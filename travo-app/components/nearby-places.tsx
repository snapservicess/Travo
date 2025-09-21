import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Linking } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from './ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';

interface NearbyPlace {
  id: string;
  name: string;
  category: 'restaurant' | 'attraction' | 'hospital' | 'police' | 'hotel' | 'transport' | 'shopping' | 'entertainment';
  rating: number;
  distance: number; // in kilometers
  address: string;
  phone?: string;
  website?: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  isOpen: boolean;
  openHours?: string;
  priceLevel?: 1 | 2 | 3 | 4; // 1 = cheap, 4 = expensive
  safetyRating: number;
  verifiedTourist: boolean;
  description: string;
  imageUrl?: string;
}

interface PlaceFilter {
  category: string;
  distance: 'all' | '1km' | '5km' | '10km';
  rating: 'all' | '4+' | '4.5+';
  priceLevel: 'all' | '1' | '2' | '3' | '4';
}

const API_BASE_URL = 'http://192.168.1.100:3001/api';

export default function NearbyPlaces() {
  const colorScheme = useColorScheme();
  const { userToken } = useAuth();
  
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const [filters, setFilters] = useState<PlaceFilter>({
    category: 'all',
    distance: 'all',
    rating: 'all',
    priceLevel: 'all'
  });

  const categories = [
    { id: 'all', label: 'All Places', icon: 'location.circle', color: '#FF9800' },
    { id: 'restaurant', label: 'Restaurants', icon: 'fork.knife', color: '#FF5722' },
    { id: 'attraction', label: 'Attractions', icon: 'camera.fill', color: '#9C27B0' },
    { id: 'hospital', label: 'Medical', icon: 'cross.case.fill', color: '#F44336' },
    { id: 'police', label: 'Police', icon: 'shield.fill', color: '#2196F3' },
    { id: 'hotel', label: 'Hotels', icon: 'bed.double.fill', color: '#4CAF50' },
    { id: 'transport', label: 'Transport', icon: 'car.fill', color: '#607D8B' },
    { id: 'shopping', label: 'Shopping', icon: 'bag.fill', color: '#E91E63' },
    { id: 'entertainment', label: 'Entertainment', icon: 'theatermasks.fill', color: '#673AB7' }
  ];

  const fetchNearbyPlacesCallback = React.useCallback(async () => {
    const mockData: NearbyPlace[] = [
      {
        id: 'place-001',
        name: 'India Gate',
        category: 'attraction',
        rating: 4.6,
        distance: 2.3,
        address: 'Rajpath, India Gate, New Delhi, Delhi 110001',
        coordinates: { latitude: 28.6129, longitude: 77.2295 },
        isOpen: true,
        openHours: '24 hours',
        safetyRating: 92,
        verifiedTourist: true,
        description: 'A war memorial arch and one of the most iconic landmarks of Delhi.'
      },
      {
        id: 'place-002',
        name: 'Karim Hotel',
        category: 'restaurant',
        rating: 4.4,
        distance: 0.8,
        address: '16, Gali Kababian, Jama Masjid, New Delhi',
        phone: '+91-11-2326-9880',
        coordinates: { latitude: 28.6507, longitude: 77.2334 },
        isOpen: true,
        openHours: '11:00 AM - 11:00 PM',
        priceLevel: 2,
        safetyRating: 88,
        verifiedTourist: true,
        description: 'Famous Mughlai restaurant established in 1913, known for authentic kebabs and biryanis.'
      },
      {
        id: 'place-003',
        name: 'All India Institute of Medical Sciences',
        category: 'hospital',
        rating: 4.2,
        distance: 3.5,
        address: 'Sri Aurobindo Marg, Ansari Nagar, New Delhi, Delhi 110029',
        phone: '+91-11-2658-8500',
        coordinates: { latitude: 28.5672, longitude: 77.2100 },
        isOpen: true,
        openHours: '24 hours',
        safetyRating: 95,
        verifiedTourist: true,
        description: 'Premier medical institution and hospital providing world-class healthcare services.'
      },
      {
        id: 'place-004',
        name: 'Connaught Place Police Station',
        category: 'police',
        rating: 3.8,
        distance: 1.2,
        address: 'Connaught Place, New Delhi, Delhi 110001',
        phone: '+91-11-2336-2222',
        coordinates: { latitude: 28.6304, longitude: 77.2177 },
        isOpen: true,
        openHours: '24 hours',
        safetyRating: 90,
        verifiedTourist: true,
        description: 'Central police station serving the Connaught Place area with tourist assistance.'
      },
      {
        id: 'place-005',
        name: 'The Imperial New Delhi',
        category: 'hotel',
        rating: 4.8,
        distance: 1.8,
        address: '1, Janpath, Man Singh Road Area, New Delhi, Delhi 110001',
        phone: '+91-11-2334-1234',
        website: 'https://theimperialindia.com',
        coordinates: { latitude: 28.6243, longitude: 77.2187 },
        isOpen: true,
        openHours: '24 hours',
        priceLevel: 4,
        safetyRating: 96,
        verifiedTourist: true,
        description: 'Luxury heritage hotel in the heart of New Delhi, offering world-class amenities.'
      },
      {
        id: 'place-006',
        name: 'New Delhi Railway Station',
        category: 'transport',
        rating: 4.0,
        distance: 2.1,
        address: 'Bhavbhuti Marg, New Delhi, Delhi 110055',
        phone: '+91-139',
        coordinates: { latitude: 28.6434, longitude: 77.2197 },
        isOpen: true,
        openHours: '24 hours',
        safetyRating: 85,
        verifiedTourist: true,
        description: 'Major railway station connecting Delhi to all parts of India with modern facilities.'
      }
    ];

    try {
      setLoading(true);
      // In a real app, you would get the user's current location first
      const mockLocation = { latitude: 28.6139, longitude: 77.2090 }; // New Delhi coordinates
      
      const response = await fetch(`${API_BASE_URL}/nearby-places`, {
        method: 'POST',
        headers: userToken ? {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        } : {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          latitude: mockLocation.latitude,
          longitude: mockLocation.longitude,
          radius: 10000 // 10km radius
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPlaces(data.places);
        } else {
          setPlaces(mockData);
        }
      } else {
        setPlaces(mockData);
      }
    } catch (error) {
      console.error('Error fetching nearby places:', error);
      setPlaces(mockData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userToken]);

  useEffect(() => {
    fetchNearbyPlacesCallback();
  }, [fetchNearbyPlacesCallback]);



  const onRefresh = () => {
    setRefreshing(true);
    fetchNearbyPlacesCallback();
  };

  const filteredPlaces = places.filter(place => {
    if (selectedCategory !== 'all' && place.category !== selectedCategory) return false;
    if (filters.distance !== 'all') {
      const maxDistance = parseInt(filters.distance.replace('km', ''));
      if (place.distance > maxDistance) return false;
    }
    if (filters.rating !== 'all') {
      const minRating = parseFloat(filters.rating.replace('+', ''));
      if (place.rating < minRating) return false;
    }
    return true;
  });

  const getCategoryColor = (category: string) => {
    return categories.find(c => c.id === category)?.color || '#FF9800';
  };

  const getCategoryIcon = (category: string) => {
    return categories.find(c => c.id === category)?.icon || 'location.circle';
  };

  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const getPriceLevelText = (level?: number) => {
    if (!level) return '';
    return '₹'.repeat(level);
  };

  const handlePlacePress = (place: NearbyPlace) => {
    Alert.alert(
      place.name,
      place.description,
      [
        { text: 'Cancel', style: 'cancel' },
        ...(place.phone ? [{
          text: 'Call',
          onPress: () => Linking.openURL(`tel:${place.phone}`)
        }] : []),
        {
          text: 'Navigate',
          onPress: () => {
            const url = `maps:0,0?q=${place.coordinates.latitude},${place.coordinates.longitude}`;
            Linking.openURL(url).catch(() => {
              // Fallback to Google Maps web
              Linking.openURL(`https://maps.google.com/?q=${place.coordinates.latitude},${place.coordinates.longitude}`);
            });
          }
        }
      ]
    );
  };

  const getSafetyColor = (rating: number) => {
    if (rating >= 90) return Colors[colorScheme ?? 'light'].success;
    if (rating >= 75) return Colors[colorScheme ?? 'light'].warning;
    return Colors[colorScheme ?? 'light'].error;
  };

  if (loading && places.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <IconSymbol name="location.circle" size={48} color={Colors[colorScheme ?? 'light'].primary} />
          <ThemedText style={styles.loadingText}>Finding nearby places...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Nearby Places</ThemedText>
        <View style={styles.locationIndicator}>
          <IconSymbol name="location.fill" size={16} color={Colors[colorScheme ?? 'light'].success} />
          <ThemedText style={styles.locationText}>New Delhi</ThemedText>
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.categoryFilter}
        contentContainerStyle={styles.categoryFilterContent}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              {
                backgroundColor: selectedCategory === category.id 
                  ? category.color + '30'
                  : Colors[colorScheme ?? 'light'].card,
                borderColor: selectedCategory === category.id 
                  ? category.color
                  : Colors[colorScheme ?? 'light'].border
              }
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <IconSymbol 
              name={category.icon as any} 
              size={16} 
              color={selectedCategory === category.id ? category.color : Colors[colorScheme ?? 'light'].text} 
            />
            <ThemedText 
              style={[
                styles.categoryChipText,
                { color: selectedCategory === category.id ? category.color : Colors[colorScheme ?? 'light'].text }
              ]}
            >
              {category.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Places List */}
      <ScrollView
        style={styles.placesList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredPlaces.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="location.slash" size={64} color={Colors[colorScheme ?? 'light'].tabIconDefault} />
            <ThemedText style={styles.emptyTitle}>No Places Found</ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              Try adjusting your filters or check back later for new places.
            </ThemedText>
          </View>
        ) : (
          filteredPlaces.map(place => (
            <TouchableOpacity
              key={place.id}
              style={[styles.placeCard, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}
              onPress={() => handlePlacePress(place)}
            >
              <View style={styles.placeHeader}>
                <View style={styles.placeTitleSection}>
                  <View style={[
                    styles.categoryIcon,
                    { backgroundColor: getCategoryColor(place.category) + '20' }
                  ]}>
                    <IconSymbol 
                      name={getCategoryIcon(place.category) as any}
                      size={20}
                      color={getCategoryColor(place.category)}
                    />
                  </View>
                  <View style={styles.placeTitleInfo}>
                    <View style={styles.placeNameRow}>
                      <ThemedText style={styles.placeName}>{place.name}</ThemedText>
                      {place.verifiedTourist && (
                        <View style={[styles.verifiedBadge, { backgroundColor: Colors[colorScheme ?? 'light'].success }]}>
                          <IconSymbol name="checkmark.circle.fill" size={12} color="white" />
                        </View>
                      )}
                    </View>
                    <ThemedText style={styles.placeDistance}>{formatDistance(place.distance)} away</ThemedText>
                  </View>
                </View>
                
                <View style={styles.placeActions}>
                  <View style={styles.placeStatus}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: place.isOpen ? Colors[colorScheme ?? 'light'].success : Colors[colorScheme ?? 'light'].error }
                    ]} />
                    <ThemedText style={styles.statusText}>
                      {place.isOpen ? 'Open' : 'Closed'}
                    </ThemedText>
                  </View>
                </View>
              </View>

              <ThemedText style={styles.placeAddress} numberOfLines={2}>
                {place.address}
              </ThemedText>

              <View style={styles.placeMeta}>
                <View style={styles.placeStats}>
                  <View style={styles.statItem}>
                    <IconSymbol name="star.fill" size={14} color="#FFD700" />
                    <ThemedText style={styles.statText}>{place.rating}</ThemedText>
                  </View>
                  
                  <View style={styles.statItem}>
                    <IconSymbol name="shield.checkered" size={14} color={getSafetyColor(place.safetyRating)} />
                    <ThemedText style={styles.statText}>{place.safetyRating}%</ThemedText>
                  </View>

                  {place.priceLevel && (
                    <View style={styles.statItem}>
                      <ThemedText style={styles.priceLevel}>{getPriceLevelText(place.priceLevel)}</ThemedText>
                    </View>
                  )}
                </View>

                {place.openHours && (
                  <View style={styles.hoursSection}>
                    <IconSymbol name="clock" size={12} color={Colors[colorScheme ?? 'light'].tabIconDefault} />
                    <ThemedText style={styles.hoursText}>{place.openHours}</ThemedText>
                  </View>
                )}
              </View>

              <View style={styles.placeActions}>
                {place.phone && (
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: Colors[colorScheme ?? 'light'].primary + '20' }]}
                    onPress={() => Linking.openURL(`tel:${place.phone}`)}
                  >
                    <IconSymbol name="phone.fill" size={16} color={Colors[colorScheme ?? 'light'].primary} />
                    <ThemedText style={[styles.actionButtonText, { color: Colors[colorScheme ?? 'light'].primary }]}>
                      Call
                    </ThemedText>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: Colors[colorScheme ?? 'light'].success + '20' }]}
                  onPress={() => {
                    const url = `maps:0,0?q=${place.coordinates.latitude},${place.coordinates.longitude}`;
                    Linking.openURL(url).catch(() => {
                      Linking.openURL(`https://maps.google.com/?q=${place.coordinates.latitude},${place.coordinates.longitude}`);
                    });
                  }}
                >
                  <IconSymbol name="location.north.line" size={16} color={Colors[colorScheme ?? 'light'].success} />
                  <ThemedText style={[styles.actionButtonText, { color: Colors[colorScheme ?? 'light'].success }]}>
                    Navigate
                  </ThemedText>
                </TouchableOpacity>
              </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  locationIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    opacity: 0.8,
  },
  categoryFilter: {
    marginBottom: 16,
  },
  categoryFilterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  placesList: {
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
  placeCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  placeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  placeTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeTitleInfo: {
    flex: 1,
  },
  placeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placeName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeDistance: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  placeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  placeAddress: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 12,
  },
  placeMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  placeStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceLevel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  hoursSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hoursText: {
    fontSize: 12,
    opacity: 0.7,
  },
  placeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});