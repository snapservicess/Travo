const mongoose = require('mongoose');

const locationTrackingSchema = new mongoose.Schema({
  touristId: {
    type: String,
    required: true,
    ref: 'User'
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  locationData: {
    coordinates: {
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180
      }
    },
    altitude: Number,
    accuracy: Number, // GPS accuracy in meters
    heading: Number,  // Direction of movement in degrees
    speed: Number     // Speed in m/s
  },
  address: {
    formatted: String,
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
    landmark: String
  },
  context: {
    activity: {
      type: String,
      enum: ['walking', 'driving', 'stationary', 'running', 'cycling', 'unknown'],
      default: 'unknown'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    },
    weather: {
      condition: String,
      temperature: Number,
      humidity: Number
    },
    timeOfDay: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night'],
      required: true
    }
  },
  geofenceEvents: [{
    geofenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Geofence'
    },
    geofenceName: String,
    eventType: {
      type: String,
      enum: ['enter', 'exit', 'dwell'],
      required: true
    },
    safetyLevel: String,
    alertTriggered: Boolean,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  safetyMetrics: {
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    factors: [{
      factor: String,
      impact: Number, // -100 to +100
      description: String
    }],
    nearbyThreats: [{
      type: String,
      distance: Number, // in meters
      severity: String
    }],
    safetyRecommendations: [String]
  },
  movement: {
    previousLocation: {
      coordinates: {
        latitude: Number,
        longitude: Number
      },
      timestamp: Date
    },
    distance: Number,     // Distance traveled from previous point in meters
    duration: Number,     // Time elapsed from previous point in seconds
    averageSpeed: Number, // Average speed since last update in m/s
    trajectory: String    // General direction: 'north', 'south', 'east', 'west', etc.
  },
  battery: {
    level: Number,        // Battery percentage
    isCharging: Boolean,
    lowBatteryAlert: Boolean
  },
  networkInfo: {
    connectionType: String, // 'wifi', 'cellular', 'offline'
    signalStrength: Number, // 0-100
    provider: String
  },
  emergencyStatus: {
    isEmergency: {
      type: Boolean,
      default: false
    },
    emergencyType: String,
    triggered: Boolean,
    officerNotified: Boolean
  },
  privacy: {
    shareLocation: {
      type: Boolean,
      default: true
    },
    shareWithFamily: Boolean,
    shareWithOfficers: Boolean,
    dataRetention: {
      type: String,
      enum: ['session', '24hours', '7days', '30days'],
      default: '7days'
    }
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  serverTimestamp: {
    type: Date,
    default: Date.now
  }
});

// Compound indexes for efficient queries
locationTrackingSchema.index({ touristId: 1, timestamp: -1 });
locationTrackingSchema.index({ sessionId: 1, timestamp: -1 });
locationTrackingSchema.index({ 'locationData.coordinates.latitude': 1, 'locationData.coordinates.longitude': 1 });
locationTrackingSchema.index({ 'emergencyStatus.isEmergency': 1, timestamp: -1 });
locationTrackingSchema.index({ 'geofenceEvents.eventType': 1, timestamp: -1 });

// Geospatial index for location queries
locationTrackingSchema.index({ 
  'locationData.coordinates': '2dsphere' 
});

// TTL index for automatic data cleanup based on privacy settings
locationTrackingSchema.index({ 
  'serverTimestamp': 1 
}, { 
  expireAfterSeconds: 30 * 24 * 60 * 60 // 30 days default
});

// Pre-save middleware to calculate movement data
locationTrackingSchema.pre('save', function(next) {
  this.serverTimestamp = new Date();
  
  // Calculate time of day
  const hour = this.timestamp.getHours();
  if (hour >= 6 && hour < 12) this.context.timeOfDay = 'morning';
  else if (hour >= 12 && hour < 18) this.context.timeOfDay = 'afternoon';
  else if (hour >= 18 && hour < 22) this.context.timeOfDay = 'evening';
  else this.context.timeOfDay = 'night';
  
  next();
});

// Method to calculate distance from previous location
locationTrackingSchema.methods.calculateMovementData = function(previousTracking) {
  if (!previousTracking) return;

  const prev = previousTracking.locationData.coordinates;
  const curr = this.locationData.coordinates;
  
  // Calculate distance using Haversine formula
  const distance = this.calculateDistance(
    prev.latitude, prev.longitude,
    curr.latitude, curr.longitude
  );
  
  // Calculate duration
  const duration = (this.timestamp - previousTracking.timestamp) / 1000; // seconds
  
  // Calculate speed
  const speed = duration > 0 ? distance / duration : 0;
  
  // Determine trajectory
  const bearing = this.calculateBearing(
    prev.latitude, prev.longitude,
    curr.latitude, curr.longitude
  );
  
  this.movement = {
    previousLocation: {
      coordinates: prev,
      timestamp: previousTracking.timestamp
    },
    distance,
    duration,
    averageSpeed: speed,
    trajectory: this.bearingToDirection(bearing)
  };
};

// Helper method to calculate distance between two points
locationTrackingSchema.methods.calculateDistance = function(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

// Helper method to calculate bearing between two points
locationTrackingSchema.methods.calculateBearing = function(lat1, lon1, lat2, lon2) {
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};

// Helper method to convert bearing to direction
locationTrackingSchema.methods.bearingToDirection = function(bearing) {
  const directions = [
    'north', 'northeast', 'east', 'southeast',
    'south', 'southwest', 'west', 'northwest'
  ];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
};

// Method to add geofence event
locationTrackingSchema.methods.addGeofenceEvent = function(geofence, eventType) {
  this.geofenceEvents.push({
    geofenceId: geofence._id,
    geofenceName: geofence.name,
    eventType,
    safetyLevel: geofence.safetyLevel,
    alertTriggered: geofence.alertSettings.sendAlertOnEntry && eventType === 'enter' ||
                    geofence.alertSettings.sendAlertOnExit && eventType === 'exit',
    timestamp: new Date()
  });
};

// Method to calculate real-time safety score
locationTrackingSchema.methods.calculateSafetyScore = function(geofences = [], nearbyThreats = []) {
  let score = 70; // Base safety score
  const factors = [];

  // Factor 1: Time of day
  const timeFactors = {
    'morning': 10,
    'afternoon': 5,
    'evening': -5,
    'night': -15
  };
  const timeFactor = timeFactors[this.context.timeOfDay] || 0;
  score += timeFactor;
  factors.push({
    factor: 'Time of day',
    impact: timeFactor,
    description: `${this.context.timeOfDay} time affects safety`
  });

  // Factor 2: Geofence safety levels
  geofences.forEach(geofence => {
    const levelFactors = {
      'very_safe': 15,
      'safe': 10,
      'moderate': 0,
      'unsafe': -15,
      'dangerous': -25
    };
    const geofenceFactor = levelFactors[geofence.safetyLevel] || 0;
    score += geofenceFactor;
    factors.push({
      factor: 'Area safety',
      impact: geofenceFactor,
      description: `Currently in ${geofence.safetyLevel} zone: ${geofence.name}`
    });
  });

  // Factor 3: Movement patterns
  if (this.movement && this.movement.averageSpeed) {
    if (this.movement.averageSpeed > 1.5) { // Moving (good)
      score += 5;
      factors.push({
        factor: 'Movement',
        impact: 5,
        description: 'Active movement detected'
      });
    } else if (this.movement.averageSpeed < 0.1) { // Stationary for too long (potential risk)
      score -= 5;
      factors.push({
        factor: 'Movement',
        impact: -5,
        description: 'Stationary for extended period'
      });
    }
  }

  // Factor 4: Network connectivity
  if (this.networkInfo) {
    if (this.networkInfo.connectionType === 'offline' || this.networkInfo.signalStrength < 20) {
      score -= 10;
      factors.push({
        factor: 'Connectivity',
        impact: -10,
        description: 'Poor network connection'
      });
    }
  }

  // Factor 5: Battery level
  if (this.battery && this.battery.level < 20) {
    score -= 10;
    factors.push({
      factor: 'Device battery',
      impact: -10,
      description: 'Low battery level'
    });
  }

  // Factor 6: Nearby threats
  nearbyThreats.forEach(threat => {
    const threatImpact = threat.severity === 'high' ? -15 : threat.severity === 'medium' ? -10 : -5;
    score += threatImpact;
    factors.push({
      factor: 'Nearby threat',
      impact: threatImpact,
      description: `${threat.type} detected ${threat.distance}m away`
    });
  });

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  this.safetyMetrics = {
    riskScore: score,
    factors,
    nearbyThreats,
    safetyRecommendations: this.generateSafetyRecommendations(score, factors)
  };

  return score;
};

// Method to generate safety recommendations
locationTrackingSchema.methods.generateSafetyRecommendations = function(score, factors) {
  const recommendations = [];

  if (score < 30) {
    recommendations.push('Consider moving to a safer area immediately');
    recommendations.push('Contact emergency services if you feel unsafe');
  } else if (score < 50) {
    recommendations.push('Stay alert and aware of your surroundings');
    recommendations.push('Consider traveling with others');
  }

  // Time-based recommendations
  if (this.context.timeOfDay === 'night') {
    recommendations.push('Use well-lit paths and avoid isolated areas');
    recommendations.push('Keep emergency contacts readily available');
  }

  // Battery-based recommendations
  if (this.battery && this.battery.level < 20) {
    recommendations.push('Find a place to charge your device');
    recommendations.push('Enable power saving mode');
  }

  // Network-based recommendations
  if (this.networkInfo && (this.networkInfo.connectionType === 'offline' || this.networkInfo.signalStrength < 20)) {
    recommendations.push('Move to an area with better network coverage');
    recommendations.push('Inform someone about your location before losing connectivity');
  }

  return recommendations;
};

// Static method to get recent locations for tourist
locationTrackingSchema.statics.getRecentLocations = function(touristId, hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({
    touristId,
    timestamp: { $gte: since }
  }).sort({ timestamp: -1 }).limit(100);
};

// Static method to find tourists in area
locationTrackingSchema.statics.findTouristsInArea = function(centerLat, centerLng, radiusMeters, timeLimit = 1) {
  const since = new Date(Date.now() - timeLimit * 60 * 60 * 1000);
  
  return this.find({
    timestamp: { $gte: since },
    'locationData.coordinates': {
      $near: {
        $geometry: { type: 'Point', coordinates: [centerLng, centerLat] },
        $maxDistance: radiusMeters
      }
    }
  }).sort({ timestamp: -1 });
};

// Static method to get movement analytics
locationTrackingSchema.statics.getMovementAnalytics = function(touristId, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        touristId,
        timestamp: { $gte: since }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$timestamp" }
        },
        totalDistance: { $sum: "$movement.distance" },
        averageSpeed: { $avg: "$movement.averageSpeed" },
        locations: { $sum: 1 },
        safetyScore: { $avg: "$safetyMetrics.riskScore" }
      }
    },
    {
      $sort: { "_id": 1 }
    }
  ]);
};

module.exports = mongoose.model('LocationTracking', locationTrackingSchema);