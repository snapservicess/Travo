const mongoose = require('mongoose');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/travo';
      
      const options = {
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        family: 4 // Use IPv4, skip trying IPv6
      };

      this.connection = await mongoose.connect(mongoUri, options);
      
      console.log(`✅ MongoDB Connected: ${this.connection.connection.host}`);
      console.log(`📊 Database: ${this.connection.connection.name}`);
      
      // Handle connection events
      mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️  MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
      });

      return this.connection;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      
      // If MongoDB is not available, continue with in-memory storage
      console.log('🔄 Falling back to in-memory storage...');
      return null;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        console.log('📴 MongoDB connection closed');
      }
    } catch (error) {
      console.error('❌ Error closing MongoDB connection:', error);
    }
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  async healthCheck() {
    try {
      if (!this.isConnected()) {
        return { status: 'disconnected', message: 'Not connected to MongoDB' };
      }

      // Simple ping to check if database is responsive
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'connected',
        message: 'MongoDB is healthy',
        database: mongoose.connection.name,
        host: mongoose.connection.host,
        readyState: mongoose.connection.readyState
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'MongoDB health check failed',
        error: error.message
      };
    }
  }

  async createInitialData() {
    try {
      const User = require('../models/User');
      
      // Check if initial user already exists
      const existingUser = await User.findByTouristId('T12345');
      
      if (!existingUser) {
        // Create initial demo user
        const demoUser = new User({
          touristId: 'T12345',
          email: 'john@example.com',
          password: 'password123', // This will be automatically hashed
          profile: {
            name: 'John Traveler',
            phone: '+1-555-0123',
            nationality: 'American',
            passportNumber: 'US123456789',
            emergencyContact: '+1-555-0199'
          },
          preferences: {
            language: 'en',
            notifications: {
              email: true,
              sms: true,
              push: true
            }
          }
        });

        await demoUser.save();
        console.log('👤 Created demo user: T12345');
      }

      // Create demo officers for dashboard
      const Officer = require('../models/Officer');
      const existingOfficer = await Officer.findByOfficerId('PO001');
      
      if (!existingOfficer) {
        // Police Officer
        const policeOfficer = new Officer({
          officerId: 'PO001',
          email: 'police@travo.com',
          password: 'police123',
          profile: {
            name: 'Officer John Smith',
            department: 'police',
            role: 'officer',
            badgeNumber: 'P-12345',
            phone: '+1-555-0100',
            station: 'Central Police Station'
          }
        });
        
        // Tourism Officer  
        const tourismOfficer = new Officer({
          officerId: 'TO001',
          email: 'tourism@travo.com',
          password: 'tourism123',
          profile: {
            name: 'Sarah Tourism',
            department: 'tourism',
            role: 'supervisor',
            phone: '+1-555-0200',
            station: 'Tourism Information Center'
          },
          permissions: {
            viewAnalytics: true
          }
        });

        await policeOfficer.save();
        await tourismOfficer.save();
        console.log('👮 Created demo officers: PO001, TO001');
      }

      // Create sample geofences
      const Geofence = require('../models/Geofence');
      const existingGeofence = await Geofence.findOne({ name: 'Times Square Safe Zone' });
      
      if (!existingGeofence) {
        const sampleGeofences = [
          {
            name: 'Times Square Safe Zone',
            description: 'Well-monitored tourist area with high security',
            type: 'tourist_zone',
            geometry: {
              type: 'Circle',
              coordinates: [-73.9857, 40.7580], // Times Square coordinates
              radius: 500 // 500 meters
            },
            safetyLevel: 'very_safe',
            alertSettings: {
              sendAlertOnEntry: true,
              sendAlertOnExit: false,
              alertMessage: {
                entry: 'Welcome to Times Square! This is a monitored safe zone.',
                exit: 'You are leaving the Times Square safe zone.'
              },
              alertSeverity: 'info'
            },
            metadata: {
              city: 'New York',
              state: 'NY',
              country: 'USA',
              landmarks: ['Times Square', 'Broadway Theater District'],
              emergencyContacts: [
                { type: 'police', number: '911', description: 'Emergency Services' },
                { type: 'tourist_helpline', number: '+1-555-TOUR', description: 'Tourist Information' }
              ]
            },
            createdBy: 'TO001'
          },
          {
            name: 'Central Park Recreation Area',
            description: 'Popular park area - exercise caution after dark',
            type: 'tourist_zone',
            geometry: {
              type: 'Circle',
              coordinates: [-73.9654, 40.7829], // Central Park coordinates
              radius: 800
            },
            safetyLevel: 'safe',
            alertSettings: {
              sendAlertOnEntry: false,
              sendAlertOnExit: false,
              alertSeverity: 'info'
            },
            activeHours: {
              allDay: false,
              startTime: '06:00',
              endTime: '22:00'
            },
            metadata: {
              city: 'New York',
              state: 'NY',
              country: 'USA',
              landmarks: ['Central Park', 'Bethesda Fountain', 'Sheep Meadow']
            },
            createdBy: 'TO001'
          },
          {
            name: 'Construction Zone - 42nd Street',
            description: 'Temporary construction area with restricted access',
            type: 'restricted_area',
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [-73.9900, 40.7550],
                [-73.9850, 40.7550],
                [-73.9850, 40.7570],
                [-73.9900, 40.7570],
                [-73.9900, 40.7550]
              ]]
            },
            safetyLevel: 'unsafe',
            alertSettings: {
              sendAlertOnEntry: true,
              sendAlertOnExit: false,
              alertMessage: {
                entry: 'CAUTION: You are entering a construction zone. Be aware of your surroundings.',
                exit: 'You have left the construction zone.'
              },
              alertSeverity: 'warning',
              notifyOfficers: true
            },
            metadata: {
              city: 'New York',
              state: 'NY',
              country: 'USA',
              landmarks: ['Port Authority Bus Terminal'],
              emergencyContacts: [
                { type: 'police', number: '911', description: 'Emergency Services' }
              ]
            },
            createdBy: 'PO001'
          },
          {
            name: 'Hospital Emergency Zone',
            description: 'Area around major hospital - emergency services available',
            type: 'emergency_zone',
            geometry: {
              type: 'Circle',
              coordinates: [-73.9441, 40.7614], // Hospital coordinates
              radius: 300
            },
            safetyLevel: 'very_safe',
            alertSettings: {
              sendAlertOnEntry: true,
              alertMessage: {
                entry: 'You are near emergency medical services. Help is readily available.',
              },
              alertSeverity: 'info'
            },
            metadata: {
              city: 'New York',
              state: 'NY',
              country: 'USA',
              landmarks: ['Mount Sinai Hospital'],
              emergencyContacts: [
                { type: 'medical', number: '911', description: 'Emergency Medical Services' },
                { type: 'hospital', number: '+1-212-241-6500', description: 'Mount Sinai Hospital' }
              ]
            },
            createdBy: 'PO001'
          }
        ];

        for (const geofenceData of sampleGeofences) {
          const geofence = new Geofence(geofenceData);
          await geofence.save();
        }
        
        console.log('🗺️  Created sample geofences: Times Square, Central Park, Construction Zone, Hospital Zone');
      }

      return true;
    } catch (error) {
      console.error('❌ Error creating initial data:', error.message);
      return false;
    }
  }
}

// Export singleton instance
module.exports = new Database();