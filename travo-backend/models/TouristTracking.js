const mongoose = require('mongoose');

const touristTrackingSchema = new mongoose.Schema({
  touristId: {
    type: String,
    required: true,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'checked-in', 'checked-out', 'emergency', 'missing'],
    default: 'active'
  },
  currentLocation: {
    coordinates: {
      latitude: {
        type: Number,
        required: true
      },
      longitude: {
        type: Number,
        required: true
      }
    },
    address: {
      type: String,
      required: true
    },
    city: String,
    state: String,
    country: String,
    landmark: String,
    accuracy: Number // GPS accuracy in meters
  },
  visitDetails: {
    checkInTime: {
      type: Date,
      default: Date.now
    },
    expectedCheckOutTime: Date,
    actualCheckOutTime: Date,
    visitPurpose: {
      type: String,
      enum: ['tourism', 'business', 'medical', 'transit', 'other'],
      default: 'tourism'
    },
    accommodationDetails: {
      hotelName: String,
      hotelAddress: String,
      contactNumber: String
    },
    groupSize: {
      type: Number,
      default: 1
    },
    accompanyingTourists: [String] // Array of tourist IDs
  },
  emergencyInfo: {
    hasActiveEmergency: {
      type: Boolean,
      default: false
    },
    lastEmergencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Emergency'
    },
    emergencyLevel: {
      type: String,
      enum: ['none', 'low', 'medium', 'high', 'critical'],
      default: 'none'
    }
  },
  locationHistory: [{
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    address: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    activity: {
      type: String,
      enum: ['arrived', 'departed', 'emergency', 'check-in', 'check-out', 'update'],
      default: 'update'
    }
  }],
  officerAssigned: {
    officerId: {
      type: String,
      ref: 'Officer'
    },
    assignedAt: Date,
    notes: String
  },
  alerts: [{
    type: {
      type: String,
      enum: ['safety', 'location', 'time', 'emergency'],
      required: true
    },
    message: String,
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    acknowledged: {
      type: Boolean,
      default: false
    },
    acknowledgedBy: String,
    acknowledgedAt: Date
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
touristTrackingSchema.index({ touristId: 1 });
touristTrackingSchema.index({ status: 1, lastUpdated: -1 });
touristTrackingSchema.index({ 'currentLocation.coordinates.latitude': 1, 'currentLocation.coordinates.longitude': 1 });
touristTrackingSchema.index({ 'emergencyInfo.hasActiveEmergency': 1 });

// Pre-save middleware to update timestamp
touristTrackingSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

// Method to add location history entry
touristTrackingSchema.methods.addLocationHistory = function(coordinates, address, activity = 'update') {
  this.locationHistory.push({
    coordinates,
    address,
    activity,
    timestamp: new Date()
  });
  
  // Keep only last 100 location entries to prevent bloat
  if (this.locationHistory.length > 100) {
    this.locationHistory = this.locationHistory.slice(-100);
  }
};

// Method to add alert
touristTrackingSchema.methods.addAlert = function(type, message, severity = 'info') {
  this.alerts.push({
    type,
    message,
    severity,
    createdAt: new Date()
  });
};

// Static method to find active tourists in area
touristTrackingSchema.statics.findActiveInArea = function(centerLat, centerLng, radiusKm) {
  // Simple bounding box calculation (for more precision, use MongoDB geospatial queries)
  const latDelta = radiusKm / 111; // Rough conversion: 1 degree lat ≈ 111 km
  const lngDelta = radiusKm / (111 * Math.cos(centerLat * Math.PI / 180));
  
  return this.find({
    status: { $in: ['active', 'checked-in'] },
    'currentLocation.coordinates.latitude': {
      $gte: centerLat - latDelta,
      $lte: centerLat + latDelta
    },
    'currentLocation.coordinates.longitude': {
      $gte: centerLng - lngDelta,
      $lte: centerLng + lngDelta
    }
  });
};

// Static method to get dashboard summary
touristTrackingSchema.statics.getDashboardSummary = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('TouristTracking', touristTrackingSchema);