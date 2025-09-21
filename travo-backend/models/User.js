const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  touristId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profile: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    nationality: {
      type: String,
      trim: true
    },
    passportNumber: {
      type: String,
      trim: true
    },
    emergencyContact: {
      type: String,
      trim: true
    },
    profilePicture: {
      type: String, // URL to uploaded image
      default: null
    },
    dateOfBirth: {
      type: Date
    },
    address: {
      street: String,
      city: String,
      country: String,
      zipCode: String
    }
  },
  preferences: {
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      emergencyAlerts: {
        type: Boolean,
        default: true
      },
      safetyAlerts: {
        type: Boolean,
        default: true
      },
      geofenceAlerts: {
        type: Boolean,
        default: true
      }
    },
    emergencyContacts: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      phone: {
        type: String,
        required: true,
        trim: true
      },
      email: {
        type: String,
        trim: true,
        lowercase: true
      },
      relationship: {
        type: String,
        required: true,
        enum: ['family', 'friend', 'colleague', 'partner', 'parent', 'sibling', 'other']
      },
      isPrimary: {
        type: Boolean,
        default: false
      },
      isActive: {
        type: Boolean,
        default: true
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  // Push notification settings
  pushToken: {
    type: String,
    default: null
  },
  platform: {
    type: String,
    enum: ['ios', 'android', 'web'],
    default: null
  },
  notificationPreferences: {
    emergencyAlerts: {
      type: Boolean,
      default: true
    },
    safetyAlerts: {
      type: Boolean,
      default: true
    },
    geofenceAlerts: {
      type: Boolean,
      default: true
    },
    systemNotifications: {
      type: Boolean,
      default: true
    },
    recommendations: {
      type: Boolean,
      default: true
    },
    quietHours: {
      enabled: {
        type: Boolean,
        default: false
      },
      startTime: {
        type: String,
        default: '22:00'
      },
      endTime: {
        type: String,
        default: '07:00'
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
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

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(8); // Reduced from 12 to 8 for faster login
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

// Static method to find by tourist ID
userSchema.statics.findByTouristId = function(touristId) {
  return this.findOne({ touristId: touristId.toUpperCase() });
};

module.exports = mongoose.model('User', userSchema);