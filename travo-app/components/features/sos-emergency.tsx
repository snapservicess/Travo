import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Linking, ActivityIndicator, Platform, Vibration } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '../ui/icon-symbol';
import { useNavigation } from '@/contexts/NavigationContext';
import { useAuth } from '@/contexts/AuthContext';
import LocationService from '@/services/LocationService';
import { useWebSocket, useEmergencyAlerts } from '@/hooks/useWebSocket';
import * as Location from 'expo-location';

// API Configuration
const API_BASE_URL = 'http://192.168.1.100:3001/api'; // Update this IP to your computer's IP

interface EmergencyStatus {
  isActive: boolean;
  emergencyId?: string;
  startTime?: Date;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  safetyScore?: number;
  recommendations?: string[];
}

export default function SOSEmergency() {
  const [emergencyStatus, setEmergencyStatus] = useState<EmergencyStatus>({ isActive: false });
  const [isSendingAlert, setIsSendingAlert] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationSession, setLocationSession] = useState<any>(null);
  
  const colorScheme = useColorScheme();
  const { userToken, touristId } = useAuth();

  // WebSocket integration for real-time emergency alerts
  const { isConnected, error } = useWebSocket({
    autoConnect: true,
    callbacks: {
      onEmergencyResponse: (response) => {
        Alert.alert(
          'Emergency Response',
          `Emergency services are responding. ETA: ${response.eta || 'Unknown'}`,
          [{ text: 'OK' }]
        );
        // Vibrate to notify user
        Vibration.vibrate([0, 200, 100, 200]);
      },
      onConnection: () => {
        console.log('SOS: Connected to emergency services');
      },
      onError: (error) => {
        console.error('SOS WebSocket error:', error);
      }
    }
  });

  // Emergency alerts hook for sending and receiving alerts
  const { alerts, sendAlert, responses } = useEmergencyAlerts();

  // Initialize location service and get current location
  useEffect(() => {
    if (userToken) {
      LocationService.setAuthToken(userToken);
      getCurrentLocation();
    }
  }, [userToken]);

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const hasPermission = await LocationService.requestPermissions();
      if (!hasPermission) {
        Alert.alert('Location Permission', 'Location permission is required for emergency services.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCurrentLocation(locationData);

      // Get enhanced safety score for current location
      const safetyData = await LocationService.getEnhancedSafetyScore(locationData);
      if (safetyData) {
        setEmergencyStatus(prev => ({
          ...prev,
          safetyScore: safetyData.overallScore,
          recommendations: safetyData.recommendations,
        }));
      }
    } catch (error) {
      console.error('Error getting current location:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const emergencyContacts = [
    { name: 'Police', number: '100', icon: 'shield.fill' },
    { name: 'Medical', number: '102', icon: 'cross.fill' },
    { name: 'Fire', number: '101', icon: 'flame.fill' },
    { name: 'Tourist Helpline', number: '1800-11-1363', icon: 'phone.fill' },
  ];

  const handleEmergencyCall = (number: string, service: string) => {
    Alert.alert(
      'Emergency Call',
      `Call ${service} at ${number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          style: 'destructive',
          onPress: () => {
            Linking.openURL(`tel:${number}`);
            setEmergencyStatus(prev => ({ ...prev, isActive: true }));
          }
        }
      ]
    );
  };

  const sendSOSAlert = async (message: string = 'Emergency assistance needed') => {
    if (!userToken) {
      Alert.alert('Error', 'Please login first to send SOS alerts');
      return;
    }

    setIsSendingAlert(true);
    try {
      // Get current location if not available
      let locationData = currentLocation;
      if (!locationData) {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        locationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setCurrentLocation(locationData);
      }

      // Activate emergency through new enhanced API
      const response = await fetch(`${API_BASE_URL}/emergency/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          location: {
            coordinates: [locationData.longitude, locationData.latitude],
            type: 'Point'
          },
          emergencyType: 'SOS_BUTTON',
          description: message,
          severity: 'high',
          deviceInfo: {
            platform: Platform.OS,
            appVersion: '1.0.0',
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        const emergency = data.emergency;
        
        // Also send via WebSocket for real-time notification
        const webSocketSuccess = sendAlert({
          type: 'panic',
          severity: 'critical',
          location: {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
          },
          message: `Emergency ID ${emergency._id.slice(-6)} - ${message}`,
        });

        console.log('WebSocket alert sent:', webSocketSuccess);

        setEmergencyStatus({
          isActive: true,
          emergencyId: emergency._id,
          startTime: new Date(emergency.timestamp),
          location: locationData,
        });

        // Start continuous location tracking session
        try {
          const session = await LocationService.startLocationSession(touristId || 'user', {
            coordinates: locationData,
            timestamp: new Date(),
          });

          if (session) {
            setLocationSession(session);
            
            // Start real-time tracking
            await LocationService.startTracking((locationUpdate) => {
              console.log('Emergency location update:', locationUpdate);
              
              // Handle safety alerts during emergency
              if (locationUpdate.safetyAlerts.length > 0) {
                locationUpdate.safetyAlerts.forEach(alert => {
                  Alert.alert('Safety Alert', alert.message);
                });
              }
            });
          }
        } catch (locationError) {
          console.warn('Could not start location tracking:', locationError);
        }

        Alert.alert(
          '🚨 SOS Alert Sent!',
          `Emergency ID: ${emergency._id.slice(-6)}\nLocation shared with authorities\n\nEmergency services have been notified. Keep your phone on and with you.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to send SOS alert. Please try calling emergency services directly.');
      }
    } catch (error) {
      console.error('SOS Error:', error);
      Alert.alert(
        'SOS Alert (Offline)',
        'Could not reach emergency servers. Please call emergency services directly.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSendingAlert(false);
    }
  };

  const handleSendLocation = () => {
    // Send location via WebSocket for real-time sharing
    if (currentLocation && isConnected) {
      sendAlert({
        type: 'security',
        severity: 'medium',
        location: currentLocation,
        message: 'Location sharing requested - tourist needs assistance',
      });
    }
    sendSOSAlert('Location sharing requested - tourist needs assistance');
  };

  const deactivateEmergency = () => {
    if (!emergencyStatus.isActive) return;

    Alert.alert(
      'Deactivate Emergency',
      'Are you safe? This will deactivate the emergency alert.',
      [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'I am Safe',
          onPress: async () => {
            try {
              setIsSendingAlert(true);

              // Deactivate emergency through backend
              const response = await fetch(`${API_BASE_URL}/emergency/deactivate`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${userToken}`,
                },
                body: JSON.stringify({
                  emergencyId: emergencyStatus.emergencyId,
                  resolution: 'resolved_safe',
                  notes: 'User confirmed safety from mobile app',
                }),
              });

              const data = await response.json();

              if (data.success) {
                // Stop location tracking
                await LocationService.stopTracking();
                await LocationService.endLocationSession();

                setEmergencyStatus({ isActive: false });
                setLocationSession(null);

                Alert.alert(
                  'Emergency Deactivated',
                  'Emergency services have been notified that you are safe.',
                  [{ text: 'OK' }]
                );
              } else {
                throw new Error(data.message || 'Failed to deactivate emergency');
              }
            } catch (error) {
              console.error('Error deactivating emergency:', error);
              Alert.alert('Error', 'Failed to deactivate emergency. Please contact authorities directly.');
            } finally {
              setIsSendingAlert(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Emergency Header */}
      <View style={styles.header}>
        <IconSymbol 
          name="exclamationmark.triangle.fill" 
          size={40} 
          color={emergencyStatus.isActive ? "#FF6666" : "#FF4444"} 
        />
        <ThemedText type="title" style={styles.title}>
          {emergencyStatus.isActive ? 'EMERGENCY ACTIVE' : 'Emergency Assistance'}
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {emergencyStatus.isActive 
            ? 'Emergency services have been contacted' 
            : 'Quick access to emergency services'
          }
        </ThemedText>
      </View>

      {/* WebSocket Connection Status */}
      <View style={[
        styles.connectionStatus,
        {
          backgroundColor: isConnected 
            ? Colors[colorScheme ?? 'light'].success + '20'
            : Colors[colorScheme ?? 'light'].error + '20',
          borderColor: isConnected 
            ? Colors[colorScheme ?? 'light'].success
            : Colors[colorScheme ?? 'light'].error,
        }
      ]}>
        <IconSymbol 
          name={isConnected ? "checkmark.circle.fill" : "xmark.circle.fill"} 
          size={20} 
          color={isConnected ? Colors[colorScheme ?? 'light'].success : Colors[colorScheme ?? 'light'].error} 
        />
        <ThemedText style={styles.connectionText}>
          {isConnected ? 'Real-time Emergency Services Connected' : 'Offline Mode - Using backup systems'}
        </ThemedText>
      </View>

      {/* Emergency Response Status */}
      {responses.length > 0 && (
        <View style={[styles.responseStatus, { backgroundColor: Colors[colorScheme ?? 'light'].success + '20' }]}>
          <IconSymbol name="checkmark.shield.fill" size={20} color={Colors[colorScheme ?? 'light'].success} />
          <ThemedText style={[styles.responseText, { color: Colors[colorScheme ?? 'light'].success }]}>
            Emergency Response Received: {responses[0]?.status || 'Dispatched'}
            {responses[0]?.eta && ` - ETA: ${responses[0].eta} minutes`}
          </ThemedText>
        </View>
      )}

      {/* WebSocket Error Display */}
      {error && (
        <View style={[styles.errorStatus, { backgroundColor: Colors[colorScheme ?? 'light'].error + '20' }]}>
          <IconSymbol name="wifi.exclamationmark" size={20} color={Colors[colorScheme ?? 'light'].error} />
          <ThemedText style={[styles.errorText, { color: Colors[colorScheme ?? 'light'].error }]}>
            Connection Error: {error}
          </ThemedText>
        </View>
      )}

      {/* Recent Emergency Alerts */}
      {alerts.length > 0 && (
        <View style={[styles.alertsHistory, { backgroundColor: Colors[colorScheme ?? 'light'].warning + '20' }]}>
          <ThemedText style={styles.alertsTitle}>Recent Emergency Alerts ({alerts.length})</ThemedText>
          {alerts.slice(0, 2).map((alert, index) => (
            <ThemedText key={index} style={styles.alertHistoryText}>
              • {alert.message} - {new Date(alert.timestamp).toLocaleTimeString()}
            </ThemedText>
          ))}
        </View>
      )}

      {/* Emergency Status Display */}
      {emergencyStatus.isActive && (
        <View style={[
          styles.emergencyStatus,
          { 
            backgroundColor: colorScheme === 'dark' ? '#4D1F1F' : '#FFE5E5',
            borderColor: Colors[colorScheme ?? 'light'].error,
          }
        ]}>
          <View style={styles.statusHeader}>
            <IconSymbol name="checkmark.shield.fill" size={24} color={Colors[colorScheme ?? 'light'].error} />
            <ThemedText style={[styles.statusTitle, { color: Colors[colorScheme ?? 'light'].error }]}>
              Emergency Active
            </ThemedText>
          </View>
          
          {emergencyStatus.emergencyId && (
            <ThemedText style={styles.emergencyId}>
              ID: {emergencyStatus.emergencyId.slice(-8)}
            </ThemedText>
          )}
          
          {emergencyStatus.startTime && (
            <ThemedText style={styles.emergencyTime}>
              Started: {emergencyStatus.startTime.toLocaleTimeString()}
            </ThemedText>
          )}
          
          {emergencyStatus.location && (
            <ThemedText style={styles.locationInfo}>
              📍 Location shared: {emergencyStatus.location.latitude.toFixed(4)}, {emergencyStatus.location.longitude.toFixed(4)}
            </ThemedText>
          )}

          {locationSession && (
            <View style={styles.trackingInfo}>
              <IconSymbol name="location.fill" size={16} color={Colors[colorScheme ?? 'light'].success} />
              <ThemedText style={[styles.trackingText, { color: Colors[colorScheme ?? 'light'].success }]}>
                Location tracking active
              </ThemedText>
            </View>
          )}
          
          <TouchableOpacity
            style={[styles.deactivateButton, { backgroundColor: Colors[colorScheme ?? 'light'].success }]}
            onPress={deactivateEmergency}
            disabled={isSendingAlert}
          >
            {isSendingAlert ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <ThemedText style={styles.deactivateButtonText}>I am Safe</ThemedText>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Main SOS Button */}
      <TouchableOpacity
        style={[
          styles.sosButton,
          { 
            backgroundColor: emergencyStatus.isActive ? '#FF6666' : isSendingAlert ? '#FF8888' : '#FF4444',
            opacity: isSendingAlert ? 0.8 : 1
          }
        ]}
        onPress={() => {
          if (!isSendingAlert) {
            Alert.alert(
              '🚨 Send SOS Alert?',
              'This will immediately notify emergency services and send your location to local authorities.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Send SOS Alert',
                  style: 'destructive',
                  onPress: () => sendSOSAlert('URGENT: Tourist in distress, immediate assistance required')
                }
              ]
            );
          }
        }}
        disabled={isSendingAlert}
      >
        <IconSymbol name="exclamationmark.triangle.fill" size={60} color="white" />
        <ThemedText style={styles.sosButtonText}>
          {isSendingAlert ? 'SENDING ALERT...' : emergencyStatus.isActive ? 'EMERGENCY ACTIVE' : 'SOS - SEND ALERT'}
        </ThemedText>
        <ThemedText style={styles.sosButtonSubtext}>
          {isSendingAlert ? 'Please wait...' : 'Tap to send emergency alert'}
        </ThemedText>
      </TouchableOpacity>

      {/* Current Location & Safety Status */}
      {!emergencyStatus.isActive && currentLocation && (
        <View style={[
          styles.locationStatus,
          { 
            backgroundColor: Colors[colorScheme ?? 'light'].card,
            borderColor: Colors[colorScheme ?? 'light'].border,
          }
        ]}>
          <View style={styles.locationHeader}>
            <IconSymbol name="location.fill" size={20} color={Colors[colorScheme ?? 'light'].primary} />
            <ThemedText style={styles.locationTitle}>Current Location Status</ThemedText>
          </View>
          
          {isLoadingLocation ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={Colors[colorScheme ?? 'light'].primary} />
              <ThemedText style={styles.loadingText}>Getting location...</ThemedText>
            </View>
          ) : (
            <>
              <ThemedText style={styles.coordinates}>
                📍 {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
              </ThemedText>
              
              {emergencyStatus.safetyScore && (
                <View style={styles.safetyScoreContainer}>
                  <ThemedText style={styles.safetyScoreLabel}>Safety Score:</ThemedText>
                  <View style={[
                    styles.safetyScoreBadge,
                    { 
                      backgroundColor: emergencyStatus.safetyScore >= 70 
                        ? Colors[colorScheme ?? 'light'].success 
                        : emergencyStatus.safetyScore >= 40
                        ? Colors[colorScheme ?? 'light'].warning
                        : Colors[colorScheme ?? 'light'].error
                    }
                  ]}>
                    <ThemedText style={styles.safetyScoreText}>
                      {emergencyStatus.safetyScore}/100
                    </ThemedText>
                  </View>
                </View>
              )}
              
              {emergencyStatus.recommendations && emergencyStatus.recommendations.length > 0 && (
                <View style={styles.recommendationsContainer}>
                  <ThemedText style={styles.recommendationsTitle}>💡 Safety Recommendations:</ThemedText>
                  {emergencyStatus.recommendations.slice(0, 2).map((rec, index) => (
                    <ThemedText key={index} style={styles.recommendationText}>
                      • {rec}
                    </ThemedText>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: Colors[colorScheme ?? 'light'].primary }]}
          onPress={handleSendLocation}
        >
          <IconSymbol name="location.fill" size={24} color="white" />
          <ThemedText style={styles.actionButtonText}>Send Location</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: Colors[colorScheme ?? 'light'].warning }]}
          onPress={() => sendSOSAlert('Tourist requesting emergency contact notification - assistance may be needed')}
        >
          <IconSymbol name="bell.fill" size={24} color="white" />
          <ThemedText style={styles.actionButtonText}>Alert Contacts</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Emergency Contacts */}
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Emergency Contacts
      </ThemedText>
      
      <View style={styles.contactsList}>
        {emergencyContacts.map((contact, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.contactCard, 
              { 
                backgroundColor: Colors[colorScheme ?? 'light'].card,
                borderColor: Colors[colorScheme ?? 'light'].border,
                borderWidth: colorScheme === 'dark' ? 1 : 0,
              }
            ]}
            onPress={() => handleEmergencyCall(contact.number, contact.name)}
          >
            <View style={[
              styles.contactIcon,
              {
                backgroundColor: colorScheme === 'dark' ? '#FF444430' : '#FFE5E5'
              }
            ]}>
              <IconSymbol name={contact.icon as any} size={24} color={Colors[colorScheme ?? 'light'].error} />
            </View>
            <View style={styles.contactInfo}>
              <ThemedText style={styles.contactName}>{contact.name}</ThemedText>
              <ThemedText style={styles.contactNumber}>{contact.number}</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={16} color={Colors[colorScheme ?? 'light'].secondary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Safety Tips */}
      <View style={[
        styles.safetyTips, 
        { 
          backgroundColor: Colors[colorScheme ?? 'light'].surfaceVariant,
          borderColor: Colors[colorScheme ?? 'light'].border,
          borderWidth: colorScheme === 'dark' ? 1 : 0,
        }
      ]}>
        <ThemedText style={styles.safetyTitle}>💡 Safety Tips</ThemedText>
        <ThemedText style={styles.safetyText}>
          • Stay calm and provide clear information
        </ThemedText>
        <ThemedText style={styles.safetyText}>
          • Share your exact location when possible
        </ThemedText>
        <ThemedText style={styles.safetyText}>
          • Keep this app easily accessible
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#007AFF',
    borderRadius: 25,
    alignSelf: 'flex-start',
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    marginTop: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 5,
  },
  sosButton: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sosButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 15,
    textAlign: 'center',
  },
  sosButtonSubtext: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 5,
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 30,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 15,
  },
  contactsList: {
    marginBottom: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
  },
  contactNumber: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
  safetyTips: {
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  safetyText: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 5,
  },
  // Emergency Status Styles
  emergencyStatus: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emergencyId: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  emergencyTime: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 8,
  },
  locationInfo: {
    fontSize: 12,
    opacity: 0.9,
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  trackingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  trackingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deactivateButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  deactivateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Location Status Styles
  locationStatus: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.7,
  },
  coordinates: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 8,
    opacity: 0.8,
  },
  safetyScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  safetyScoreLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  safetyScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  safetyScoreText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  recommendationsContainer: {
    marginTop: 8,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  recommendationText: {
    fontSize: 13,
    opacity: 0.8,
    marginBottom: 3,
  },
  // WebSocket Status Styles
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    gap: 8,
  },
  connectionText: {
    fontSize: 14,
    flex: 1,
  },
  responseStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    gap: 8,
  },
  responseText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  errorStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  alertsHistory: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  alertsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  alertHistoryText: {
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 4,
  },
});