import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from './ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';

interface VisitedLocation {
  id: string;
  name: string;
  address: string;
  visitDate: Date;
  duration: number; // in minutes
  coordinates: {
    latitude: number;
    longitude: number;
  };
  category: 'attraction' | 'restaurant' | 'hotel' | 'transport' | 'shopping' | 'entertainment' | 'other';
  rating?: number;
  photos?: string[];
  notes?: string;
  safetyRating: number;
  wasEmergency: boolean;
}

interface TravelStats {
  totalLocations: number;
  totalDuration: number;
  totalDistance: number;
  favoriteCategory: string;
  averageSafety: number;
  emergencyVisits: number;
}

export default function History() {
  const colorScheme = useColorScheme();
  const { userToken, touristId } = useAuth();
  
  const [visitedLocations, setVisitedLocations] = useState<VisitedLocation[]>([]);
  const [travelStats, setTravelStats] = useState<TravelStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filterOptions = [
    { id: 'all', label: 'All Visits', icon: 'calendar' },
    { id: 'today', label: 'Today', icon: 'sun.max' },
    { id: 'week', label: 'This Week', icon: 'calendar.badge.plus' },
    { id: 'month', label: 'This Month', icon: 'calendar' },
    { id: 'emergency', label: 'Emergency', icon: 'exclamationmark.triangle' }
  ];

  const categoryIcons = {
    attraction: 'camera.fill',
    restaurant: 'fork.knife',
    hotel: 'bed.double.fill',
    transport: 'car.fill',
    shopping: 'bag.fill',
    entertainment: 'theatermasks.fill',
    other: 'location.circle'
  };

  const categoryColors = {
    attraction: '#9C27B0',
    restaurant: '#FF5722',
    hotel: '#4CAF50',
    transport: '#607D8B',
    shopping: '#E91E63',
    entertainment: '#673AB7',
    other: '#FF9800'
  };

  useEffect(() => {
    fetchVisitHistory();
  }, []);

  const fetchVisitHistory = async () => {
    try {
      setLoading(true);
      
      // Mock data for demonstration
      const mockData: VisitedLocation[] = [
        {
          id: 'visit-001',
          name: 'India Gate',
          address: 'Rajpath, India Gate, New Delhi',
          visitDate: new Date('2025-09-21T10:30:00'),
          duration: 120,
          coordinates: { latitude: 28.6129, longitude: 77.2295 },
          category: 'attraction',
          rating: 5,
          safetyRating: 95,
          wasEmergency: false,
          notes: 'Beautiful monument, great for photos'
        },
        {
          id: 'visit-002',
          name: 'Karim Hotel Restaurant',
          address: 'Jama Masjid, Old Delhi',
          visitDate: new Date('2025-09-21T13:15:00'),
          duration: 75,
          coordinates: { latitude: 28.6507, longitude: 77.2334 },
          category: 'restaurant',
          rating: 4,
          safetyRating: 88,
          wasEmergency: false,
          notes: 'Amazing Mughlai food, highly recommended'
        },
        {
          id: 'visit-003',
          name: 'Red Fort',
          address: 'Netaji Subhash Marg, Chandni Chowk',
          visitDate: new Date('2025-09-20T16:00:00'),
          duration: 180,
          coordinates: { latitude: 28.6562, longitude: 77.2410 },
          category: 'attraction',
          rating: 5,
          safetyRating: 90,
          wasEmergency: false,
          notes: 'Historic fort with rich Mughal architecture'
        },
        {
          id: 'visit-004',
          name: 'Emergency Call - Police Station',
          address: 'Connaught Place Police Station',
          visitDate: new Date('2025-09-19T22:30:00'),
          duration: 45,
          coordinates: { latitude: 28.6304, longitude: 77.2177 },
          category: 'other',
          safetyRating: 85,
          wasEmergency: true,
          notes: 'Emergency assistance - Lost wallet, police were very helpful'
        },
        {
          id: 'visit-005',
          name: 'The Imperial Hotel',
          address: 'Janpath, New Delhi',
          visitDate: new Date('2025-09-18T20:00:00'),
          duration: 600, // 10 hours
          coordinates: { latitude: 28.6243, longitude: 77.2187 },
          category: 'hotel',
          rating: 5,
          safetyRating: 98,
          wasEmergency: false,
          notes: 'Luxury accommodation, excellent service'
        }
      ];

      setVisitedLocations(mockData);
      
      // Calculate stats
      const stats: TravelStats = {
        totalLocations: mockData.length,
        totalDuration: mockData.reduce((sum, loc) => sum + loc.duration, 0),
        totalDistance: 25.4, // Mock distance in km
        favoriteCategory: 'attraction',
        averageSafety: mockData.reduce((sum, loc) => sum + loc.safetyRating, 0) / mockData.length,
        emergencyVisits: mockData.filter(loc => loc.wasEmergency).length
      };
      
      setTravelStats(stats);
    } catch (error) {
      console.error('Error fetching visit history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchVisitHistory();
  };

  const filteredLocations = visitedLocations.filter(location => {
    const now = new Date();
    const visitDate = location.visitDate;
    
    switch (selectedFilter) {
      case 'today':
        return visitDate.toDateString() === now.toDateString();
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return visitDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return visitDate >= monthAgo;
      case 'emergency':
        return location.wasEmergency;
      default:
        return true;
    }
  });

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Today ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-IN');
    }
  };

  const getSafetyColor = (rating: number) => {
    if (rating >= 90) return Colors[colorScheme ?? 'light'].success;
    if (rating >= 75) return Colors[colorScheme ?? 'light'].warning;
    return Colors[colorScheme ?? 'light'].error;
  };

  const handleLocationPress = (location: VisitedLocation) => {
    Alert.alert(
      location.name,
      `Visited: ${formatDate(location.visitDate)}\nDuration: ${formatDuration(location.duration)}\n\n${location.notes || 'No notes available'}`,
      [
        { text: 'OK', style: 'default' }
      ]
    );
  };

  if (loading && visitedLocations.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <IconSymbol name="clock.arrow.circlepath" size={48} color={Colors[colorScheme ?? 'light'].primary} />
          <ThemedText style={styles.loadingText}>Loading your travel history...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Travel History</ThemedText>
        <ThemedText style={styles.subtitle}>Tourist ID: {touristId}</ThemedText>
      </View>

      {/* Stats Cards */}
      {travelStats && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.statsContainer}
          contentContainerStyle={styles.statsContent}
        >
          <View style={[styles.statCard, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
            <IconSymbol name="location.fill" size={24} color={Colors[colorScheme ?? 'light'].primary} />
            <ThemedText style={styles.statNumber}>{travelStats.totalLocations}</ThemedText>
            <ThemedText style={styles.statLabel}>Places Visited</ThemedText>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
            <IconSymbol name="clock.fill" size={24} color={Colors[colorScheme ?? 'light'].secondary} />
            <ThemedText style={styles.statNumber}>{formatDuration(travelStats.totalDuration)}</ThemedText>
            <ThemedText style={styles.statLabel}>Total Time</ThemedText>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
            <IconSymbol name="shield.checkered" size={24} color={getSafetyColor(travelStats.averageSafety)} />
            <ThemedText style={styles.statNumber}>{Math.round(travelStats.averageSafety)}%</ThemedText>
            <ThemedText style={styles.statLabel}>Avg Safety</ThemedText>
          </View>
          
          {travelStats.emergencyVisits > 0 && (
            <View style={[styles.statCard, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={24} color={Colors[colorScheme ?? 'light'].error} />
              <ThemedText style={styles.statNumber}>{travelStats.emergencyVisits}</ThemedText>
              <ThemedText style={styles.statLabel}>Emergency Calls</ThemedText>
            </View>
          )}
        </ScrollView>
      )}

      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filterTabs}
        contentContainerStyle={styles.filterTabsContent}
      >
        {filterOptions.map(filter => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterTab,
              {
                backgroundColor: selectedFilter === filter.id 
                  ? Colors[colorScheme ?? 'light'].primary + '30'
                  : Colors[colorScheme ?? 'light'].card,
                borderColor: selectedFilter === filter.id 
                  ? Colors[colorScheme ?? 'light'].primary
                  : Colors[colorScheme ?? 'light'].border
              }
            ]}
            onPress={() => setSelectedFilter(filter.id)}
          >
            <IconSymbol 
              name={filter.icon as any} 
              size={16} 
              color={selectedFilter === filter.id ? Colors[colorScheme ?? 'light'].primary : Colors[colorScheme ?? 'light'].text} 
            />
            <ThemedText 
              style={[
                styles.filterTabText,
                { color: selectedFilter === filter.id ? Colors[colorScheme ?? 'light'].primary : Colors[colorScheme ?? 'light'].text }
              ]}
            >
              {filter.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* History List */}
      <ScrollView
        style={styles.historyList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredLocations.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="location.slash" size={64} color={Colors[colorScheme ?? 'light'].tabIconDefault} />
            <ThemedText style={styles.emptyTitle}>No History Found</ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              {selectedFilter === 'all' 
                ? 'Start exploring places to build your travel history!' 
                : 'No visits found for the selected filter.'}
            </ThemedText>
          </View>
        ) : (
          filteredLocations.map(location => (
            <TouchableOpacity
              key={location.id}
              style={[
                styles.historyCard,
                { 
                  backgroundColor: Colors[colorScheme ?? 'light'].card,
                  borderLeftColor: location.wasEmergency 
                    ? Colors[colorScheme ?? 'light'].error 
                    : categoryColors[location.category]
                }
              ]}
              onPress={() => handleLocationPress(location)}
            >
              <View style={styles.historyHeader}>
                <View style={styles.historyTitleSection}>
                  <View style={[
                    styles.categoryIcon,
                    { 
                      backgroundColor: location.wasEmergency
                        ? Colors[colorScheme ?? 'light'].error + '20'
                        : categoryColors[location.category] + '20'
                    }
                  ]}>
                    <IconSymbol 
                      name={location.wasEmergency 
                        ? 'exclamationmark.triangle.fill' 
                        : (categoryIcons[location.category] as any)}
                      size={20}
                      color={location.wasEmergency 
                        ? Colors[colorScheme ?? 'light'].error 
                        : categoryColors[location.category]}
                    />
                  </View>
                  
                  <View style={styles.historyTitleInfo}>
                    <ThemedText style={styles.historyName}>{location.name}</ThemedText>
                    <ThemedText style={styles.historyDate}>{formatDate(location.visitDate)}</ThemedText>
                  </View>
                </View>
                
                <View style={styles.historyMeta}>
                  <View style={styles.safetyIndicator}>
                    <IconSymbol name="shield.checkered" size={14} color={getSafetyColor(location.safetyRating)} />
                    <ThemedText style={[styles.safetyText, { color: getSafetyColor(location.safetyRating) }]}>
                      {location.safetyRating}%
                    </ThemedText>
                  </View>
                </View>
              </View>

              <ThemedText style={styles.historyAddress} numberOfLines={1}>
                {location.address}
              </ThemedText>

              <View style={styles.historyStats}>
                <View style={styles.statItem}>
                  <IconSymbol name="clock" size={14} color={Colors[colorScheme ?? 'light'].tabIconDefault} />
                  <ThemedText style={styles.statItemText}>{formatDuration(location.duration)}</ThemedText>
                </View>
                
                {location.rating && (
                  <View style={styles.statItem}>
                    <IconSymbol name="star.fill" size={14} color="#FFD700" />
                    <ThemedText style={styles.statItemText}>{location.rating}/5</ThemedText>
                  </View>
                )}
                
                {location.wasEmergency && (
                  <View style={styles.emergencyBadge}>
                    <ThemedText style={styles.emergencyBadgeText}>EMERGENCY</ThemedText>
                  </View>
                )}
              </View>

              {location.notes && (
                <ThemedText style={styles.historyNotes} numberOfLines={2}>
                  {location.notes}
                </ThemedText>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  statsContainer: {
    marginBottom: 16,
  },
  statsContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 100,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 10,
    opacity: 0.7,
    marginTop: 4,
    textAlign: 'center',
  },
  filterTabs: {
    marginBottom: 16,
  },
  filterTabsContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  historyList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptySubtitle: {
    textAlign: 'center',
    opacity: 0.7,
    paddingHorizontal: 40,
  },
  historyCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  historyTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyTitleInfo: {
    flex: 1,
  },
  historyName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  historyMeta: {
    alignItems: 'flex-end',
  },
  safetyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  safetyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  historyAddress: {
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 8,
  },
  historyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statItemText: {
    fontSize: 12,
    opacity: 0.8,
  },
  emergencyBadge: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emergencyBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  historyNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.7,
  },
});