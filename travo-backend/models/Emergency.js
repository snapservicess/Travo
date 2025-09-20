const mongoose = require('mongoose');
const notificationService = require('../services/notificationService');

const emergencySchema = new mongoose.Schema({
  emergencyId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  touristId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['sos', 'medical', 'police', 'fire', 'general'],
    default: 'sos'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'high'
  },
  status: {
    type: String,
    enum: ['active', 'responded', 'resolved', 'cancelled'],
    default: 'active'
  },
  location: {
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
    country: String
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  contactInfo: {
    phone: String,
    alternateContact: String
  },
  response: {
    responseTime: Date,
    respondedBy: String,
    responseMessage: String,
    estimatedArrivalTime: Date,
    actualArrivalTime: Date
  },
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'audio', 'video', 'document']
    },
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  timeline: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    action: String,
    description: String,
    performedBy: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: Date
});

// Index for efficient queries
emergencySchema.index({ touristId: 1, createdAt: -1 });
emergencySchema.index({ status: 1, createdAt: -1 });
emergencySchema.index({ 'location.coordinates.latitude': 1, 'location.coordinates.longitude': 1 });

// Pre-save middleware to generate emergency ID
emergencySchema.pre('save', function(next) {
  if (!this.emergencyId) {
    const timestamp = Date.now();
    this.emergencyId = `SOS-${timestamp}`;
  }
  next();
});

// Method to add timeline entry
emergencySchema.methods.addTimelineEntry = function(action, description, performedBy) {
  this.timeline.push({
    action,
    description,
    performedBy,
    timestamp: new Date()
  });
};

// Static method to find active emergencies
emergencySchema.statics.findActiveEmergencies = function() {
  return this.find({ status: 'active' }).sort({ createdAt: -1 });
};

// Static method to find user emergencies
emergencySchema.statics.findUserEmergencies = function(touristId) {
  return this.find({ touristId }).sort({ createdAt: -1 });
};

// Post-save middleware to trigger notifications
emergencySchema.post('save', async function(doc) {
  try {
    // Only send notifications for new emergency records
    if (doc.isNew) {
      // Get user details for notification
      await doc.populate('userId', 'name email phone touristId');
      
      const emergencyData = {
        touristId: doc.touristId,
        touristName: doc.userId?.name || 'Unknown Tourist',
        location: doc.location,
        message: doc.message,
        type: doc.type,
        severity: doc.severity,
        createdAt: doc.createdAt,
        email: doc.userId?.email,
        phoneNumber: doc.userId?.phone || doc.contactInfo?.phone
      };

      // Send emergency alert notification
      const notificationResult = await notificationService.sendEmergencyAlert(emergencyData);
      
      // Log notification result
      console.log(`📢 Emergency notification sent for ${doc.emergencyId}:`, notificationResult.summary);
      
      // Add timeline entry for notification
      doc.addTimelineEntry(
        'notification_sent', 
        `Emergency alert sent via ${Object.keys(notificationResult.channels).join(', ')}`,
        'system'
      );
      
      // Save timeline update without triggering notifications again
      await doc.save({ validateBeforeSave: false });
    }
  } catch (error) {
    console.error('Error sending emergency notification:', error.message);
    // Don't throw error to prevent emergency creation failure
  }
});

// Post-update middleware for status changes
emergencySchema.post('findOneAndUpdate', async function(doc) {
  try {
    if (doc && doc.status === 'resolved') {
      await doc.populate('userId', 'name email phone');
      
      const resolveNotificationData = {
        touristId: doc.touristId,
        touristName: doc.userId?.name || 'Unknown Tourist',
        location: doc.location.address,
        message: `Your emergency ${doc.emergencyId} has been resolved. Thank you for using Travo safety services.`,
        timestamp: doc.resolvedAt || new Date(),
        priority: 'normal',
        email: doc.userId?.email,
        phoneNumber: doc.userId?.phone || doc.contactInfo?.phone
      };

      // Send resolution notification
      await notificationService.sendMultiChannelNotification('checkIn', resolveNotificationData, ['email', 'sms']);
      
      console.log(`✅ Emergency resolution notification sent for ${doc.emergencyId}`);
    }
  } catch (error) {
    console.error('Error sending resolution notification:', error.message);
  }
});

module.exports = mongoose.model('Emergency', emergencySchema);