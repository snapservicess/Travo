import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '../ui/icon-symbol';
import { useWebSocket } from '@/hooks/useWebSocket';

interface GeofenceZone {
  id: string;
  name: string;
  type: 'safe_zone' | 'restricted' | 'tourist_area' | 'emergency_zone' | 'high_risk';
  description: string;
  coordinates: {
    latitude: number;
    longitude: number;
  }[];
  radius?: number; // For circular geofences
  safetyLevel: number; // 0-100
  alertEnabled: boolean;
  entryAlert: boolean;
  exitAlert: boolean;
  touristsInside: number;
  maxCapacity?: number;
  createdAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
  isActive: boolean;
}

interface GeofenceEvent {
  id: string;
  geofenceId: string;
  touristId: string;
  touristName: string;
  eventType: 'entry' | 'exit';
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
  };
  alertSent: boolean;
  handled: boolean;
}

export default function GeofenceVisualization() {
  const colorScheme = useColorScheme();
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | GeofenceZone['type']>('all');

  const { isConnected } = useWebSocket({
    callbacks: {
      onGeofenceAlert: (data) => {
        const newEvent: GeofenceEvent = {
          id: `event-${Date.now()}`,
          geofenceId: data.geofence.id,
          touristId: data.userId,
          touristName: 'Tourist',
          eventType: data.type,
          timestamp: new Date(),
          location: data.geofence.center || { latitude: 0, longitude: 0 },
          alertSent: true,
          handled: false
        };
        setRecentEvents(prev => [newEvent, ...prev.slice(0, 19)]);
        
        Alert.alert(
          'Geofence Alert',
          `Tourist ${data.type === 'entry' ? 'entered' : 'left'} ${data.geofence.name}`,
          [{ text: 'OK' }]
        );
      }
    }
  });

  // Mock geofence data (would come from API in production)
  const [geofences, setGeofences] = useState<GeofenceZone[]>([
    {
      id: 'zone-1',
      name: 'Historic District Safe Zone',
      type: 'safe_zone',
      description: 'Well-monitored historic area with high tourist presence',
      coordinates: [
        { latitude: 28.6100, longitude: 77.2050 },
        { latitude: 28.6180, longitude: 77.2050 },
        { latitude: 28.6180, longitude: 77.2130 },
        { latitude: 28.6100, longitude: 77.2130 }
      ],
      safetyLevel: 95,
      alertEnabled: true,
      entryAlert: false,
      exitAlert: true,
      touristsInside: 12,
      maxCapacity: 50,
      createdAt: new Date('2024-01-15'),
      triggerCount: 156,
      isActive: true
    },
    {
      id: 'zone-2',
      name: 'Construction Area',
      type: 'restricted',
      description: 'Active construction zone - tourists should avoid',
      coordinates: [
        { latitude: 28.6200, longitude: 77.2100 },
        { latitude: 28.6220, longitude: 77.2100 },
        { latitude: 28.6220, longitude: 77.2140 },
        { latitude: 28.6200, longitude: 77.2140 }
      ],
      safetyLevel: 25,
      alertEnabled: true,
      entryAlert: true,
      exitAlert: false,
      touristsInside: 0,
      createdAt: new Date('2024-01-10'),
      lastTriggered: new Date('2024-01-20'),
      triggerCount: 8,
      isActive: true
    },
    {
      id: 'zone-3',
      name: 'Night Market Area',
      type: 'tourist_area',
      description: 'Popular evening destination with food and shopping',
      coordinates: [
        { latitude: 28.6050, longitude: 77.2000 },
        { latitude: 28.6100, longitude: 77.2000 },
        { latitude: 28.6100, longitude: 77.2070 },
        { latitude: 28.6050, longitude: 77.2070 }
      ],
      safetyLevel: 80,
      alertEnabled: true,
      entryAlert: true,
      exitAlert: true,
      touristsInside: 8,
      maxCapacity: 30,
      createdAt: new Date('2024-01-05'),
      triggerCount: 234,
      isActive: true
    },
    {
      id: 'zone-4',
      name: 'High Crime Area',
      type: 'high_risk',
      description: 'Area with elevated security concerns',
      coordinates: [
        { latitude: 28.6250, longitude: 77.2200 },
        { latitude: 28.6280, longitude: 77.2200 },
        { latitude: 28.6280, longitude: 77.2250 },
        { latitude: 28.6250, longitude: 77.2250 }
      ],
      safetyLevel: 15,
      alertEnabled: true,
      entryAlert: true,
      exitAlert: false,
      touristsInside: 1,
      createdAt: new Date('2024-01-08'),
      lastTriggered: new Date(),
      triggerCount: 45,
      isActive: true
    }
  ]);

  const [recentEvents, setRecentEvents] = useState<GeofenceEvent[]>([
    {
      id: 'event-1',
      geofenceId: 'zone-1',
      touristId: 'tourist-1',
      touristName: 'John Smith',
      eventType: 'exit',
      timestamp: new Date(Date.now() - 300000),
      location: { latitude: 28.6140, longitude: 77.2090 },
      alertSent: true,
      handled: true
    },
    {
      id: 'event-2',
      geofenceId: 'zone-4',
      touristId: 'tourist-2',
      touristName: 'Emma Wilson',
      eventType: 'entry',
      timestamp: new Date(Date.now() - 600000),
      location: { latitude: 28.6265, longitude: 77.2225 },
      alertSent: true,
      handled: false
    }
  ]);

  const handleToggleGeofence = (geofenceId: string) => {
    setGeofences(prev => prev.map(zone =>
      zone.id === geofenceId
        ? { ...zone, isActive: !zone.isActive }
        : zone
    ));
  };

  const handleToggleAlert = (geofenceId: string, alertType: 'entry' | 'exit') => {
    setGeofences(prev => prev.map(zone =>
      zone.id === geofenceId
        ? { 
            ...zone, 
            [alertType === 'entry' ? 'entryAlert' : 'exitAlert']: 
              !zone[alertType === 'entry' ? 'entryAlert' : 'exitAlert']
          }
        : zone
    ));
  };

  const handleEventAction = (eventId: string) => {
    setRecentEvents(prev => prev.map(event =>
      event.id === eventId
        ? { ...event, handled: true }
        : event
    ));
  };

  const getZoneTypeIcon = (type: GeofenceZone['type']) => {
    switch (type) {
      case 'safe_zone': return 'shield.checkered';
      case 'restricted': return 'exclamationmark.octagon.fill';
      case 'tourist_area': return 'camera.fill';
      case 'emergency_zone': return 'cross.circle.fill';
      case 'high_risk': return 'triangle.fill';
      default: return 'mappin.circle.fill';
    }
  };

  const getZoneTypeColor = (type: GeofenceZone['type']) => {
    switch (type) {
      case 'safe_zone': return Colors[colorScheme ?? 'light'].success;
      case 'restricted': return Colors[colorScheme ?? 'light'].error;
      case 'tourist_area': return Colors[colorScheme ?? 'light'].primary;
      case 'emergency_zone': return '#FF5722';
      case 'high_risk': return '#C62828';
      default: return Colors[colorScheme ?? 'light'].text;
    }
  };

  const getSafetyLevelColor = (level: number) => {
    if (level >= 80) return Colors[colorScheme ?? 'light'].success;
    if (level >= 60) return Colors[colorScheme ?? 'light'].warning;
    if (level >= 40) return '#FF7043';
    return Colors[colorScheme ?? 'light'].error;
  };

  const filteredGeofences = geofences.filter(zone =>
    filterType === 'all' || zone.type === filterType
  );

  const unhandledEvents = recentEvents.filter(event => !event.handled);

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconSymbol name="location.viewfinder" size={24} color={Colors[colorScheme ?? 'light'].primary} />
          <ThemedText type="title" style={styles.title}>Geofence Monitor</ThemedText>
        </View>

        <View style={styles.headerRight}>
          <View style={[
            styles.connectionStatus,
            {
              backgroundColor: isConnected 
                ? Colors[colorScheme ?? 'light'].success + '20'
                : Colors[colorScheme ?? 'light'].error + '20'
            }
          ]}>
            <View style={[
              styles.connectionDot,
              { backgroundColor: isConnected ? Colors[colorScheme ?? 'light'].success : Colors[colorScheme ?? 'light'].error }
            ]} />
            <ThemedText style={styles.connectionText}>
              {isConnected ? 'Live' : 'Offline'}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Alert Banner */}
      {unhandledEvents.length > 0 && (
        <View style={[styles.alertBanner, { backgroundColor: Colors[colorScheme ?? 'light'].error + '20' }]}>
          <IconSymbol name="exclamationmark.triangle.fill" size={20} color={Colors[colorScheme ?? 'light'].error} />
          <ThemedText style={[styles.alertText, { color: Colors[colorScheme ?? 'light'].error }]}>
            {unhandledEvents.length} unhandled geofence {unhandledEvents.length === 1 ? 'alert' : 'alerts'}
          </ThemedText>
          <TouchableOpacity
            style={[styles.alertButton, { backgroundColor: Colors[colorScheme ?? 'light'].error }]}
            onPress={() => setSelectedZone('events')}
          >
            <ThemedText style={styles.alertButtonText}>View</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: Colors[colorScheme ?? 'light'].success + '20' }]}>
          <IconSymbol name="checkmark.circle" size={16} color={Colors[colorScheme ?? 'light'].success} />
          <ThemedText style={styles.statNumber}>{geofences.filter(z => z.isActive).length}</ThemedText>
          <ThemedText style={styles.statLabel}>Active</ThemedText>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: Colors[colorScheme ?? 'light'].primary + '20' }]}>
          <IconSymbol name="person.2.fill" size={16} color={Colors[colorScheme ?? 'light'].primary} />
          <ThemedText style={styles.statNumber}>{geofences.reduce((sum, z) => sum + z.touristsInside, 0)}</ThemedText>
          <ThemedText style={styles.statLabel}>Tourists</ThemedText>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: Colors[colorScheme ?? 'light'].warning + '20' }]}>
          <IconSymbol name="bell.fill" size={16} color={Colors[colorScheme ?? 'light'].warning} />
          <ThemedText style={styles.statNumber}>{unhandledEvents.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Alerts</ThemedText>
        </View>
      </View>

      {/* Type Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {(['all', 'safe_zone', 'restricted', 'tourist_area', 'emergency_zone', 'high_risk'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterButton,
              {
                backgroundColor: filterType === type 
                  ? Colors[colorScheme ?? 'light'].primary
                  : Colors[colorScheme ?? 'light'].card,
                borderColor: Colors[colorScheme ?? 'light'].border,
              }
            ]}
            onPress={() => setFilterType(type)}
          >
            <ThemedText style={[
              styles.filterButtonText,
              { color: filterType === type ? 'white' : Colors[colorScheme ?? 'light'].text }
            ]}>
              {type === 'all' ? 'All' : type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {selectedZone === 'events' ? (
          /* Recent Events View */
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Recent Geofence Events</ThemedText>
              <TouchableOpacity onPress={() => setSelectedZone(null)}>
                <IconSymbol name="xmark" size={20} color={Colors[colorScheme ?? 'light'].text} />
              </TouchableOpacity>
            </View>

            {recentEvents.map((event) => {
              const geofence = geofences.find(z => z.id === event.geofenceId);
              
              return (
                <View key={event.id} style={[
                  styles.eventCard,
                  { 
                    backgroundColor: Colors[colorScheme ?? 'light'].card,
                    borderLeftColor: event.handled 
                      ? Colors[colorScheme ?? 'light'].success 
                      : Colors[colorScheme ?? 'light'].warning
                  }
                ]}>
                  <View style={styles.eventHeader}>
                    <View style={styles.eventInfo}>
                      <ThemedText style={styles.eventTitle}>
                        {event.touristName} {event.eventType === 'entry' ? 'entered' : 'left'} {geofence?.name}
                      </ThemedText>
                      <ThemedText style={styles.eventTime}>
                        {event.timestamp.toLocaleString()}
                      </ThemedText>
                      <ThemedText style={styles.eventLocation}>
                        📍 {event.location.latitude.toFixed(4)}, {event.location.longitude.toFixed(4)}
                      </ThemedText>
                    </View>

                    <View style={styles.eventActions}>
                      {!event.handled && (
                        <TouchableOpacity
                          style={[styles.eventActionButton, { backgroundColor: Colors[colorScheme ?? 'light'].primary }]}
                          onPress={() => handleEventAction(event.id)}
                        >
                          <ThemedText style={styles.eventActionText}>Mark Handled</ThemedText>
                        </TouchableOpacity>
                      )}
                      
                      <View style={[
                        styles.eventStatus,
                        { 
                          backgroundColor: event.handled 
                            ? Colors[colorScheme ?? 'light'].success 
                            : Colors[colorScheme ?? 'light'].warning 
                        }
                      ]}>
                        <ThemedText style={styles.eventStatusText}>
                          {event.handled ? 'Handled' : 'Pending'}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          /* Geofences List View */
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>
              Geofence Zones ({filteredGeofences.length})
            </ThemedText>

            {filteredGeofences.map((zone) => (
              <TouchableOpacity
                key={zone.id}
                style={[
                  styles.zoneCard,
                  {
                    backgroundColor: Colors[colorScheme ?? 'light'].card,
                    borderLeftColor: getZoneTypeColor(zone.type),
                    opacity: zone.isActive ? 1 : 0.6
                  }
                ]}
                onPress={() => setSelectedZone(selectedZone === zone.id ? null : zone.id)}
              >
                <View style={styles.zoneHeader}>
                  <View style={styles.zoneInfo}>
                    <View style={styles.zoneTitleRow}>
                      <IconSymbol 
                        name={getZoneTypeIcon(zone.type) as any}
                        size={20}
                        color={getZoneTypeColor(zone.type)}
                      />
                      <ThemedText style={styles.zoneName}>{zone.name}</ThemedText>
                    </View>
                    
                    <ThemedText style={styles.zoneDescription}>{zone.description}</ThemedText>
                    
                    <View style={styles.zoneStats}>
                      <View style={styles.zoneStat}>
                        <ThemedText style={styles.zoneStatLabel}>Safety:</ThemedText>
                        <View style={[
                          styles.safetyBadge,
                          { backgroundColor: getSafetyLevelColor(zone.safetyLevel) }
                        ]}>
                          <ThemedText style={styles.safetyText}>{zone.safetyLevel}%</ThemedText>
                        </View>
                      </View>
                      
                      <View style={styles.zoneStat}>
                        <ThemedText style={styles.zoneStatLabel}>Inside:</ThemedText>
                        <ThemedText style={styles.zoneStatValue}>
                          {zone.touristsInside}{zone.maxCapacity ? `/${zone.maxCapacity}` : ''}
                        </ThemedText>
                      </View>
                      
                      <View style={styles.zoneStat}>
                        <ThemedText style={styles.zoneStatLabel}>Triggers:</ThemedText>
                        <ThemedText style={styles.zoneStatValue}>{zone.triggerCount}</ThemedText>
                      </View>
                    </View>
                  </View>

                  <View style={styles.zoneControls}>
                    <Switch
                      value={zone.isActive}
                      onValueChange={() => handleToggleGeofence(zone.id)}
                      trackColor={{ 
                        false: Colors[colorScheme ?? 'light'].surfaceVariant, 
                        true: Colors[colorScheme ?? 'light'].primary + '60' 
                      }}
                      thumbColor={zone.isActive ? Colors[colorScheme ?? 'light'].primary : Colors[colorScheme ?? 'light'].text}
                    />
                    
                    <IconSymbol 
                      name={selectedZone === zone.id ? "chevron.up" : "chevron.down"} 
                      size={16} 
                      color={Colors[colorScheme ?? 'light'].text} 
                    />
                  </View>
                </View>

                {/* Expanded Details */}
                {selectedZone === zone.id && (
                  <View style={styles.zoneDetails}>
                    <View style={styles.alertSettings}>
                      <ThemedText style={styles.detailsTitle}>Alert Settings</ThemedText>
                      
                      <View style={styles.alertRow}>
                        <ThemedText style={styles.alertLabel}>Entry Alerts:</ThemedText>
                        <Switch
                          value={zone.entryAlert}
                          onValueChange={() => handleToggleAlert(zone.id, 'entry')}
                          trackColor={{ 
                            false: Colors[colorScheme ?? 'light'].surfaceVariant, 
                            true: Colors[colorScheme ?? 'light'].success + '60' 
                          }}
                          thumbColor={zone.entryAlert ? Colors[colorScheme ?? 'light'].success : Colors[colorScheme ?? 'light'].text}
                        />
                      </View>
                      
                      <View style={styles.alertRow}>
                        <ThemedText style={styles.alertLabel}>Exit Alerts:</ThemedText>
                        <Switch
                          value={zone.exitAlert}
                          onValueChange={() => handleToggleAlert(zone.id, 'exit')}
                          trackColor={{ 
                            false: Colors[colorScheme ?? 'light'].surfaceVariant, 
                            true: Colors[colorScheme ?? 'light'].warning + '60' 
                          }}
                          thumbColor={zone.exitAlert ? Colors[colorScheme ?? 'light'].warning : Colors[colorScheme ?? 'light'].text}
                        />
                      </View>
                    </View>

                    <View style={styles.zoneMetrics}>
                      <ThemedText style={styles.detailsTitle}>Zone Metrics</ThemedText>
                      
                      <View style={styles.metricRow}>
                        <ThemedText style={styles.metricLabel}>Created:</ThemedText>
                        <ThemedText style={styles.metricValue}>
                          {zone.createdAt.toLocaleDateString()}
                        </ThemedText>
                      </View>
                      
                      {zone.lastTriggered && (
                        <View style={styles.metricRow}>
                          <ThemedText style={styles.metricLabel}>Last Triggered:</ThemedText>
                          <ThemedText style={styles.metricValue}>
                            {zone.lastTriggered.toLocaleString()}
                          </ThemedText>
                        </View>
                      )}
                      
                      <View style={styles.metricRow}>
                        <ThemedText style={styles.metricLabel}>Coordinates:</ThemedText>
                        <ThemedText style={styles.metricValue}>
                          {zone.coordinates.length} points
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    gap: 8,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  alertButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  alertButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 11,
    opacity: 0.8,
  },
  filterScroll: {
    paddingLeft: 20,
    marginBottom: 15,
  },
  filterContent: {
    paddingRight: 20,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  zoneCard: {
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  zoneHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  zoneInfo: {
    flex: 1,
  },
  zoneTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  zoneName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  zoneDescription: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 8,
  },
  zoneStats: {
    flexDirection: 'row',
    gap: 16,
  },
  zoneStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  zoneStatLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  zoneStatValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  safetyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  safetyText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  zoneControls: {
    alignItems: 'center',
    gap: 8,
  },
  zoneDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 16,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  alertSettings: {},
  alertRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  alertLabel: {
    fontSize: 14,
  },
  zoneMetrics: {},
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  metricLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Event Styles
  eventCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
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
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 12,
    opacity: 0.6,
  },
  eventActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  eventActionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  eventActionText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  eventStatus: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eventStatusText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '600',
  },
});