const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Database imports
const database = require('./config/database');
const User = require('./models/User');
const Emergency = require('./models/Emergency');
const SafetyScore = require('./models/SafetyScore');
const Officer = require('./models/Officer');
const TouristTracking = require('./models/TouristTracking');
const Geofence = require('./models/Geofence');
const LocationTracking = require('./models/LocationTracking');

// JWT Authentication
const { jwtService, authenticateToken, optionalAuth } = require('./utils/jwt');

// Services
const notificationService = require('./services/notificationService');
const geofenceService = require('./services/geofenceService');
const locationService = require('./services/locationService');
const websocketService = require('./services/websocketService');

// Route imports
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 3001;

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:19006', 'exp://192.168.1.0:19000'],
  credentials: true
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add notification routes
app.use('/api/notifications', notificationRoutes);

// Initialize Database Connection
async function initializeDatabase() {
  try {
    await database.connect();
    if (database.isConnected()) {
      await database.createInitialData();
      console.log('🗄️  Database initialized successfully');
    } else {
      console.log('⚠️  Running without database (in-memory mode)');
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
  }
}

// In-memory fallback storage (used when MongoDB is not available)
let fallbackUsers = [
  {
    touristId: 'T12345',
    password: 'password123',
    name: 'John Traveler',
    email: 'john@example.com',
    phone: '+1-555-0123',
    nationality: 'American',
    passportNumber: 'US123456789',
    emergencyContact: '+1-555-0199',
    profilePicture: null
  }
];
let fallbackEmergencies = [];
let fallbackSafetyScores = [];

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();
    res.json({
      status: 'OK',
      message: 'Travo Backend is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: dbHealth
    });
  } catch (error) {
    res.json({
      status: 'OK',
      message: 'Travo Backend is running (database health check failed)',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: { status: 'error', message: error.message }
    });
  }
});

// Authentication Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { touristId, password } = req.body;

    if (!touristId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Tourist ID and password are required'
      });
    }

    let user = null;

    // Fast development login bypass for testing
    if (process.env.NODE_ENV === 'development' && touristId === 'DEMO' && password === 'demo123') {
      user = {
        _id: 'demo-user-123',
        touristId: 'DEMO',
        email: 'demo@travo.com',
        profile: {
          name: 'Demo Tourist',
          phone: '+1234567890',
          nationality: 'Demo',
          passportNumber: 'DEMO123',
          emergencyContact: '+1234567899'
        },
        lastLogin: new Date()
      };
      
      console.log('🚀 Fast demo login successful');
    } else if (database.isConnected()) {
      // Try MongoDB with optimized query
      user = await User.findByTouristId(touristId).select('+password'); // Explicitly select password
      
      if (user) {
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
          return res.status(401).json({
            success: false,
            message: 'Invalid tourist ID or password'
          });
        }
        
        // Update last login asynchronously to not block response
        setImmediate(() => {
          User.updateOne({ _id: user._id }, { lastLogin: new Date() }).catch(console.error);
        });
      }
    } else {
      // Fallback to in-memory storage
      user = fallbackUsers.find(u => u.touristId === touristId && u.password === password);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid tourist ID or password'
        });
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid tourist ID or password'
      });
    }

    // Generate real JWT tokens
    const tokens = jwtService.generateTokenPair(user, 'tourist');

    // Prepare user data response
    const userData = database.isConnected() ? {
      id: user._id,
      touristId: user.touristId,
      name: user.profile.name,
      email: user.email,
      phone: user.profile.phone,
      nationality: user.profile.nationality,
      passportNumber: user.profile.passportNumber,
      emergencyContact: user.profile.emergencyContact
    } : {
      touristId: user.touristId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      nationality: user.nationality,
      passportNumber: user.passportNumber,
      emergencyContact: user.emergencyContact
    };

    res.json({
      success: true,
      message: 'Login successful',
      ...tokens,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Token Refresh Endpoint
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = jwtService.verifyRefreshToken(refreshToken);
    
    // Find user by ID and type
    let user = null;
    if (decoded.type === 'tourist' && database.isConnected()) {
      user = await User.findById(decoded.userId);
    } else if (decoded.type === 'officer' && database.isConnected()) {
      user = await Officer.findById(decoded.userId);
    }

    if (!user && database.isConnected()) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new token pair
    const tokens = jwtService.generateTokenPair(user || { id: decoded.userId }, decoded.type);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      ...tokens
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }
});

app.post('/api/auth/logout', authenticateToken(), (req, res) => {
  // In production, you would blacklist the token
  // For now, just send success response
  res.json({
    success: true,
    message: 'Logout successful',
    user: req.user
  });
});

// Profile Routes
app.get('/api/profile', authenticateToken('tourist'), async (req, res) => {
  // Get user from JWT token
  let user = null;
  
  if (database.isConnected()) {
    user = await User.findById(req.user.id);
  } else {
    user = fallbackUsers.find(u => u.touristId === req.user.touristId);
  }

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    user: {
      touristId: user.touristId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      nationality: user.nationality,
      passportNumber: user.passportNumber,
      emergencyContact: user.emergencyContact,
      profilePicture: user.profilePicture
    }
  });
});

app.put('/api/profile', authenticateToken('tourist'), async (req, res) => {
  try {
    // In production, get user from JWT token
    const touristId = 'T12345'; // Mock for now
    const userIndex = users.findIndex(u => u.touristId === touristId);

    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user data
    const allowedFields = ['name', 'email', 'phone', 'emergencyContact'];
    allowedFields.forEach(field => {
      if (req.body[field]) {
        users[userIndex][field] = req.body[field];
      }
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: users[userIndex]
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Emergency Services Routes
app.post('/api/emergency/sos', authenticateToken('tourist'), async (req, res) => {
  try {
    const { location, message, severity, coordinates } = req.body;
    
    const emergencyData = {
      touristId: req.user.touristId, // From JWT token
      type: 'sos',
      severity: severity || 'high',
      status: 'active',
      location: {
        coordinates: {
          latitude: coordinates?.latitude || 0,
          longitude: coordinates?.longitude || 0
        },
        address: location || 'Unknown location'
      },
      message: message || 'Emergency assistance needed',
      contactInfo: {
        phone: '+1-555-0123' // TODO: Get from user profile
      }
    };

    let emergency;
    
    if (database.isConnected()) {
      // Save to MongoDB
      emergency = new Emergency(emergencyData);
      emergency.addTimelineEntry('created', 'Emergency alert created', 'system');
      await emergency.save();
    } else {
      // Fallback to in-memory storage
      emergency = {
        id: `sos-${Date.now()}`,
        ...emergencyData,
        timestamp: new Date().toISOString(),
        responseTime: '2-5 minutes'
      };
      fallbackEmergencies.push(emergency);
    }

    // Update tourist tracking for dashboard
    if (database.isConnected()) {
      try {
        let tracking = await TouristTracking.findOne({ touristId: emergencyData.touristId });
        
        if (!tracking) {
          tracking = new TouristTracking({
            touristId: emergencyData.touristId,
            currentLocation: emergencyData.location,
            status: 'emergency',
            emergencyInfo: {
              hasActiveEmergency: true,
              lastEmergencyId: emergency._id,
              emergencyLevel: emergencyData.severity
            }
          });
        } else {
          tracking.currentLocation = emergencyData.location;
          tracking.status = 'emergency';
          tracking.emergencyInfo.hasActiveEmergency = true;
          tracking.emergencyInfo.lastEmergencyId = emergency._id;
          tracking.emergencyInfo.emergencyLevel = emergencyData.severity;
          
          tracking.addLocationHistory(
            emergencyData.location.coordinates,
            emergencyData.location.address,
            'emergency'
          );
          
          tracking.addAlert(
            'emergency',
            `SOS Alert: ${emergencyData.message}`,
            'critical'
          );
        }
        
        await tracking.save();
        console.log(`🚨 Dashboard notified: Tourist ${emergencyData.touristId} emergency at ${emergencyData.location.address}`);
      } catch (trackingError) {
        console.error('Failed to update tourist tracking:', trackingError.message);
      }
    }

    res.json({
      success: true,
      message: 'Emergency alert sent successfully',
      emergency: {
        id: emergency._id || emergency.id,
        emergencyId: emergency.emergencyId || emergency.id,
        status: emergency.status,
        responseTime: '2-5 minutes',
        estimatedArrival: '5-8 minutes'
      },
      emergencyContacts: {
        police: '100',
        medical: '102',
        fire: '101',
        tourist_helpline: '+91-1363'
      },
      dashboardNotified: true
    });
  } catch (error) {
    console.error('Emergency SOS error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send emergency alert'
    });
  }
});

// Notification Service Routes
app.post('/api/notifications/send', authenticateToken(['officer', 'admin']), async (req, res) => {
  try {
    const { type, recipients, data, channels } = req.body;
    
    if (!type || !recipients || !data) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, recipients, data'
      });
    }

    // Validate notification type
    const validTypes = ['emergency', 'checkIn', 'weatherAlert', 'safetyUpdate'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid notification type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Process bulk notification for multiple recipients
    const users = Array.isArray(recipients) ? recipients : [recipients];
    const result = await notificationService.sendBulkNotification(type, users, data);

    res.json({
      success: true,
      message: `Notifications sent successfully`,
      result: {
        type: result.type,
        totalUsers: result.totalUsers,
        successful: result.summary.successful,
        failed: result.summary.failed,
        details: result.results
      }
    });

  } catch (error) {
    console.error('Notification send error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notifications',
      error: error.message
    });
  }
});

// Send weather alert to tourists in specific area
app.post('/api/notifications/weather-alert', authenticateToken(['officer', 'admin']), async (req, res) => {
  try {
    const { alertType, location, message, validUntil, severity, recommendations } = req.body;

    if (!alertType || !location || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: alertType, location, message'
      });
    }

    let targetUsers = [];

    // Find tourists in the specified location area
    if (database.isConnected()) {
      const trackingData = await TouristTracking.find({
        'currentLocation.city': { $regex: location, $options: 'i' },
        status: { $in: ['active', 'visiting'] }
      }).populate('touristId', 'touristId profile.name email profile.phone');

      targetUsers = trackingData.map(tracking => ({
        touristId: tracking.touristId?.touristId,
        touristName: tracking.touristId?.profile?.name,
        email: tracking.touristId?.email,
        phoneNumber: tracking.touristId?.profile?.phone
      })).filter(user => user.email || user.phoneNumber);
    } else {
      // Fallback demo data
      targetUsers = [{
        touristId: 'T12345',
        touristName: 'Demo Tourist',
        email: 'demo@example.com',
        phoneNumber: '+1234567890'
      }];
    }

    const weatherData = {
      location,
      alertType,
      message,
      validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 24 * 60 * 60 * 1000),
      severity: severity || 'medium',
      recommendations: recommendations || ['Stay indoors', 'Monitor weather updates', 'Keep emergency contacts ready']
    };

    const result = await notificationService.sendBulkNotification('weatherAlert', targetUsers, weatherData);

    res.json({
      success: true,
      message: `Weather alert sent to ${targetUsers.length} tourists in ${location}`,
      result: {
        alertType,
        location,
        usersNotified: result.summary.successful,
        totalTargeted: targetUsers.length,
        failedCount: result.summary.failed
      }
    });

  } catch (error) {
    console.error('Weather alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send weather alert',
      error: error.message
    });
  }
});

// Get emergency notifications for dashboard
app.get('/api/notifications/emergencies', authenticateToken(['officer', 'admin']), async (req, res) => {
  try {
    const { limit = 20, status = 'active' } = req.query;

    let emergencies = [];

    if (database.isConnected()) {
      const query = status === 'all' ? {} : { status };
      emergencies = await Emergency.find(query)
        .populate('userId', 'touristId profile.name email profile.phone')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

      emergencies = emergencies.map(emergency => ({
        id: emergency._id,
        emergencyId: emergency.emergencyId,
        touristId: emergency.touristId,
        touristName: emergency.userId?.profile?.name || 'Unknown Tourist',
        type: emergency.type,
        severity: emergency.severity,
        status: emergency.status,
        location: emergency.location,
        message: emergency.message,
        createdAt: emergency.createdAt,
        timeline: emergency.timeline.slice(-3), // Last 3 events
        hasNotifications: emergency.timeline.some(entry => entry.action === 'notification_sent')
      }));
    } else {
      // Fallback demo data
      emergencies = [
        {
          id: '1',
          emergencyId: 'SOS-001',
          touristId: 'T12345',
          touristName: 'Alice Kumar',
          type: 'sos',
          severity: 'high',
          status: 'active',
          location: { address: 'Times Square, NY' },
          message: 'Lost and need immediate help',
          createdAt: new Date(),
          hasNotifications: true
        }
      ];
    }

    res.json({
      success: true,
      emergencies,
      summary: {
        total: emergencies.length,
        active: emergencies.filter(e => e.status === 'active').length,
        highSeverity: emergencies.filter(e => e.severity === 'high').length
      }
    });

  } catch (error) {
    console.error('Emergency notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve emergency notifications'
    });
  }
});

// Send safety score updates to tourists
app.post('/api/notifications/safety-update', authenticateToken(['officer', 'admin']), async (req, res) => {
  try {
    const { location, score, level, recommendations, targetUsers } = req.body;

    if (!location || score === undefined || !level) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: location, score, level'
      });
    }

    let users = targetUsers || [];

    // If no specific users, find tourists in the area
    if (!users.length && database.isConnected()) {
      const trackingData = await TouristTracking.find({
        'currentLocation.city': { $regex: location, $options: 'i' },
        status: { $in: ['active', 'visiting'] }
      }).populate('touristId', 'email profile.name profile.phone');

      users = trackingData.map(tracking => ({
        email: tracking.touristId?.email,
        touristName: tracking.touristId?.profile?.name,
        phoneNumber: tracking.touristId?.profile?.phone
      })).filter(user => user.email);
    }

    const safetyData = {
      location,
      score,
      level,
      recommendations: recommendations || [
        'Stay in well-lit areas',
        'Keep emergency contacts updated',
        'Travel in groups when possible'
      ]
    };

    const result = await notificationService.sendBulkNotification('safetyUpdate', users, safetyData);

    res.json({
      success: true,
      message: `Safety update sent to ${users.length} tourists`,
      result: {
        location,
        score,
        level,
        usersNotified: result.summary.successful,
        totalTargeted: users.length
      }
    });

  } catch (error) {
    console.error('Safety update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send safety update',
      error: error.message
    });
  }
});

// Test notification endpoint (development only)
app.post('/api/notifications/test', authenticateToken(['admin']), async (req, res) => {
  try {
    const { email, phone, type = 'checkIn' } = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Either email or phone number is required'
      });
    }

    const testData = {
      touristId: 'TEST001',
      touristName: 'Test User',
      location: 'Test Location',
      message: 'This is a test notification from Travo system',
      timestamp: new Date(),
      email,
      phoneNumber: phone
    };

    const result = await notificationService.sendMultiChannelNotification(type, testData, ['email', 'sms']);

    res.json({
      success: true,
      message: 'Test notification sent successfully',
      result: {
        channels: Object.keys(result.channels),
        successful: result.summary.sent,
        failed: result.summary.failed,
        details: result.channels
      }
    });

  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: error.message
    });
  }
});

// Safety Score Routes
app.get('/api/safety/score', (req, res) => {
  try {
    const mockSafetyData = {
      overall_score: 8.5,
      location: 'Current Area',
      factors: {
        crime_rate: 9.0,
        traffic_safety: 7.5,
        natural_disasters: 8.0,
        health_risks: 8.8,
        political_stability: 9.2
      },
      recommendations: [
        'Avoid walking alone after 10 PM',
        'Use registered taxis or ride-sharing apps',
        'Keep emergency contacts handy',
        'Stay updated with local news'
      ],
      last_updated: new Date().toISOString()
    };

    res.json({
      success: true,
      safety_data: mockSafetyData
    });
  } catch (error) {
    console.error('Safety score error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch safety score'
    });
  }
});

// Offline Maps Routes
app.get('/api/maps/offline', (req, res) => {
  try {
    const availableMaps = [
      {
        id: 'city-center',
        name: 'City Center',
        size: '45 MB',
        coverage: 'Downtown area with major attractions',
        last_updated: '2025-09-15'
      },
      {
        id: 'tourist-zones',
        name: 'Tourist Zones',
        size: '78 MB',
        coverage: 'Popular tourist destinations and hotels',
        last_updated: '2025-09-18'
      },
      {
        id: 'transport-hubs',
        name: 'Transport Hubs',
        size: '32 MB',
        coverage: 'Airports, railway stations, bus terminals',
        last_updated: '2025-09-19'
      }
    ];

    res.json({
      success: true,
      available_maps: availableMaps,
      downloaded_maps: offlineMaps
    });
  } catch (error) {
    console.error('Offline maps error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch offline maps'
    });
  }
});

app.post('/api/maps/download', (req, res) => {
  try {
    const { mapId } = req.body;
    
    if (!mapId) {
      return res.status(400).json({
        success: false,
        message: 'Map ID is required'
      });
    }

    // Simulate map download
    const downloadedMap = {
      id: mapId,
      downloaded_at: new Date().toISOString(),
      status: 'downloaded'
    };

    offlineMaps.push(downloadedMap);

    res.json({
      success: true,
      message: 'Map downloaded successfully',
      map: downloadedMap
    });
  } catch (error) {
    console.error('Map download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download map'
    });
  }
});

// Weather Alerts Routes
app.get('/api/weather', (req, res) => {
  try {
    const mockWeatherData = {
      current: {
        temperature: 28,
        condition: 'Partly Cloudy',
        humidity: 65,
        wind_speed: 12,
        uv_index: 6
      },
      alerts: [
        {
          type: 'heat_wave',
          severity: 'moderate',
          message: 'High temperatures expected. Stay hydrated.',
          valid_until: '2025-09-21T18:00:00Z'
        }
      ],
      forecast: [
        { day: 'Today', high: 32, low: 24, condition: 'Sunny' },
        { day: 'Tomorrow', high: 29, low: 22, condition: 'Rainy' },
        { day: 'Day 3', high: 31, low: 25, condition: 'Cloudy' }
      ]
    };

    res.json({
      success: true,
      weather: mockWeatherData
    });
  } catch (error) {
    console.error('Weather error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weather data'
    });
  }
});

// Events & Festivals Routes
app.get('/api/events', (req, res) => {
  try {
    const mockEvents = [
      {
        id: 'evt-001',
        name: 'Cultural Heritage Festival',
        date: '2025-09-25',
        location: 'City Square',
        type: 'cultural',
        description: 'Celebrate local traditions with music, dance, and food.'
      },
      {
        id: 'evt-002',
        name: 'Night Market',
        date: '2025-09-22',
        location: 'Market Street',
        type: 'shopping',
        description: 'Local crafts, street food, and live entertainment.'
      },
      {
        id: 'evt-003',
        name: 'Adventure Sports Week',
        date: '2025-10-01',
        location: 'Adventure Park',
        type: 'sports',
        description: 'Rock climbing, zip-lining, and water sports activities.'
      }
    ];

    res.json({
      success: true,
      events: mockEvents
    });
  } catch (error) {
    console.error('Events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events'
    });
  }
});

// Transport Routes
app.get('/api/transport', (req, res) => {
  try {
    const mockTransportData = {
      public_transport: [
        {
          type: 'metro',
          name: 'City Metro',
          status: 'operational',
          frequency: '5-10 minutes',
          fare: '$2.50'
        },
        {
          type: 'bus',
          name: 'City Bus Service',
          status: 'operational',
          frequency: '10-15 minutes',
          fare: '$1.25'
        }
      ],
      ride_sharing: [
        {
          service: 'Local Taxi',
          availability: 'high',
          estimated_fare: '$8-15',
          booking: 'Call +1-555-TAXI'
        },
        {
          service: 'Ride Share App',
          availability: 'medium',
          estimated_fare: '$6-12',
          booking: 'Mobile App'
        }
      ]
    };

    res.json({
      success: true,
      transport: mockTransportData
    });
  } catch (error) {
    console.error('Transport error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transport data'
    });
  }
});

// Language Help Routes
app.get('/api/language', (req, res) => {
  try {
    const commonPhrases = {
      greetings: {
        'Hello': 'Namaste',
        'Thank you': 'Dhanyawad',
        'Please': 'Kripaya',
        'Excuse me': 'Maaf kijiye'
      },
      emergency: {
        'Help!': 'Madad!',
        'Call police': 'Police ko call karo',
        'I need a doctor': 'Mujhe doctor ki zarurat hai',
        'Where is hospital?': 'Hospital kahan hai?'
      },
      directions: {
        'Where is...?': '... kahan hai?',
        'Left': 'Bayen',
        'Right': 'Dayen',
        'Straight': 'Seedha'
      }
    };

    res.json({
      success: true,
      language_help: {
        local_language: 'Hindi',
        phrases: commonPhrases,
        translation_service: 'Available 24/7',
        helpline: '+91-1363'
      }
    });
  } catch (error) {
    console.error('Language help error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch language help'
    });
  }
});

// Eco Tourism Routes
app.get('/api/tourism', (req, res) => {
  try {
    const ecoTips = [
      {
        category: 'Transportation',
        tip: 'Use public transport or walk when possible to reduce carbon footprint.',
        impact: 'High'
      },
      {
        category: 'Accommodation',
        tip: 'Choose eco-certified hotels that use renewable energy.',
        impact: 'Medium'
      },
      {
        category: 'Activities',
        tip: 'Support local wildlife conservation programs and national parks.',
        impact: 'High'
      },
      {
        category: 'Shopping',
        tip: 'Buy local, handmade products to support community economy.',
        impact: 'Medium'
      },
      {
        category: 'Waste',
        tip: 'Carry a reusable water bottle and avoid single-use plastics.',
        impact: 'High'
      }
    ];

    res.json({
      success: true,
      eco_tourism: {
        tips: ecoTips,
        certified_businesses: [
          'Green Hotel Chain',
          'Eco Adventure Tours',
          'Sustainable Dining Co.'
        ],
        carbon_offset_programs: 'Available through local partners'
      }
    });
  } catch (error) {
    console.error('Eco tourism error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch eco tourism data'
    });
  }
});

// ========== ADVANCED SAFETY FEATURES API ROUTES ==========

// Start Location Tracking Session
app.post('/api/location/start-session', authenticateToken('tourist'), async (req, res) => {
  try {
    const { initialLocation } = req.body;
    const touristId = req.user.touristId;

    const sessionId = await locationService.startLocationSession(touristId, initialLocation);

    res.json({
      success: true,
      message: 'Location tracking session started',
      sessionId,
      touristId
    });
  } catch (error) {
    console.error('Start location session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start location session',
      error: error.message
    });
  }
});

// Process Location Update with Advanced Safety Analysis
app.post('/api/location/update', authenticateToken('tourist'), async (req, res) => {
  try {
    const { sessionId, coordinates, altitude, accuracy, heading, speed, address, battery, networkInfo } = req.body;
    const touristId = req.user.touristId;

    if (!coordinates || !coordinates.latitude || !coordinates.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Valid coordinates (latitude, longitude) are required'
      });
    }

    const locationData = {
      coordinates,
      altitude,
      accuracy,
      heading,
      speed,
      address,
      battery,
      networkInfo,
      timestamp: new Date()
    };

    const result = await locationService.processLocationUpdate(touristId, sessionId, locationData);

    res.json({
      success: true,
      message: 'Location updated successfully',
      ...result
    });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: error.message
    });
  }
});

// Get Real-time Safety Status
app.get('/api/location/safety-status', authenticateToken('tourist'), async (req, res) => {
  try {
    const touristId = req.user.touristId;
    const safetyStatus = await locationService.getSafetyStatus(touristId);

    res.json({
      success: true,
      safetyStatus
    });
  } catch (error) {
    console.error('Safety status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get safety status',
      error: error.message
    });
  }
});

// Get Location History
app.get('/api/location/history', authenticateToken('tourist'), async (req, res) => {
  try {
    const touristId = req.user.touristId;
    const { hours = 24, limit = 100, includeEvents = false, includeMovement = false } = req.query;

    const options = {
      hours: parseInt(hours),
      limit: parseInt(limit),
      includeGeofenceEvents: includeEvents === 'true',
      includeMovementData: includeMovement === 'true'
    };

    const history = await locationService.getLocationHistory(touristId, options);

    res.json({
      success: true,
      history,
      count: history.length,
      timeRange: `${hours} hours`
    });
  } catch (error) {
    console.error('Location history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get location history',
      error: error.message
    });
  }
});

// Get Movement Analytics
app.get('/api/location/analytics', authenticateToken('tourist'), async (req, res) => {
  try {
    const touristId = req.user.touristId;
    const { days = 7 } = req.query;

    const analytics = await locationService.getMovementAnalytics(touristId, parseInt(days));

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Movement analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get movement analytics',
      error: error.message
    });
  }
});

// End Location Session
app.post('/api/location/end-session', authenticateToken('tourist'), async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    const summary = await locationService.endLocationSession(sessionId);

    res.json({
      success: true,
      message: 'Location session ended',
      summary
    });
  } catch (error) {
    console.error('End location session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end location session',
      error: error.message
    });
  }
});

// ========== GEOFENCE MANAGEMENT API ROUTES ==========

// Create Geofence (Officers only)
app.post('/api/geofence/create', authenticateToken('officer'), async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      geometry,
      safetyLevel,
      alertSettings,
      activeHours,
      restrictions,
      metadata
    } = req.body;

    // Validate required fields
    if (!name || !type || !geometry || !safetyLevel) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, type, geometry, safetyLevel'
      });
    }

    const geofenceData = {
      name,
      description,
      type,
      geometry,
      safetyLevel,
      alertSettings: alertSettings || {},
      activeHours: activeHours || { allDay: true },
      restrictions: restrictions || {},
      metadata: metadata || {}
    };

    const geofence = await geofenceService.createGeofence(geofenceData, req.user.id);

    res.json({
      success: true,
      message: 'Geofence created successfully',
      geofence: {
        id: geofence._id,
        name: geofence.name,
        type: geofence.type,
        safetyLevel: geofence.safetyLevel,
        isActive: geofence.isActive
      }
    });
  } catch (error) {
    console.error('Create geofence error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create geofence',
      error: error.message
    });
  }
});

// Get Geofences for Dashboard
app.get('/api/geofence/list', authenticateToken('officer'), async (req, res) => {
  try {
    const { type, safetyLevel, city, limit = 50 } = req.query;

    const filters = {
      type,
      safetyLevel,
      city,
      limit: parseInt(limit)
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) delete filters[key];
    });

    const geofences = await geofenceService.getGeofencesForDashboard(filters);

    res.json({
      success: true,
      geofences,
      count: geofences.length,
      filters: filters
    });
  } catch (error) {
    console.error('Get geofences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get geofences',
      error: error.message
    });
  }
});

// Get Tourists in Specific Geofence
app.get('/api/geofence/:geofenceId/tourists', authenticateToken('officer'), async (req, res) => {
  try {
    const { geofenceId } = req.params;

    const result = await geofenceService.getTouristsInGeofence(geofenceId);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Get tourists in geofence error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tourists in geofence',
      error: error.message
    });
  }
});

// Get Safety Analytics for Area
app.get('/api/geofence/safety-analytics', authenticateToken('officer'), async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const analytics = await geofenceService.getSafetyAnalytics(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radius)
    );

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Safety analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get safety analytics',
      error: error.message
    });
  }
});

// Get Enhanced Safety Score with Real-time Factors
app.get('/api/safety/enhanced-score', authenticateToken('tourist'), async (req, res) => {
  try {
    const touristId = req.user.touristId;
    const { lat, lng } = req.query;

    // Get current location or use provided coordinates
    let coordinates;
    if (lat && lng) {
      coordinates = { latitude: parseFloat(lat), longitude: parseFloat(lng) };
    } else {
      const latestLocation = await locationService.getLatestLocation(touristId);
      if (!latestLocation) {
        return res.status(400).json({
          success: false,
          message: 'No location data available. Please provide coordinates or enable location sharing.'
        });
      }
      coordinates = latestLocation.locationData.coordinates;
    }

    // Find geofences at this location
    const geofences = await geofenceService.findContainingGeofences(coordinates.longitude, coordinates.latitude);

    // Calculate enhanced safety score
    const baseScore = 70;
    let enhancedScore = baseScore;
    const factors = [];

    // Factor 1: Geofence safety levels
    if (geofences.length > 0) {
      const safetyLevels = geofences.map(gf => gf.safetyLevel);
      const levelScores = {
        'very_safe': 90,
        'safe': 75,
        'moderate': 50,
        'unsafe': 25,
        'dangerous': 10
      };
      
      const avgGeofenceScore = geofences.reduce((sum, gf) => sum + levelScores[gf.safetyLevel], 0) / geofences.length;
      enhancedScore = (enhancedScore + avgGeofenceScore) / 2;
      
      factors.push({
        name: 'Area Safety Classification',
        impact: avgGeofenceScore - baseScore,
        details: geofences.map(gf => `${gf.name}: ${gf.safetyLevel}`).join(', ')
      });
    }

    // Factor 2: Time of day
    const hour = new Date().getHours();
    let timeImpact = 0;
    if (hour >= 6 && hour <= 18) {
      timeImpact = 10; // Daytime bonus
    } else if (hour >= 19 && hour <= 22) {
      timeImpact = -5; // Evening slight penalty
    } else {
      timeImpact = -15; // Night penalty
    }
    enhancedScore += timeImpact;
    factors.push({
      name: 'Time of Day',
      impact: timeImpact,
      details: `Current hour: ${hour}:00`
    });

    // Factor 3: Recent activity and movement patterns
    const recentActivity = await locationService.getLatestLocation(touristId);
    if (recentActivity) {
      const minutesAgo = (Date.now() - recentActivity.timestamp) / (1000 * 60);
      if (minutesAgo < 10) {
        enhancedScore += 5;
        factors.push({
          name: 'Recent Activity',
          impact: 5,
          details: 'Active location tracking detected'
        });
      } else if (minutesAgo > 60) {
        enhancedScore -= 10;
        factors.push({
          name: 'Location Staleness',
          impact: -10,
          details: `Last update: ${Math.round(minutesAgo)} minutes ago`
        });
      }
    }

    // Clamp score between 0 and 100
    enhancedScore = Math.max(0, Math.min(100, enhancedScore));

    // Generate recommendations based on score
    const recommendations = [];
    if (enhancedScore < 30) {
      recommendations.push('Consider moving to a safer area immediately');
      recommendations.push('Contact local authorities if you feel unsafe');
      recommendations.push('Share your location with emergency contacts');
    } else if (enhancedScore < 50) {
      recommendations.push('Stay alert and aware of your surroundings');
      recommendations.push('Avoid isolated areas');
      recommendations.push('Keep emergency numbers readily accessible');
    } else if (enhancedScore < 70) {
      recommendations.push('Continue to monitor your surroundings');
      recommendations.push('Travel with others when possible');
    } else {
      recommendations.push('You are in a relatively safe area');
      recommendations.push('Continue following standard safety practices');
    }

    res.json({
      success: true,
      safetyData: {
        overall_score: enhancedScore,
        base_score: baseScore,
        location: {
          coordinates,
          geofences: geofences.map(gf => ({
            name: gf.name,
            type: gf.type,
            safetyLevel: gf.safetyLevel
          }))
        },
        factors,
        recommendations,
        calculated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Enhanced safety score error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate enhanced safety score',
      error: error.message
    });
  }
});

// ========== DASHBOARD API ROUTES FOR TOURISM DEPARTMENT & POLICE ==========

// Dashboard Officer Authentication
app.post('/api/dashboard/auth/login', async (req, res) => {
  try {
    const { username, password, role } = req.body; // username can be email or officerId

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    let officer = null;

    if (database.isConnected()) {
      // Try to find by email first, then by officerId
      officer = await Officer.findOne({
        $or: [
          { email: username.toLowerCase() },
          { officerId: username.toUpperCase() }
        ]
      });

      if (officer) {
        const isValidPassword = await officer.comparePassword(password);
        if (!isValidPassword) {
          return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
          });
        }

        // Check role authorization
        if (role && role !== officer.profile.department) {
          return res.status(403).json({
            success: false,
            message: 'Unauthorized role access'
          });
        }

        // Update last login
        officer.lastLogin = new Date();
        await officer.save();
      }
    } else {
      // Fallback authentication for demo
      const demoOfficers = {
        'police@travo.com': { password: 'police123', department: 'police', name: 'Officer Smith' },
        'tourism@travo.com': { password: 'tourism123', department: 'tourism', name: 'Sarah Tourism' }
      };
      
      const demo = demoOfficers[username.toLowerCase()];
      if (demo && demo.password === password) {
        officer = { profile: { department: demo.department, name: demo.name }, officerId: 'DEMO001' };
      }
    }

    if (!officer) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate real JWT tokens for dashboard
    const tokens = jwtService.generateTokenPair(officer, 'officer');

    res.json({
      success: true,
      message: 'Dashboard login successful',
      ...tokens,
      officer: {
        id: officer.officerId || officer._id,
        name: officer.profile.name,
        department: officer.profile.department,
        role: officer.profile.role,
        permissions: officer.permissions || {}
      }
    });

  } catch (error) {
    console.error('Dashboard login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get All Active Tourists for Dashboard
app.get('/api/dashboard/tourists', authenticateToken('officer'), async (req, res) => {
  try {
    const { status, search, limit = 50 } = req.query;

    let tourists = [];

    if (database.isConnected()) {
      // Build query
      let query = {};
      if (status && status !== 'all') {
        query.status = status;
      }

      const trackingData = await TouristTracking.find(query)
        .populate('touristId', 'touristId profile.name email profile.phone')
        .limit(parseInt(limit))
        .sort({ lastUpdated: -1 });

      tourists = trackingData.map(tracking => ({
        id: tracking._id,
        touristId: tracking.touristId?.touristId || 'Unknown',
        name: tracking.touristId?.profile?.name || 'Unknown Tourist',
        email: tracking.touristId?.email,
        phone: tracking.touristId?.profile?.phone,
        status: tracking.status,
        location: {
          address: tracking.currentLocation.address,
          coordinates: tracking.currentLocation.coordinates,
          city: tracking.currentLocation.city
        },
        checkInTime: tracking.visitDetails.checkInTime,
        lastSeen: tracking.lastUpdated,
        hasEmergency: tracking.emergencyInfo.hasActiveEmergency,
        emergencyLevel: tracking.emergencyInfo.emergencyLevel
      }));
    } else {
      // Fallback demo data matching your screenshots
      tourists = [
        { 
          id: '1', touristId: 'T12345', name: 'Alice Kumar', status: 'active', 
          location: { address: 'Times Square, NY', coordinates: { lat: 40.7580, lng: -73.9855 }},
          checkInTime: new Date(), lastSeen: new Date(), hasEmergency: false 
        },
        { 
          id: '2', touristId: 'T12346', name: 'Akshay Kumar', status: 'inactive', 
          location: { address: 'Central Park, NY', coordinates: { lat: 40.7829, lng: -73.9654 }},
          checkInTime: new Date(), lastSeen: new Date(Date.now() - 3600000), hasEmergency: false 
        },
        { 
          id: '3', touristId: 'T12347', name: 'Maria Garcia', status: 'inactive',
          location: { address: 'Brooklyn Bridge, NY', coordinates: { lat: 40.7061, lng: -73.9969 }},
          checkInTime: new Date(), lastSeen: new Date(Date.now() - 7200000), hasEmergency: false 
        },
        { 
          id: '4', touristId: 'T12348', name: 'John Smith', status: 'active',
          location: { address: 'Statue of Liberty, NY', coordinates: { lat: 40.6892, lng: -74.0445 }},
          checkInTime: new Date(), lastSeen: new Date(), hasEmergency: false 
        }
      ];

      // Apply search filter
      if (search) {
        tourists = tourists.filter(t => 
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.touristId.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Apply status filter  
      if (status && status !== 'all') {
        tourists = tourists.filter(t => t.status === status);
      }
    }

    // Get summary statistics
    const summary = {
      total: tourists.length,
      active: tourists.filter(t => t.status === 'active').length,
      inactive: tourists.filter(t => t.status === 'inactive').length,
      checkedIn: tourists.filter(t => t.status === 'checked-in').length,
      emergency: tourists.filter(t => t.hasEmergency).length
    };

    res.json({
      success: true,
      tourists,
      summary
    });

  } catch (error) {
    console.error('Dashboard tourists error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tourist data'
    });
  }
});

// Get Live Emergency/SOS Alerts for Dashboard  
app.get('/api/dashboard/emergency/live', authenticateToken('officer'), async (req, res) => {
  try {
    let emergencies = [];

    if (database.isConnected()) {
      emergencies = await Emergency.find({ 
        status: { $in: ['active', 'responded'] }
      })
      .populate('userId', 'touristId profile.name profile.phone')
      .sort({ createdAt: -1 })
      .limit(20);

      emergencies = emergencies.map(emergency => ({
        id: emergency._id,
        caseId: emergency.emergencyId,
        touristId: emergency.touristId,
        touristName: emergency.userId?.profile?.name || 'Unknown',
        type: emergency.type,
        severity: emergency.severity,
        status: emergency.status,
        location: {
          address: emergency.location.address,
          coordinates: emergency.location.coordinates
        },
        message: emergency.message,
        createdAt: emergency.createdAt,
        timeline: emergency.timeline
      }));
    } else {
      // Demo emergency data matching your dashboard
      emergencies = [
        {
          id: 'TRV-LIVE-5195',
          caseId: 'TRV-LIVE-5195',
          touristId: 'T12345',
          touristName: 'Alice Kumar',
          type: 'injury',
          severity: 'medium',
          status: 'open',
          location: { address: 'Times Square, NY', coordinates: { lat: 40.7580, lng: -73.9855 }},
          message: 'Minor injury, need medical assistance',
          createdAt: new Date()
        },
        {
          id: 'TRV-LIVE-8066',
          caseId: 'TRV-LIVE-8066', 
          touristId: 'T12346',
          touristName: 'John Smith',
          type: 'theft',
          severity: 'high',
          status: 'open',
          location: { address: 'Central Park, NY', coordinates: { lat: 40.7829, lng: -73.9654 }},
          message: 'Wallet stolen, need police assistance',
          createdAt: new Date(Date.now() - 300000)
        }
      ];
    }

    // Calculate statistics
    const stats = {
      activeCases: emergencies.length,
      avgResponseTime: '32 mins',
      totalIncidentsToday: 24,
      byType: {
        injury: emergencies.filter(e => e.type === 'injury').length,
        theft: emergencies.filter(e => e.type === 'theft').length,
        medical: emergencies.filter(e => e.type === 'medical').length,
        missing: emergencies.filter(e => e.type === 'missing').length
      }
    };

    res.json({
      success: true,
      emergencies,
      stats
    });

  } catch (error) {
    console.error('Dashboard emergency live error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch live emergency data'
    });
  }
});

// Update Tourist Location (Called when SOS is pressed)
app.post('/api/dashboard/tourist/location', async (req, res) => {
  try {
    const { touristId, coordinates, address, emergency = false } = req.body;

    if (!touristId || !coordinates) {
      return res.status(400).json({
        success: false,
        message: 'Tourist ID and coordinates are required'
      });
    }

    let tracking = null;

    if (database.isConnected()) {
      // Find or create tourist tracking record
      tracking = await TouristTracking.findOne({ touristId });
      
      if (!tracking) {
        tracking = new TouristTracking({
          touristId,
          currentLocation: {
            coordinates,
            address: address || 'Unknown location'
          },
          status: emergency ? 'emergency' : 'active'
        });
      } else {
        // Update existing record
        tracking.currentLocation.coordinates = coordinates;
        tracking.currentLocation.address = address || tracking.currentLocation.address;
        
        if (emergency) {
          tracking.status = 'emergency';
          tracking.emergencyInfo.hasActiveEmergency = true;
          tracking.emergencyInfo.emergencyLevel = 'high';
        }
        
        // Add to location history
        tracking.addLocationHistory(coordinates, address, emergency ? 'emergency' : 'update');
      }

      await tracking.save();
    }

    // If emergency, notify dashboard in real-time (implement WebSocket later)
    if (emergency) {
      console.log(`🚨 EMERGENCY ALERT: Tourist ${touristId} at ${address}`);
      // Here you would send WebSocket notification to dashboard
    }

    res.json({
      success: true,
      message: emergency ? 'Emergency location updated' : 'Location updated successfully',
      tracking: {
        touristId,
        location: { coordinates, address },
        status: emergency ? 'emergency' : 'active',
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Tourist location update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tourist location'
    });
  }
});

// Get Dashboard Analytics with Real-time WebSocket Data
app.get('/api/dashboard/analytics', authenticateToken('officer'), async (req, res) => {
  try {
    const wsStats = websocketService.getStats();
    
    const analytics = {
      touristStats: {
        totalActive: wsStats.connectedTourists,
        totalInactive: 3, 
        justCheckedIn: 3,
        totalToday: 24
      },
      emergencyStats: {
        activeCases: wsStats.activeEmergencies,
        avgResponseTime: '32 mins',
        totalIncidentsToday: 24,
        resolved: 156
      },
      webSocketStats: {
        connectedTourists: wsStats.connectedTourists,
        connectedOfficers: wsStats.connectedOfficers,
        activeEmergencies: wsStats.activeEmergencies,
        locationUpdates: wsStats.locationUpdates,
        serverUptime: Math.floor(wsStats.uptime / 60) + ' minutes'
      },
      locationHotspots: [
        { area: 'Times Square', count: 12, risk: 'medium' },
        { area: 'Central Park', count: 8, risk: 'low' },
        { area: 'Brooklyn Bridge', count: 6, risk: 'medium' },
        { area: 'Statue of Liberty', count: 4, risk: 'low' }
      ],
      recentActivity: [
        { time: 'Just now', event: 'Tourist T12345 sent SOS from Times Square' },
        { time: '2 mins ago', event: 'Tourist T12346 checked in at hotel' },
        { time: '5 mins ago', event: 'Emergency case TRV-8066 resolved' }
      ]
    };

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics'
    });
  }
});

// ========== WEBSOCKET INTEGRATION API ROUTES ==========

// Trigger WebSocket broadcast from REST API
app.post('/api/websocket/broadcast', authenticateToken('officer'), async (req, res) => {
  try {
    const { event, data, target } = req.body;
    
    if (!event || !data) {
      return res.status(400).json({
        success: false,
        message: 'Event and data are required'
      });
    }

    // Broadcast via WebSocket
    if (target === 'dashboard') {
      websocketService.broadcastToDashboard(event, data);
    } else if (target === 'all_tourists') {
      websocketService.io.emit(event, data);
    } else if (target && target.startsWith('user_')) {
      websocketService.io.to(target).emit(event, data);
    } else {
      websocketService.io.emit(event, data);
    }

    res.json({
      success: true,
      message: 'WebSocket broadcast sent',
      event,
      target: target || 'all',
      timestamp: new Date()
    });

  } catch (error) {
    console.error('WebSocket broadcast error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to broadcast WebSocket message'
    });
  }
});

// Get WebSocket connection statistics
app.get('/api/websocket/stats', authenticateToken('officer'), (req, res) => {
  try {
    const stats = websocketService.getStats();
    
    res.json({
      success: true,
      stats,
      connections: {
        tourists: stats.connectedTourists,
        officers: stats.connectedOfficers,
        total: stats.connectedTourists + stats.connectedOfficers
      },
      system: {
        uptime: stats.uptime,
        activeEmergencies: stats.activeEmergencies,
        locationUpdates: stats.locationUpdates
      }
    });

  } catch (error) {
    console.error('WebSocket stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get WebSocket statistics'
    });
  }
});

// Send emergency alert via REST API (integrates with WebSocket)
app.post('/api/websocket/emergency', authenticateToken('tourist'), async (req, res) => {
  try {
    const { type, location, message, severity } = req.body;
    const touristId = req.user.touristId;

    if (!location) {
      return res.status(400).json({
        success: false,
        message: 'Location data is required for emergency alerts'
      });
    }

    // Create emergency data
    const emergencyData = {
      type: type || 'sos',
      location,
      message: message || 'Emergency assistance needed',
      severity: severity || 'high'
    };

    // Broadcast via WebSocket to all connected clients
    websocketService.broadcastToDashboard('emergency_alert', {
      touristId,
      userId: req.user.id,
      ...emergencyData,
      timestamp: new Date()
    });

    // Also broadcast to nearby tourists
    websocketService.broadcastToNearbyTourists(location, 2000, 'nearby_emergency', {
      type: emergencyData.type,
      location: emergencyData.location,
      message: 'Emergency reported in your area. Stay alert.',
      severity: 'warning'
    });

    res.json({
      success: true,
      message: 'Emergency alert broadcasted via WebSocket',
      emergencyData: {
        touristId,
        ...emergencyData,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('WebSocket emergency alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to broadcast emergency alert'
    });
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Serve test dashboard
app.get('/test', (req, res) => {
  res.sendFile(__dirname + '/test-api.html');
});

// Start Server with Database Initialization
async function startServer() {
  try {
    // Initialize database connection
    await initializeDatabase();
    
    // Create HTTP server
    const http = require('http');
    const httpServer = http.createServer(app);
    
    // Initialize WebSocket service
    websocketService.initialize(httpServer);
    
    // Start the server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Travo Backend Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📱 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🌐 WebSocket URL: ws://localhost:${PORT}`);
      console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Database: ${database.isConnected() ? 'MongoDB Connected' : 'In-Memory Mode'}`);
      
      // Log WebSocket stats periodically
      setInterval(() => {
        const stats = websocketService.getStats();
        console.log(`📊 WebSocket Stats: ${stats.connectedTourists} tourists, ${stats.connectedOfficers} officers, ${stats.activeEmergencies} emergencies`);
      }, 60000); // Every minute
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down server gracefully...');
  await database.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Shutting down server gracefully...');
  await database.disconnect();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;