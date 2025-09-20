import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationData {
  coordinates: LocationCoordinates;
  altitude?: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  address?: {
    formatted?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    landmark?: string;
  };
  timestamp?: Date;
}

export interface LocationSession {
  sessionId: string;
  touristId: string;
  startTime: Date;
  isActive: boolean;
}

export interface SafetyStatus {
  status: 'active' | 'inactive' | 'emergency' | 'unknown';
  message: string;
  lastSeen: Date | null;
  safetyScore: number;
  location?: {
    coordinates: LocationCoordinates;
    address?: string;
  };
  recommendations: string[];
}

export interface GeofenceEvent {
  type: 'geofence_entry' | 'geofence_exit';
  geofenceId: string;
  geofenceName: string;
  safetyLevel: string;
  alertTriggered: boolean;
  timestamp: Date;
}

export interface LocationUpdateResponse {
  success: boolean;
  locationId: string;
  sessionId: string;
  safetyScore: number;
  geofenceEvents: GeofenceEvent[];
  safetyAlerts: {
    type: string;
    message: string;
  }[];
  recommendations: string[];
  emergency?: {
    isEmergency: boolean;
    emergencyType: string;
    confidence: number;
  };
}

class LocationService {
  private baseUrl = 'http://localhost:3001/api';
  private currentSession: LocationSession | null = null;
  private isTracking = false;
  private locationSubscription: Location.LocationSubscription | null = null;
  private updateInterval = 10000; // 10 seconds
  private authToken: string | null = null;

  // Set authentication token
  setAuthToken(token: string) {
    this.authToken = token;
  }

  // Request location permissions
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        console.warn('Foreground location permission not granted');
        return false;
      }

      // For background location (optional)
      if (Platform.OS === 'ios') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          console.warn('Background location permission not granted');
        }
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  // Start location tracking session
  async startLocationSession(touristId: string, initialLocation?: LocationData): Promise<LocationSession | null> {
    try {
      if (!this.authToken) {
        throw new Error('Authentication token required');
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Location permissions not granted');
      }

      // Get initial location if not provided
      let locationData = initialLocation;
      if (!locationData) {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        
        locationData = {
          coordinates: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          altitude: location.coords.altitude || undefined,
          accuracy: location.coords.accuracy,
          heading: location.coords.heading || undefined,
          speed: location.coords.speed || undefined,
          timestamp: new Date(location.timestamp),
        };
      }

      const response = await fetch(`${this.baseUrl}/location/start-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          initialLocation: locationData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        this.currentSession = {
          sessionId: data.sessionId,
          touristId: data.touristId,
          startTime: new Date(),
          isActive: true,
        };

        console.log('✅ Location session started:', data.sessionId);
        return this.currentSession;
      } else {
        throw new Error(data.message || 'Failed to start location session');
      }
    } catch (error) {
      console.error('Error starting location session:', error);
      return null;
    }
  }

  // Start continuous location tracking
  async startTracking(onLocationUpdate?: (response: LocationUpdateResponse) => void): Promise<boolean> {
    try {
      if (!this.currentSession) {
        throw new Error('No active session. Start a session first.');
      }

      if (this.isTracking) {
        console.warn('Location tracking already active');
        return true;
      }

      this.isTracking = true;

      // Start watching location changes
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: this.updateInterval,
          distanceInterval: 10, // Update when moved 10 meters
        },
        async (location: Location.LocationObject) => {
          try {
            const response = await this.updateLocation({
              coordinates: {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              },
              altitude: location.coords.altitude || undefined,
              accuracy: location.coords.accuracy,
              heading: location.coords.heading || undefined,
              speed: location.coords.speed || undefined,
              timestamp: new Date(location.timestamp),
            });

            if (response && onLocationUpdate) {
              onLocationUpdate(response);
            }
          } catch (error) {
            console.error('Error updating location:', error);
          }
        }
      );

      console.log('✅ Location tracking started');
      return true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      this.isTracking = false;
      return false;
    }
  }

  // Update location manually
  async updateLocation(locationData: LocationData): Promise<LocationUpdateResponse | null> {
    try {
      if (!this.currentSession || !this.authToken) {
        throw new Error('No active session or authentication token');
      }

      // Get battery level if available
      const battery = await this.getBatteryInfo();
      
      // Get network info if available
      const networkInfo = await this.getNetworkInfo();

      const response = await fetch(`${this.baseUrl}/location/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          sessionId: this.currentSession.sessionId,
          coordinates: locationData.coordinates,
          altitude: locationData.altitude,
          accuracy: locationData.accuracy,
          heading: locationData.heading,
          speed: locationData.speed,
          address: locationData.address,
          battery,
          networkInfo,
        }),
      });

      const data = await response.json();

      if (data.success) {
        return data as LocationUpdateResponse;
      } else {
        throw new Error(data.message || 'Failed to update location');
      }
    } catch (error) {
      console.error('Error updating location:', error);
      return null;
    }
  }

  // Get current safety status
  async getSafetyStatus(): Promise<SafetyStatus | null> {
    try {
      if (!this.authToken) {
        throw new Error('Authentication token required');
      }

      const response = await fetch(`${this.baseUrl}/location/safety-status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        return data.safetyStatus;
      } else {
        throw new Error(data.message || 'Failed to get safety status');
      }
    } catch (error) {
      console.error('Error getting safety status:', error);
      return null;
    }
  }

  // Get location history
  async getLocationHistory(hours = 24, limit = 100, includeEvents = false): Promise<any[]> {
    try {
      if (!this.authToken) {
        throw new Error('Authentication token required');
      }

      const params = new URLSearchParams({
        hours: hours.toString(),
        limit: limit.toString(),
        includeEvents: includeEvents.toString(),
      });

      const response = await fetch(`${this.baseUrl}/location/history?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        return data.history;
      } else {
        throw new Error(data.message || 'Failed to get location history');
      }
    } catch (error) {
      console.error('Error getting location history:', error);
      return [];
    }
  }

  // Get enhanced safety score
  async getEnhancedSafetyScore(coordinates?: LocationCoordinates): Promise<any | null> {
    try {
      if (!this.authToken) {
        throw new Error('Authentication token required');
      }

      let url = `${this.baseUrl}/safety/enhanced-score`;
      if (coordinates) {
        const params = new URLSearchParams({
          lat: coordinates.latitude.toString(),
          lng: coordinates.longitude.toString(),
        });
        url += `?${params}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        return data.safetyData;
      } else {
        throw new Error(data.message || 'Failed to get safety score');
      }
    } catch (error) {
      console.error('Error getting enhanced safety score:', error);
      return null;
    }
  }

  // Stop location tracking
  async stopTracking(): Promise<void> {
    try {
      if (this.locationSubscription) {
        this.locationSubscription.remove();
        this.locationSubscription = null;
      }

      this.isTracking = false;
      console.log('✅ Location tracking stopped');
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  }

  // End location session
  async endLocationSession(): Promise<boolean> {
    try {
      if (!this.currentSession || !this.authToken) {
        return false;
      }

      // Stop tracking first
      await this.stopTracking();

      const response = await fetch(`${this.baseUrl}/location/end-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          sessionId: this.currentSession.sessionId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Location session ended:', data.summary);
        this.currentSession = null;
        return true;
      } else {
        throw new Error(data.message || 'Failed to end location session');
      }
    } catch (error) {
      console.error('Error ending location session:', error);
      return false;
    }
  }

  // Get current session info
  getCurrentSession(): LocationSession | null {
    return this.currentSession;
  }

  // Check if tracking is active
  isActivelyTracking(): boolean {
    return this.isTracking;
  }

  // Helper method to get battery info
  private async getBatteryInfo(): Promise<{ level: number; isCharging: boolean } | undefined> {
    try {
      // This would require expo-battery or similar package
      // For now, return undefined
      return undefined;
    } catch {
      return undefined;
    }
  }

  // Helper method to get network info
  private async getNetworkInfo(): Promise<{ connectionType: string; signalStrength?: number } | undefined> {
    // This would require @react-native-community/netinfo or similar package
    // For now, return basic info
    return { connectionType: 'wifi' };
  }
}

export default new LocationService();