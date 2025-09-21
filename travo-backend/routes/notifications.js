const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { Expo } = require('expo-server-sdk');
const nodemailer = require('nodemailer');
const axios = require('axios');

// Initialize Expo SDK
let expo = new Expo();

// Store for push tokens (in production, use Redis or database)
const pushTokenStore = new Map();

// Initialize Email Service
const emailTransporter = nodemailer.createTransport({
  service: 'gmail', // Use your preferred email service
  auth: {
    user: process.env.EMAIL_USER || 'travo@example.com',
    pass: process.env.EMAIL_PASS || 'app-password'
  }
});

// SMS Service Configuration (using Twilio or similar)
const SMS_CONFIG = {
  provider: process.env.SMS_PROVIDER || 'twilio',
  apiUrl: process.env.SMS_API_URL || 'https://api.twilio.com/2010-04-01/Accounts',
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  fromNumber: process.env.TWILIO_PHONE_NUMBER
};

// Notification History Store (in production, use database)
const notificationHistory = new Map();

/**
 * Register a push notification token for a user
 */
router.post('/register-token', async (req, res) => {
  try {
    const { pushToken, platform, preferences } = req.body;
    const userId = req.user?.id;

    if (!pushToken || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Push token and user ID are required'
      });
    }

    // Validate push token format
    if (!Expo.isExpoPushToken(pushToken)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid push token format'
      });
    }

    // Store token with user info
    pushTokenStore.set(userId, {
      token: pushToken,
      platform,
      preferences: preferences || {},
      registeredAt: new Date(),
      active: true
    });

    // Update user model with notification preferences
    await User.findByIdAndUpdate(userId, {
      $set: {
        pushToken,
        platform,
        notificationPreferences: preferences,
        lastTokenUpdate: new Date()
      }
    });

    console.log(`📱 Push token registered for user ${userId}: ${pushToken}`);

    res.json({
      success: true,
      message: 'Push token registered successfully'
    });

  } catch (error) {
    console.error('Error registering push token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register push token',
      error: error.message
    });
  }
});

/**
 * Send push notification to specific users or all users
 */
router.post('/send', async (req, res) => {
  try {
    const { notification, targetUsers } = req.body;
    const senderId = req.user?.id;

    if (!notification || !notification.title || !notification.body) {
      return res.status(400).json({
        success: false,
        message: 'Notification title and body are required'
      });
    }

    let recipients = [];

    if (targetUsers && targetUsers.length > 0) {
      // Send to specific users
      for (const userId of targetUsers) {
        const tokenData = pushTokenStore.get(userId);
        if (tokenData && tokenData.active) {
          recipients.push({
            userId,
            token: tokenData.token,
            preferences: tokenData.preferences
          });
        }
      }
    } else {
      // Send to all users (broadcast)
      for (const [userId, tokenData] of pushTokenStore.entries()) {
        if (tokenData.active) {
          recipients.push({
            userId,
            token: tokenData.token,
            preferences: tokenData.preferences
          });
        }
      }
    }

    if (recipients.length === 0) {
      return res.json({
        success: true,
        message: 'No active recipients found',
        sentCount: 0
      });
    }

    // Filter recipients based on their notification preferences
    const filteredRecipients = recipients.filter(recipient => {
      const prefs = recipient.preferences || {};
      
      switch (notification.type) {
        case 'emergency':
          return prefs.emergencyAlerts !== false;
        case 'safety_alert':
          return prefs.safetyAlerts !== false;
        case 'geofence':
          return prefs.geofenceAlerts !== false;
        case 'system':
          return prefs.systemNotifications !== false;
        case 'recommendation':
          return prefs.recommendations !== false;
        default:
          return true;
      }
    });

    // Prepare Expo push messages
    const messages = filteredRecipients.map(recipient => ({
      to: recipient.token,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      sound: notification.severity === 'critical' ? 'default' : undefined,
      priority: notification.severity === 'critical' ? 'high' : 'default',
      channelId: getChannelForType(notification.type)
    }));

    // Send notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);
    const results = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        results.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending notification chunk:', error);
      }
    }

    // Log notification in database for history
    await logNotification({
      senderId,
      type: notification.type,
      severity: notification.severity,
      title: notification.title,
      body: notification.body,
      recipients: filteredRecipients.map(r => r.userId),
      results,
      timestamp: new Date()
    });

    console.log(`📨 Push notifications sent: ${results.length} messages`);

    res.json({
      success: true,
      message: 'Push notifications sent successfully',
      sentCount: results.length,
      results: results.slice(0, 10) // Return first 10 results for debugging
    });

  } catch (error) {
    console.error('Error sending push notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send push notifications',
      error: error.message
    });
  }
});

/**
 * Send emergency alert to all users in proximity
 */
router.post('/emergency-alert', async (req, res) => {
  try {
    const { emergencyId, location, radius = 5000, message } = req.body; // radius in meters
    const userId = req.user?.id;

    if (!emergencyId || !location) {
      return res.status(400).json({
        success: false,
        message: 'Emergency ID and location are required'
      });
    }

    // Find users within radius (simplified - in production use geospatial queries)
    const nearbyUsers = await findUsersInProximity(location, radius);

    const notification = {
      type: 'emergency',
      severity: 'critical',
      title: '🚨 EMERGENCY ALERT NEARBY',
      body: message || 'An emergency has been reported in your area. Please stay alert and follow safety guidelines.',
      data: {
        emergencyId,
        coordinates: location,
        actionUrl: `/emergency/${emergencyId}`
      }
    };

    // Send notifications to nearby users
    const sendResult = await sendPushNotificationsToUsers(nearbyUsers, notification);

    console.log(`🚨 Emergency alert sent to ${sendResult.sentCount} nearby users`);

    res.json({
      success: true,
      message: 'Emergency alert sent to nearby users',
      emergencyId,
      nearbyUsers: nearbyUsers.length,
      sentCount: sendResult.sentCount
    });

  } catch (error) {
    console.error('Error sending emergency alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send emergency alert',
      error: error.message
    });
  }
});

/**
 * Send geofence notification
 */
router.post('/geofence-alert', async (req, res) => {
  try {
    const { userId, geofenceId, geofenceName, eventType, safetyLevel, coordinates } = req.body;

    if (!userId || !geofenceId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and geofence ID are required'
      });
    }

    const isEntry = eventType === 'entry';
    const severity = safetyLevel === 'danger' ? 'high' : safetyLevel === 'warning' ? 'medium' : 'low';

    const notification = {
      type: 'geofence',
      severity,
      title: `📍 ${isEntry ? 'Entered' : 'Exited'} ${geofenceName}`,
      body: `You have ${isEntry ? 'entered' : 'left'} a ${safetyLevel} safety zone: ${geofenceName}`,
      data: {
        geofenceId,
        coordinates,
        actionUrl: '/location/geofences'
      }
    };

    const result = await sendPushNotificationToUser(userId, notification);

    res.json({
      success: true,
      message: 'Geofence notification sent',
      sent: result.success
    });

  } catch (error) {
    console.error('Error sending geofence alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send geofence alert',
      error: error.message
    });
  }
});

/**
 * Get notification history for user
 */
router.get('/history', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { limit = 50, offset = 0, type } = req.query;

    // In a real application, fetch from database
    // For now, return mock data
    const notifications = [
      {
        id: '1',
        type: 'safety_alert',
        severity: 'medium',
        title: 'Weather Alert',
        body: 'Heavy rain expected in your area',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        read: true
      },
      {
        id: '2',
        type: 'geofence',
        severity: 'low',
        title: 'Entered Tourist Zone',
        body: 'Welcome to Times Square - High foot traffic area',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        read: false
      }
    ];

    const filteredNotifications = type 
      ? notifications.filter(n => n.type === type)
      : notifications;

    const paginatedNotifications = filteredNotifications
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      success: true,
      notifications: paginatedNotifications,
      total: filteredNotifications.length,
      hasMore: (parseInt(offset) + parseInt(limit)) < filteredNotifications.length
    });

  } catch (error) {
    console.error('Error fetching notification history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification history',
      error: error.message
    });
  }
});

/**
 * Update notification preferences
 */
router.put('/preferences', async (req, res) => {
  try {
    const userId = req.user?.id;
    const preferences = req.body;

    // Update user preferences in database
    await User.findByIdAndUpdate(userId, {
      $set: {
        notificationPreferences: preferences,
        updatedAt: new Date()
      }
    });

    // Update in memory store
    const tokenData = pushTokenStore.get(userId);
    if (tokenData) {
      tokenData.preferences = preferences;
    }

    console.log(`🔧 Notification preferences updated for user ${userId}`);

    res.json({
      success: true,
      message: 'Notification preferences updated',
      preferences
    });

  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences',
      error: error.message
    });
  }
});

/**
 * Send multi-channel notification (Push + Email + SMS)
 */
router.post('/send-multi-channel', async (req, res) => {
  try {
    const { notification, targetUsers, channels = ['push', 'email', 'sms'], emergency = false } = req.body;
    const senderId = req.user?.id;

    if (!notification || !notification.title || !notification.body) {
      return res.status(400).json({
        success: false,
        message: 'Notification title and body are required'
      });
    }

    if (!targetUsers || targetUsers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Target users are required'
      });
    }

    const results = {
      totalUsers: targetUsers.length,
      successful: 0,
      failed: 0,
      channels: {
        push: { sent: 0, failed: 0, results: [] },
        email: { sent: 0, failed: 0, results: [] },
        sms: { sent: 0, failed: 0, results: [] }
      }
    };

    // Process each user and send via selected channels
    for (const user of targetUsers) {
      const userResults = { userId: user.id || user.userId, channels: {} };

      // Send push notification
      if (channels.includes('push')) {
        const pushResult = await sendPushNotificationToUser(user.id || user.userId, notification);
        userResults.channels.push = pushResult;
        if (pushResult.success) {
          results.channels.push.sent++;
        } else {
          results.channels.push.failed++;
        }
        results.channels.push.results.push(pushResult);
      }

      // Send email notification
      if (channels.includes('email') && user.email) {
        const emailResult = await sendEmailNotification(user.email, notification, user.name);
        userResults.channels.email = emailResult;
        if (emailResult.success) {
          results.channels.email.sent++;
        } else {
          results.channels.email.failed++;
        }
        results.channels.email.results.push(emailResult);
      }

      // Send SMS notification
      if (channels.includes('sms') && user.phone) {
        const smsResult = await sendSMSNotification(user.phone, notification, emergency);
        userResults.channels.sms = smsResult;
        if (smsResult.success) {
          results.channels.sms.sent++;
        } else {
          results.channels.sms.failed++;
        }
        results.channels.sms.results.push(smsResult);
      }

      // Count overall success (if any channel succeeded)
      const anySuccess = Object.values(userResults.channels).some(result => result.success);
      if (anySuccess) {
        results.successful++;
      } else {
        results.failed++;
      }

      // Store in notification history
      storeNotificationHistory(user.id || user.userId, {
        ...notification,
        channels: userResults.channels,
        timestamp: new Date(),
        senderId
      });
    }

    console.log(`📨 Multi-channel notifications sent: ${results.successful}/${results.totalUsers} users`);

    res.json({
      success: true,
      message: 'Multi-channel notifications processed',
      results
    });

  } catch (error) {
    console.error('Multi-channel notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send multi-channel notifications',
      error: error.message
    });
  }
});

/**
 * Send emergency contact alerts
 */
router.post('/emergency-contacts', async (req, res) => {
  try {
    const { userId, emergencyId, location, message, severity } = req.body;

    if (!userId || !emergencyId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and emergency ID are required'
      });
    }

    // Get user and their emergency contacts
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const emergencyContacts = user.profile?.emergencyContacts || [];
    
    if (emergencyContacts.length === 0) {
      return res.json({
        success: true,
        message: 'No emergency contacts configured',
        contactsNotified: 0
      });
    }

    const notification = {
      type: 'emergency_contact',
      severity: 'critical',
      title: `🚨 EMERGENCY: ${user.profile.name}`,
      body: message || `${user.profile.name} has activated an emergency alert and may need assistance.`,
      data: {
        emergencyId,
        touristName: user.profile.name,
        location: location || 'Location not available',
        emergencyPhone: '911',
        timestamp: new Date().toISOString()
      }
    };

    const results = [];

    // Notify each emergency contact via multiple channels
    for (const contact of emergencyContacts) {
      const contactResult = {
        name: contact.name,
        relationship: contact.relationship,
        phone: contact.phone,
        email: contact.email,
        notifications: {}
      };

      // Send SMS to emergency contact
      if (contact.phone) {
        const smsMessage = {
          title: notification.title,
          body: `EMERGENCY ALERT: Your contact ${user.profile.name} has requested emergency assistance. Location: ${location || 'Unknown'}. Please contact local authorities at 911 or check on their safety immediately.`,
          data: notification.data
        };
        
        contactResult.notifications.sms = await sendSMSNotification(contact.phone, smsMessage, true);
      }

      // Send email to emergency contact
      if (contact.email) {
        const emailMessage = {
          ...notification,
          body: `
            <h2 style="color: #d32f2f;">🚨 EMERGENCY ALERT</h2>
            <p><strong>${user.profile.name}</strong> has activated an emergency alert and may need immediate assistance.</p>
            
            <div style="background: #fff3e0; padding: 15px; border-left: 4px solid #ff9800; margin: 15px 0;">
              <h3>Emergency Details:</h3>
              <p><strong>Tourist:</strong> ${user.profile.name}</p>
              <p><strong>Location:</strong> ${location || 'Location not available'}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Emergency ID:</strong> ${emergencyId}</p>
            </div>

            <div style="background: #ffebee; padding: 15px; border-left: 4px solid #f44336; margin: 15px 0;">
              <h3>Immediate Actions:</h3>
              <ul>
                <li>Try to contact ${user.profile.name} immediately</li>
                <li>If no response, contact local emergency services: <strong>911</strong></li>
                <li>Contact the nearest police station in their travel area</li>
                <li>Monitor this situation until resolved</li>
              </ul>
            </div>

            <p style="font-size: 12px; color: #666;">
              This is an automated emergency alert from Travo Tourist Safety System.
              Emergency ID: ${emergencyId} | Time: ${new Date().toISOString()}
            </p>
          `
        };
        
        contactResult.notifications.email = await sendEmailNotification(contact.email, emailMessage, contact.name);
      }

      results.push(contactResult);
    }

    const totalNotified = results.reduce((sum, contact) => {
      return sum + (contact.notifications.sms?.success ? 1 : 0) + (contact.notifications.email?.success ? 1 : 0);
    }, 0);

    console.log(`🆘 Emergency contact alerts sent: ${totalNotified} notifications to ${emergencyContacts.length} contacts`);

    res.json({
      success: true,
      message: 'Emergency contact alerts sent',
      emergencyId,
      contactsNotified: totalNotified,
      totalContacts: emergencyContacts.length,
      results
    });

  } catch (error) {
    console.error('Emergency contact alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send emergency contact alerts',
      error: error.message
    });
  }
});

/**
 * Get comprehensive notification history
 */
router.get('/history/detailed', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { limit = 50, offset = 0, type, channel, days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get notifications from history store
    const userHistory = notificationHistory.get(userId) || [];
    
    let filteredHistory = userHistory.filter(notification => {
      const notificationDate = new Date(notification.timestamp);
      if (notificationDate < startDate) return false;
      if (type && notification.type !== type) return false;
      if (channel && !notification.channels[channel]) return false;
      return true;
    });

    // Sort by timestamp (newest first)
    filteredHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply pagination
    const paginatedHistory = filteredHistory.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    // Calculate statistics
    const stats = {
      total: filteredHistory.length,
      byType: {},
      byChannel: {},
      successRate: {
        overall: 0,
        byChannel: {}
      }
    };

    filteredHistory.forEach(notification => {
      // Count by type
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;

      // Count by channel and calculate success rates
      Object.keys(notification.channels).forEach(channel => {
        stats.byChannel[channel] = (stats.byChannel[channel] || 0) + 1;
        
        if (!stats.successRate.byChannel[channel]) {
          stats.successRate.byChannel[channel] = { sent: 0, successful: 0 };
        }
        
        stats.successRate.byChannel[channel].sent++;
        if (notification.channels[channel].success) {
          stats.successRate.byChannel[channel].successful++;
        }
      });
    });

    // Calculate overall success rate
    const totalSent = Object.values(stats.successRate.byChannel).reduce((sum, channel) => sum + channel.sent, 0);
    const totalSuccessful = Object.values(stats.successRate.byChannel).reduce((sum, channel) => sum + channel.successful, 0);
    stats.successRate.overall = totalSent > 0 ? (totalSuccessful / totalSent * 100).toFixed(2) : 0;

    // Calculate channel success rates
    Object.keys(stats.successRate.byChannel).forEach(channel => {
      const channelStats = stats.successRate.byChannel[channel];
      channelStats.rate = channelStats.sent > 0 ? (channelStats.successful / channelStats.sent * 100).toFixed(2) : 0;
    });

    res.json({
      success: true,
      notifications: paginatedHistory,
      pagination: {
        total: filteredHistory.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < filteredHistory.length
      },
      statistics: stats,
      filters: { type, channel, days }
    });

  } catch (error) {
    console.error('Detailed notification history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch detailed notification history',
      error: error.message
    });
  }
});

/**
 * Test multi-channel system
 */
router.post('/test-channels', async (req, res) => {
  try {
    const { email, phone, channels = ['push', 'email', 'sms'] } = req.body;
    const userId = req.user?.id || 'test-user';

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Either email or phone number is required for testing'
      });
    }

    const testNotification = {
      type: 'system',
      severity: 'low',
      title: '🧪 Travo Multi-Channel Test',
      body: 'This is a test notification to verify all communication channels are working properly.',
      data: {
        testId: `test-${Date.now()}`,
        timestamp: new Date().toISOString()
      }
    };

    const testUser = {
      id: userId,
      email,
      phone,
      name: 'Test User'
    };

    const results = {};

    // Test push notification
    if (channels.includes('push')) {
      results.push = await sendPushNotificationToUser(userId, testNotification);
    }

    // Test email
    if (channels.includes('email') && email) {
      results.email = await sendEmailNotification(email, testNotification, 'Test User');
    }

    // Test SMS
    if (channels.includes('sms') && phone) {
      results.sms = await sendSMSNotification(phone, testNotification, false);
    }

    const successfulChannels = Object.keys(results).filter(channel => results[channel].success);
    const failedChannels = Object.keys(results).filter(channel => !results[channel].success);

    res.json({
      success: true,
      message: `Multi-channel test completed: ${successfulChannels.length}/${Object.keys(results).length} channels successful`,
      results,
      summary: {
        successful: successfulChannels,
        failed: failedChannels,
        totalTested: Object.keys(results).length
      }
    });

  } catch (error) {
    console.error('Channel test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test communication channels',
      error: error.message
    });
  }
});

// Helper Functions

function getChannelForType(type) {
  switch (type) {
    case 'emergency':
      return 'emergency';
    case 'safety_alert':
      return 'safety';
    case 'geofence':
      return 'geofence';
    default:
      return 'system';
  }
}

async function sendPushNotificationToUser(userId, notification) {
  const tokenData = pushTokenStore.get(userId);
  if (!tokenData || !tokenData.active) {
    return { success: false, error: 'No active token for user' };
  }

  const message = {
    to: tokenData.token,
    title: notification.title,
    body: notification.body,
    data: notification.data || {},
    sound: notification.severity === 'critical' ? 'default' : undefined,
    priority: notification.severity === 'critical' ? 'high' : 'default'
  };

  try {
    const tickets = await expo.sendPushNotificationsAsync([message]);
    return { success: true, ticket: tickets[0] };
  } catch (error) {
    console.error('Error sending push notification to user:', error);
    return { success: false, error: error.message };
  }
}

async function sendPushNotificationsToUsers(userIds, notification) {
  const messages = [];
  
  for (const userId of userIds) {
    const tokenData = pushTokenStore.get(userId);
    if (tokenData && tokenData.active) {
      messages.push({
        to: tokenData.token,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        sound: notification.severity === 'critical' ? 'default' : undefined,
        priority: notification.severity === 'critical' ? 'high' : 'default'
      });
    }
  }

  if (messages.length === 0) {
    return { success: true, sentCount: 0 };
  }

  try {
    const chunks = expo.chunkPushNotifications(messages);
    let totalSent = 0;

    for (const chunk of chunks) {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      totalSent += tickets.length;
    }

    return { success: true, sentCount: totalSent };
  } catch (error) {
    console.error('Error sending push notifications to users:', error);
    return { success: false, error: error.message };
  }
}

async function findUsersInProximity(location, radius) {
  // Simplified proximity search
  // In production, use proper geospatial queries with MongoDB or PostGIS
  const allUsers = Array.from(pushTokenStore.keys());
  return allUsers.slice(0, Math.min(10, allUsers.length)); // Return up to 10 users for demo
}

async function sendEmailNotification(email, notification, recipientName = 'Tourist') {
  try {
    const isHTML = notification.body.includes('<');
    
    const emailContent = {
      from: process.env.EMAIL_USER || 'travo@example.com',
      to: email,
      subject: notification.title,
      [isHTML ? 'html' : 'text']: isHTML ? notification.body : `
        Dear ${recipientName},

        ${notification.body}

        ${notification.data ? `
        Additional Information:
        ${Object.entries(notification.data).map(([key, value]) => `• ${key}: ${value}`).join('\n')}
        ` : ''}

        Best regards,
        Travo Tourist Safety System

        ---
        This is an automated message. Please do not reply to this email.
        Sent at: ${new Date().toLocaleString()}
      `
    };

    // In development, simulate email sending
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 Email simulated:', {
        to: email,
        subject: notification.title,
        type: notification.type
      });
      
      return {
        success: true,
        messageId: `sim-${Date.now()}`,
        provider: 'simulated',
        timestamp: new Date()
      };
    }

    // In production, use real email service
    const result = await emailTransporter.sendMail(emailContent);
    
    return {
      success: true,
      messageId: result.messageId,
      provider: 'nodemailer',
      timestamp: new Date()
    };

  } catch (error) {
    console.error('Email sending error:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

async function sendSMSNotification(phone, notification, isEmergency = false) {
  try {
    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Create SMS message
    let smsBody = notification.body;
    if (isEmergency) {
      smsBody = `🚨 EMERGENCY: ${smsBody}`;
    }
    
    // Truncate to SMS length limits
    if (smsBody.length > 160) {
      smsBody = smsBody.substring(0, 157) + '...';
    }

    // In development, simulate SMS sending
    if (process.env.NODE_ENV !== 'production' || !SMS_CONFIG.accountSid) {
      console.log('📱 SMS simulated:', {
        to: phone,
        message: smsBody,
        emergency: isEmergency
      });
      
      return {
        success: true,
        messageId: `sms-sim-${Date.now()}`,
        provider: 'simulated',
        timestamp: new Date()
      };
    }

    // In production, use real SMS service (Twilio)
    const smsData = {
      From: SMS_CONFIG.fromNumber,
      To: phone,
      Body: smsBody
    };

    const response = await axios.post(
      `${SMS_CONFIG.apiUrl}/${SMS_CONFIG.accountSid}/Messages.json`,
      new URLSearchParams(smsData),
      {
        auth: {
          username: SMS_CONFIG.accountSid,
          password: SMS_CONFIG.authToken
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return {
      success: true,
      messageId: response.data.sid,
      provider: 'twilio',
      timestamp: new Date()
    };

  } catch (error) {
    console.error('SMS sending error:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

function storeNotificationHistory(userId, notificationData) {
  if (!notificationHistory.has(userId)) {
    notificationHistory.set(userId, []);
  }
  
  const userHistory = notificationHistory.get(userId);
  userHistory.unshift(notificationData); // Add to beginning (newest first)
  
  // Keep only last 1000 notifications per user
  if (userHistory.length > 1000) {
    userHistory.splice(1000);
  }
  
  console.log('📝 Notification stored in history:', {
    userId,
    type: notificationData.type,
    channels: Object.keys(notificationData.channels),
    timestamp: notificationData.timestamp
  });
}

async function logNotification(notificationData) {
  // In production, save to database
  console.log('📝 Notification logged:', {
    type: notificationData.type,
    recipients: notificationData.recipients.length,
    timestamp: notificationData.timestamp
  });
}

module.exports = router;