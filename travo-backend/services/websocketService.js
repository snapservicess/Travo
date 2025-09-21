/**
 * WebSocket Service for Real-time Communication
 * Handles live location updates, emergency broadcasts, and dashboard notifications
 */

const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { jwtService } = require('../utils/jwt');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // Map of userId -> socket info
    this.connectedOfficers = new Map(); // Map of officerId -> socket info
    this.activeEmergencies = new Map(); // Map of emergencyId -> emergency data
    this.locationUpdates = new Map(); // Map of userId -> latest location
    this.roomSubscriptions = new Map(); // Map of roomId -> subscribers
  }

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer) {
    this.io = socketIo(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || ["http://localhost:19006", "exp://192.168.1.0:19000"],
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Authentication middleware
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      try {
        // Verify JWT token
        const decoded = jwtService.verifyToken(token);
        socket.userId = decoded.id;
        socket.userType = decoded.type; // 'tourist' or 'officer'
        socket.touristId = decoded.touristId;
        
        console.log(`🔌 WebSocket authenticated: ${socket.userType} ${socket.userId}`);
        next();
      } catch (error) {
        console.error('WebSocket auth error:', error);
        next(new Error('Invalid authentication token'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    console.log('🌐 WebSocket server initialized');
    return this.io;
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(socket) {
    const { userId, userType, touristId } = socket;

    // Store connection info
    const connectionInfo = {
      socketId: socket.id,
      userId,
      userType,
      touristId,
      connectedAt: new Date(),
      lastActivity: new Date()
    };

    if (userType === 'tourist') {
      this.connectedUsers.set(userId, connectionInfo);
      console.log(`👤 Tourist connected: ${touristId} (${this.connectedUsers.size} total)`);
      
      // Join personal room for targeted updates
      socket.join(`user_${userId}`);
      
      // Notify dashboard of new tourist connection
      this.broadcastToDashboard('tourist_connected', {
        touristId,
        userId,
        timestamp: new Date()
      });
      
    } else if (userType === 'officer') {
      this.connectedOfficers.set(userId, connectionInfo);
      console.log(`👮 Officer connected: ${userId} (${this.connectedOfficers.size} total)`);
      
      // Join dashboard room for real-time updates
      socket.join('dashboard');
      
      // Send current system status
      socket.emit('dashboard_status', {
        connectedTourists: this.connectedUsers.size,
        activeEmergencies: this.activeEmergencies.size,
        onlineOfficers: this.connectedOfficers.size
      });
    }

    // Location Update Handler
    socket.on('location_update', (data) => {
      this.handleLocationUpdate(socket, data);
    });

    // Emergency Alert Handler
    socket.on('emergency_alert', (data) => {
      this.handleEmergencyAlert(socket, data);
    });

    // Emergency Status Update Handler
    socket.on('emergency_status_update', (data) => {
      this.handleEmergencyStatusUpdate(socket, data);
    });

    // Join Location Area Handler
    socket.on('join_location_area', (data) => {
      this.handleJoinLocationArea(socket, data);
    });

    // Dashboard Command Handler (Officers only)
    socket.on('dashboard_command', (data) => {
      if (userType === 'officer') {
        this.handleDashboardCommand(socket, data);
      }
    });

    // Safety Score Request Handler
    socket.on('request_safety_score', (data) => {
      this.handleSafetyScoreRequest(socket, data);
    });

    // Geofence Event Handler
    socket.on('geofence_event', (data) => {
      this.handleGeofenceEvent(socket, data);
    });

    // Heartbeat Handler
    socket.on('heartbeat', () => {
      connectionInfo.lastActivity = new Date();
      socket.emit('heartbeat_ack');
    });

    // Disconnect Handler
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Send welcome message
    socket.emit('connected', {
      message: 'WebSocket connection established',
      userId,
      userType,
      serverTime: new Date()
    });
  }

  /**
   * Handle real-time location updates
   */
  handleLocationUpdate(socket, data) {
    const { userId, userType, touristId } = socket;
    
    if (userType !== 'tourist') return;

    const locationData = {
      userId,
      touristId,
      coordinates: data.coordinates,
      accuracy: data.accuracy,
      timestamp: new Date(data.timestamp) || new Date(),
      speed: data.speed,
      heading: data.heading,
      address: data.address
    };

    // Store latest location
    this.locationUpdates.set(userId, locationData);

    // Broadcast to dashboard
    this.broadcastToDashboard('location_update', locationData);

    // Check for nearby officers (within 5km)
    this.notifyNearbyOfficers(locationData, 5000);

    // Emit location update confirmation to user
    socket.emit('location_update_ack', {
      status: 'received',
      timestamp: new Date()
    });

    console.log(`📍 Location update: ${touristId} at ${data.coordinates.latitude}, ${data.coordinates.longitude}`);
  }

  /**
   * Handle emergency alerts
   */
  handleEmergencyAlert(socket, data) {
    const { userId, userType, touristId } = socket;
    
    if (userType !== 'tourist') return;

    const emergencyId = `EMG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const emergencyData = {
      emergencyId,
      userId,
      touristId,
      type: data.type || 'sos',
      severity: data.severity || 'high',
      location: data.location,
      message: data.message,
      timestamp: new Date(),
      status: 'active',
      responseTeam: []
    };

    // Store emergency
    this.activeEmergencies.set(emergencyId, emergencyData);

    // Broadcast critical alert to all officers
    this.broadcastToDashboard('emergency_alert', emergencyData);

    // Broadcast to all nearby tourists (within 2km)
    this.broadcastToNearbyTourists(emergencyData.location, 2000, 'nearby_emergency', {
      emergencyId,
      type: emergencyData.type,
      location: emergencyData.location,
      message: 'Emergency reported in your area. Stay alert and follow safety guidelines.',
      severity: 'warning'
    });

    // Notify emergency contacts if available
    this.notifyEmergencyContacts(userId, emergencyData);

    // Send confirmation to user
    socket.emit('emergency_alert_ack', {
      emergencyId,
      status: 'broadcasted',
      responseTime: '2-5 minutes',
      timestamp: new Date()
    });

    console.log(`🚨 Emergency alert: ${emergencyId} from ${touristId}`);
  }

  /**
   * Handle emergency status updates from officers
   */
  handleEmergencyStatusUpdate(socket, data) {
    const { userId, userType } = socket;
    
    if (userType !== 'officer') return;

    const { emergencyId, status, notes, officerId } = data;
    const emergency = this.activeEmergencies.get(emergencyId);
    
    if (!emergency) return;

    // Update emergency status
    emergency.status = status;
    emergency.lastUpdate = new Date();
    emergency.responseTeam.push({
      officerId,
      action: status,
      notes,
      timestamp: new Date()
    });

    // Notify the tourist
    this.io.to(`user_${emergency.userId}`).emit('emergency_status_update', {
      emergencyId,
      status,
      message: this.getStatusMessage(status),
      officerId,
      timestamp: new Date()
    });

    // Broadcast to dashboard
    this.broadcastToDashboard('emergency_status_update', {
      emergencyId,
      status,
      officerId,
      timestamp: new Date()
    });

    // Remove from active emergencies if resolved
    if (status === 'resolved' || status === 'closed') {
      this.activeEmergencies.delete(emergencyId);
    }

    console.log(`🔄 Emergency ${emergencyId} status updated to: ${status}`);
  }

  /**
   * Handle joining location area for regional updates
   */
  handleJoinLocationArea(socket, data) {
    const { coordinates, radius = 5000 } = data; // radius in meters
    
    // Create location area room ID
    const areaId = this.getAreaId(coordinates, radius);
    
    // Join area room
    socket.join(`area_${areaId}`);
    
    socket.emit('area_joined', {
      areaId,
      coordinates,
      radius,
      timestamp: new Date()
    });

    console.log(`📍 User joined location area: ${areaId}`);
  }

  /**
   * Handle dashboard commands from officers
   */
  handleDashboardCommand(socket, data) {
    const { command, payload } = data;

    switch (command) {
      case 'broadcast_safety_alert':
        this.broadcastSafetyAlert(payload);
        break;
      case 'request_tourist_location':
        this.requestTouristLocation(payload.touristId);
        break;
      case 'send_assistance':
        this.sendAssistance(payload);
        break;
      default:
        console.log(`Unknown dashboard command: ${command}`);
    }
  }

  /**
   * Handle safety score requests
   */
  handleSafetyScoreRequest(socket, data) {
    const { coordinates } = data;
    
    // Calculate safety score based on current data
    const safetyScore = this.calculateRealTimeSafetyScore(coordinates);
    
    socket.emit('safety_score_update', safetyScore);
  }

  /**
   * Handle geofence events
   */
  handleGeofenceEvent(socket, data) {
    const { userId, touristId } = socket;
    const { geofenceId, eventType, geofenceName, safetyLevel } = data;

    const geofenceEvent = {
      userId,
      touristId,
      geofenceId,
      eventType, // 'entry' or 'exit'
      geofenceName,
      safetyLevel,
      timestamp: new Date()
    };

    // Broadcast to dashboard
    this.broadcastToDashboard('geofence_event', geofenceEvent);

    // Send notification based on safety level
    if (safetyLevel === 'dangerous' || safetyLevel === 'unsafe') {
      socket.emit('safety_alert', {
        type: 'geofence_warning',
        message: `You have ${eventType === 'entry' ? 'entered' : 'left'} a ${safetyLevel} area: ${geofenceName}`,
        severity: safetyLevel === 'dangerous' ? 'high' : 'medium'
      });
    }

    console.log(`📍 Geofence ${eventType}: ${touristId} ${eventType} ${geofenceName}`);
  }

  /**
   * Handle disconnection
   */
  handleDisconnection(socket, reason) {
    const { userId, userType, touristId } = socket;

    if (userType === 'tourist') {
      this.connectedUsers.delete(userId);
      console.log(`👤 Tourist disconnected: ${touristId} (${reason})`);
      
      // Notify dashboard
      this.broadcastToDashboard('tourist_disconnected', {
        touristId,
        userId,
        reason,
        timestamp: new Date()
      });
    } else if (userType === 'officer') {
      this.connectedOfficers.delete(userId);
      console.log(`👮 Officer disconnected: ${userId} (${reason})`);
    }
  }

  /**
   * Broadcast message to dashboard (all connected officers)
   */
  broadcastToDashboard(event, data) {
    this.io.to('dashboard').emit(event, {
      ...data,
      serverTime: new Date()
    });
  }

  /**
   * Notify nearby officers about location updates
   */
  notifyNearbyOfficers(locationData, radiusMeters) {
    // In a real implementation, this would query officer locations
    // For now, notify all connected officers
    this.broadcastToDashboard('tourist_location_update', locationData);
  }

  /**
   * Broadcast to tourists in a specific area
   */
  broadcastToNearbyTourists(center, radiusMeters, event, data) {
    // In a real implementation, this would use geospatial queries
    // For now, broadcast to all connected tourists
    for (const [userId, userInfo] of this.connectedUsers.entries()) {
      this.io.to(`user_${userId}`).emit(event, data);
    }
  }

  /**
   * Notify emergency contacts via other channels
   */
  async notifyEmergencyContacts(userId, emergencyData) {
    // This would integrate with the notification service
    console.log(`📞 Notifying emergency contacts for user ${userId}`);
  }

  /**
   * Broadcast safety alert to all tourists
   */
  broadcastSafetyAlert(alertData) {
    this.io.emit('safety_alert', {
      ...alertData,
      timestamp: new Date()
    });
    
    console.log(`📢 Safety alert broadcasted: ${alertData.message}`);
  }

  /**
   * Request current location from specific tourist
   */
  requestTouristLocation(touristId) {
    // Find user by touristId
    for (const [userId, userInfo] of this.connectedUsers.entries()) {
      if (userInfo.touristId === touristId) {
        this.io.to(`user_${userId}`).emit('location_request', {
          message: 'Dashboard requesting current location',
          timestamp: new Date()
        });
        break;
      }
    }
  }

  /**
   * Send assistance to tourist
   */
  sendAssistance(assistanceData) {
    const { touristId, message, assistanceType } = assistanceData;
    
    // Find and notify tourist
    for (const [userId, userInfo] of this.connectedUsers.entries()) {
      if (userInfo.touristId === touristId) {
        this.io.to(`user_${userId}`).emit('assistance_incoming', {
          type: assistanceType,
          message,
          eta: '5-10 minutes',
          timestamp: new Date()
        });
        break;
      }
    }
  }

  /**
   * Calculate real-time safety score
   */
  calculateRealTimeSafetyScore(coordinates) {
    // Simplified safety score calculation
    const baseScore = 75;
    const timeOfDay = new Date().getHours();
    const nightPenalty = (timeOfDay < 6 || timeOfDay > 22) ? -15 : 0;
    const connectedUsersBonus = Math.min(this.connectedUsers.size, 10);
    
    return {
      score: Math.max(0, Math.min(100, baseScore + nightPenalty + connectedUsersBonus)),
      factors: {
        timeOfDay: timeOfDay,
        nearbyUsers: this.connectedUsers.size,
        activeEmergencies: this.activeEmergencies.size
      },
      timestamp: new Date()
    };
  }

  /**
   * Get area ID for location-based rooms
   */
  getAreaId(coordinates, radius) {
    // Simplified area ID based on rounded coordinates
    const lat = Math.round(coordinates.latitude * 100) / 100;
    const lng = Math.round(coordinates.longitude * 100) / 100;
    return `${lat}_${lng}_${radius}`;
  }

  /**
   * Get status message for emergency updates
   */
  getStatusMessage(status) {
    const messages = {
      'acknowledged': 'Your emergency alert has been received by authorities',
      'responding': 'Emergency responders are on their way',
      'on_scene': 'Emergency responders have arrived at your location',
      'resolved': 'Emergency situation has been resolved',
      'closed': 'Emergency case has been closed'
    };
    
    return messages[status] || `Emergency status updated to: ${status}`;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      connectedTourists: this.connectedUsers.size,
      connectedOfficers: this.connectedOfficers.size,
      activeEmergencies: this.activeEmergencies.size,
      locationUpdates: this.locationUpdates.size,
      uptime: process.uptime()
    };
  }
}

module.exports = new WebSocketService();