import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '../ui/icon-symbol';
import { useDashboard, useWebSocket } from '@/hooks/useWebSocket';

// Dimensions removed as not currently used

interface TouristLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  lastUpdate: Date;
  safetyScore: number;
  status: 'safe' | 'warning' | 'emergency';
  batteryLevel?: number;
  accuracy?: number;
}

interface EmergencyIncident {
  id: string;
  touristId: string;
  type: 'panic' | 'medical' | 'security' | 'natural_disaster';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  status: 'active' | 'responding' | 'resolved';
  timestamp: Date;
  responseTime?: number;
  assignedOfficer?: string;
}

interface GeofenceArea {
  id: string;
  name: string;
  type: 'safe_zone' | 'restricted' | 'tourist_area' | 'emergency_zone';
  coordinates: { latitude: number; longitude: number }[];
  safetyLevel: number;
  alertEnabled: boolean;
  touristsInside: number;
}

export default function RealTimeTrackingMap() {
  const colorScheme = useColorScheme();
  const [selectedTourist, setSelectedTourist] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<'standard' | 'safety' | 'emergency'>('standard');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    safetyThreshold: 70,
    showEmergencies: true,
    showGeofences: true,
    timeRange: '1h'
  });

  // Real-time data from WebSocket
  const { isJoined, dashboardData, joinRoom } = useDashboard(true);
  
  // Mock data for demonstration (would come from WebSocket in production)
  const [tourists, setTourists] = useState<TouristLocation[]>([
    {
      id: 'tourist-1',
      name: 'John Smith',
      latitude: 28.6139,
      longitude: 77.2090,
      lastUpdate: new Date(),
      safetyScore: 85,
      status: 'safe',
      batteryLevel: 78,
      accuracy: 5
    },
    {
      id: 'tourist-2',
      name: 'Emma Wilson',
      latitude: 28.6129,
      longitude: 77.2080,
      lastUpdate: new Date(Date.now() - 300000),
      safetyScore: 45,
      status: 'warning',
      batteryLevel: 23,
      accuracy: 12
    },
    {
      id: 'tourist-3',
      name: 'Mike Johnson',
      latitude: 28.6149,
      longitude: 77.2100,
      lastUpdate: new Date(Date.now() - 60000),
      safetyScore: 15,
      status: 'emergency',
      batteryLevel: 5,
      accuracy: 8
    }
  ]);

  const [emergencies, setEmergencies] = useState<EmergencyIncident[]>([
    {
      id: 'emergency-1',
      touristId: 'tourist-3',
      type: 'panic',
      severity: 'critical',
      location: {
        latitude: 28.6149,
        longitude: 77.2100,
        address: 'Connaught Place, New Delhi'
      },
      status: 'active',
      timestamp: new Date(Date.now() - 120000),
      assignedOfficer: 'Officer Kumar'
    }
  ]);

  const [geofences, setGeofences] = useState<GeofenceArea[]>([
    {
      id: 'geofence-1',
      name: 'Tourist Safe Zone',
      type: 'safe_zone',
      coordinates: [
        { latitude: 28.6100, longitude: 77.2050 },
        { latitude: 28.6180, longitude: 77.2050 },
        { latitude: 28.6180, longitude: 77.2130 },
        { latitude: 28.6100, longitude: 77.2130 }
      ],
      safetyLevel: 90,
      alertEnabled: true,
      touristsInside: 2
    }
  ]);

  const { isConnected } = useWebSocket({
    callbacks: {
      onLocationUpdate: (update) => {
        setTourists(prev => prev.map(tourist => 
          tourist.id === update.userId 
            ? {
                ...tourist,
                latitude: update.latitude,
                longitude: update.longitude,
                lastUpdate: new Date(update.timestamp),
                accuracy: update.accuracy
              }
            : tourist
        ));
      },
      onEmergencyAlert: (alert) => {
        const newEmergency: EmergencyIncident = {
          id: `emergency-${Date.now()}`,
          touristId: alert.userId,
          type: alert.type,
          severity: alert.severity,
          location: alert.location,
          status: 'active',
          timestamp: new Date(alert.timestamp)
        };
        setEmergencies(prev => [newEmergency, ...prev]);
      }
    }
  });

  // Auto-join dashboard room on mount
  useEffect(() => {
    if (!isJoined) {
      joinRoom();
    }
  }, [isJoined, joinRoom]);

  const handleTouristSelect = (touristId: string) => {
    setSelectedTourist(touristId === selectedTourist ? null : touristId);
  };

  const handleEmergencyResponse = (emergencyId: string) => {
    Alert.alert(
      'Respond to Emergency',
      'Dispatch emergency services to this location?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dispatch',
          style: 'destructive',
          onPress: () => {
            setEmergencies(prev => prev.map(emergency =>
              emergency.id === emergencyId
                ? { ...emergency, status: 'responding' as const }
                : emergency
            ));
            Alert.alert('Success', 'Emergency services dispatched');
          }
        }
      ]
    );
  };

  const getStatusColor = (status: TouristLocation['status']) => {
    switch (status) {
      case 'safe': return Colors[colorScheme ?? 'light'].success;
      case 'warning': return Colors[colorScheme ?? 'light'].warning;
      case 'emergency': return Colors[colorScheme ?? 'light'].error;
      default: return Colors[colorScheme ?? 'light'].text;
    }
  };

  const getSeverityColor = (severity: EmergencyIncident['severity']) => {
    switch (severity) {
      case 'low': return '#FFA726';
      case 'medium': return '#FF7043';
      case 'high': return '#EF5350';
      case 'critical': return '#C62828';
      default: return Colors[colorScheme ?? 'light'].error;
    }
  };

  const filteredTourists = tourists.filter(tourist => 
    tourist.safetyScore >= (mapMode === 'safety' ? filters.safetyThreshold : 0) &&
    (mapMode !== 'emergency' || tourist.status === 'emergency')
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconSymbol name="location.fill" size={24} color={Colors[colorScheme ?? 'light'].primary} />
          <ThemedText type="title" style={styles.title}>Live Tracking</ThemedText>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.connectionStatus, {
              backgroundColor: isConnected 
                ? Colors[colorScheme ?? 'light'].success + '20'
                : Colors[colorScheme ?? 'light'].error + '20'
            }]}
          >
            <View style={[
              styles.connectionDot,
              { backgroundColor: isConnected ? Colors[colorScheme ?? 'light'].success : Colors[colorScheme ?? 'light'].error }
            ]} />
            <ThemedText style={styles.connectionText}>
              {isConnected ? 'Live' : 'Offline'}
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.filtersButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <IconSymbol name="line.3.horizontal.decrease.circle" size={24} color={Colors[colorScheme ?? 'light'].text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Map Mode Selector */}
      <View style={styles.modeSelector}>
        {(['standard', 'safety', 'emergency'] as const).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.modeButton,
              {
                backgroundColor: mapMode === mode 
                  ? Colors[colorScheme ?? 'light'].primary
                  : Colors[colorScheme ?? 'light'].card,
                borderColor: Colors[colorScheme ?? 'light'].border,
              }
            ]}
            onPress={() => setMapMode(mode)}
          >
            <ThemedText style={[
              styles.modeButtonText,
              { color: mapMode === mode ? 'white' : Colors[colorScheme ?? 'light'].text }
            ]}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filters Panel */}
      {showFilters && (
        <View style={[styles.filtersPanel, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
          <View style={styles.filterRow}>
            <ThemedText style={styles.filterLabel}>Safety Threshold: {filters.safetyThreshold}%</ThemedText>
            <View style={styles.filterControls}>
              <TouchableOpacity 
                onPress={() => setFilters(prev => ({ ...prev, safetyThreshold: Math.max(0, prev.safetyThreshold - 10) }))}
                style={styles.filterButton}
              >
                <ThemedText>-</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setFilters(prev => ({ ...prev, safetyThreshold: Math.min(100, prev.safetyThreshold + 10) }))}
                style={styles.filterButton}
              >
                <ThemedText>+</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Statistics Bar */}
      <View style={styles.statsBar}>
        <View style={[styles.statItem, { backgroundColor: Colors[colorScheme ?? 'light'].success + '20' }]}>
          <IconSymbol name="checkmark.circle" size={16} color={Colors[colorScheme ?? 'light'].success} />
          <ThemedText style={styles.statNumber}>{tourists.filter(t => t.status === 'safe').length}</ThemedText>
          <ThemedText style={styles.statLabel}>Safe</ThemedText>
        </View>
        
        <View style={[styles.statItem, { backgroundColor: Colors[colorScheme ?? 'light'].warning + '20' }]}>
          <IconSymbol name="exclamationmark.triangle" size={16} color={Colors[colorScheme ?? 'light'].warning} />
          <ThemedText style={styles.statNumber}>{tourists.filter(t => t.status === 'warning').length}</ThemedText>
          <ThemedText style={styles.statLabel}>Warning</ThemedText>
        </View>
        
        <View style={[styles.statItem, { backgroundColor: Colors[colorScheme ?? 'light'].error + '20' }]}>
          <IconSymbol name="exclamationmark.octagon" size={16} color={Colors[colorScheme ?? 'light'].error} />
          <ThemedText style={styles.statNumber}>{emergencies.filter(e => e.status === 'active').length}</ThemedText>
          <ThemedText style={styles.statLabel}>Emergency</ThemedText>
        </View>
      </View>

      {/* Map Container (Placeholder) */}
      <View style={[styles.mapContainer, { backgroundColor: Colors[colorScheme ?? 'light'].surfaceVariant }]}>
        <ThemedText style={styles.mapPlaceholder}>
          🗺️ Interactive Map Component
        </ThemedText>
        <ThemedText style={styles.mapSubtext}>
          Real-time tourist locations would be displayed here using a map library like react-native-maps
        </ThemedText>
        
        {/* Tourist Markers Overlay */}
        <ScrollView style={styles.markersOverlay} horizontal showsHorizontalScrollIndicator={false}>
          {filteredTourists.map((tourist) => (
            <TouchableOpacity
              key={tourist.id}
              style={[
                styles.touristMarker,
                {
                  backgroundColor: Colors[colorScheme ?? 'light'].card,
                  borderColor: getStatusColor(tourist.status),
                  borderWidth: selectedTourist === tourist.id ? 3 : 1,
                }
              ]}
              onPress={() => handleTouristSelect(tourist.id)}
            >
              <View style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(tourist.status) }
              ]} />
              <ThemedText style={styles.touristName}>{tourist.name}</ThemedText>
              <ThemedText style={styles.touristScore}>{tourist.safetyScore}%</ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Selected Tourist Details */}
      {selectedTourist && (
        <View style={[styles.detailsPanel, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
          {(() => {
            const tourist = tourists.find(t => t.id === selectedTourist);
            if (!tourist) return null;
            
            return (
              <>
                <View style={styles.detailsHeader}>
                  <View style={styles.touristInfo}>
                    <ThemedText style={styles.detailsName}>{tourist.name}</ThemedText>
                    <ThemedText style={styles.detailsStatus}>
                      Status: <ThemedText style={{ color: getStatusColor(tourist.status) }}>
                        {tourist.status.toUpperCase()}
                      </ThemedText>
                    </ThemedText>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedTourist(null)}>
                    <IconSymbol name="xmark" size={20} color={Colors[colorScheme ?? 'light'].text} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <ThemedText style={styles.detailLabel}>Safety Score</ThemedText>
                    <ThemedText style={[
                      styles.detailValue,
                      { color: getStatusColor(tourist.status) }
                    ]}>
                      {tourist.safetyScore}%
                    </ThemedText>
                  </View>
                  
                  <View style={styles.detailItem}>
                    <ThemedText style={styles.detailLabel}>Battery</ThemedText>
                    <ThemedText style={styles.detailValue}>{tourist.batteryLevel}%</ThemedText>
                  </View>
                  
                  <View style={styles.detailItem}>
                    <ThemedText style={styles.detailLabel}>Accuracy</ThemedText>
                    <ThemedText style={styles.detailValue}>±{tourist.accuracy}m</ThemedText>
                  </View>
                  
                  <View style={styles.detailItem}>
                    <ThemedText style={styles.detailLabel}>Last Update</ThemedText>
                    <ThemedText style={styles.detailValue}>
                      {Math.round((Date.now() - tourist.lastUpdate.getTime()) / 60000)}m ago
                    </ThemedText>
                  </View>
                </View>
              </>
            );
          })()}
        </View>
      )}

      {/* Active Emergencies */}
      {emergencies.filter(e => e.status === 'active').length > 0 && (
        <View style={[styles.emergenciesPanel, { backgroundColor: Colors[colorScheme ?? 'light'].error + '10' }]}>
          <ThemedText style={[styles.emergenciesTitle, { color: Colors[colorScheme ?? 'light'].error }]}>
            🚨 Active Emergencies ({emergencies.filter(e => e.status === 'active').length})
          </ThemedText>
          
          {emergencies.filter(e => e.status === 'active').slice(0, 2).map((emergency) => (
            <View key={emergency.id} style={[
              styles.emergencyItem,
              { 
                backgroundColor: Colors[colorScheme ?? 'light'].card,
                borderLeftColor: getSeverityColor(emergency.severity)
              }
            ]}>
              <View style={styles.emergencyInfo}>
                <ThemedText style={styles.emergencyType}>
                  {emergency.type.replace('_', ' ').toUpperCase()}
                </ThemedText>
                <ThemedText style={styles.emergencyLocation}>
                  📍 {emergency.location.address || `${emergency.location.latitude.toFixed(4)}, ${emergency.location.longitude.toFixed(4)}`}
                </ThemedText>
                <ThemedText style={styles.emergencyTime}>
                  {Math.round((Date.now() - emergency.timestamp.getTime()) / 60000)} minutes ago
                </ThemedText>
              </View>
              
              <TouchableOpacity
                style={[styles.respondButton, { backgroundColor: Colors[colorScheme ?? 'light'].error }]}
                onPress={() => handleEmergencyResponse(emergency.id)}
              >
                <ThemedText style={styles.respondButtonText}>Respond</ThemedText>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
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
    gap: 12,
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
  filtersButton: {
    padding: 4,
  },
  modeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
    gap: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filtersPanel: {
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterControls: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
    gap: 12,
  },
  statItem: {
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
    fontSize: 12,
    opacity: 0.8,
  },
  mapContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mapPlaceholder: {
    fontSize: 24,
    marginBottom: 8,
  },
  mapSubtext: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  markersOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  touristMarker: {
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  touristName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  touristScore: {
    fontSize: 10,
    opacity: 0.8,
  },
  detailsPanel: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  touristInfo: {
    flex: 1,
  },
  detailsName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  detailsStatus: {
    fontSize: 14,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    width: '48%',
  },
  detailLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  emergenciesPanel: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  emergenciesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emergencyItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  emergencyInfo: {
    flex: 1,
  },
  emergencyType: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  emergencyLocation: {
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 2,
  },
  emergencyTime: {
    fontSize: 11,
    opacity: 0.6,
  },
  respondButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  respondButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});