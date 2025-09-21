import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal, TextInput } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '../ui/icon-symbol';
import { useEmergencyAlerts, useWebSocket } from '@/hooks/useWebSocket';

interface EmergencyResponse {
  id: string;
  emergencyId: string;
  responderId: string;
  responderName: string;
  responderType: 'police' | 'medical' | 'fire' | 'tourist_police';
  status: 'dispatched' | 'en_route' | 'on_scene' | 'completed';
  eta?: number;
  arrivalTime?: Date;
  notes?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: Date;
}

interface Responder {
  id: string;
  name: string;
  type: 'police' | 'medical' | 'fire' | 'tourist_police';
  status: 'available' | 'busy' | 'off_duty';
  location: {
    latitude: number;
    longitude: number;
  };
  contact: string;
  currentEmergency?: string;
}

export default function LiveEmergencyResponse() {
  const colorScheme = useColorScheme();
  const [selectedEmergency, setSelectedEmergency] = useState<string | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseNotes, setResponseNotes] = useState('');
  const [selectedResponder, setSelectedResponder] = useState<string | null>(null);

  const { alerts } = useEmergencyAlerts();
  const { isConnected } = useWebSocket();

  // Mock response data (would come from WebSocket/API in production)
  const [emergencyResponses, setEmergencyResponses] = useState<EmergencyResponse[]>([
    {
      id: 'response-1',
      emergencyId: 'emergency-1',
      responderId: 'responder-1',
      responderName: 'Officer Kumar',
      responderType: 'police',
      status: 'en_route',
      eta: 8,
      location: { latitude: 28.6140, longitude: 77.2085 },
      timestamp: new Date(Date.now() - 300000),
      notes: 'Patrol unit dispatched, ETA 8 minutes'
    }
  ]);

  const [responders, setResponders] = useState<Responder[]>([
    {
      id: 'responder-1',
      name: 'Officer Kumar',
      type: 'police',
      status: 'busy',
      location: { latitude: 28.6140, longitude: 77.2085 },
      contact: '+91-9876543210',
      currentEmergency: 'emergency-1'
    },
    {
      id: 'responder-2',
      name: 'Dr. Sharma',
      type: 'medical',
      status: 'available',
      location: { latitude: 28.6150, longitude: 77.2070 },
      contact: '+91-9876543211'
    },
    {
      id: 'responder-3',
      name: 'Fire Unit Alpha',
      type: 'fire',
      status: 'available',
      location: { latitude: 28.6120, longitude: 77.2095 },
      contact: '+91-9876543212'
    }
  ]);

  const handleDispatchResponder = (emergencyId: string, responderId: string) => {
    const responder = responders.find(r => r.id === responderId);
    if (!responder) return;

    Alert.alert(
      'Dispatch Responder',
      `Dispatch ${responder.name} to emergency?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dispatch',
          onPress: () => {
            const newResponse: EmergencyResponse = {
              id: `response-${Date.now()}`,
              emergencyId,
              responderId,
              responderName: responder.name,
              responderType: responder.type,
              status: 'dispatched',
              eta: Math.floor(Math.random() * 15) + 5, // Random ETA 5-20 mins
              location: responder.location,
              timestamp: new Date(),
              notes: responseNotes || `${responder.name} dispatched to emergency`
            };

            setEmergencyResponses(prev => [newResponse, ...prev]);
            
            // Update responder status
            setResponders(prev => prev.map(r =>
              r.id === responderId 
                ? { ...r, status: 'busy' as const, currentEmergency: emergencyId }
                : r
            ));

            setShowResponseModal(false);
            setResponseNotes('');
            setSelectedResponder(null);
            
            Alert.alert('Success', `${responder.name} has been dispatched`);
          }
        }
      ]
    );
  };

  const handleUpdateResponseStatus = (responseId: string, newStatus: EmergencyResponse['status']) => {
    setEmergencyResponses(prev => prev.map(response =>
      response.id === responseId
        ? { 
            ...response, 
            status: newStatus,
            arrivalTime: newStatus === 'on_scene' ? new Date() : response.arrivalTime
          }
        : response
    ));

    // If completed, make responder available again
    if (newStatus === 'completed') {
      const response = emergencyResponses.find(r => r.id === responseId);
      if (response) {
        setResponders(prev => prev.map(r =>
          r.id === response.responderId
            ? { ...r, status: 'available' as const, currentEmergency: undefined }
            : r
        ));
      }
    }
  };

  const getStatusColor = (status: EmergencyResponse['status']) => {
    switch (status) {
      case 'dispatched': return '#FF9800';
      case 'en_route': return '#2196F3';
      case 'on_scene': return '#FF5722';
      case 'completed': return '#4CAF50';
      default: return Colors[colorScheme ?? 'light'].text;
    }
  };

  const getResponderTypeIcon = (type: Responder['type']) => {
    switch (type) {
      case 'police': return 'shield.fill';
      case 'medical': return 'cross.fill';
      case 'fire': return 'flame.fill';
      case 'tourist_police': return 'person.badge.shield.checkmark.fill';
      default: return 'person.fill';
    }
  };

  const getResponderTypeColor = (type: Responder['type']) => {
    switch (type) {
      case 'police': return '#1976D2';
      case 'medical': return '#D32F2F';
      case 'fire': return '#F57C00';
      case 'tourist_police': return '#7B1FA2';
      default: return Colors[colorScheme ?? 'light'].primary;
    }
  };

  const activeEmergencies = alerts.filter(alert => 
    !emergencyResponses.some(response => 
      response.emergencyId === alert.userId && response.status === 'completed'
    )
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconSymbol name="antenna.radiowaves.left.and.right" size={24} color={Colors[colorScheme ?? 'light'].error} />
          <ThemedText type="title" style={styles.title}>Emergency Response</ThemedText>
        </View>
        
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

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: Colors[colorScheme ?? 'light'].error + '20' }]}>
          <IconSymbol name="exclamationmark.octagon.fill" size={20} color={Colors[colorScheme ?? 'light'].error} />
          <ThemedText style={styles.statNumber}>{activeEmergencies.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Active</ThemedText>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: Colors[colorScheme ?? 'light'].warning + '20' }]}>
          <IconSymbol name="figure.run" size={20} color={Colors[colorScheme ?? 'light'].warning} />
          <ThemedText style={styles.statNumber}>
            {emergencyResponses.filter(r => r.status === 'en_route' || r.status === 'dispatched').length}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Responding</ThemedText>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: Colors[colorScheme ?? 'light'].success + '20' }]}>
          <IconSymbol name="person.fill.checkmark" size={20} color={Colors[colorScheme ?? 'light'].success} />
          <ThemedText style={styles.statNumber}>
            {responders.filter(r => r.status === 'available').length}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Available</ThemedText>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Active Emergencies */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            🚨 Active Emergencies ({activeEmergencies.length})
          </ThemedText>
          
          {activeEmergencies.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
              <IconSymbol name="checkmark.circle" size={48} color={Colors[colorScheme ?? 'light'].success} />
              <ThemedText style={styles.emptyText}>No active emergencies</ThemedText>
              <ThemedText style={styles.emptySubtext}>All tourists are safe</ThemedText>
            </View>
          ) : (
            activeEmergencies.map((alert) => {
              const response = emergencyResponses.find(r => r.emergencyId === alert.userId);
              
              return (
                <View key={alert.userId} style={[
                  styles.emergencyCard,
                  { 
                    backgroundColor: Colors[colorScheme ?? 'light'].card,
                    borderLeftColor: Colors[colorScheme ?? 'light'].error
                  }
                ]}>
                  <View style={styles.emergencyHeader}>
                    <View style={styles.emergencyInfo}>
                      <ThemedText style={styles.emergencyType}>
                        {alert.type.replace('_', ' ').toUpperCase()}
                      </ThemedText>
                      <ThemedText style={styles.emergencyLocation}>
                        📍 {alert.location.address || `${alert.location.latitude.toFixed(4)}, ${alert.location.longitude.toFixed(4)}`}
                      </ThemedText>
                      <ThemedText style={styles.emergencyTime}>
                        {Math.round((Date.now() - alert.timestamp) / 60000)} minutes ago
                      </ThemedText>
                    </View>
                    
                    <View style={[
                      styles.severityBadge,
                      { backgroundColor: alert.severity === 'critical' ? '#C62828' : '#FF5722' }
                    ]}>
                      <ThemedText style={styles.severityText}>
                        {alert.severity.toUpperCase()}
                      </ThemedText>
                    </View>
                  </View>

                  {alert.message && (
                    <ThemedText style={styles.emergencyMessage}>{alert.message}</ThemedText>
                  )}

                  {/* Response Status */}
                  {response ? (
                    <View style={styles.responseStatus}>
                      <View style={styles.responseInfo}>
                        <ThemedText style={styles.responderName}>
                          {response.responderName} ({response.responderType})
                        </ThemedText>
                        <View style={styles.statusRow}>
                          <View style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusColor(response.status) }
                          ]}>
                            <ThemedText style={styles.statusText}>
                              {response.status.replace('_', ' ').toUpperCase()}
                            </ThemedText>
                          </View>
                          {response.eta && response.status !== 'on_scene' && (
                            <ThemedText style={styles.etaText}>ETA: {response.eta}m</ThemedText>
                          )}
                        </View>
                      </View>
                      
                      <View style={styles.responseActions}>
                        {response.status === 'dispatched' && (
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: Colors[colorScheme ?? 'light'].primary }]}
                            onPress={() => handleUpdateResponseStatus(response.id, 'en_route')}
                          >
                            <ThemedText style={styles.actionButtonText}>En Route</ThemedText>
                          </TouchableOpacity>
                        )}
                        {response.status === 'en_route' && (
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: Colors[colorScheme ?? 'light'].warning }]}
                            onPress={() => handleUpdateResponseStatus(response.id, 'on_scene')}
                          >
                            <ThemedText style={styles.actionButtonText}>On Scene</ThemedText>
                          </TouchableOpacity>
                        )}
                        {response.status === 'on_scene' && (
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: Colors[colorScheme ?? 'light'].success }]}
                            onPress={() => handleUpdateResponseStatus(response.id, 'completed')}
                          >
                            <ThemedText style={styles.actionButtonText}>Complete</ThemedText>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.dispatchButton, { backgroundColor: Colors[colorScheme ?? 'light'].error }]}
                      onPress={() => {
                        setSelectedEmergency(alert.userId);
                        setShowResponseModal(true);
                      }}
                    >
                      <IconSymbol name="paperplane.fill" size={16} color="white" />
                      <ThemedText style={styles.dispatchButtonText}>Dispatch Responder</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Available Responders */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            👮 Available Responders ({responders.filter(r => r.status === 'available').length})
          </ThemedText>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.respondersScroll}>
            {responders.filter(r => r.status === 'available').map((responder) => (
              <View key={responder.id} style={[
                styles.responderCard,
                { backgroundColor: Colors[colorScheme ?? 'light'].card }
              ]}>
                <View style={[
                  styles.responderIcon,
                  { backgroundColor: getResponderTypeColor(responder.type) + '20' }
                ]}>
                  <IconSymbol 
                    name={getResponderTypeIcon(responder.type) as any} 
                    size={24} 
                    color={getResponderTypeColor(responder.type)} 
                  />
                </View>
                
                <ThemedText style={styles.responderCardName}>{responder.name}</ThemedText>
                <ThemedText style={styles.responderType}>
                  {responder.type.replace('_', ' ').toUpperCase()}
                </ThemedText>
                
                <View style={[
                  styles.availabilityBadge,
                  { backgroundColor: Colors[colorScheme ?? 'light'].success }
                ]}>
                  <ThemedText style={styles.availabilityText}>Available</ThemedText>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Recent Responses */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>📋 Recent Responses</ThemedText>
          
          {emergencyResponses.slice(0, 5).map((response) => (
            <View key={response.id} style={[
              styles.responseHistoryCard,
              { backgroundColor: Colors[colorScheme ?? 'light'].card }
            ]}>
              <View style={styles.responseHistoryHeader}>
                <ThemedText style={styles.responseHistoryResponder}>
                  {response.responderName}
                </ThemedText>
                <View style={[
                  styles.responseHistoryStatus,
                  { backgroundColor: getStatusColor(response.status) }
                ]}>
                  <ThemedText style={styles.responseHistoryStatusText}>
                    {response.status.replace('_', ' ').toUpperCase()}
                  </ThemedText>
                </View>
              </View>
              
              <ThemedText style={styles.responseHistoryTime}>
                {response.timestamp.toLocaleTimeString()}
              </ThemedText>
              
              {response.notes && (
                <ThemedText style={styles.responseHistoryNotes}>{response.notes}</ThemedText>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Dispatch Modal */}
      <Modal
        visible={showResponseModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Dispatch Responder</ThemedText>
              <TouchableOpacity onPress={() => setShowResponseModal(false)}>
                <IconSymbol name="xmark" size={20} color={Colors[colorScheme ?? 'light'].text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <ThemedText style={styles.modalLabel}>Select Responder:</ThemedText>
              
              {responders.filter(r => r.status === 'available').map((responder) => (
                <TouchableOpacity
                  key={responder.id}
                  style={[
                    styles.modalResponderOption,
                    {
                      backgroundColor: selectedResponder === responder.id 
                        ? Colors[colorScheme ?? 'light'].primary + '20'
                        : Colors[colorScheme ?? 'light'].surfaceVariant,
                      borderColor: selectedResponder === responder.id 
                        ? Colors[colorScheme ?? 'light'].primary
                        : 'transparent'
                    }
                  ]}
                  onPress={() => setSelectedResponder(responder.id)}
                >
                  <IconSymbol 
                    name={getResponderTypeIcon(responder.type) as any}
                    size={20}
                    color={getResponderTypeColor(responder.type)}
                  />
                  <View style={styles.modalResponderInfo}>
                    <ThemedText style={styles.modalResponderName}>{responder.name}</ThemedText>
                    <ThemedText style={styles.modalResponderType}>
                      {responder.type.replace('_', ' ').toUpperCase()}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              ))}

              <ThemedText style={styles.modalLabel}>Notes (optional):</ThemedText>
              <TextInput
                style={[
                  styles.modalTextInput,
                  {
                    backgroundColor: Colors[colorScheme ?? 'light'].surfaceVariant,
                    color: Colors[colorScheme ?? 'light'].text
                  }
                ]}
                value={responseNotes}
                onChangeText={setResponseNotes}
                placeholder="Add dispatch notes..."
                placeholderTextColor={Colors[colorScheme ?? 'light'].text + '60'}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: Colors[colorScheme ?? 'light'].surfaceVariant }]}
                onPress={() => setShowResponseModal(false)}
              >
                <ThemedText>Cancel</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  { 
                    backgroundColor: selectedResponder ? Colors[colorScheme ?? 'light'].error : Colors[colorScheme ?? 'light'].surfaceVariant,
                    opacity: selectedResponder ? 1 : 0.5
                  }
                ]}
                disabled={!selectedResponder}
                onPress={() => {
                  if (selectedEmergency && selectedResponder) {
                    handleDispatchResponder(selectedEmergency, selectedResponder);
                  }
                }}
              >
                <ThemedText style={{ color: selectedResponder ? 'white' : Colors[colorScheme ?? 'light'].text }}>
                  Dispatch
                </ThemedText>
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emptyState: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  emergencyCard: {
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
  emergencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  emergencyInfo: {
    flex: 1,
  },
  emergencyType: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emergencyLocation: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 2,
  },
  emergencyTime: {
    fontSize: 12,
    opacity: 0.6,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emergencyMessage: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
  },
  responseStatus: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  responseInfo: {
    marginBottom: 8,
  },
  responderName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  etaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  responseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  dispatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  dispatchButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  respondersScroll: {
    marginBottom: 8,
  },
  responderCard: {
    width: 120,
    padding: 12,
    borderRadius: 8,
    marginRight: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  responderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  responderCardName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  responderType: {
    fontSize: 10,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 6,
  },
  availabilityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  availabilityText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '600',
  },
  responseHistoryCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  responseHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  responseHistoryResponder: {
    fontSize: 14,
    fontWeight: '600',
  },
  responseHistoryStatus: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  responseHistoryStatusText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '600',
  },
  responseHistoryTime: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 4,
  },
  responseHistoryNotes: {
    fontSize: 12,
    opacity: 0.8,
    fontStyle: 'italic',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  modalResponderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    gap: 12,
  },
  modalResponderInfo: {
    flex: 1,
  },
  modalResponderName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  modalResponderType: {
    fontSize: 12,
    opacity: 0.7,
  },
  modalTextInput: {
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
});