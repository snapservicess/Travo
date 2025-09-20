const LocationTracking = require('../models/LocationTracking');
const TouristTracking = require('../models/TouristTracking');
const geofenceService = require('./geofenceService');
const crypto = require('crypto');

class LocationService {
  constructor() {
    this.activeSessions = new Map(); // Track active location sessions
    this.locationCache = new Map();  // Cache recent locations for performance
  }

  // Start a new location tracking session
  async startLocationSession(touristId, initialLocation) {
    try {
      const sessionId = crypto.randomUUID();
      const session = {
        sessionId,
        touristId,
        startTime: new Date(),
        lastUpdate: new Date(),
        totalPoints: 0,
        totalDistance: 0
      };

      this.activeSessions.set(sessionId, session);
      
      // Process initial location
      if (initialLocation) {
        await this.processLocationUpdate(touristId, sessionId, initialLocation);
      }

      console.log(`📍 Started location session ${sessionId} for tourist ${touristId}`);
      return sessionId;
    } catch (error) {
      console.error('Failed to start location session:', error.message);
      throw error;
    }
  }

  // Process a location update with full safety analysis
  async processLocationUpdate(touristId, sessionId, locationData) {
    try {
      const {
        coordinates,
        altitude,
        accuracy,
        heading,
        speed,
        address,
        battery,
        networkInfo,
        timestamp = new Date()
      } = locationData;

      // Validate required data
      if (!coordinates || !coordinates.latitude || !coordinates.longitude) {
        throw new Error('Invalid coordinates provided');
      }

      // Get previous location for movement calculation
      const previousLocation = await this.getLatestLocation(touristId, sessionId);

      // Create new location tracking record
      const locationRecord = new LocationTracking({
        touristId,
        sessionId,
        locationData: {
          coordinates,
          altitude,
          accuracy,
          heading,
          speed
        },
        address: this.normalizeAddress(address),
        battery,
        networkInfo,
        timestamp
      });

      // Calculate movement data if previous location exists
      if (previousLocation) {
        locationRecord.calculateMovementData(previousLocation);
      }

      // Process geofence events
      const geofenceResults = await geofenceService.processLocationUpdate(
        touristId,
        coordinates.longitude,
        coordinates.latitude,
        sessionId
      );

      // Add geofence events to location record
      geofenceResults.geofenceEvents.forEach(event => {
        locationRecord.addGeofenceEvent(event, event.type.replace('geofence_', ''));
      });

      // Calculate real-time safety score
      const nearbyGeofences = await geofenceService.findContainingGeofences(
        coordinates.longitude,
        coordinates.latitude
      );

      const safetyScore = locationRecord.calculateSafetyScore(
        nearbyGeofences,
        [] // TODO: Add nearby threats detection
      );

      // Check for emergency situations
      const emergencyCheck = this.checkForEmergencySituations(locationRecord, previousLocation);
      if (emergencyCheck.isEmergency) {
        locationRecord.emergencyStatus = emergencyCheck;
        await this.handleEmergencyDetection(touristId, locationRecord, emergencyCheck);
      }

      // Save location record
      await locationRecord.save();

      // Update session statistics
      await this.updateSessionStatistics(sessionId, locationRecord);

      // Update main tourist tracking
      await this.updateTouristMainTracking(touristId, locationRecord, geofenceResults);

      // Cache recent location
      this.cacheLocation(touristId, locationRecord);

      const response = {
        success: true,
        locationId: locationRecord._id,
        sessionId,
        safetyScore,
        geofenceEvents: geofenceResults.geofenceEvents,
        safetyAlerts: geofenceResults.safetyAlerts,
        recommendations: locationRecord.safetyMetrics.safetyRecommendations,
        emergency: emergencyCheck.isEmergency ? emergencyCheck : null
      };

      return response;
    } catch (error) {
      console.error('Failed to process location update:', error.message);
      throw error;
    }
  }

  // Get latest location for a tourist
  async getLatestLocation(touristId, sessionId = null) {
    try {
      const query = { touristId };
      if (sessionId) query.sessionId = sessionId;

      return await LocationTracking.findOne(query)
        .sort({ timestamp: -1 })
        .limit(1);
    } catch (error) {
      console.error('Failed to get latest location:', error.message);
      return null;
    }
  }

  // Normalize address information
  normalizeAddress(address) {
    if (!address) return null;

    if (typeof address === 'string') {
      return { formatted: address };
    }

    return {
      formatted: address.formatted || address.street || 'Unknown location',
      street: address.street,
      city: address.city,
      state: address.state,
      country: address.country,
      postalCode: address.postalCode,
      landmark: address.landmark
    };
  }

  // Check for emergency situations based on location patterns
  checkForEmergencySituations(currentLocation, previousLocation) {
    const emergency = {
      isEmergency: false,
      emergencyType: null,
      confidence: 0,
      triggers: []
    };

    // Check 1: Rapid movement to dangerous area
    if (currentLocation.safetyMetrics.riskScore < 30) {
      emergency.triggers.push('entered_dangerous_area');
      emergency.confidence += 0.3;
    }

    // Check 2: Sudden stop in unsafe area (possible incident)
    if (previousLocation && currentLocation.movement) {
      const wasMoving = previousLocation.movement && previousLocation.movement.averageSpeed > 1.0;
      const nowStationary = currentLocation.movement.averageSpeed < 0.1;
      const inUnsafeArea = currentLocation.safetyMetrics.riskScore < 50;

      if (wasMoving && nowStationary && inUnsafeArea) {
        emergency.triggers.push('sudden_stop_unsafe_area');
        emergency.confidence += 0.4;
      }
    }

    // Check 3: Low battery in remote area
    if (currentLocation.battery && currentLocation.battery.level < 15) {
      const isRemote = currentLocation.geofenceEvents.length === 0; // No geofences = remote
      if (isRemote) {
        emergency.triggers.push('low_battery_remote_area');
        emergency.confidence += 0.2;
      }
    }

    // Check 4: Lost network connectivity for extended period
    if (currentLocation.networkInfo && 
        (currentLocation.networkInfo.connectionType === 'offline' || 
         currentLocation.networkInfo.signalStrength < 10)) {
      emergency.triggers.push('lost_connectivity');
      emergency.confidence += 0.1;
    }

    // Check 5: Movement to restricted area
    const restrictedAreaEntry = currentLocation.geofenceEvents.find(
      event => event.eventType === 'enter' && 
               (event.geofenceName.includes('restricted') || event.geofenceName.includes('danger'))
    );
    if (restrictedAreaEntry) {
      emergency.triggers.push('entered_restricted_area');
      emergency.confidence += 0.5;
    }

    // Determine if this constitutes an emergency
    if (emergency.confidence >= 0.4) {
      emergency.isEmergency = true;
      emergency.emergencyType = 'potential_incident';
    } else if (emergency.confidence >= 0.6) {
      emergency.isEmergency = true;
      emergency.emergencyType = 'high_risk_situation';
    }

    return emergency;
  }

  // Handle emergency detection
  async handleEmergencyDetection(touristId, locationRecord, emergencyInfo) {
    try {
      console.log(`🚨 EMERGENCY DETECTED for tourist ${touristId}: ${emergencyInfo.emergencyType}`);
      
      // Update emergency status
      locationRecord.emergencyStatus.triggered = true;

      // Send alert to tourist
      // TODO: Implement emergency alert to tourist

      // Notify officers immediately
      // TODO: Implement officer notification
      locationRecord.emergencyStatus.officerNotified = true;

      console.log(`⚠️  Emergency triggers: ${emergencyInfo.triggers.join(', ')}`);
      console.log(`📊 Confidence level: ${Math.round(emergencyInfo.confidence * 100)}%`);
    } catch (error) {
      console.error('Failed to handle emergency detection:', error.message);
    }
  }

  // Update session statistics
  async updateSessionStatistics(sessionId, locationRecord) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) return;

      session.totalPoints += 1;
      session.lastUpdate = locationRecord.timestamp;

      if (locationRecord.movement && locationRecord.movement.distance) {
        session.totalDistance += locationRecord.movement.distance;
      }

      this.activeSessions.set(sessionId, session);
    } catch (error) {
      console.error('Failed to update session statistics:', error.message);
    }
  }

  // Update main tourist tracking record
  async updateTouristMainTracking(touristId, locationRecord, geofenceResults) {
    try {
      let tracking = await TouristTracking.findOne({ touristId });
      
      if (!tracking) {
        tracking = new TouristTracking({
          touristId,
          currentLocation: {
            coordinates: locationRecord.locationData.coordinates,
            address: locationRecord.address?.formatted || 'Unknown location',
            city: locationRecord.address?.city,
            state: locationRecord.address?.state,
            country: locationRecord.address?.country,
            accuracy: locationRecord.locationData.accuracy
          },
          status: locationRecord.emergencyStatus.isEmergency ? 'emergency' : 'active'
        });
      } else {
        // Update current location
        tracking.currentLocation = {
          coordinates: locationRecord.locationData.coordinates,
          address: locationRecord.address?.formatted || tracking.currentLocation.address,
          city: locationRecord.address?.city || tracking.currentLocation.city,
          state: locationRecord.address?.state || tracking.currentLocation.state,
          country: locationRecord.address?.country || tracking.currentLocation.country,
          accuracy: locationRecord.locationData.accuracy
        };

        // Update status based on safety and emergency
        if (locationRecord.emergencyStatus.isEmergency) {
          tracking.status = 'emergency';
          tracking.emergencyInfo.hasActiveEmergency = true;
          tracking.emergencyInfo.emergencyLevel = 'high';
        } else if (locationRecord.safetyMetrics.riskScore < 30) {
          tracking.status = 'active'; // Keep active but add alerts
        }

        // Add location to history
        tracking.addLocationHistory(
          locationRecord.locationData.coordinates,
          locationRecord.address?.formatted || 'Unknown location',
          locationRecord.emergencyStatus.isEmergency ? 'emergency' : 'update'
        );
      }

      // Add safety alerts
      if (geofenceResults.safetyAlerts.length > 0) {
        geofenceResults.safetyAlerts.forEach(alert => {
          tracking.addAlert('safety', alert.message, alert.type);
        });
      }

      await tracking.save();
    } catch (error) {
      console.error('Failed to update tourist main tracking:', error.message);
    }
  }

  // Cache recent location for performance
  cacheLocation(touristId, locationRecord) {
    const key = `${touristId}_recent`;
    this.locationCache.set(key, {
      locationRecord,
      timestamp: new Date()
    });

    // Clean old cache entries (keep only last 100 tourists)
    if (this.locationCache.size > 100) {
      const oldestKey = this.locationCache.keys().next().value;
      this.locationCache.delete(oldestKey);
    }
  }

  // Get location history for tourist
  async getLocationHistory(touristId, options = {}) {
    try {
      const {
        hours = 24,
        limit = 100,
        includeGeofenceEvents = false,
        includeMovementData = false
      } = options;

      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      let query = LocationTracking.find({
        touristId,
        timestamp: { $gte: since }
      }).sort({ timestamp: -1 });

      if (limit) query = query.limit(limit);

      const locations = await query.exec();

      return locations.map(loc => ({
        id: loc._id,
        coordinates: loc.locationData.coordinates,
        address: loc.address?.formatted,
        timestamp: loc.timestamp,
        safetyScore: loc.safetyMetrics?.riskScore,
        activity: loc.context?.activity,
        geofenceEvents: includeGeofenceEvents ? loc.geofenceEvents : undefined,
        movement: includeMovementData ? loc.movement : undefined
      }));
    } catch (error) {
      console.error('Failed to get location history:', error.message);
      throw error;
    }
  }

  // Get real-time safety status for tourist
  async getSafetyStatus(touristId) {
    try {
      // Get latest location
      const latest = await this.getLatestLocation(touristId);
      if (!latest) {
        return {
          status: 'unknown',
          message: 'No recent location data available',
          lastSeen: null
        };
      }

      // Analyze recency
      const minutesAgo = (Date.now() - latest.timestamp) / (1000 * 60);
      let status = 'active';
      let message = 'Recent activity detected';

      if (minutesAgo > 60) {
        status = 'inactive';
        message = `Last seen ${Math.round(minutesAgo / 60)} hours ago`;
      } else if (minutesAgo > 30) {
        status = 'idle';
        message = `Last activity ${Math.round(minutesAgo)} minutes ago`;
      }

      // Check emergency status
      if (latest.emergencyStatus.isEmergency) {
        status = 'emergency';
        message = `Emergency situation detected: ${latest.emergencyStatus.emergencyType}`;
      }

      return {
        status,
        message,
        lastSeen: latest.timestamp,
        safetyScore: latest.safetyMetrics?.riskScore || 50,
        location: {
          coordinates: latest.locationData.coordinates,
          address: latest.address?.formatted
        },
        recommendations: latest.safetyMetrics?.safetyRecommendations || []
      };
    } catch (error) {
      console.error('Failed to get safety status:', error.message);
      throw error;
    }
  }

  // Get movement analytics
  async getMovementAnalytics(touristId, days = 7) {
    try {
      const analytics = await LocationTracking.getMovementAnalytics(touristId, days);
      
      const summary = {
        totalDays: days,
        totalDistance: analytics.reduce((sum, day) => sum + (day.totalDistance || 0), 0),
        averageDistance: 0,
        averageSpeed: 0,
        averageSafetyScore: 0,
        totalLocations: analytics.reduce((sum, day) => sum + (day.locations || 0), 0),
        dailyBreakdown: analytics
      };

      if (analytics.length > 0) {
        summary.averageDistance = summary.totalDistance / analytics.length;
        summary.averageSpeed = analytics.reduce((sum, day) => sum + (day.averageSpeed || 0), 0) / analytics.length;
        summary.averageSafetyScore = analytics.reduce((sum, day) => sum + (day.safetyScore || 50), 0) / analytics.length;
      }

      return summary;
    } catch (error) {
      console.error('Failed to get movement analytics:', error.message);
      throw error;
    }
  }

  // End location session
  async endLocationSession(sessionId) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      session.endTime = new Date();
      session.duration = session.endTime - session.startTime;

      // Save session summary (optional - could create a Session model)
      console.log(`📍 Ended location session ${sessionId} for tourist ${session.touristId}`);
      console.log(`   Duration: ${Math.round(session.duration / 60000)} minutes`);
      console.log(`   Total points: ${session.totalPoints}`);
      console.log(`   Total distance: ${Math.round(session.totalDistance)}m`);

      // Remove from active sessions
      this.activeSessions.delete(sessionId);

      return {
        sessionId,
        touristId: session.touristId,
        duration: session.duration,
        totalPoints: session.totalPoints,
        totalDistance: session.totalDistance
      };
    } catch (error) {
      console.error('Failed to end location session:', error.message);
      throw error;
    }
  }

  // Get tourists in area (for dashboard)
  async getTouristsInArea(centerLat, centerLng, radiusKm, timeLimit = 1) {
    try {
      return await LocationTracking.findTouristsInArea(centerLat, centerLng, radiusKm * 1000, timeLimit);
    } catch (error) {
      console.error('Failed to get tourists in area:', error.message);
      throw error;
    }
  }

  // Cleanup old location data based on privacy settings
  async cleanupLocationData() {
    try {
      const cutoffs = {
        'session': new Date(Date.now() - 24 * 60 * 60 * 1000),      // 24 hours
        '24hours': new Date(Date.now() - 24 * 60 * 60 * 1000),     // 24 hours
        '7days': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),   // 7 days
        '30days': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)  // 30 days
      };

      let totalDeleted = 0;

      for (const [retention, cutoff] of Object.entries(cutoffs)) {
        const result = await LocationTracking.deleteMany({
          'privacy.dataRetention': retention,
          serverTimestamp: { $lt: cutoff }
        });
        totalDeleted += result.deletedCount;
      }

      if (totalDeleted > 0) {
        console.log(`🧹 Cleaned up ${totalDeleted} old location records`);
      }

      return totalDeleted;
    } catch (error) {
      console.error('Failed to cleanup location data:', error.message);
      return 0;
    }
  }
}

module.exports = new LocationService();