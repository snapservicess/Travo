import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '../ui/icon-symbol';
import { AIAnalyticsEngine, RouteRecommendation, TouristBehaviorPattern } from '@/services/AIAnalyticsEngine';

interface RouteOption {
  id: string;
  name: string;
  path: { latitude: number; longitude: number }[];
  safetyScore: number;
  estimatedDuration: number;
  distance: number;
  crowdLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  benefits: string[];
  confidence: number;
  aiRecommended?: boolean;
}

interface PersonalizationSettings {
  safetyPriority: number; // 0-100
  speedPriority: number; // 0-100
  scenicPriority: number; // 0-100
  crowdAvoidance: number; // 0-100
  accessibilityNeeds: boolean;
  preferredTransport: 'walking' | 'public' | 'taxi' | 'any';
}

export default function IntelligentRouteRecommendations() {
  const colorScheme = useColorScheme();
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [showPersonalization, setShowPersonalization] = useState(false);
  const [aiEngine] = useState(() => new AIAnalyticsEngine());
  
  const [personalization, setPersonalization] = useState<PersonalizationSettings>({
    safetyPriority: 85,
    speedPriority: 60,
    scenicPriority: 45,
    crowdAvoidance: 75,
    accessibilityNeeds: false,
    preferredTransport: 'walking'
  });

  const [currentLocation] = useState({
    latitude: 28.6139,
    longitude: 77.2090,
    address: 'India Gate, New Delhi'
  });

  const [destination] = useState({
    latitude: 28.6200,
    longitude: 77.2100,
    address: 'Connaught Place, New Delhi'
  });

  const [routeRecommendation, setRouteRecommendation] = useState<RouteRecommendation | null>(null);
  const [behaviorPattern, setBehaviorPattern] = useState<TouristBehaviorPattern | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const generateRoutes = async () => {
      setIsGenerating(true);
      try {
        const recommendation = await aiEngine.generateRouteRecommendation(
          'current-tourist',
          currentLocation.latitude,
          currentLocation.longitude,
          28.6200, // Destination lat
          77.2100, // Destination lng
          {
            safetyPriority: personalization.safetyPriority,
            speedPriority: personalization.speedPriority,
            scenicPriority: personalization.scenicPriority,
            crowdAvoidance: personalization.crowdAvoidance
          }
        );
        
        const routeOptions: RouteOption[] = recommendation.routes.map((route, index) => ({
          id: `route-${index}`,
          name: `AI Route ${index + 1}`,
          path: route.path,
          safetyScore: route.safetyScore,
          estimatedDuration: route.estimatedDuration,
          distance: route.distance,
          crowdLevel: route.crowdLevel,
          riskFactors: route.riskFactors,
          benefits: route.alternativeOptions,
          confidence: route.confidence,
          aiRecommended: index === 0
        }));
        
        setRouteRecommendation(recommendation);
        setSelectedRoute(routeOptions[0]?.id || null);
      } catch (error) {
        console.error('Error generating routes:', error);
      } finally {
        setIsGenerating(false);
      }
    };
    
    const loadPattern = async () => {
      const mockLocationHistory = [
        { latitude: 28.6139, longitude: 77.2090, accuracy: 10, timestamp: new Date(), speed: 1.2, heading: 0 },
        { latitude: 28.6200, longitude: 77.2100, accuracy: 8, timestamp: new Date(), speed: 0.8, heading: 45 },
        { latitude: 28.6180, longitude: 77.2080, accuracy: 12, timestamp: new Date(), speed: 1.5, heading: 90 }
      ];

      const mockLocationData = mockLocationHistory.map(location => ({
        coordinates: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        accuracy: location.accuracy,
        timestamp: location.timestamp,
        speed: location.speed,
        heading: location.heading
      }));
      
      const pattern = await aiEngine.analyzeTouristBehavior('current-tourist', mockLocationData);
      setBehaviorPattern(pattern);
    };
    
    generateRoutes();
    loadPattern();
  }, [personalization, aiEngine, currentLocation.latitude, currentLocation.longitude]);



  const handleRouteSelection = (routeIndex: number) => {
    setSelectedRoute(routeIndex.toString());
    Alert.alert(
      'Route Selected',
      'Navigation will start with AI-optimized guidance and real-time safety updates.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start Navigation', onPress: () => startNavigation(routeIndex) }
      ]
    );
  };

  const startNavigation = (routeIndex: number) => {
    if (!routeRecommendation) return;
    
    const route = routeRecommendation.routes[routeIndex];
    console.log('Starting navigation with route:', route);
    
    // In a real implementation, this would start turn-by-turn navigation
    Alert.alert('Navigation Started', 'AI-powered navigation with real-time safety monitoring is now active.');
  };



  const getRouteTypeIcon = (route: any, index: number) => {
    if (route.safetyScore >= 85) return 'shield.checkered.fill';
    if (route.estimatedDuration <= 25) return 'bolt.fill';
    if (index === 2) return 'camera.fill'; // Scenic route
    return 'map.fill';
  };

  const getRouteTypeLabel = (route: any, index: number) => {
    if (route.safetyScore >= 85) return 'Safest Route';
    if (route.estimatedDuration <= 25) return 'Fastest Route';
    if (index === 2) return 'Scenic Route';
    return 'Balanced Route';
  };

  const getCrowdLevelColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return Colors[colorScheme ?? 'light'].success;
      case 'medium': return Colors[colorScheme ?? 'light'].warning;
      case 'high': return Colors[colorScheme ?? 'light'].error;
      default: return Colors[colorScheme ?? 'light'].text;
    }
  };

  const getSafetyScoreColor = (score: number) => {
    if (score >= 85) return Colors[colorScheme ?? 'light'].success;
    if (score >= 70) return Colors[colorScheme ?? 'light'].warning;
    if (score >= 50) return '#FF7043';
    return Colors[colorScheme ?? 'light'].error;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconSymbol name="location.north.line.fill" size={24} color={Colors[colorScheme ?? 'light'].primary} />
          <ThemedText type="title" style={styles.title}>Smart Routes</ThemedText>
        </View>

        <TouchableOpacity
          style={[styles.personalizationButton, { backgroundColor: Colors[colorScheme ?? 'light'].primary }]}
          onPress={() => setShowPersonalization(true)}
        >
          <IconSymbol name="slider.horizontal.3" size={18} color="white" />
        </TouchableOpacity>
      </View>

      {/* Route Overview */}
      <View style={styles.routeOverview}>
        <View style={styles.locationInfo}>
          <View style={styles.locationPoint}>
            <IconSymbol name="location.fill" size={16} color={Colors[colorScheme ?? 'light'].success} />
            <ThemedText style={styles.locationLabel}>From: {currentLocation.address}</ThemedText>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.locationPoint}>
            <IconSymbol name="mappin.and.ellipse" size={16} color={Colors[colorScheme ?? 'light'].error} />
            <ThemedText style={styles.locationLabel}>To: {destination.address}</ThemedText>
          </View>
        </View>
      </View>

      {/* AI Insights */}
      {behaviorPattern && (
        <View style={[styles.aiInsights, { backgroundColor: Colors[colorScheme ?? 'light'].primary + '15' }]}>
          <View style={styles.aiHeader}>
            <IconSymbol name="brain.head.profile" size={20} color={Colors[colorScheme ?? 'light'].primary} />
            <ThemedText style={styles.aiTitle}>AI Insights</ThemedText>
          </View>
          <ThemedText style={styles.aiDescription}>
            Based on your travel patterns, we recommend prioritizing safety ({behaviorPattern.riskScore < 50 ? 'low risk profile' : 'safety-conscious'}) 
            with {behaviorPattern.patterns.safetyPreferences.crowdTolerance > 70 ? 'crowd-friendly' : 'quieter'} routes.
          </ThemedText>
        </View>
      )}

      {/* Route Recommendations */}
      <ScrollView style={styles.routesList} showsVerticalScrollIndicator={false}>
        <ThemedText style={styles.sectionTitle}>
          AI-Powered Route Recommendations {isGenerating && '(Generating...)'}
        </ThemedText>

        {routeRecommendation?.routes.map((route, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.routeCard,
              {
                backgroundColor: Colors[colorScheme ?? 'light'].card,
                borderColor: selectedRoute === index.toString() 
                  ? Colors[colorScheme ?? 'light'].primary 
                  : Colors[colorScheme ?? 'light'].border,
                borderWidth: selectedRoute === index.toString() ? 2 : 1,
              }
            ]}
            onPress={() => handleRouteSelection(index)}
          >
            <View style={styles.routeHeader}>
              <View style={styles.routeTypeInfo}>
                <IconSymbol 
                  name={getRouteTypeIcon(route, index) as any}
                  size={20}
                  color={index === 0 ? Colors[colorScheme ?? 'light'].primary : Colors[colorScheme ?? 'light'].text}
                />
                <ThemedText style={[
                  styles.routeTypeLabel,
                  index === 0 && { color: Colors[colorScheme ?? 'light'].primary, fontWeight: 'bold' }
                ]}>
                  {getRouteTypeLabel(route, index)}
                </ThemedText>
                {index === 0 && (
                  <View style={[styles.aiRecommendedBadge, { backgroundColor: Colors[colorScheme ?? 'light'].primary }]}>
                    <ThemedText style={styles.aiRecommendedText}>AI PICK</ThemedText>
                  </View>
                )}
              </View>

              <View style={styles.routeMetrics}>
                <View style={[
                  styles.safetyScore,
                  { backgroundColor: getSafetyScoreColor(route.safetyScore) }
                ]}>
                  <ThemedText style={styles.safetyScoreText}>{route.safetyScore}</ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.routeDetails}>
              <View style={styles.routeStats}>
                <View style={styles.routeStat}>
                  <IconSymbol name="clock" size={14} color={Colors[colorScheme ?? 'light'].text} />
                  <ThemedText style={styles.routeStatText}>{formatDuration(route.estimatedDuration)}</ThemedText>
                </View>
                
                <View style={styles.routeStat}>
                  <IconSymbol name="ruler" size={14} color={Colors[colorScheme ?? 'light'].text} />
                  <ThemedText style={styles.routeStatText}>{formatDistance(route.distance)}</ThemedText>
                </View>
                
                <View style={styles.routeStat}>
                  <IconSymbol name="person.3" size={14} color={getCrowdLevelColor(route.crowdLevel)} />
                  <ThemedText style={[
                    styles.routeStatText,
                    { color: getCrowdLevelColor(route.crowdLevel) }
                  ]}>
                    {route.crowdLevel.toUpperCase()}
                  </ThemedText>
                </View>

                <View style={styles.routeStat}>
                  <IconSymbol name="checkmark.seal" size={14} color={Colors[colorScheme ?? 'light'].primary} />
                  <ThemedText style={styles.routeStatText}>{route.confidence}%</ThemedText>
                </View>
              </View>

              {route.alternativeOptions.length > 0 && (
                <View style={styles.routeFeatures}>
                  <ThemedText style={styles.routeFeaturesLabel}>Features:</ThemedText>
                  <ThemedText style={styles.routeFeaturesText}>
                    {route.alternativeOptions.join(' • ')}
                  </ThemedText>
                </View>
              )}

              {route.riskFactors.length > 0 && (
                <View style={styles.routeWarnings}>
                  <IconSymbol name="exclamationmark.triangle" size={12} color={Colors[colorScheme ?? 'light'].warning} />
                  <ThemedText style={[styles.routeWarningsText, { color: Colors[colorScheme ?? 'light'].warning }]}>
                    {route.riskFactors.join(', ')}
                  </ThemedText>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}

        {/* Real-time Updates */}
        <View style={[styles.realTimeUpdates, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
          <View style={styles.updatesHeader}>
            <IconSymbol name="antenna.radiowaves.left.and.right" size={18} color={Colors[colorScheme ?? 'light'].success} />
            <ThemedText style={styles.updatesTitle}>Live Updates</ThemedText>
            <View style={[styles.liveDot, { backgroundColor: Colors[colorScheme ?? 'light'].success }]} />
          </View>
          
          <View style={styles.updatesList}>
            <View style={styles.updateItem}>
              <IconSymbol name="checkmark.circle" size={14} color={Colors[colorScheme ?? 'light'].success} />
              <ThemedText style={styles.updateText}>Route safety scores updated 2 min ago</ThemedText>
            </View>
            <View style={styles.updateItem}>
              <IconSymbol name="exclamationmark.triangle" size={14} color={Colors[colorScheme ?? 'light'].warning} />
              <ThemedText style={styles.updateText}>Crowd density increased near Connaught Place</ThemedText>
            </View>
            <View style={styles.updateItem}>
              <IconSymbol name="info.circle" size={14} color={Colors[colorScheme ?? 'light'].primary} />
              <ThemedText style={styles.updateText}>Weather conditions optimal for walking</ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Personalization Modal */}
      <Modal
        visible={showPersonalization}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPersonalization(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title">Route Preferences</ThemedText>
              <TouchableOpacity onPress={() => setShowPersonalization(false)}>
                <IconSymbol name="xmark" size={20} color={Colors[colorScheme ?? 'light'].text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.preferencesContent} showsVerticalScrollIndicator={false}>
              <View style={styles.preferenceSection}>
                <ThemedText style={styles.preferenceTitle}>Safety Priority</ThemedText>
                <ThemedText style={styles.preferenceDescription}>
                  Higher values prioritize safer routes over speed
                </ThemedText>
                <View style={styles.sliderContainer}>
                  <ThemedText style={styles.sliderValue}>{personalization.safetyPriority}%</ThemedText>
                  {/* Note: In a real implementation, you'd use a proper slider component */}
                  <View style={[styles.sliderTrack, { backgroundColor: Colors[colorScheme ?? 'light'].surfaceVariant }]}>
                    <View style={[
                      styles.sliderFill,
                      { 
                        width: `${personalization.safetyPriority}%`,
                        backgroundColor: Colors[colorScheme ?? 'light'].primary
                      }
                    ]} />
                  </View>
                </View>
              </View>

              <View style={styles.preferenceSection}>
                <ThemedText style={styles.preferenceTitle}>Speed Priority</ThemedText>
                <ThemedText style={styles.preferenceDescription}>
                  Higher values prioritize faster routes
                </ThemedText>
                <View style={styles.sliderContainer}>
                  <ThemedText style={styles.sliderValue}>{personalization.speedPriority}%</ThemedText>
                  <View style={[styles.sliderTrack, { backgroundColor: Colors[colorScheme ?? 'light'].surfaceVariant }]}>
                    <View style={[
                      styles.sliderFill,
                      { 
                        width: `${personalization.speedPriority}%`,
                        backgroundColor: Colors[colorScheme ?? 'light'].warning
                      }
                    ]} />
                  </View>
                </View>
              </View>

              <View style={styles.preferenceSection}>
                <ThemedText style={styles.preferenceTitle}>Scenic Priority</ThemedText>
                <ThemedText style={styles.preferenceDescription}>
                  Higher values include more scenic and interesting routes
                </ThemedText>
                <View style={styles.sliderContainer}>
                  <ThemedText style={styles.sliderValue}>{personalization.scenicPriority}%</ThemedText>
                  <View style={[styles.sliderTrack, { backgroundColor: Colors[colorScheme ?? 'light'].surfaceVariant }]}>
                    <View style={[
                      styles.sliderFill,
                      { 
                        width: `${personalization.scenicPriority}%`,
                        backgroundColor: Colors[colorScheme ?? 'light'].success
                      }
                    ]} />
                  </View>
                </View>
              </View>

              <View style={styles.preferenceSection}>
                <ThemedText style={styles.preferenceTitle}>Crowd Avoidance</ThemedText>
                <ThemedText style={styles.preferenceDescription}>
                  Higher values avoid crowded areas
                </ThemedText>
                <View style={styles.sliderContainer}>
                  <ThemedText style={styles.sliderValue}>{personalization.crowdAvoidance}%</ThemedText>
                  <View style={[styles.sliderTrack, { backgroundColor: Colors[colorScheme ?? 'light'].surfaceVariant }]}>
                    <View style={[
                      styles.sliderFill,
                      { 
                        width: `${personalization.crowdAvoidance}%`,
                        backgroundColor: Colors[colorScheme ?? 'light'].error
                      }
                    ]} />
                  </View>
                </View>
              </View>

              <View style={styles.preferenceActions}>
                <TouchableOpacity
                  style={[styles.resetButton, { backgroundColor: Colors[colorScheme ?? 'light'].surfaceVariant }]}
                  onPress={() => {
                    setPersonalization({
                      safetyPriority: 85,
                      speedPriority: 60,
                      scenicPriority: 45,
                      crowdAvoidance: 75,
                      accessibilityNeeds: false,
                      preferredTransport: 'walking'
                    });
                  }}
                >
                  <ThemedText style={styles.resetButtonText}>Reset to Defaults</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.applyButton, { backgroundColor: Colors[colorScheme ?? 'light'].primary }]}
                  onPress={() => {
                    setShowPersonalization(false);
                    // Regenerate routes with updated personalization
                    setPersonalization(prev => ({ ...prev }));
                  }}
                >
                  <ThemedText style={styles.applyButtonText}>Apply Changes</ThemedText>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  personalizationButton: {
    padding: 8,
    borderRadius: 8,
  },
  routeOverview: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  locationInfo: {
    alignItems: 'flex-start',
  },
  locationPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#DDD',
    marginLeft: 8,
    marginVertical: 2,
  },
  locationLabel: {
    fontSize: 14,
    flex: 1,
  },
  aiInsights: {
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  aiDescription: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.9,
  },
  routesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  routeCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  routeTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  aiRecommendedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiRecommendedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  routeMetrics: {
    alignItems: 'flex-end',
  },
  safetyScore: {
    width: 40,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyScoreText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  routeDetails: {
    gap: 8,
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  routeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeStatText: {
    fontSize: 12,
    fontWeight: '500',
  },
  routeFeatures: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  routeFeaturesLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    opacity: 0.7,
  },
  routeFeaturesText: {
    fontSize: 12,
    flex: 1,
    opacity: 0.8,
  },
  routeWarnings: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeWarningsText: {
    fontSize: 11,
    flex: 1,
  },
  realTimeUpdates: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  updatesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  updatesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  updatesList: {
    gap: 8,
  },
  updateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  updateText: {
    fontSize: 12,
    flex: 1,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  preferencesContent: {
    flex: 1,
    paddingVertical: 20,
  },
  preferenceSection: {
    marginBottom: 24,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 12,
  },
  sliderContainer: {
    gap: 8,
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
  },
  sliderFill: {
    height: 6,
    borderRadius: 3,
  },
  preferenceActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});