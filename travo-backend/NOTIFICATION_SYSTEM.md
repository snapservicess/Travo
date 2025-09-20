# Travo Notification System Documentation

## Overview

The Travo notification system provides multi-channel communication capabilities for the travel safety platform, supporting email, SMS, and push notifications for emergency alerts, safety updates, weather warnings, and check-in confirmations.

## Features

### 📧 Multi-Channel Notifications
- **Email**: Rich HTML templates with responsive design
- **SMS**: Concise text messages via Twilio
- **Push Notifications**: Mobile app integration (planned)

### 🚨 Emergency Alerts
- Automatic notifications when SOS button is pressed
- Real-time alerts to emergency services and contacts
- Timeline tracking for emergency response

### 🌤️ Weather & Safety Alerts
- Location-based weather warnings
- Safety score updates for tourist areas
- Bulk notifications to affected tourists

### 🎯 Targeted Messaging
- Location-based targeting
- User group segmentation
- Bulk notification capabilities

## API Endpoints

### Send Notification
```http
POST /api/notifications/send
Authorization: Bearer <officer/admin-token>
Content-Type: application/json

{
  "type": "emergency|checkIn|weatherAlert|safetyUpdate",
  "recipients": [
    {
      "touristId": "T12345",
      "email": "user@example.com",
      "phoneNumber": "+1234567890",
      "touristName": "John Doe"
    }
  ],
  "data": {
    "location": "Times Square, NY",
    "message": "Emergency alert message",
    "severity": "high"
  },
  "channels": ["email", "sms", "push"]
}
```

### Weather Alert
```http
POST /api/notifications/weather-alert
Authorization: Bearer <officer/admin-token>
Content-Type: application/json

{
  "alertType": "Heavy Rain Warning",
  "location": "New York City",
  "message": "Heavy rainfall expected for the next 6 hours. Take necessary precautions.",
  "validUntil": "2024-12-19T18:00:00Z",
  "severity": "medium",
  "recommendations": [
    "Avoid outdoor activities",
    "Stay in covered areas",
    "Monitor weather updates"
  ]
}
```

### Safety Update
```http
POST /api/notifications/safety-update
Authorization: Bearer <officer/admin-token>
Content-Type: application/json

{
  "location": "Central Park Area",
  "score": 8.5,
  "level": "Safe",
  "recommendations": [
    "Stay in well-lit paths",
    "Travel in groups after sunset",
    "Keep emergency contacts updated"
  ]
}
```

### Test Notification
```http
POST /api/notifications/test
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "email": "test@example.com",
  "phone": "+1234567890",
  "type": "checkIn"
}
```

### Get Emergency Notifications
```http
GET /api/notifications/emergencies?limit=20&status=active
Authorization: Bearer <officer/admin-token>
```

## Notification Templates

### Emergency Alert Template
- **Subject**: 🚨 Emergency Alert - [Tourist ID]
- **Includes**: Tourist details, location, emergency type, severity, contact information
- **Priority**: High (immediate delivery)

### Check-in Confirmation Template
- **Subject**: ✅ Check-in Confirmation - [Location]
- **Includes**: Welcome message, safety tips, emergency contacts
- **Priority**: Normal

### Weather Alert Template
- **Subject**: 🌧️ Weather Alert - [Location]
- **Includes**: Alert type, duration, safety recommendations
- **Priority**: Medium to High (based on severity)

### Safety Update Template
- **Subject**: 🛡️ Safety Score Update - [Location]
- **Includes**: Current safety score, risk level, recommendations
- **Priority**: Normal

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Demo Mode (for development)
DEMO_MODE=true
```

### Email Setup (Gmail)
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password at https://myaccount.google.com/apppasswords
3. Use the App Password in EMAIL_PASS (not your regular password)

### SMS Setup (Twilio)
1. Create a Twilio account at https://www.twilio.com/
2. Get your Account SID and Auth Token from the Console
3. Purchase a phone number for sending SMS

### Demo Mode
Set `DEMO_MODE=true` to log notifications to console without sending real emails/SMS. Perfect for development and testing.

## Integration with Models

### Emergency Model Integration
The notification service is automatically triggered when:
- New emergency is created (sends emergency alert)
- Emergency status changes to 'resolved' (sends confirmation)

### Tourist Tracking Integration
Notifications are location-aware and can target:
- Tourists in specific cities/areas
- Active vs inactive tourists
- Users with emergency status

## Error Handling

### Notification Failures
- Failed notifications are logged with error details
- Bulk notifications continue even if individual sends fail
- Results include success/failure counts and details

### Rate Limiting
- Email: No specific limits (uses Gmail quotas)
- SMS: Twilio rate limits apply (check your account)
- API endpoints: Rate limited to prevent abuse

## Monitoring & Logging

### Console Logging
```
📱 SMS sent: SM1234567890abcdef
📧 Email sent: <message-id@gmail.com>
🔔 Push Notification (Demo): Title - Body
📢 Emergency notification sent for SOS-12345: {sent: 2, failed: 0}
```

### Response Format
All notification endpoints return standardized responses:
```json
{
  "success": true,
  "message": "Notifications sent successfully",
  "result": {
    "type": "emergency",
    "totalUsers": 5,
    "successful": 4,
    "failed": 1,
    "details": [...]
  }
}
```

## Usage Examples

### 1. Automatic Emergency Notifications
When a tourist presses the SOS button, notifications are automatically sent via the Emergency model's post-save middleware.

### 2. Weather Alert for Specific Area
Tourism officers can send weather alerts to all active tourists in a specific location.

### 3. Safety Score Updates
When safety conditions change, officers can notify tourists about updated safety scores and recommendations.

### 4. Bulk Messaging
Send important updates to multiple tourists simultaneously with detailed success/failure reporting.

## Development & Testing

### Running in Demo Mode
Set `DEMO_MODE=true` to test notifications without sending real messages:
- Email notifications logged to console
- SMS notifications logged to console  
- Push notifications logged to console

### Testing Real Notifications
1. Configure email and SMS credentials
2. Set `DEMO_MODE=false`
3. Use the test endpoint to verify configuration

### Adding New Notification Types
1. Add template to `notificationService.js` templates object
2. Add validation to `/api/notifications/send` endpoint
3. Create specific endpoint if needed (like weather-alert)

## Security Considerations

### Authentication
- All notification endpoints require officer or admin authentication
- JWT tokens validated for each request

### Rate Limiting
- Prevents notification spam
- Configurable limits per environment

### Data Validation
- All input validated before processing
- Sanitized data in notification templates

### Privacy
- User contact information encrypted in transit
- Notification logs do not store sensitive data

## Future Enhancements

### Planned Features
- Real-time push notifications via Firebase/FCM
- WebSocket integration for dashboard alerts
- Email delivery tracking and read receipts
- SMS delivery status webhooks
- Notification preferences per user
- Template customization interface
- Analytics and reporting dashboard

### Integration Points
- Mobile app push notification registration
- WebSocket server for real-time updates
- External API integrations (weather services)
- Advanced targeting based on user preferences

## Troubleshooting

### Common Issues
1. **Gmail Authentication Error**
   - Ensure 2FA is enabled
   - Use App Password, not regular password
   - Check EMAIL_USER format

2. **Twilio SMS Failures**
   - Verify phone number format (+1234567890)
   - Check account balance
   - Confirm phone number is verified

3. **Rate Limit Errors**
   - Reduce bulk notification batch size
   - Implement delay between batches
   - Check service provider limits

4. **Template Rendering Issues**
   - Validate data object structure
   - Check for missing required fields
   - Review template syntax

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` to see detailed notification processing logs.