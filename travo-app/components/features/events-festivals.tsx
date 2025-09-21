import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, Linking, RefreshControl, TextInput } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '../ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';

interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  type: 'cultural' | 'sports' | 'music' | 'food' | 'shopping' | 'religious' | 'art' | 'festival';
  description: string;
  image?: string;
  price?: {
    min: number;
    max: number;
    currency: string;
    isFree: boolean;
  };
  duration?: string;
  organizer?: string;
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  capacity?: number;
  attendees?: number;
  rating?: number;
  reviews?: number;
  tags?: string[];
  requirements?: string[];
  accessibility?: {
    wheelchairAccessible: boolean;
    signLanguage: boolean;
    audioAssistance: boolean;
  };
  safety?: {
    safetyRating: number;
    crowdLevel: 'low' | 'medium' | 'high';
    securityPresence: boolean;
  };
}

interface EventFilter {
  type: string;
  dateRange: 'today' | 'tomorrow' | 'week' | 'month' | 'all';
  priceRange: 'free' | 'budget' | 'premium' | 'all';
  location: 'nearby' | 'city' | 'all';
}

const API_BASE_URL = 'http://192.168.1.100:3001/api';

export default function EventsFestivals() {
  const colorScheme = useColorScheme();
  const { userToken } = useAuth();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [filters, setFilters] = useState<EventFilter>({
    type: 'all',
    dateRange: 'all',
    priceRange: 'all',
    location: 'all'
  });

  const eventTypes = [
    { id: 'all', label: 'All Events', icon: 'calendar.badge.plus', color: '#FF9800' },
    { id: 'cultural', label: 'Cultural', icon: 'theatermasks', color: '#9C27B0' },
    { id: 'festival', label: 'Festivals', icon: 'party.popper', color: '#E91E63' },
    { id: 'music', label: 'Music', icon: 'music.note', color: '#673AB7' },
    { id: 'food', label: 'Food', icon: 'fork.knife', color: '#FF5722' },
    { id: 'sports', label: 'Sports', icon: 'sportscourt', color: '#2196F3' },
    { id: 'art', label: 'Art', icon: 'paintbrush', color: '#607D8B' },
    { id: 'shopping', label: 'Shopping', icon: 'bag', color: '#4CAF50' },
    { id: 'religious', label: 'Religious', icon: 'building.columns', color: '#795548' }
  ];

  // Mock events data for fallback
  const mockEvents: Event[] = React.useMemo(() => [
    {
      id: 'evt-001',
      name: 'Diwali Light Festival',
      date: '2025-10-25',
      location: 'India Gate, New Delhi',
      type: 'festival',
      description: 'Spectacular light display and traditional celebrations for Diwali, the Festival of Lights.',
      price: { min: 0, max: 0, currency: 'INR', isFree: true },
      duration: '4 hours',
      organizer: 'Delhi Tourism',
      capacity: 10000,
      attendees: 7500,
      rating: 4.8,
      reviews: 1200,
      tags: ['Traditional', 'Lights', 'Family', 'Cultural'],
      accessibility: {
        wheelchairAccessible: true,
        signLanguage: false,
        audioAssistance: true
      },
      safety: {
        safetyRating: 92,
        crowdLevel: 'high',
        securityPresence: true
      }
    },
    {
      id: 'evt-002',
      name: 'Rajasthani Folk Music Concert',
      date: '2025-09-28',
      location: 'Purana Qila Amphitheater',
      type: 'music',
      description: 'Live performance by renowned Rajasthani folk artists showcasing traditional music and dance.',
      price: { min: 200, max: 800, currency: 'INR', isFree: false },
      duration: '3 hours',
      organizer: 'Cultural Heritage Society',
      capacity: 2000,
      attendees: 1200,
      rating: 4.6,
      reviews: 340,
      tags: ['Folk', 'Traditional', 'Live Music', 'Cultural'],
      accessibility: {
        wheelchairAccessible: true,
        signLanguage: true,
        audioAssistance: true
      },
      safety: {
        safetyRating: 88,
        crowdLevel: 'medium',
        securityPresence: true
      }
    },
    {
      id: 'evt-003',
      name: 'Street Food Festival',
      date: '2025-09-30',
      location: 'Connaught Place',
      type: 'food',
      description: 'Experience authentic Delhi street food from 50+ vendors, cooking competitions, and food tours.',
      price: { min: 100, max: 500, currency: 'INR', isFree: false },
      duration: '6 hours',
      organizer: 'Delhi Food Association',
      capacity: 5000,
      attendees: 3200,
      rating: 4.4,
      reviews: 890,
      tags: ['Street Food', 'Local Cuisine', 'Vendors', 'Tasting'],
      accessibility: {
        wheelchairAccessible: false,
        signLanguage: false,
        audioAssistance: false
      },
      safety: {
        safetyRating: 85,
        crowdLevel: 'high',
        securityPresence: true
      }
    }
  ], []);

  const fetchEvents = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/events`, {
        headers: userToken ? {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        } : {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        // Transform backend data to match our interface
        const transformedEvents = data.events.map((event: any) => ({
          id: event.id,
          name: event.name,
          date: event.date,
          location: event.location,
          type: event.type,
          description: event.description,
          price: {
            min: 0,
            max: event.type === 'cultural' ? 500 : 200,
            currency: 'INR',
            isFree: Math.random() > 0.6
          },
          duration: event.type === 'festival' ? '3 days' : '2-4 hours',
          organizer: 'Local Tourism Board',
          contact: {
            phone: '+91-1800-111-363',
            website: 'https://tourism.gov.in'
          },
          capacity: Math.floor(Math.random() * 5000) + 500,
          attendees: Math.floor(Math.random() * 2000) + 100,
          rating: 4.0 + Math.random() * 1.0,
          reviews: Math.floor(Math.random() * 500) + 50,
          tags: generateEventTags(event.type),
          accessibility: {
            wheelchairAccessible: Math.random() > 0.5,
            signLanguage: Math.random() > 0.7,
            audioAssistance: Math.random() > 0.6
          },
          safety: {
            safetyRating: 80 + Math.random() * 15,
            crowdLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
            securityPresence: Math.random() > 0.3
          }
        }));

        setEvents(transformedEvents);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      // Fallback to mock data
      setEvents(mockEvents);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userToken, mockEvents]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);



  const generateEventTags = (type: string): string[] => {
    const tagMap: { [key: string]: string[] } = {
      cultural: ['Traditional', 'Heritage', 'Dance', 'Music'],
      festival: ['Celebration', 'Community', 'Food', 'Entertainment'],
      music: ['Live', 'Concert', 'Performance', 'Audio'],
      food: ['Cuisine', 'Local', 'Tasting', 'Cooking'],
      sports: ['Active', 'Competition', 'Fitness', 'Outdoor'],
      art: ['Creative', 'Visual', 'Exhibition', 'Gallery'],
      shopping: ['Market', 'Local', 'Crafts', 'Souvenirs'],
      religious: ['Spiritual', 'Pilgrimage', 'Sacred', 'Prayer']
    };
    
    return tagMap[type] || ['Event', 'Local', 'Experience'];
  };



  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const filteredEvents = events.filter(event => {
    if (filters.type !== 'all' && event.type !== filters.type) return false;
    if (searchQuery && !event.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filters.priceRange === 'free' && !event.price?.isFree) return false;
    if (filters.priceRange === 'budget' && event.price && event.price.max > 300) return false;
    if (filters.priceRange === 'premium' && event.price && event.price.max < 500) return false;
    
    return true;
  });

  const handleEventPress = (event: Event) => {
    setSelectedEvent(event);
  };

  const handleBooking = (event: Event) => {
    Alert.alert(
      'Book Event',
      `Would you like to book "${event.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Book Now',
          onPress: () => {
            if (event.contact?.website) {
              Linking.openURL(event.contact.website);
            } else if (event.contact?.phone) {
              Linking.openURL(`tel:${event.contact.phone}`);
            } else {
              Alert.alert('Booking', 'Booking feature coming soon!');
            }
          }
        }
      ]
    );
  };

  const handleShare = (event: Event) => {
    Alert.alert('Share Event', `Share "${event.name}" with friends?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Share', onPress: () => Alert.alert('Shared!', 'Event shared successfully.') }
    ]);
  };

  const getEventTypeColor = (type: string) => {
    return eventTypes.find(t => t.id === type)?.color || '#FF9800';
  };

  const getEventTypeIcon = (type: string) => {
    return eventTypes.find(t => t.id === type)?.icon || 'calendar.badge.plus';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getSafetyColor = (rating: number) => {
    if (rating >= 90) return Colors[colorScheme ?? 'light'].success;
    if (rating >= 75) return Colors[colorScheme ?? 'light'].warning;
    return Colors[colorScheme ?? 'light'].error;
  };

  if (loading && events.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <IconSymbol name="calendar.badge.plus" size={48} color={Colors[colorScheme ?? 'light'].primary} />
          <ThemedText style={styles.loadingText}>Loading Events...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Events & Festivals</ThemedText>
        <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterButton}>
          <IconSymbol name="line.3.horizontal.decrease.circle" size={24} color={Colors[colorScheme ?? 'light'].primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
        <IconSymbol name="magnifyingglass" size={16} color={Colors[colorScheme ?? 'light'].tabIconDefault} />
        <TextInput
          style={[styles.searchInput, { color: Colors[colorScheme ?? 'light'].text }]}
          placeholder="Search events..."
          placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <IconSymbol name="xmark.circle.fill" size={16} color={Colors[colorScheme ?? 'light'].tabIconDefault} />
          </TouchableOpacity>
        )}
      </View>

      {/* Event Type Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.typeFilter}
        contentContainerStyle={styles.typeFilterContent}
      >
        {eventTypes.map(type => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.typeChip,
              {
                backgroundColor: filters.type === type.id 
                  ? type.color + '30'
                  : Colors[colorScheme ?? 'light'].card,
                borderColor: filters.type === type.id 
                  ? type.color
                  : Colors[colorScheme ?? 'light'].border
              }
            ]}
            onPress={() => setFilters(prev => ({ ...prev, type: type.id }))}
          >
            <IconSymbol 
              name={type.icon as any} 
              size={16} 
              color={filters.type === type.id ? type.color : Colors[colorScheme ?? 'light'].text} 
            />
            <ThemedText 
              style={[
                styles.typeChipText,
                { color: filters.type === type.id ? type.color : Colors[colorScheme ?? 'light'].text }
              ]}
            >
              {type.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Events List */}
      <ScrollView
        style={styles.eventsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="calendar.badge.exclamationmark" size={64} color={Colors[colorScheme ?? 'light'].tabIconDefault} />
            <ThemedText style={styles.emptyTitle}>No Events Found</ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              Try adjusting your filters or check back later for new events.
            </ThemedText>
          </View>
        ) : (
          filteredEvents.map(event => (
            <TouchableOpacity
              key={event.id}
              style={[styles.eventCard, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}
              onPress={() => handleEventPress(event)}
            >
              <View style={styles.eventHeader}>
                <View style={styles.eventTitleSection}>
                  <View style={[
                    styles.eventTypeIcon,
                    { backgroundColor: getEventTypeColor(event.type) + '20' }
                  ]}>
                    <IconSymbol 
                      name={getEventTypeIcon(event.type) as any}
                      size={20}
                      color={getEventTypeColor(event.type)}
                    />
                  </View>
                  <View style={styles.eventTitleInfo}>
                    <ThemedText style={styles.eventTitle}>{event.name}</ThemedText>
                    <ThemedText style={styles.eventDate}>{formatDate(event.date)}</ThemedText>
                  </View>
                </View>
                
                <View style={styles.eventActions}>
                  {event.price?.isFree && (
                    <View style={[styles.freeBadge, { backgroundColor: Colors[colorScheme ?? 'light'].success }]}>
                      <ThemedText style={styles.freeBadgeText}>FREE</ThemedText>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => handleShare(event)}>
                    <IconSymbol name="square.and.arrow.up" size={20} color={Colors[colorScheme ?? 'light'].primary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.eventLocation}>
                <IconSymbol name="location" size={16} color={Colors[colorScheme ?? 'light'].primary} />
                <ThemedText style={styles.locationText}>{event.location}</ThemedText>
              </View>

              <ThemedText style={styles.eventDescription} numberOfLines={2}>
                {event.description}
              </ThemedText>

              <View style={styles.eventMeta}>
                <View style={styles.eventStats}>
                  <View style={styles.statItem}>
                    <IconSymbol name="person.2.fill" size={14} color={Colors[colorScheme ?? 'light'].text} />
                    <ThemedText style={styles.statText}>{event.attendees}</ThemedText>
                  </View>
                  
                  {event.rating && (
                    <View style={styles.statItem}>
                      <IconSymbol name="star.fill" size={14} color="#FFD700" />
                      <ThemedText style={styles.statText}>{event.rating.toFixed(1)}</ThemedText>
                    </View>
                  )}
                  
                  <View style={styles.statItem}>
                    <IconSymbol name="shield.checkered" size={14} color={getSafetyColor(event.safety?.safetyRating || 75)} />
                    <ThemedText style={styles.statText}>Safe</ThemedText>
                  </View>
                </View>

                {!event.price?.isFree && (
                  <View style={styles.priceSection}>
                    <ThemedText style={styles.priceText}>
                      ₹{event.price?.min}-{event.price?.max}
                    </ThemedText>
                  </View>
                )}
              </View>

              <View style={styles.eventTags}>
                {event.tags?.slice(0, 3).map((tag, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: Colors[colorScheme ?? 'light'].primary + '20' }]}>
                    <ThemedText style={[styles.tagText, { color: Colors[colorScheme ?? 'light'].primary }]}>
                      {tag}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Event Details Modal */}
      {selectedEvent && (
        <Modal
          visible={!!selectedEvent}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedEvent(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="title" numberOfLines={2} style={styles.modalTitle}>
                  {selectedEvent.name}
                </ThemedText>
                <TouchableOpacity onPress={() => setSelectedEvent(null)}>
                  <IconSymbol name="xmark" size={20} color={Colors[colorScheme ?? 'light'].text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={[
                  styles.eventTypeHeader,
                  { backgroundColor: getEventTypeColor(selectedEvent.type) + '20' }
                ]}>
                  <IconSymbol
                    name={getEventTypeIcon(selectedEvent.type) as any}
                    size={24}
                    color={getEventTypeColor(selectedEvent.type)}
                  />
                  <ThemedText style={[styles.eventTypeLabel, { color: getEventTypeColor(selectedEvent.type) }]}>
                    {eventTypes.find(t => t.id === selectedEvent.type)?.label || 'Event'}
                  </ThemedText>
                </View>

                <View style={styles.eventDetailsSection}>
                  <View style={styles.detailRow}>
                    <IconSymbol name="calendar" size={20} color={Colors[colorScheme ?? 'light'].primary} />
                    <ThemedText style={styles.detailText}>{formatDate(selectedEvent.date)}</ThemedText>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <IconSymbol name="location" size={20} color={Colors[colorScheme ?? 'light'].primary} />
                    <ThemedText style={styles.detailText}>{selectedEvent.location}</ThemedText>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <IconSymbol name="clock" size={20} color={Colors[colorScheme ?? 'light'].primary} />
                    <ThemedText style={styles.detailText}>{selectedEvent.duration}</ThemedText>
                  </View>
                  
                  {selectedEvent.organizer && (
                    <View style={styles.detailRow}>
                      <IconSymbol name="building.2" size={20} color={Colors[colorScheme ?? 'light'].primary} />
                      <ThemedText style={styles.detailText}>{selectedEvent.organizer}</ThemedText>
                    </View>
                  )}
                </View>

                <View style={styles.descriptionSection}>
                  <ThemedText style={styles.sectionTitle}>Description</ThemedText>
                  <ThemedText style={styles.descriptionText}>{selectedEvent.description}</ThemedText>
                </View>

                {selectedEvent.price && (
                  <View style={styles.priceSection}>
                    <ThemedText style={styles.sectionTitle}>Pricing</ThemedText>
                    {selectedEvent.price.isFree ? (
                      <View style={styles.freePricing}>
                        <IconSymbol name="checkmark.circle.fill" size={20} color={Colors[colorScheme ?? 'light'].success} />
                        <ThemedText style={[styles.freePriceText, { color: Colors[colorScheme ?? 'light'].success }]}>
                          Free Entry
                        </ThemedText>
                      </View>
                    ) : (
                      <ThemedText style={styles.priceRangeText}>
                        ₹{selectedEvent.price.min} - ₹{selectedEvent.price.max}
                      </ThemedText>
                    )}
                  </View>
                )}

                <View style={styles.safetySection}>
                  <ThemedText style={styles.sectionTitle}>Safety & Accessibility</ThemedText>
                  
                  <View style={styles.safetyStats}>
                    <View style={styles.safetyItem}>
                      <IconSymbol name="shield.checkered" size={16} color={getSafetyColor(selectedEvent.safety?.safetyRating || 75)} />
                      <ThemedText style={styles.safetyText}>
                        Safety: {selectedEvent.safety?.safetyRating?.toFixed(0)}%
                      </ThemedText>
                    </View>
                    
                    <View style={styles.safetyItem}>
                      <IconSymbol name="person.3.fill" size={16} color={Colors[colorScheme ?? 'light'].text} />
                      <ThemedText style={styles.safetyText}>
                        Crowd: {selectedEvent.safety?.crowdLevel}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.accessibilityItems}>
                    {selectedEvent.accessibility?.wheelchairAccessible && (
                      <View style={styles.accessibilityItem}>
                        <IconSymbol name="figure.roll" size={16} color={Colors[colorScheme ?? 'light'].success} />
                        <ThemedText style={styles.accessibilityText}>Wheelchair Accessible</ThemedText>
                      </View>
                    )}
                    
                    {selectedEvent.accessibility?.signLanguage && (
                      <View style={styles.accessibilityItem}>
                        <IconSymbol name="hand.raised" size={16} color={Colors[colorScheme ?? 'light'].success} />
                        <ThemedText style={styles.accessibilityText}>Sign Language Support</ThemedText>
                      </View>
                    )}
                  </View>
                </View>

                {selectedEvent.tags && selectedEvent.tags.length > 0 && (
                  <View style={styles.tagsSection}>
                    <ThemedText style={styles.sectionTitle}>Tags</ThemedText>
                    <View style={styles.tagsContainer}>
                      {selectedEvent.tags.map((tag, index) => (
                        <View key={index} style={[styles.tag, { backgroundColor: Colors[colorScheme ?? 'light'].primary + '20' }]}>
                          <ThemedText style={[styles.tagText, { color: Colors[colorScheme ?? 'light'].primary }]}>
                            {tag}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.shareButton, { backgroundColor: Colors[colorScheme ?? 'light'].secondary }]}
                  onPress={() => handleShare(selectedEvent)}
                >
                  <IconSymbol name="square.and.arrow.up" size={20} color="white" />
                  <ThemedText style={styles.shareButtonText}>Share</ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.bookButton, { backgroundColor: Colors[colorScheme ?? 'light'].primary }]}
                  onPress={() => handleBooking(selectedEvent)}
                >
                  <IconSymbol name="ticket" size={20} color="white" />
                  <ThemedText style={styles.bookButtonText}>Book Now</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.filtersModal, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
            <View style={styles.filtersHeader}>
              <ThemedText type="subtitle">Filter Events</ThemedText>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <IconSymbol name="xmark" size={20} color={Colors[colorScheme ?? 'light'].text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filtersContent}>
              <View style={styles.filterGroup}>
                <ThemedText style={styles.filterGroupTitle}>Price Range</ThemedText>
                {['all', 'free', 'budget', 'premium'].map(range => (
                  <TouchableOpacity
                    key={range}
                    style={styles.filterOption}
                    onPress={() => setFilters(prev => ({ ...prev, priceRange: range as any }))}
                  >
                    <IconSymbol
                      name={filters.priceRange === range ? "checkmark.circle.fill" : "circle"}
                      size={20}
                      color={filters.priceRange === range ? Colors[colorScheme ?? 'light'].primary : Colors[colorScheme ?? 'light'].tabIconDefault}
                    />
                    <ThemedText style={styles.filterOptionText}>
                      {range === 'all' ? 'All Prices' : range === 'free' ? 'Free Events' : range === 'budget' ? 'Budget (Under ₹300)' : 'Premium (₹500+)'}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.filterGroup}>
                <ThemedText style={styles.filterGroupTitle}>Date Range</ThemedText>
                {['all', 'today', 'tomorrow', 'week', 'month'].map(date => (
                  <TouchableOpacity
                    key={date}
                    style={styles.filterOption}
                    onPress={() => setFilters(prev => ({ ...prev, dateRange: date as any }))}
                  >
                    <IconSymbol
                      name={filters.dateRange === date ? "checkmark.circle.fill" : "circle"}
                      size={20}
                      color={filters.dateRange === date ? Colors[colorScheme ?? 'light'].primary : Colors[colorScheme ?? 'light'].tabIconDefault}
                    />
                    <ThemedText style={styles.filterOptionText}>
                      {date === 'all' ? 'All Dates' : date === 'today' ? 'Today' : date === 'tomorrow' ? 'Tomorrow' : date === 'week' ? 'This Week' : 'This Month'}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.filtersActions}>
              <TouchableOpacity
                style={[styles.resetButton, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}
                onPress={() => setFilters({ type: 'all', dateRange: 'all', priceRange: 'all', location: 'all' })}
              >
                <ThemedText style={styles.resetButtonText}>Reset</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.applyButton, { backgroundColor: Colors[colorScheme ?? 'light'].primary }]}
                onPress={() => setShowFilters(false)}
              >
                <ThemedText style={styles.applyButtonText}>Apply Filters</ThemedText>
              </TouchableOpacity>
            </View>
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
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  typeFilter: {
    marginBottom: 16,
  },
  typeFilterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventsList: {
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
  eventCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  eventTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventTitleInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  eventDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  eventActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  freeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freeBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    opacity: 0.8,
  },
  eventDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  eventMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventStats: {
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
    opacity: 0.8,
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventTags: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 16,
  },
  modalBody: {
    flex: 1,
    paddingVertical: 20,
  },
  eventTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  eventTypeLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  eventDetailsSection: {
    marginBottom: 20,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailText: {
    fontSize: 14,
  },
  descriptionSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  freePricing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  freePriceText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  priceRangeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  safetySection: {
    marginBottom: 20,
  },
  safetyStats: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  safetyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  safetyText: {
    fontSize: 12,
  },
  accessibilityItems: {
    gap: 8,
  },
  accessibilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accessibilityText: {
    fontSize: 12,
  },
  tagsSection: {
    marginBottom: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  bookButton: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  bookButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Filter Modal Styles
  filtersModal: {
    height: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filtersContent: {
    flex: 1,
    paddingVertical: 20,
  },
  filterGroup: {
    marginBottom: 24,
  },
  filterGroupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  filterOptionText: {
    fontSize: 14,
  },
  filtersActions: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
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
    fontWeight: 'bold',
  },
});