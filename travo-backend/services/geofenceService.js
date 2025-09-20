const Geofence = require('../models/Geofence');
const LocationTracking = require('../models/LocationTracking');
const TouristTracking = require('../models/TouristTracking');
const notificationService = require('./notificationService');

class GeofenceService {
  constructor() {
    this.activeGeofences = new Map(); // Cache for active geofences
    this.touristStates = new Map();   // Track tourist geofence states
    this.initializeCache();
  }

  // Initialize geofence cache for performance
  async initializeCache() {
    try {
      const activeGeofences = await Geofence.find({ isActive: true });
      activeGeofences.forEach(geofence => {
        this.activeGeofences.set(geofence._id.toString(), geofence);
      });
      console.log(`🗺️  Initialized ${activeGeofences.length} active geofences`);
    } catch (error) {
      console.error('Failed to initialize geofence cache:', error.message);
    }
  }

  // Create a new geofence
  async createGeofence(geofenceData, createdBy) {
    try {
      const geofence = new Geofence({
        ...geofenceData,
        createdBy
      });

      await geofence.save();
      
      // Add to cache
      this.activeGeofences.set(geofence._id.toString(), geofence);

      console.log(`🎯 Created new geofence: ${geofence.name} (${geofence.type})`);
      return geofence;
    } catch (error) {
      console.error('Failed to create geofence:', error.message);
      throw error;
    }
  }

  // Process tourist location update and check geofences
  async processLocationUpdate(touristId, longitude, latitude, sessionId) {
    try {
      const results = {
        geofenceEvents: [],
        safetyAlerts: [],
        recommendations: []
      };

      // Get current geofences containing this location
      const currentGeofences = await this.findContainingGeofences(longitude, latitude);
      
      // Get tourist's previous geofence state
      const previousState = this.touristStates.get(touristId) || new Set();
      const currentState = new Set(currentGeofences.map(gf => gf._id.toString()));

      // Detect entries (new geofences)
      for (const geofence of currentGeofences) {
        const geofenceId = geofence._id.toString();
        
        if (!previousState.has(geofenceId)) {
          // Tourist entered this geofence
          const event = await this.handleGeofenceEntry(touristId, geofence, longitude, latitude, sessionId);
          results.geofenceEvents.push(event);
          
          // Update geofence statistics
          geofence.recordActivity('entry');
          await geofence.save();
        }
      }

      // Detect exits (previous geofences not in current)
      const previousGeofences = await Geofence.find({
        _id: { $in: Array.from(previousState) }
      });

      for (const geofence of previousGeofences) {
        const geofenceId = geofence._id.toString();
        
        if (!currentState.has(geofenceId)) {
          // Tourist exited this geofence
          const event = await this.handleGeofenceExit(touristId, geofence, longitude, latitude, sessionId);
          results.geofenceEvents.push(event);
          
          // Update geofence statistics
          geofence.recordActivity('exit');
          await geofence.save();
        }
      }

      // Update tourist state
      this.touristStates.set(touristId, currentState);

      // Generate safety assessment
      const safetyAssessment = this.assessLocationSafety(currentGeofences, longitude, latitude);
      results.safetyAlerts = safetyAssessment.alerts;
      results.recommendations = safetyAssessment.recommendations;

      return results;
    } catch (error) {
      console.error('Failed to process location update:', error.message);
      throw error;
    }
  }

  // Handle geofence entry
  async handleGeofenceEntry(touristId, geofence, longitude, latitude, sessionId) {
    console.log(`🚶‍♂️ Tourist ${touristId} entered ${geofence.name} (${geofence.safetyLevel})`);

    const event = {
      type: 'geofence_entry',
      geofenceId: geofence._id,
      geofenceName: geofence.name,
      safetyLevel: geofence.safetyLevel,
      alertTriggered: false,
      timestamp: new Date()
    };

    // Check if alerts should be sent
    if (geofence.alertSettings.sendAlertOnEntry && this.shouldSendAlert(geofence)) {
      event.alertTriggered = true;
      
      // Send alert to tourist
      await this.sendGeofenceAlert(touristId, geofence, 'entry', longitude, latitude);
      
      // Notify officers if required
      if (geofence.alertSettings.notifyOfficers) {
        await this.notifyOfficersAboutGeofenceEvent(touristId, geofence, 'entry', longitude, latitude);
      }
    }

    // Update tourist tracking
    await this.updateTouristTracking(touristId, geofence, 'entry', longitude, latitude);

    return event;
  }

  // Handle geofence exit
  async handleGeofenceExit(touristId, geofence, longitude, latitude, sessionId) {
    console.log(`🚶‍♂️ Tourist ${touristId} exited ${geofence.name}`);

    const event = {
      type: 'geofence_exit',
      geofenceId: geofence._id,
      geofenceName: geofence.name,
      safetyLevel: geofence.safetyLevel,
      alertTriggered: false,
      timestamp: new Date()
    };

    // Check if exit alerts should be sent
    if (geofence.alertSettings.sendAlertOnExit && this.shouldSendAlert(geofence)) {
      event.alertTriggered = true;
      
      // Send alert to tourist
      await this.sendGeofenceAlert(touristId, geofence, 'exit', longitude, latitude);
      
      // Notify officers if required
      if (geofence.alertSettings.notifyOfficers) {
        await this.notifyOfficersAboutGeofenceEvent(touristId, geofence, 'exit', longitude, latitude);
      }
    }

    // Update tourist tracking
    await this.updateTouristTracking(touristId, geofence, 'exit', longitude, latitude);

    return event;
  }

  // Find geofences containing a point
  async findContainingGeofences(longitude, latitude) {
    try {
      const geofences = [];

      // Check cached geofences first for performance
      for (const geofence of this.activeGeofences.values()) {
        if (geofence.containsPoint(longitude, latitude)) {
          geofences.push(geofence);
        }
      }

      return geofences;
    } catch (error) {
      console.error('Failed to find containing geofences:', error.message);
      // Fallback to database query
      return await Geofence.findContaining(longitude, latitude);
    }
  }

  // Check if alert should be sent based on active hours
  shouldSendAlert(geofence) {
    if (geofence.activeHours.allDay) return true;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return currentTime >= geofence.activeHours.startTime && 
           currentTime <= geofence.activeHours.endTime;
  }

  // Send geofence alert to tourist
  async sendGeofenceAlert(touristId, geofence, eventType, longitude, latitude) {
    try {
      const message = eventType === 'entry' 
        ? geofence.alertSettings.alertMessage.entry || `You've entered ${geofence.name} - ${geofence.safetyLevel} area`
        : geofence.alertSettings.alertMessage.exit || `You've left ${geofence.name}`;

      const alertData = {
        touristId,
        geofenceName: geofence.name,
        eventType,
        safetyLevel: geofence.safetyLevel,
        message,
        location: { longitude, latitude },
        emergencyContacts: geofence.metadata.emergencyContacts,
        timestamp: new Date()
      };

      // Send notification (implement notification service call)
      await notificationService.sendGeofenceAlert(touristId, alertData);
      
      console.log(`📱 Sent ${eventType} alert for ${geofence.name} to tourist ${touristId}`);
    } catch (error) {
      console.error('Failed to send geofence alert:', error.message);
    }
  }

  // Notify officers about geofence event
  async notifyOfficersAboutGeofenceEvent(touristId, geofence, eventType, longitude, latitude) {
    try {
      const alertData = {
        touristId,
        geofenceName: geofence.name,
        geofenceType: geofence.type,
        eventType,
        safetyLevel: geofence.safetyLevel,
        location: { longitude, latitude },
        timestamp: new Date(),
        requiresAttention: geofence.safetyLevel === 'dangerous' || geofence.type === 'danger_zone'
      };

      // Send to dashboard/officers (implement notification service call)
      await notificationService.sendOfficerAlert('geofence_event', alertData);
      
      console.log(`🚔 Notified officers about ${eventType} event in ${geofence.name}`);
    } catch (error) {
      console.error('Failed to notify officers:', error.message);
    }
  }

  // Update tourist tracking with geofence information
  async updateTouristTracking(touristId, geofence, eventType, longitude, latitude) {
    try {
      let tracking = await TouristTracking.findOne({ touristId });
      
      if (tracking) {
        // Add alert about geofence event
        const alertMessage = eventType === 'entry' 
          ? `Entered ${geofence.safetyLevel} zone: ${geofence.name}`
          : `Exited zone: ${geofence.name}`;

        const alertSeverity = geofence.safetyLevel === 'dangerous' ? 'critical' :
                              geofence.safetyLevel === 'unsafe' ? 'warning' : 'info';

        tracking.addAlert('location', alertMessage, alertSeverity);
        await tracking.save();
      }
    } catch (error) {
      console.error('Failed to update tourist tracking:', error.message);
    }
  }

  // Assess safety of current location
  assessLocationSafety(geofences, longitude, latitude) {
    const assessment = {
      overallSafety: 'moderate',
      riskScore: 50,
      alerts: [],
      recommendations: []
    };

    if (geofences.length === 0) {
      // No geofences - unknown area
      assessment.overallSafety = 'unknown';
      assessment.riskScore = 40;
      assessment.alerts.push({
        type: 'info',
        message: 'You are in an unmonitored area. Stay alert and keep emergency contacts handy.'
      });
    } else {
      // Analyze geofence safety levels
      const safetyLevels = geofences.map(gf => gf.safetyLevel);
      const dangerousCount = safetyLevels.filter(level => level === 'dangerous').length;
      const unsafeCount = safetyLevels.filter(level => level === 'unsafe').length;
      const safeCount = safetyLevels.filter(level => level === 'safe' || level === 'very_safe').length;

      if (dangerousCount > 0) {
        assessment.overallSafety = 'dangerous';
        assessment.riskScore = 20;
        assessment.alerts.push({
          type: 'critical',
          message: 'WARNING: You are in a high-risk area. Consider leaving immediately.'
        });
        assessment.recommendations.push('Move to a safer area immediately');
        assessment.recommendations.push('Contact local authorities if you feel threatened');
      } else if (unsafeCount > 0) {
        assessment.overallSafety = 'unsafe';
        assessment.riskScore = 35;
        assessment.alerts.push({
          type: 'warning',
          message: 'CAUTION: You are in an area with safety concerns.'
        });
        assessment.recommendations.push('Stay alert and avoid isolated areas');
        assessment.recommendations.push('Travel with others if possible');
      } else if (safeCount > 0) {
        assessment.overallSafety = 'safe';
        assessment.riskScore = 80;
        assessment.alerts.push({
          type: 'info',
          message: 'You are in a monitored safe area.'
        });
      }
    }

    // Add time-based recommendations
    const hour = new Date().getHours();
    if (hour >= 22 || hour <= 6) {
      assessment.riskScore -= 10;
      assessment.recommendations.push('Use well-lit paths during nighttime');
    }

    return assessment;
  }

  // Get geofences for dashboard
  async getGeofencesForDashboard(filters = {}) {
    try {
      const query = { isActive: true };
      
      if (filters.type) query.type = filters.type;
      if (filters.safetyLevel) query.safetyLevel = filters.safetyLevel;
      if (filters.city) query['metadata.city'] = filters.city;

      const geofences = await Geofence.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50);

      return geofences.map(gf => ({
        id: gf._id,
        name: gf.name,
        type: gf.type,
        safetyLevel: gf.safetyLevel,
        geometry: gf.geometry,
        currentTourists: gf.statistics.currentTourists,
        totalEntries: gf.statistics.totalEntries,
        lastActivity: gf.statistics.lastActivity,
        metadata: gf.metadata
      }));
    } catch (error) {
      console.error('Failed to get geofences for dashboard:', error.message);
      throw error;
    }
  }

  // Get tourists in specific geofence
  async getTouristsInGeofence(geofenceId) {
    try {
      const geofence = await Geofence.findById(geofenceId);
      if (!geofence) throw new Error('Geofence not found');

      const tourists = [];
      
      // Check which tourists are currently in this geofence
      for (const [touristId, geofenceSet] of this.touristStates.entries()) {
        if (geofenceSet.has(geofenceId)) {
          // Get tourist details
          const tracking = await TouristTracking.findOne({ touristId })
            .populate('touristId', 'touristId profile.name email');
          
          if (tracking) {
            tourists.push({
              touristId: tracking.touristId,
              name: tracking.userId?.profile?.name || 'Unknown',
              location: tracking.currentLocation,
              status: tracking.status,
              lastUpdated: tracking.lastUpdated
            });
          }
        }
      }

      return {
        geofence: {
          id: geofence._id,
          name: geofence.name,
          type: geofence.type,
          safetyLevel: geofence.safetyLevel
        },
        tourists,
        count: tourists.length
      };
    } catch (error) {
      console.error('Failed to get tourists in geofence:', error.message);
      throw error;
    }
  }

  // Get safety analytics for area
  async getSafetyAnalytics(centerLat, centerLng, radiusKm) {
    try {
      // Find geofences in area
      const geofences = await Geofence.findInArea(centerLat, centerLng, radiusKm * 1000);
      
      // Calculate safety metrics
      const safetyStats = {
        totalGeofences: geofences.length,
        safeZones: geofences.filter(gf => gf.safetyLevel === 'safe' || gf.safetyLevel === 'very_safe').length,
        dangerZones: geofences.filter(gf => gf.safetyLevel === 'unsafe' || gf.safetyLevel === 'dangerous').length,
        totalTouristActivity: geofences.reduce((sum, gf) => sum + gf.statistics.totalEntries, 0),
        averageSafetyScore: this.calculateAreaSafetyScore(geofences)
      };

      return {
        area: {
          center: { latitude: centerLat, longitude: centerLng },
          radius: radiusKm
        },
        safetyStats,
        geofences: geofences.map(gf => ({
          id: gf._id,
          name: gf.name,
          type: gf.type,
          safetyLevel: gf.safetyLevel,
          currentTourists: gf.statistics.currentTourists
        }))
      };
    } catch (error) {
      console.error('Failed to get safety analytics:', error.message);
      throw error;
    }
  }

  // Calculate area safety score
  calculateAreaSafetyScore(geofences) {
    if (geofences.length === 0) return 50;

    const scoreMap = {
      'very_safe': 90,
      'safe': 75,
      'moderate': 50,
      'unsafe': 25,
      'dangerous': 10
    };

    const totalScore = geofences.reduce((sum, gf) => {
      return sum + (scoreMap[gf.safetyLevel] || 50);
    }, 0);

    return Math.round(totalScore / geofences.length);
  }

  // Cleanup and refresh cache
  async refreshCache() {
    try {
      this.activeGeofences.clear();
      await this.initializeCache();
      console.log('🔄 Geofence cache refreshed');
    } catch (error) {
      console.error('Failed to refresh geofence cache:', error.message);
    }
  }
}

module.exports = new GeofenceService();