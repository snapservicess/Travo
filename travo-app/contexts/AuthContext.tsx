import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import LocationService from '@/services/LocationService';
import * as Location from 'expo-location';

interface UserProfile {
  name?: string;
  email?: string;
  phone?: string;
  emergencyContacts: EmergencyContact[];
  locationPreferences: {
    trackingEnabled: boolean;
    highAccuracyMode: boolean;
    backgroundTracking: boolean;
    shareLocation: boolean;
  };
  safetyPreferences: {
    alertsEnabled: boolean;
    emergencyAutoCall: boolean;
    safetyReminders: boolean;
    riskTolerance: 'low' | 'medium' | 'high';
  };
}

interface SafetyStatus {
  currentScore: number;
  lastUpdated: Date;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  recommendations: string[];
  activeAlerts: {
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
  }[];
}

interface LocationPermissions {
  foreground: boolean;
  background: boolean;
  requested: boolean;
}

interface EmergencyContact {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  relationship: 'family' | 'friend' | 'colleague' | 'partner' | 'parent' | 'sibling' | 'other';
  isPrimary?: boolean;
  isActive?: boolean;
  addedAt?: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  touristId: string;
  userToken: string | null;
  userProfile: UserProfile | null;
  safetyStatus: SafetyStatus | null;
  locationPermissions: LocationPermissions;
  login: (touristId: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  updateProfile: (profile: Partial<UserProfile>) => Promise<boolean>;
  refreshSafetyStatus: () => Promise<void>;
  requestLocationPermissions: () => Promise<boolean>;
  updateLocationPreferences: (preferences: UserProfile['locationPreferences']) => Promise<boolean>;
  // Emergency contact management
  addEmergencyContact: (contact: EmergencyContact) => Promise<{ success: boolean; contact?: EmergencyContact }>;
  updateEmergencyContact: (contactId: string, updates: Partial<EmergencyContact>) => Promise<boolean>;
  removeEmergencyContact: (contactId: string) => Promise<boolean>;
  testNotificationChannels: (channels?: string[]) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API Configuration
const API_BASE_URL = 'http://192.168.1.100:3001/api'; // Update this IP to your computer's IP
// For testing on same machine, you can also use: http://10.0.2.2:3001/api (Android emulator)
// or http://localhost:3001/api (iOS simulator)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [touristId, setTouristId] = useState('');
  const [userToken, setUserToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [safetyStatus, setSafetyStatus] = useState<SafetyStatus | null>(null);
  const [locationPermissions, setLocationPermissions] = useState<LocationPermissions>({
    foreground: false,
    background: false,
    requested: false,
  });

  const loadUserProfile = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserProfile(data.profile);
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Set default profile if API fails
      setUserProfile({
        emergencyContacts: [],
        locationPreferences: {
          trackingEnabled: true,
          highAccuracyMode: false,
          backgroundTracking: false,
          shareLocation: true,
        },
        safetyPreferences: {
          alertsEnabled: true,
          emergencyAutoCall: false,
          safetyReminders: true,
          riskTolerance: 'medium',
        },
      });
    }
  }, [userToken]);

  // Initialize location service when user token changes
  useEffect(() => {
    const initializeServices = async () => {
      if (userToken && userToken !== 'demo-token') {
        LocationService.setAuthToken(userToken);
        await loadUserProfile();
        await refreshSafetyStatus();
      }
    };

    initializeServices();
  }, [userToken, loadUserProfile]);

  const login = async (touristId: string, password: string): Promise<boolean> => {
    if (!touristId.trim() || !password.trim()) {
      return false;
    }

    setLoading(true);

    // Fast demo login for testing
    if (touristId.toUpperCase() === 'DEMO' && password === 'demo123') {
      console.log('🚀 Fast demo login activated');
      setIsLoggedIn(true);
      setTouristId('DEMO');
      setUserToken('demo-token-' + Date.now());
      
      // Set demo profile immediately
      setUserProfile({
        name: 'Demo Tourist',
        email: 'demo@travo.com',
        phone: '+1234567890',
        emergencyContacts: [
          {
            name: 'Emergency Contact',
            phone: '+1234567899',
            email: 'emergency@example.com',
            relationship: 'family',
            isPrimary: true
          }
        ],
        locationPreferences: {
          trackingEnabled: true,
          highAccuracyMode: false,
          backgroundTracking: false,
          shareLocation: true,
        },
        safetyPreferences: {
          alertsEnabled: true,
          emergencyAutoCall: false,
          safetyReminders: true,
          riskTolerance: 'medium',
        },
      });

      setLoading(false);
      return true;
    }

    try {
      // Set a timeout for the login request to make it fail fast
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          touristId: touristId.trim(),
          password: password.trim(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (data.success && data.user) {
        console.log('✅ Login successful');
        setIsLoggedIn(true);
        setTouristId(touristId.trim());
        setUserToken(data.accessToken || 'authenticated-token');
        
        // Set user profile from login response
        if (data.user) {
          setUserProfile({
            name: data.user.name,
            email: data.user.email,
            phone: data.user.phone,
            emergencyContacts: [],
            locationPreferences: {
              trackingEnabled: true,
              highAccuracyMode: false,
              backgroundTracking: false,
              shareLocation: true,
            },
            safetyPreferences: {
              alertsEnabled: true,
              emergencyAutoCall: false,
              safetyReminders: true,
              riskTolerance: 'medium',
            },
          });
        }

        setLoading(false);
        return true;
      } else {
        console.error('Login failed:', data.message);
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Check if it's a timeout or network error - offer demo fallback
      if ((error as any)?.name === 'AbortError' || (error as any)?.message?.includes('Network')) {
        console.log('🔄 Network timeout - enabling demo mode...');
        setIsLoggedIn(true);
        setTouristId('DEMO-OFFLINE');
        setUserToken('demo-offline-token');
        
        setUserProfile({
          name: 'Demo User (Offline)',
          email: 'demo@travo.com',
          phone: '+1234567890',
          emergencyContacts: [],
          locationPreferences: {
            trackingEnabled: true,
            highAccuracyMode: false,
            backgroundTracking: false,
            shareLocation: true,
          },
          safetyPreferences: {
            alertsEnabled: true,
            emergencyAutoCall: false,
            safetyReminders: true,
            riskTolerance: 'medium',
          },
        });

        setLoading(false);
        return true;
      }
      
      setLoading(false);
      return false;
    }
  };

  const refreshSafetyStatus = async () => {
    try {
      const status = await LocationService.getSafetyStatus();
      if (status) {
        setSafetyStatus({
          currentScore: status.safetyScore,
          lastUpdated: new Date(),
          location: status.location ? {
            latitude: status.location.coordinates.latitude,
            longitude: status.location.coordinates.longitude,
            address: status.location.address,
          } : undefined,
          recommendations: status.recommendations,
          activeAlerts: [], // Will be populated by notification system
        });
      }
    } catch (error) {
      console.error('Error refreshing safety status:', error);
    }
  };

  const requestLocationPermissions = async (): Promise<boolean> => {
    try {
      const hasPermission = await LocationService.requestPermissions();
      
      // Check specific permission types
      const foregroundStatus = await Location.getForegroundPermissionsAsync();
      const backgroundStatus = await Location.getBackgroundPermissionsAsync();
      
      const permissions = {
        foreground: foregroundStatus.granted,
        background: backgroundStatus.granted,
        requested: true,
      };
      
      setLocationPermissions(permissions);
      return hasPermission;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  };

  const updateProfile = async (profileUpdates: Partial<UserProfile>): Promise<boolean> => {
    try {
      if (!userToken || userToken === 'demo-token') {
        // Update local profile in demo mode
        setUserProfile(prev => prev ? { ...prev, ...profileUpdates } : null);
        return true;
      }

      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify(profileUpdates),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserProfile(prev => prev ? { ...prev, ...profileUpdates } : null);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  };

  const updateLocationPreferences = async (preferences: UserProfile['locationPreferences']): Promise<boolean> => {
    const success = await updateProfile({ locationPreferences: preferences });
    
    if (success && preferences.trackingEnabled) {
      // Start location session if tracking is enabled
      try {
        await LocationService.startLocationSession(touristId);
        if (preferences.backgroundTracking) {
          await LocationService.startTracking();
        }
      } catch (error) {
        console.error('Error starting location tracking:', error);
      }
    } else if (success && !preferences.trackingEnabled) {
      // Stop tracking if disabled
      try {
        await LocationService.stopTracking();
        await LocationService.endLocationSession();
      } catch (error) {
        console.error('Error stopping location tracking:', error);
      }
    }
    
    return success;
  };

  // Emergency contact management
  const addEmergencyContact = useCallback(async (contact: EmergencyContact): Promise<{ success: boolean; contact?: EmergencyContact }> => {
    if (!userToken) {
      throw new Error('User not authenticated');
    }

    try {
      // Validate required fields
      if (!contact.name || !contact.phone || !contact.relationship) {
        throw new Error('Name, phone, and relationship are required for emergency contacts');
      }

      const response = await fetch(`${API_BASE_URL}/profile/emergency-contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          ...contact,
          addedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update local state
        setUserProfile(prev => prev ? {
          ...prev,
          emergencyContacts: [...(prev.emergencyContacts || []), result.contact]
        } : prev);
        
        // Test emergency contact notification system
        try {
          console.log('🧪 Testing emergency contact notification system for:', result.contact.name);
          
          const testResponse = await fetch(`${API_BASE_URL}/notifications/test-channels`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify({
              email: result.contact.email,
              phone: result.contact.phone,
              channels: ['email', 'sms'],
              testType: 'emergency_contact_verification'
            })
          });

          if (testResponse.ok) {
            console.log('✅ Emergency contact notification test successful');
          }
        } catch (testError) {
          console.warn('Emergency contact test notification failed:', testError);
        }
        
        return { success: true, contact: result.contact };
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add emergency contact');
      }
    } catch (error) {
      console.error('Failed to add emergency contact:', error);
      throw error;
    }
  }, [userToken]);



  const updateEmergencyContact = useCallback(async (contactId: string, updates: Partial<EmergencyContact>): Promise<boolean> => {
    if (!userToken) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/profile/emergency-contacts/${contactId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        // Update local state
        setUserProfile(prev => prev ? {
          ...prev,
          emergencyContacts: prev.emergencyContacts.map(contact => 
            contact.id === contactId ? { ...contact, ...updates } : contact
          )
        } : prev);
        
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update emergency contact');
      }
    } catch (error) {
      console.error('Failed to update emergency contact:', error);
      throw error;
    }
  }, [userToken]);

  const removeEmergencyContact = useCallback(async (contactId: string): Promise<boolean> => {
    if (!userToken) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/profile/emergency-contacts/${contactId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (response.ok) {
        // Update local state
        setUserProfile(prev => prev ? {
          ...prev,
          emergencyContacts: prev.emergencyContacts.filter(contact => contact.id !== contactId)
        } : prev);
        
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove emergency contact');
      }
    } catch (error) {
      console.error('Failed to remove emergency contact:', error);
      throw error;
    }
  }, [userToken]);

  const testNotificationChannels = useCallback(async (channels: string[] = ['push', 'email', 'sms']) => {
    if (!userToken || !userProfile) {
      throw new Error('User not authenticated or profile not loaded');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/test-channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          email: userProfile.email,
          phone: userProfile.phone,
          channels,
          testType: 'user_channel_verification'
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to test notification channels');
      }
    } catch (error) {
      console.error('Failed to test notification channels:', error);
      throw error;
    }
  }, [userToken, userProfile]);

  const logout = async () => {
    // Stop any active location tracking
    try {
      await LocationService.stopTracking();
      await LocationService.endLocationSession();
    } catch (error) {
      console.error('Error stopping location services during logout:', error);
    }

    // Clear all state
    setIsLoggedIn(false);
    setTouristId('');
    setUserToken(null);
    setUserProfile(null);
    setSafetyStatus(null);
    setLocationPermissions({
      foreground: false,
      background: false,
      requested: false,
    });
  };

  return (
    <AuthContext.Provider 
      value={{ 
        isLoggedIn, 
        touristId, 
        userToken, 
        userProfile,
        safetyStatus,
        locationPermissions,
        login, 
        logout, 
        loading,
        updateProfile,
        refreshSafetyStatus,
        requestLocationPermissions,
        updateLocationPreferences,
        addEmergencyContact,
        updateEmergencyContact,
        removeEmergencyContact,
        testNotificationChannels,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}