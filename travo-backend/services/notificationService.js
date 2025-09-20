const nodemailer = require('nodemailer');
const twilio = require('twilio');

class NotificationService {
  constructor() {
    // Email configuration (using Gmail SMTP)
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER || 'demo@travo.com',
        pass: process.env.EMAIL_PASS || 'demo-password'
      }
    });

    // SMS configuration (Twilio)
    this.twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
      ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      : null;

    this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || '+1234567890';

    // Initialize notification templates
    this.templates = {
      emergency: {
        sms: (data) => `🚨 EMERGENCY ALERT: ${data.touristName} (${data.touristId}) needs help at ${data.location}. Message: ${data.message}`,
        email: {
          subject: (data) => `🚨 Emergency Alert - ${data.touristId}`,
          html: (data) => `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
                <h1>🚨 EMERGENCY ALERT</h1>
              </div>
              <div style="padding: 20px;">
                <h2>Tourist Emergency Reported</h2>
                <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <p><strong>Tourist:</strong> ${data.touristName} (${data.touristId})</p>
                  <p><strong>Location:</strong> ${data.location}</p>
                  <p><strong>Time:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
                  <p><strong>Emergency Type:</strong> ${data.type}</p>
                  <p><strong>Severity:</strong> ${data.severity}</p>
                  <p><strong>Message:</strong> ${data.message}</p>
                </div>
                <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <h3>Emergency Contacts</h3>
                  <p>Police: 100 | Medical: 102 | Fire: 101</p>
                  <p>Tourist Helpline: +91-1363</p>
                </div>
                <p style="color: #666; font-size: 14px;">This is an automated alert from Travo Travel Safety System.</p>
              </div>
            </div>
          `
        }
      },
      checkIn: {
        sms: (data) => `✅ Check-in confirmed: ${data.touristName} arrived at ${data.location}. Stay safe!`,
        email: {
          subject: (data) => `✅ Check-in Confirmation - ${data.location}`,
          html: (data) => `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #059669; color: white; padding: 20px; text-align: center;">
                <h1>✅ Check-in Confirmed</h1>
              </div>
              <div style="padding: 20px;">
                <h2>Welcome to ${data.location}</h2>
                <p>Hello ${data.touristName},</p>
                <p>Your check-in has been successfully recorded:</p>
                <div style="background: #dcfce7; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <p><strong>Location:</strong> ${data.location}</p>
                  <p><strong>Check-in Time:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
                  <p><strong>Tourist ID:</strong> ${data.touristId}</p>
                </div>
                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <h3>🛡️ Safety Tips</h3>
                  <ul>
                    <li>Keep your emergency contacts updated</li>
                    <li>Share your location with trusted contacts</li>
                    <li>Use the SOS button in case of emergency</li>
                    <li>Stay aware of local safety guidelines</li>
                  </ul>
                </div>
                <p>Have a safe and enjoyable trip!</p>
              </div>
            </div>
          `
        }
      },
      weatherAlert: {
        sms: (data) => `🌧️ Weather Alert: ${data.alertType} expected in ${data.location}. ${data.message}`,
        email: {
          subject: (data) => `🌧️ Weather Alert - ${data.location}`,
          html: (data) => `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #f59e0b; color: white; padding: 20px; text-align: center;">
                <h1>🌧️ Weather Alert</h1>
              </div>
              <div style="padding: 20px;">
                <h2>${data.alertType} Warning</h2>
                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <p><strong>Location:</strong> ${data.location}</p>
                  <p><strong>Alert Type:</strong> ${data.alertType}</p>
                  <p><strong>Valid Until:</strong> ${new Date(data.validUntil).toLocaleString()}</p>
                  <p><strong>Details:</strong> ${data.message}</p>
                </div>
                <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <h3>🛡️ Safety Recommendations</h3>
                  <ul>
                    ${data.recommendations?.map(rec => `<li>${rec}</li>`).join('') || '<li>Stay indoors and follow local authorities</li>'}
                  </ul>
                </div>
                <p>Stay safe and monitor weather updates.</p>
              </div>
            </div>
          `
        }
      },
      safetyUpdate: {
        sms: (data) => `🛡️ Safety Update: ${data.location} safety score is ${data.score}/100. ${data.level} risk level.`,
        email: {
          subject: (data) => `🛡️ Safety Score Update - ${data.location}`,
          html: (data) => `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #3b82f6; color: white; padding: 20px; text-align: center;">
                <h1>🛡️ Safety Score Update</h1>
              </div>
              <div style="padding: 20px;">
                <h2>${data.location} Safety Report</h2>
                <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <p><strong>Overall Safety Score:</strong> ${data.score}/100</p>
                  <p><strong>Risk Level:</strong> ${data.level}</p>
                  <p><strong>Last Updated:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
                </div>
                ${data.recommendations ? `
                <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <h3>📋 Recommendations</h3>
                  <ul>
                    ${data.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                  </ul>
                </div>
                ` : ''}
                <p>Stay informed and travel safely!</p>
              </div>
            </div>
          `
        }
      }
    };
  }

  // Send SMS notification
  async sendSMS(phoneNumber, message, priority = 'normal') {
    try {
      if (!this.twilioClient) {
        console.log(`📱 SMS (Demo): ${phoneNumber} - ${message}`);
        return {
          success: true,
          messageId: `demo-sms-${Date.now()}`,
          provider: 'demo',
          cost: 0
        };
      }

      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.twilioPhoneNumber,
        to: phoneNumber
      });

      console.log(`📱 SMS sent: ${result.sid}`);
      return {
        success: true,
        messageId: result.sid,
        provider: 'twilio',
        status: result.status
      };

    } catch (error) {
      console.error('SMS Error:', error.message);
      return {
        success: false,
        error: error.message,
        provider: this.twilioClient ? 'twilio' : 'demo'
      };
    }
  }

  // Send email notification
  async sendEmail(to, subject, html, priority = 'normal') {
    try {
      // For demo mode without real email credentials
      if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'demo@travo.com') {
        console.log(`📧 Email (Demo): ${to} - ${subject}`);
        return {
          success: true,
          messageId: `demo-email-${Date.now()}`,
          provider: 'demo'
        };
      }

      const mailOptions = {
        from: `"Travo Safety Alert" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        priority: priority === 'high' ? 'high' : 'normal'
      };

      const result = await this.emailTransporter.sendMail(mailOptions);

      console.log(`📧 Email sent: ${result.messageId}`);
      return {
        success: true,
        messageId: result.messageId,
        provider: 'nodemailer'
      };

    } catch (error) {
      console.error('Email Error:', error.message);
      return {
        success: false,
        error: error.message,
        provider: 'nodemailer'
      };
    }
  }

  // Send push notification (placeholder for mobile app integration)
  async sendPushNotification(deviceToken, title, body, data = {}) {
    try {
      // This is a placeholder - in production, integrate with FCM/APNS
      console.log(`🔔 Push Notification (Demo): ${title} - ${body}`);
      
      return {
        success: true,
        messageId: `demo-push-${Date.now()}`,
        provider: 'demo'
      };

    } catch (error) {
      console.error('Push Notification Error:', error.message);
      return {
        success: false,
        error: error.message,
        provider: 'demo'
      };
    }
  }

  // Multi-channel notification (email + sms + push)
  async sendMultiChannelNotification(type, data, channels = ['email', 'sms']) {
    const template = this.templates[type];
    if (!template) {
      throw new Error(`Unknown notification type: ${type}`);
    }

    const results = {
      type,
      timestamp: new Date(),
      channels: {},
      summary: { sent: 0, failed: 0 }
    };

    // Send SMS
    if (channels.includes('sms') && data.phoneNumber) {
      const smsMessage = template.sms(data);
      const smsResult = await this.sendSMS(data.phoneNumber, smsMessage, data.priority);
      results.channels.sms = smsResult;
      smsResult.success ? results.summary.sent++ : results.summary.failed++;
    }

    // Send Email
    if (channels.includes('email') && data.email) {
      const emailTemplate = template.email;
      const subject = emailTemplate.subject(data);
      const html = emailTemplate.html(data);
      const emailResult = await this.sendEmail(data.email, subject, html, data.priority);
      results.channels.email = emailResult;
      emailResult.success ? results.summary.sent++ : results.summary.failed++;
    }

    // Send Push Notification
    if (channels.includes('push') && data.deviceToken) {
      const pushTitle = `Travo Alert: ${type}`;
      const pushBody = template.sms(data).substring(0, 100) + '...';
      const pushResult = await this.sendPushNotification(data.deviceToken, pushTitle, pushBody, data);
      results.channels.push = pushResult;
      pushResult.success ? results.summary.sent++ : results.summary.failed++;
    }

    return results;
  }

  // Emergency notification (high priority, all channels)
  async sendEmergencyAlert(emergencyData) {
    const notificationData = {
      touristId: emergencyData.touristId,
      touristName: emergencyData.touristName || 'Unknown Tourist',
      location: emergencyData.location.address,
      message: emergencyData.message,
      type: emergencyData.type,
      severity: emergencyData.severity,
      timestamp: emergencyData.createdAt || new Date(),
      priority: 'high',
      email: emergencyData.email,
      phoneNumber: emergencyData.phoneNumber
    };

    return await this.sendMultiChannelNotification('emergency', notificationData, ['email', 'sms', 'push']);
  }

  // Safety update notification
  async sendSafetyUpdate(safetyData) {
    const notificationData = {
      location: safetyData.location,
      score: safetyData.score,
      level: safetyData.level,
      recommendations: safetyData.recommendations,
      timestamp: new Date(),
      priority: 'normal',
      email: safetyData.email,
      phoneNumber: safetyData.phoneNumber
    };

    return await this.sendMultiChannelNotification('safetyUpdate', notificationData, ['email']);
  }

  // Weather alert notification
  async sendWeatherAlert(weatherData) {
    const notificationData = {
      location: weatherData.location,
      alertType: weatherData.alertType,
      message: weatherData.message,
      validUntil: weatherData.validUntil,
      recommendations: weatherData.recommendations,
      priority: weatherData.severity === 'critical' ? 'high' : 'normal',
      email: weatherData.email,
      phoneNumber: weatherData.phoneNumber
    };

    return await this.sendMultiChannelNotification('weatherAlert', notificationData, ['email', 'sms']);
  }

  // Check-in confirmation
  async sendCheckInConfirmation(checkInData) {
    const notificationData = {
      touristId: checkInData.touristId,
      touristName: checkInData.touristName,
      location: checkInData.location,
      timestamp: checkInData.timestamp || new Date(),
      priority: 'normal',
      email: checkInData.email,
      phoneNumber: checkInData.phoneNumber
    };

    return await this.sendMultiChannelNotification('checkIn', notificationData, ['email', 'sms']);
  }

  // Bulk notification for multiple users
  async sendBulkNotification(type, users, commonData) {
    const results = [];
    
    for (const user of users) {
      try {
        const userData = { ...commonData, ...user };
        const result = await this.sendMultiChannelNotification(type, userData);
        results.push({ userId: user.id || user.touristId, ...result });
      } catch (error) {
        results.push({
          userId: user.id || user.touristId,
          success: false,
          error: error.message
        });
      }
    }

    return {
      type,
      totalUsers: users.length,
      results,
      summary: {
        successful: results.filter(r => r.summary?.sent > 0).length,
        failed: results.filter(r => r.summary?.sent === 0).length
      }
    };
  }
}

// Create singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;