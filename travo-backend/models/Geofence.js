const mongoose = require('mongoose');

const geofenceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['safe_zone', 'danger_zone', 'restricted_area', 'tourist_zone', 'emergency_zone', 'hospital_zone'],
    required: true
  },
  geometry: {
    type: {
      type: String,
      enum: ['Polygon', 'Circle', 'Point'],
      required: true
    },
    coordinates: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      validate: {
        validator: function(coords) {
          if (this.geometry.type === 'Circle' || this.geometry.type === 'Point') {
            return Array.isArray(coords) && coords.length === 2 && 
                   typeof coords[0] === 'number' && typeof coords[1] === 'number';
          } else if (this.geometry.type === 'Polygon') {
            return Array.isArray(coords) && Array.isArray(coords[0]) && 
                   coords[0].length >= 3;
          }
          return false;
        },
        message: 'Invalid coordinates format for geometry type'
      }
    },
    radius: {
      // Only for Circle type - radius in meters
      type: Number,
      validate: {
        validator: function(v) {
          return this.geometry.type !== 'Circle' || (v && v > 0);
        },
        message: 'Radius is required for Circle type geofences'
      }
    }
  },
  safetyLevel: {
    type: String,
    enum: ['very_safe', 'safe', 'moderate', 'unsafe', 'dangerous'],
    default: 'moderate'
  },
  alertSettings: {
    sendAlertOnEntry: {
      type: Boolean,
      default: true
    },
    sendAlertOnExit: {
      type: Boolean,
      default: false
    },
    alertMessage: {
      entry: String,
      exit: String
    },
    alertSeverity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'warning'
    },
    notifyOfficers: {
      type: Boolean,
      default: false
    }
  },
  activeHours: {
    allDay: {
      type: Boolean,
      default: true
    },
    startTime: String, // Format: "HH:MM"
    endTime: String,   // Format: "HH:MM"
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  restrictions: {
    maxTourists: Number,
    requiredPermission: Boolean,
    accessLevel: {
      type: String,
      enum: ['public', 'restricted', 'authorized_only'],
      default: 'public'
    }
  },
  metadata: {
    city: String,
    state: String,
    country: String,
    landmarks: [String],
    emergencyContacts: [{
      type: {
        type: String,
        enum: ['police', 'medical', 'fire', 'tourist_helpline', 'hospital'],
        required: true
      },
      number: {
        type: String,
        required: true
      },
      description: String
    }]
  },
  statistics: {
    totalEntries: {
      type: Number,
      default: 0
    },
    totalExits: {
      type: Number,
      default: 0
    },
    currentTourists: {
      type: Number,
      default: 0
    },
    lastActivity: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    ref: 'Officer',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for geospatial queries
geofenceSchema.index({ "geometry.coordinates": "2dsphere" });
geofenceSchema.index({ type: 1, safetyLevel: 1 });
geofenceSchema.index({ isActive: 1, 'metadata.city': 1 });

// Pre-save middleware
geofenceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if a point is inside this geofence
geofenceSchema.methods.containsPoint = function(longitude, latitude) {
  if (this.geometry.type === 'Circle') {
    const [centerLng, centerLat] = this.geometry.coordinates;
    const distance = this.calculateDistance(centerLat, centerLng, latitude, longitude);
    return distance <= this.geometry.radius;
  } else if (this.geometry.type === 'Polygon') {
    // Point-in-polygon algorithm
    return this.pointInPolygon([longitude, latitude], this.geometry.coordinates[0]);
  }
  return false;
};

// Helper method to calculate distance between two points
geofenceSchema.methods.calculateDistance = function(lat1, lon1, lat2, lon2) {
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

// Helper method for point-in-polygon check
geofenceSchema.methods.pointInPolygon = function(point, polygon) {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
};

// Method to record tourist entry/exit
geofenceSchema.methods.recordActivity = function(activity) {
  if (activity === 'entry') {
    this.statistics.totalEntries += 1;
    this.statistics.currentTourists += 1;
  } else if (activity === 'exit') {
    this.statistics.totalExits += 1;
    this.statistics.currentTourists = Math.max(0, this.statistics.currentTourists - 1);
  }
  this.statistics.lastActivity = new Date();
};

// Static method to find geofences containing a point
geofenceSchema.statics.findContaining = function(longitude, latitude) {
  // Use MongoDB's geospatial query for better performance
  return this.find({
    isActive: true,
    $or: [
      // For circular geofences
      {
        'geometry.type': 'Circle',
        'geometry.coordinates': {
          $near: {
            $geometry: { type: 'Point', coordinates: [longitude, latitude] },
            $maxDistance: { $exists: true } // Will be checked programmatically
          }
        }
      },
      // For polygon geofences
      {
        'geometry.type': 'Polygon',
        'geometry.coordinates': {
          $geoIntersects: {
            $geometry: { type: 'Point', coordinates: [longitude, latitude] }
          }
        }
      }
    ]
  });
};

// Static method to get geofences by safety level
geofenceSchema.statics.findBySafetyLevel = function(safetyLevel, city = null) {
  const query = { isActive: true, safetyLevel };
  if (city) query['metadata.city'] = city;
  return this.find(query);
};

// Static method to get active geofences in area
geofenceSchema.statics.findInArea = function(centerLat, centerLng, radiusMeters) {
  return this.find({
    isActive: true,
    'geometry.coordinates': {
      $near: {
        $geometry: { type: 'Point', coordinates: [centerLng, centerLat] },
        $maxDistance: radiusMeters
      }
    }
  });
};

module.exports = mongoose.model('Geofence', geofenceSchema);