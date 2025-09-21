import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { IconSymbol } from './ui/icon-symbol';
import LocationService from '@/services/LocationService';
import { useWebSocket, useLocationTracking, useEmergencyAlerts } from '@/hooks/useWebSocket';
import BottomNavigation from './bottom-navigation';

const { width } = Dimensions.get('window');

interface LocationStatus {
  isActive: boolean;
  sessionId?: string;
  safetyScore?: number;
  lastUpdate?: Date;
}

export default function MainDashboard() {
  const colorScheme = useColorScheme();
  const { touristId, userToken } = useAuth();
  const { navigateTo } = useNavigation();
  
  const [locationStatus, setLocationStatus] = useState<LocationStatus>({ isActive: false });
  const [safetyScore, setSafetyScore] = useState(85);
  const [isLoadingSafety, setIsLoadingSafety] = useState(false);

  // WebSocket integration
  const { isConnected, connect, error } = useWebSocket({
    autoConnect: true,
    callbacks: {
      onConnection: () => {
        console.log('Dashboard: Connected to WebSocket');
      },
      onSafetyScoreUpdate: (data) => {
        console.log('Dashboard: Safety score updated:', data.score);
        setSafetyScore(data.score);
      },
      onLocationUpdate: (update) => {
        console.log('Dashboard: Location update received');
        setLocationStatus(prev => ({
          ...prev,
          lastUpdate: new Date(update.timestamp)
        }));
      }
    }
  });

  // Location tracking with WebSocket
  useLocationTracking(locationStatus.isActive);

  // Emergency alerts
  const { alerts } = useEmergencyAlerts();

  // Initialize location service and check status
  useEffect(() => {
    if (userToken) {
      LocationService.setAuthToken(userToken);
      checkLocationStatus();
      loadSafetyStatus();
    }
  }, [userToken]);

  const checkLocationStatus = () => {
    const currentSession = LocationService.getCurrentSession();
    const isTracking = LocationService.isActivelyTracking();
    
    setLocationStatus({
      isActive: isTracking && (currentSession?.isActive || false),
      sessionId: currentSession?.sessionId,
      lastUpdate: isTracking ? new Date() : undefined,
    });
  };

  const loadSafetyStatus = async () => {
    setIsLoadingSafety(true);
    try {
      const status = await LocationService.getSafetyStatus();
      if (status) {
        setSafetyScore(status.safetyScore);
      }
    } catch (error) {
      console.error('Error loading safety status:', error);
    } finally {
      setIsLoadingSafety(false);
    }
  };

  const handleStartLocationTracking = async () => {
    try {
      const hasPermission = await LocationService.requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Location permission is needed for safety tracking.');
        return;
      }

      Alert.alert(
        'Start Location Tracking',
        'This will start tracking your location for safety purposes. You can stop this anytime.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Tracking',
            onPress: async () => {
              const session = await LocationService.startLocationSession(touristId || 'user');
              if (session) {
                await LocationService.startTracking();
                checkLocationStatus();
                Alert.alert('Success', 'Location tracking started for your safety.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
      Alert.alert('Error', 'Failed to start location tracking.');
    }
  };

  const handleStopLocationTracking = async () => {
    Alert.alert(
      'Stop Location Tracking',
      'This will stop tracking your location. You can restart it anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Tracking',
          onPress: async () => {
            await LocationService.stopTracking();
            await LocationService.endLocationSession();
            setLocationStatus({ isActive: false });
            Alert.alert('Success', 'Location tracking stopped.');
          }
        }
      ]
    );
  };

  const features = [
    {
      id: 'sos',
      title: 'SOS Emergency',
      subtitle: 'Quick help access',
      icon: 'exclamationmark.triangle.fill',
      color: '#FF4444',
      urgent: true
    },
    {
      id: 'safety',
      title: 'Safety Score',
      subtitle: 'Check your safety',
      icon: 'shield.checkered',
      color: '#4CAF50',
    },
    {
      id: 'ai-analytics',
      title: 'AI Analytics',
      subtitle: 'Advanced insights',
      icon: 'brain.head.profile',
      color: '#6B46C1',
      new: true
    },
    {
      id: 'intelligent-routes',
      title: 'Smart Routes',
      subtitle: 'AI recommendations',
      icon: 'location.north.line',
      color: '#3B82F6',
      new: true
    },
    {
      id: 'risk-assessment',
      title: 'Risk Monitor',
      subtitle: 'Real-time alerts',
      icon: 'eye.trianglebadge.exclamationmark',
      color: '#EF4444',
      new: true
    },
    {
      id: 'map',
      title: 'Offline Maps',
      subtitle: 'Download maps',
      icon: 'map.fill',
      color: '#2196F3',
    },
    {
      id: 'events',
      title: 'Events & Festivals',
      subtitle: 'Local activities',
      icon: 'calendar.badge.plus',
      color: '#FF9800',
    },
    {
      id: 'language',
      title: 'Language Help',
      subtitle: 'Translation & community',
      icon: 'bubble.left.and.bubble.right.fill',
      color: '#9C27B0',
    },
    {
      id: 'transport',
      title: 'Transport & Stay',
      subtitle: 'Verified options',
      icon: 'car.fill',
      color: '#607D8B',
    },
    {
      id: 'weather',
      title: 'Weather & Terrain',
      subtitle: 'Current conditions',
      icon: 'cloud.sun.fill',
      color: '#00BCD4',
    },
    {
      id: 'eco',
      title: 'Eco Tourism Tips',
      subtitle: 'Responsible travel',
      icon: 'leaf.fill',
      color: '#4CAF50',
    }
  ];

  const handleFeaturePress = (featureId: string) => {
    navigateTo(featureId as any);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.homeIndicator, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
              <IconSymbol name="house.fill" size={20} color="white" />
            </View>
            <View>
              <ThemedText type="title" style={styles.welcomeText}>
                Welcome back!
              </ThemedText>
              <ThemedText style={styles.touristId}>Tourist ID: {touristId}</ThemedText>
            </View>
          </View>
          <TouchableOpacity 
            onPress={() => navigateTo('settings')} 
            style={[
              styles.settingsButton, 
              { 
                backgroundColor: colorScheme === 'dark' 
                  ? Colors[colorScheme].card 
                  : Colors[colorScheme ?? 'light'].tint + '10',
                borderColor: Colors[colorScheme ?? 'light'].tint + '30',
              }
            ]}
          >
            <IconSymbol name="gearshape.fill" size={22} color={Colors[colorScheme ?? 'light'].tint} />
          </TouchableOpacity>
        </View>

        {/* SOS Button - Prominent placement */}
        <TouchableOpacity 
          style={[styles.sosButton, { backgroundColor: '#FF4444' }]}
          onPress={() => handleFeaturePress('sos')}
        >
          <IconSymbol name="exclamationmark.triangle.fill" size={32} color="white" />
          <ThemedText style={styles.sosText}>SOS EMERGENCY</ThemedText>
          <ThemedText style={styles.sosSubtext}>Tap for immediate help</ThemedText>
        </TouchableOpacity>

        {/* Location Tracking Status */}
        <View style={[
          styles.locationCard, 
          { 
            backgroundColor: locationStatus.isActive 
              ? (colorScheme === 'dark' ? '#10B98130' : '#E8F5E8')
              : Colors[colorScheme ?? 'light'].card,
            borderColor: locationStatus.isActive 
              ? Colors[colorScheme ?? 'light'].success
              : Colors[colorScheme ?? 'light'].border,
          }
        ]}>
          <View style={styles.locationHeader}>
            <View style={styles.locationInfo}>
              <IconSymbol 
                name={locationStatus.isActive ? "location.fill" : "location"} 
                size={24} 
                color={locationStatus.isActive ? Colors[colorScheme ?? 'light'].success : Colors[colorScheme ?? 'light'].icon} 
              />
              <ThemedText style={styles.locationTitle}>
                {locationStatus.isActive ? 'Location Tracking Active' : 'Location Tracking Inactive'}
              </ThemedText>
            </View>
            <TouchableOpacity
              style={[
                styles.locationToggle,
                { 
                  backgroundColor: locationStatus.isActive 
                    ? Colors[colorScheme ?? 'light'].error
                    : Colors[colorScheme ?? 'light'].success 
                }
              ]}
              onPress={locationStatus.isActive ? handleStopLocationTracking : handleStartLocationTracking}
            >
              <ThemedText style={styles.locationToggleText}>
                {locationStatus.isActive ? 'Stop' : 'Start'}
              </ThemedText>
            </TouchableOpacity>
          </View>
          
          {locationStatus.isActive && locationStatus.sessionId && (
            <View style={styles.sessionInfo}>
              <ThemedText style={styles.sessionText}>
                Session ID: {locationStatus.sessionId.slice(-8)}
              </ThemedText>
              {locationStatus.lastUpdate && (
                <ThemedText style={styles.sessionText}>
                  Last Update: {locationStatus.lastUpdate.toLocaleTimeString()}
                </ThemedText>
              )}
            </View>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={[
            styles.statCard, 
            { 
              backgroundColor: Colors[colorScheme ?? 'light'].card,
              borderColor: Colors[colorScheme ?? 'light'].border,
              borderWidth: colorScheme === 'dark' ? 1 : 0,
            }
          ]}>
            <IconSymbol name="shield.checkered" size={24} color={Colors[colorScheme ?? 'light'].success} />
            {isLoadingSafety ? (
              <ActivityIndicator size="small" color={Colors[colorScheme ?? 'light'].primary} />
            ) : (
              <ThemedText style={styles.statNumber}>{safetyScore}%</ThemedText>
            )}
            <ThemedText style={styles.statLabel}>Safety Score</ThemedText>
          </View>
          <View style={[
            styles.statCard, 
            { 
              backgroundColor: Colors[colorScheme ?? 'light'].card,
              borderColor: Colors[colorScheme ?? 'light'].border,
              borderWidth: colorScheme === 'dark' ? 1 : 0,
            }
          ]}>
            <IconSymbol 
              name={isConnected ? "antenna.radiowaves.left.and.right" : "antenna.radiowaves.left.and.right.slash"} 
              size={24} 
              color={isConnected ? Colors[colorScheme ?? 'light'].success : Colors[colorScheme ?? 'light'].error} 
            />
            <ThemedText style={[styles.statNumber, { color: isConnected ? Colors[colorScheme ?? 'light'].success : Colors[colorScheme ?? 'light'].error }]}>
              {isConnected ? 'Live' : 'Offline'}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Real-time Status</ThemedText>
          </View>
        </View>

        {/* Emergency Alerts Status */}
        {alerts.length > 0 && (
          <View style={[styles.alertsContainer, { backgroundColor: Colors[colorScheme ?? 'light'].error + '20' }]}>
            <View style={styles.alertHeader}>
              <IconSymbol name="exclamationmark.triangle.fill" size={20} color={Colors[colorScheme ?? 'light'].error} />
              <ThemedText style={[styles.alertTitle, { color: Colors[colorScheme ?? 'light'].error }]}>
                Recent Alerts ({alerts.length})
              </ThemedText>
            </View>
            <ThemedText style={styles.alertText}>
              {alerts[0]?.message || 'Emergency alert received'}
            </ThemedText>
          </View>
        )}

        {/* WebSocket Error Display */}
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: Colors[colorScheme ?? 'light'].error + '20' }]}>
            <IconSymbol name="wifi.exclamationmark" size={20} color={Colors[colorScheme ?? 'light'].error} />
            <ThemedText style={[styles.errorText, { color: Colors[colorScheme ?? 'light'].error }]}>
              Connection Error: {error}
            </ThemedText>
            <TouchableOpacity onPress={connect} style={styles.retryButton}>
              <ThemedText style={styles.retryText}>Retry</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* Features Grid */}
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Travel Tools
        </ThemedText>
        
        <View style={styles.featuresGrid}>
          {features.filter(f => f.id !== 'sos').map((feature, index) => (
            <TouchableOpacity
              key={feature.id}
              style={[
                styles.featureCard,
                { 
                  backgroundColor: Colors[colorScheme ?? 'light'].card,
                  borderColor: feature.new ? feature.color : Colors[colorScheme ?? 'light'].border,
                  borderWidth: feature.new ? 2 : (colorScheme === 'dark' ? 1 : 0),
                },
                index % 2 === 0 ? styles.featureCardLeft : styles.featureCardRight
              ]}
              onPress={() => handleFeaturePress(feature.id)}
            >
              {feature.new && (
                <View style={[styles.newBadge, { backgroundColor: feature.color }]}>
                  <ThemedText style={styles.newBadgeText}>NEW</ThemedText>
                </View>
              )}
              <View style={[
                styles.featureIcon, 
                { 
                  backgroundColor: colorScheme === 'dark' 
                    ? feature.color + '30' 
                    : feature.color + '20' 
                }
              ]}>
                <IconSymbol name={feature.icon as any} size={28} color={feature.color} />
              </View>
              <ThemedText style={styles.featureTitle}>{feature.title}</ThemedText>
              <ThemedText style={styles.featureSubtitle}>{feature.subtitle}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  homeIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    marginBottom: 4,
  },
  touristId: {
    fontSize: 14,
    opacity: 0.7,
  },
  settingsButton: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    minWidth: 44,
    minHeight: 44,
  },
  sosButton: {
    margin: 20,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  sosText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  sosSubtext: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 15,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  sectionTitle: {
    paddingHorizontal: 20,
    marginBottom: 15,
    fontSize: 18,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  featureCard: {
    width: (width - 55) / 2,
    padding: 16,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  featureCardLeft: {
    marginRight: 15,
  },
  featureCardRight: {
    marginLeft: 0,
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 12,
    opacity: 0.7,
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 1,
  },
  newBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Location Tracking Styles
  locationCard: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  locationToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  locationToggleText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  sessionInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  sessionText: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 2,
  },
  // Alert and Error Styles
  alertsContainer: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF444430',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  alertText: {
    fontSize: 12,
    opacity: 0.8,
  },
  errorContainer: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF444430',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF444430',
    borderRadius: 6,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF4444',
  },
});