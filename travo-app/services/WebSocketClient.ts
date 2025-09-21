import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

interface EmergencyAlert {
  userId: string;
  type: 'panic' | 'medical' | 'security' | 'natural_disaster';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  message?: string;
  timestamp: number;
}

interface DashboardData {
  activeTourists: number;
  activeEmergencies: number;
  averageSafetyScore: number;
  recentAlerts: EmergencyAlert[];
  geofenceViolations: any[];
}

interface WebSocketCallbacks {
  onLocationUpdate?: (update: LocationUpdate & { userId: string }) => void;
  onEmergencyAlert?: (alert: EmergencyAlert) => void;
  onEmergencyResponse?: (response: { alertId: string; status: string; eta?: number }) => void;
  onDashboardUpdate?: (data: DashboardData) => void;
  onSafetyScoreUpdate?: (data: { userId: string; score: number; factors: any }) => void;
  onGeofenceAlert?: (data: { type: 'entry' | 'exit'; geofence: any; userId: string }) => void;
  onConnection?: () => void;
  onDisconnection?: () => void;
  onError?: (error: any) => void;
}

class WebSocketClient {
  private socket: Socket | null = null;
  private callbacks: WebSocketCallbacks = {};
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: any = null;
  private lastLocationUpdate: LocationUpdate | null = null;

  constructor() {
    this.setupHeartbeat();
  }

  /**
   * Connect to WebSocket server with authentication
   */
  async connect(serverUrl = 'http://localhost:3001'): Promise<boolean> {
    try {
      // Get authentication token
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.warn('WebSocket: No authentication token found');
        return false;
      }

      // Configure socket options
      const socketOptions = {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        forceNew: true
      };

      // Create socket connection
      this.socket = io(serverUrl, socketOptions);

      // Setup event listeners
      this.setupEventListeners();

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('WebSocket: Connection timeout');
          resolve(false);
        }, 10000);

        this.socket!.on('connect', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          console.log('WebSocket: Connected successfully');
          this.callbacks.onConnection?.();
          resolve(true);
        });

        this.socket!.on('connect_error', (error) => {
          clearTimeout(timeout);
          console.error('WebSocket: Connection error:', error);
          this.callbacks.onError?.(error);
          resolve(false);
        });
      });
    } catch (error) {
      console.error('WebSocket: Failed to connect:', error);
      this.callbacks.onError?.(error);
      return false;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.clearHeartbeat();
    console.log('WebSocket: Disconnected');
  }

  /**
   * Setup WebSocket event listeners
   */
  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('WebSocket: Connected');
      this.callbacks.onConnection?.();
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('WebSocket: Disconnected:', reason);
      this.callbacks.onDisconnection?.();

      // Auto-reconnect on unexpected disconnection
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        return;
      }
      this.handleReconnection();
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket: Connection error:', error);
      this.callbacks.onError?.(error);
      this.handleReconnection();
    });

    // Real-time data events
    this.socket.on('locationUpdate', (data) => {
      console.log('WebSocket: Location update received:', data);
      this.callbacks.onLocationUpdate?.(data);
    });

    this.socket.on('emergencyAlert', (alert) => {
      console.log('WebSocket: Emergency alert received:', alert);
      this.callbacks.onEmergencyAlert?.(alert);
    });

    this.socket.on('emergencyResponse', (response) => {
      console.log('WebSocket: Emergency response received:', response);
      this.callbacks.onEmergencyResponse?.(response);
    });

    this.socket.on('dashboardUpdate', (data) => {
      console.log('WebSocket: Dashboard update received');
      this.callbacks.onDashboardUpdate?.(data);
    });

    this.socket.on('safetyScoreUpdate', (data) => {
      console.log('WebSocket: Safety score update received:', data);
      this.callbacks.onSafetyScoreUpdate?.(data);
    });

    this.socket.on('geofenceAlert', (data) => {
      console.log('WebSocket: Geofence alert received:', data);
      this.callbacks.onGeofenceAlert?.(data);
    });

    // Heartbeat response
    this.socket.on('pong', () => {
      console.log('WebSocket: Heartbeat pong received');
    });
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('WebSocket: Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`WebSocket: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Setup heartbeat mechanism
   */
  private setupHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.socket) {
        this.socket.emit('ping');
      }
    }, 30000); // Send ping every 30 seconds
  }

  /**
   * Clear heartbeat interval
   */
  private clearHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send location update to server
   */
  sendLocationUpdate(location: LocationUpdate): boolean {
    if (!this.isConnected || !this.socket) {
      console.warn('WebSocket: Not connected, cannot send location update');
      return false;
    }

    // Throttle location updates (max 1 per 5 seconds)
    const now = Date.now();
    if (this.lastLocationUpdate && (now - this.lastLocationUpdate.timestamp) < 5000) {
      return false;
    }

    const locationData = {
      ...location,
      timestamp: now
    };

    this.socket.emit('locationUpdate', locationData);
    this.lastLocationUpdate = locationData;
    console.log('WebSocket: Location update sent');
    return true;
  }

  /**
   * Send emergency alert
   */
  sendEmergencyAlert(alert: Omit<EmergencyAlert, 'userId' | 'timestamp'>): boolean {
    if (!this.isConnected || !this.socket) {
      console.warn('WebSocket: Not connected, cannot send emergency alert');
      return false;
    }

    const emergencyData = {
      ...alert,
      timestamp: Date.now()
    };

    this.socket.emit('emergencyAlert', emergencyData);
    console.log('WebSocket: Emergency alert sent:', emergencyData);
    return true;
  }

  /**
   * Join dashboard room (for officers/administrators)
   */
  joinDashboard(): boolean {
    if (!this.isConnected || !this.socket) {
      console.warn('WebSocket: Not connected, cannot join dashboard');
      return false;
    }

    this.socket.emit('joinDashboard');
    console.log('WebSocket: Joined dashboard room');
    return true;
  }

  /**
   * Leave dashboard room
   */
  leaveDashboard(): boolean {
    if (!this.isConnected || !this.socket) {
      return false;
    }

    this.socket.emit('leaveDashboard');
    console.log('WebSocket: Left dashboard room');
    return true;
  }

  /**
   * Set event callbacks
   */
  setCallbacks(callbacks: WebSocketCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get socket instance (for advanced usage)
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Export singleton instance
export const webSocketClient = new WebSocketClient();
export default WebSocketClient;
export type { LocationUpdate, EmergencyAlert, DashboardData, WebSocketCallbacks };