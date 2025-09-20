const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const officerSchema = new mongoose.Schema({
  officerId: {
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
    department: {
      type: String,
      enum: ['tourism', 'police', 'medical', 'admin'],
      required: true
    },
    role: {
      type: String,
      enum: ['officer', 'supervisor', 'admin', 'dispatcher'],
      default: 'officer'
    },
    badgeNumber: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    station: {
      type: String,
      trim: true
    },
    jurisdiction: {
      area: String,
      district: String,
      city: String,
      state: String
    }
  },
  permissions: {
    viewTourists: {
      type: Boolean,
      default: true
    },
    handleEmergencies: {
      type: Boolean,
      default: true
    },
    updateCases: {
      type: Boolean,
      default: true
    },
    viewAnalytics: {
      type: Boolean,
      default: false
    },
    adminAccess: {
      type: Boolean,
      default: false
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
  shift: {
    current: {
      type: String,
      enum: ['day', 'night', 'off-duty'],
      default: 'day'
    },
    schedule: [{
      day: String,
      startTime: String,
      endTime: String
    }]
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
officerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update timestamp
officerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compare password method
officerSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
officerSchema.methods.toJSON = function() {
  const officer = this.toObject();
  delete officer.password;
  delete officer.__v;
  return officer;
};

// Static method to find by officer ID
officerSchema.statics.findByOfficerId = function(officerId) {
  return this.findOne({ officerId: officerId.toUpperCase() });
};

module.exports = mongoose.model('Officer', officerSchema);