import React, { useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Modal,
  Alert,
  Animated
} from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '../ui/icon-symbol';
import { useWebSocket } from '@/hooks/useWebSocket';

interface Officer {
  id: string;
  name: string;
  badge: string;
  rank: string;
  status: 'active' | 'busy' | 'offline' | 'emergency_response';
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  lastSeen: Date;
  currentAssignment?: string;
  avatar: string;
  expertise: string[];
  responseTime: number; // minutes
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'emergency' | 'location' | 'image' | 'system';
  priority: 'low' | 'normal' | 'high' | 'critical';
  readBy: string[];
  metadata?: {
    location?: { latitude: number; longitude: number };
    imageUrl?: string;
    emergencyType?: string;
  };
}

interface CommunicationChannel {
  id: string;
  name: string;
  type: 'general' | 'emergency' | 'direct' | 'tactical';
  participants: string[];
  lastActivity: Date;
  unreadCount: number;
  isActive: boolean;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export default function OfficerCommunicationTools() {
  const colorScheme = useColorScheme();
  const [activeChannel, setActiveChannel] = useState<string>('general');
  const [messageText, setMessageText] = useState('');
  const [showOfficerList, setShowOfficerList] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const messageListRef = useRef<ScrollView>(null);

  // Animation values
  const emergencyAnimation = useRef(new Animated.Value(0)).current;

  const { isConnected } = useWebSocket({
    callbacks: {
      onEmergencyAlert: () => {
        setEmergencyMode(true);
        startEmergencyAnimation();
      }
    }
  });

  // Mock data
  const [officers] = useState<Officer[]>([
    {
      id: 'officer-1',
      name: 'Sarah Johnson',
      badge: 'P1234',
      rank: 'Sergeant',
      status: 'active',
      location: {
        latitude: 28.6139,
        longitude: 77.2090,
        address: 'India Gate Area'
      },
      lastSeen: new Date(Date.now() - 300000),
      currentAssignment: 'Tourist Safety Patrol',
      avatar: '👮‍♀️',
      expertise: ['Crisis Management', 'Tourist Assistance', 'Emergency Response'],
      responseTime: 3
    },
    {
      id: 'officer-2',
      name: 'Michael Chen',
      badge: 'P5678',
      rank: 'Officer',
      status: 'emergency_response',
      location: {
        latitude: 28.6200,
        longitude: 77.2100,
        address: 'Connaught Place'
      },
      lastSeen: new Date(Date.now() - 60000),
      currentAssignment: 'Emergency Response Unit',
      avatar: '👮‍♂️',
      expertise: ['Emergency Medical', 'Crowd Control', 'Investigation'],
      responseTime: 2
    },
    {
      id: 'officer-3',
      name: 'Priya Sharma',
      badge: 'P9012',
      rank: 'Inspector',
      status: 'busy',
      location: {
        latitude: 28.6250,
        longitude: 77.2200,
        address: 'Red Fort Area'
      },
      lastSeen: new Date(Date.now() - 1800000),
      currentAssignment: 'Investigation',
      avatar: '👩‍💼',
      expertise: ['Investigation', 'Legal Affairs', 'Coordination'],
      responseTime: 5
    }
  ]);

  const [channels, setChannels] = useState<CommunicationChannel[]>([
    {
      id: 'general',
      name: 'General Coordination',
      type: 'general',
      participants: ['officer-1', 'officer-2', 'officer-3'],
      lastActivity: new Date(Date.now() - 600000),
      unreadCount: 2,
      isActive: true,
      priority: 'normal'
    },
    {
      id: 'emergency',
      name: 'Emergency Response',
      type: 'emergency',
      participants: ['officer-1', 'officer-2'],
      lastActivity: new Date(Date.now() - 300000),
      unreadCount: 5,
      isActive: true,
      priority: 'critical'
    },
    {
      id: 'tactical',
      name: 'Tactical Operations',
      type: 'tactical',
      participants: ['officer-2', 'officer-3'],
      lastActivity: new Date(Date.now() - 1200000),
      unreadCount: 0,
      isActive: true,
      priority: 'high'
    }
  ]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      senderId: 'officer-1',
      senderName: 'Sarah Johnson',
      message: 'All units, tourist safety status report. Current patrol areas showing normal activity.',
      timestamp: new Date(Date.now() - 1800000),
      type: 'text',
      priority: 'normal',
      readBy: ['officer-2']
    },
    {
      id: 'msg-2',
      senderId: 'officer-2',
      senderName: 'Michael Chen',
      message: 'Received. Connaught Place area clear, no incidents reported.',
      timestamp: new Date(Date.now() - 1500000),
      type: 'text',
      priority: 'normal',
      readBy: ['officer-1', 'officer-3']
    },
    {
      id: 'msg-3',
      senderId: 'system',
      senderName: 'System',
      message: 'Emergency alert: Tourist assistance required at India Gate. Dispatching nearest units.',
      timestamp: new Date(Date.now() - 900000),
      type: 'emergency',
      priority: 'critical',
      readBy: ['officer-1']
    }
  ]);

  const startEmergencyAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(emergencyAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(emergencyAnimation, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) return;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'current-user',
      senderName: 'Command Center',
      message: messageText,
      timestamp: new Date(),
      type: emergencyMode ? 'emergency' : 'text',
      priority: emergencyMode ? 'critical' : 'normal',
      readBy: []
    };

    setMessages(prev => [...prev, newMessage]);
    setMessageText('');

    // Note: In production, would send via WebSocket or API
    console.log('Sending message:', newMessage);

    // Auto scroll to bottom
    setTimeout(() => {
      messageListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleEmergencyBroadcast = () => {
    Alert.alert(
      'Emergency Broadcast',
      'Send emergency alert to all active officers?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Alert',
          style: 'destructive',
          onPress: () => {
            const emergencyMessage: ChatMessage = {
              id: `emergency-${Date.now()}`,
              senderId: 'command-center',
              senderName: 'Command Center',
              message: 'EMERGENCY BROADCAST: All available units respond immediately. High priority incident requiring immediate attention.',
              timestamp: new Date(),
              type: 'emergency',
              priority: 'critical',
              readBy: []
            };

            setMessages(prev => [...prev, emergencyMessage]);
            setEmergencyMode(true);
            startEmergencyAnimation();
            
            // Note: In production, would send via WebSocket or API
            console.log('Emergency broadcast:', emergencyMessage);
          }
        }
      ]
    );
  };

  const getStatusColor = (status: Officer['status']) => {
    switch (status) {
      case 'active': return Colors[colorScheme ?? 'light'].success;
      case 'busy': return Colors[colorScheme ?? 'light'].warning;
      case 'emergency_response': return Colors[colorScheme ?? 'light'].error;
      case 'offline': return Colors[colorScheme ?? 'light'].secondary;
      default: return Colors[colorScheme ?? 'light'].text;
    }
  };

  const getChannelIcon = (type: CommunicationChannel['type']) => {
    switch (type) {
      case 'general': return 'person.3.fill';
      case 'emergency': return 'exclamationmark.triangle.fill';
      case 'direct': return 'person.fill';
      case 'tactical': return 'shield.fill';
      default: return 'bubble.left.fill';
    }
  };

  const getPriorityColor = (priority: ChatMessage['priority']) => {
    switch (priority) {
      case 'critical': return Colors[colorScheme ?? 'light'].error;
      case 'high': return '#FF7043';
      case 'normal': return Colors[colorScheme ?? 'light'].text;
      case 'low': return Colors[colorScheme ?? 'light'].secondary;
      default: return Colors[colorScheme ?? 'light'].text;
    }
  };

  const activeChannelData = channels.find(c => c.id === activeChannel);
  const onlineOfficers = officers.filter(o => o.status !== 'offline');

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[
        styles.header,
        emergencyMode && {
          backgroundColor: Colors[colorScheme ?? 'light'].error + '20'
        }
      ]}>
        <View style={styles.headerLeft}>
          <IconSymbol name="antenna.radiowaves.left.and.right" size={24} color={Colors[colorScheme ?? 'light'].primary} />
          <ThemedText type="title" style={styles.title}>Officer Communications</ThemedText>
        </View>

        <View style={styles.headerRight}>
          {emergencyMode && (
            <Animated.View style={[
              styles.emergencyIndicator,
              {
                opacity: emergencyAnimation,
                backgroundColor: Colors[colorScheme ?? 'light'].error
              }
            ]}>
              <ThemedText style={styles.emergencyText}>EMERGENCY</ThemedText>
            </Animated.View>
          )}

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
              {isConnected ? 'Connected' : 'Offline'}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickActionButton, { backgroundColor: Colors[colorScheme ?? 'light'].error }]}
          onPress={handleEmergencyBroadcast}
        >
          <IconSymbol name="exclamationmark.triangle.fill" size={18} color="white" />
          <ThemedText style={styles.quickActionText}>Emergency Broadcast</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionButton, { backgroundColor: Colors[colorScheme ?? 'light'].primary }]}
          onPress={() => setShowOfficerList(true)}
        >
          <IconSymbol name="person.3.fill" size={18} color="white" />
          <ThemedText style={styles.quickActionText}>Officer Status ({onlineOfficers.length})</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Channel Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.channelTabs}
        contentContainerStyle={styles.channelTabsContent}
      >
        {channels.map((channel) => (
          <TouchableOpacity
            key={channel.id}
            style={[
              styles.channelTab,
              {
                backgroundColor: activeChannel === channel.id 
                  ? Colors[colorScheme ?? 'light'].primary
                  : Colors[colorScheme ?? 'light'].card,
                borderColor: channel.priority === 'critical' 
                  ? Colors[colorScheme ?? 'light'].error
                  : Colors[colorScheme ?? 'light'].border,
              }
            ]}
            onPress={() => setActiveChannel(channel.id)}
          >
            <IconSymbol 
              name={getChannelIcon(channel.type) as any}
              size={16}
              color={activeChannel === channel.id ? 'white' : Colors[colorScheme ?? 'light'].text}
            />
            <ThemedText style={[
              styles.channelTabText,
              { color: activeChannel === channel.id ? 'white' : Colors[colorScheme ?? 'light'].text }
            ]}>
              {channel.name}
            </ThemedText>
            {channel.unreadCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: Colors[colorScheme ?? 'light'].error }]}>
                <ThemedText style={styles.unreadCount}>{channel.unreadCount}</ThemedText>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Messages */}
      <ScrollView 
        ref={messageListRef}
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
      >
        {messages
          .filter(msg => msg.type === 'system' || activeChannelData?.participants.includes(msg.senderId) || msg.senderId === 'current-user' || msg.senderId === 'command-center')
          .map((message) => {
            const sender = officers.find(o => o.id === message.senderId);
            const isOwnMessage = message.senderId === 'current-user' || message.senderId === 'command-center';
            
            return (
              <View key={message.id} style={[
                styles.messageContainer,
                isOwnMessage && styles.ownMessage
              ]}>
                <View style={[
                  styles.messageBubble,
                  {
                    backgroundColor: isOwnMessage 
                      ? Colors[colorScheme ?? 'light'].primary
                      : Colors[colorScheme ?? 'light'].card,
                    borderLeftColor: getPriorityColor(message.priority),
                  },
                  message.type === 'emergency' && {
                    backgroundColor: Colors[colorScheme ?? 'light'].error + '20',
                    borderColor: Colors[colorScheme ?? 'light'].error,
                    borderWidth: 1,
                  }
                ]}>
                  <View style={styles.messageHeader}>
                    <ThemedText style={[
                      styles.senderName,
                      { color: isOwnMessage ? 'white' : Colors[colorScheme ?? 'light'].text }
                    ]}>
                      {sender ? `${sender.name} (${sender.badge})` : message.senderName}
                    </ThemedText>
                    <ThemedText style={[
                      styles.messageTime,
                      { color: isOwnMessage ? 'rgba(255,255,255,0.8)' : Colors[colorScheme ?? 'light'].secondary }
                    ]}>
                      {message.timestamp.toLocaleTimeString()}
                    </ThemedText>
                  </View>
                  
                  <ThemedText style={[
                    styles.messageText,
                    { color: isOwnMessage ? 'white' : Colors[colorScheme ?? 'light'].text },
                    message.type === 'emergency' && { fontWeight: 'bold' }
                  ]}>
                    {message.message}
                  </ThemedText>
                  
                  {message.priority === 'critical' && (
                    <View style={styles.priorityBadge}>
                      <IconSymbol name="exclamationmark" size={10} color="white" />
                      <ThemedText style={styles.priorityText}>URGENT</ThemedText>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
      </ScrollView>

      {/* Message Input */}
      <View style={[
        styles.messageInput,
        emergencyMode && { backgroundColor: Colors[colorScheme ?? 'light'].error + '10' }
      ]}>
        <TouchableOpacity
          style={[
            styles.emergencyToggle,
            {
              backgroundColor: emergencyMode 
                ? Colors[colorScheme ?? 'light'].error
                : Colors[colorScheme ?? 'light'].surfaceVariant
            }
          ]}
          onPress={() => setEmergencyMode(!emergencyMode)}
        >
          <IconSymbol 
            name="exclamationmark.triangle.fill" 
            size={16} 
            color={emergencyMode ? 'white' : Colors[colorScheme ?? 'light'].text} 
          />
        </TouchableOpacity>

        <TextInput
          style={[styles.textInput, { color: Colors[colorScheme ?? 'light'].text }]}
          placeholder={emergencyMode ? "Emergency message..." : "Type message..."}
          placeholderTextColor={Colors[colorScheme ?? 'light'].secondary}
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={500}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: messageText.trim() 
                ? (emergencyMode ? Colors[colorScheme ?? 'light'].error : Colors[colorScheme ?? 'light'].primary)
                : Colors[colorScheme ?? 'light'].surfaceVariant
            }
          ]}
          onPress={handleSendMessage}
          disabled={!messageText.trim()}
        >
          <IconSymbol name="paperplane.fill" size={16} color="white" />
        </TouchableOpacity>
      </View>

      {/* Officer List Modal */}
      <Modal
        visible={showOfficerList}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOfficerList(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title">Officer Status</ThemedText>
              <TouchableOpacity onPress={() => setShowOfficerList(false)}>
                <IconSymbol name="xmark" size={20} color={Colors[colorScheme ?? 'light'].text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.officerList} showsVerticalScrollIndicator={false}>
              {officers.map((officer) => (
                <TouchableOpacity
                  key={officer.id}
                  style={[
                    styles.officerCard,
                    { backgroundColor: Colors[colorScheme ?? 'light'].card }
                  ]}
                  onPress={() => {
                    // Could open direct message channel with officer
                    console.log('Selected officer:', officer.id);
                  }}
                >
                  <View style={styles.officerInfo}>
                    <View style={styles.officerHeader}>
                      <ThemedText style={styles.officerName}>{officer.avatar} {officer.name}</ThemedText>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(officer.status) }
                      ]}>
                        <ThemedText style={styles.statusText}>
                          {officer.status.replace('_', ' ').toUpperCase()}
                        </ThemedText>
                      </View>
                    </View>
                    
                    <ThemedText style={styles.officerDetails}>
                      {officer.rank} • Badge: {officer.badge}
                    </ThemedText>
                    
                    <ThemedText style={styles.officerLocation}>
                      📍 {officer.location.address}
                    </ThemedText>
                    
                    {officer.currentAssignment && (
                      <ThemedText style={styles.officerAssignment}>
                        🎯 {officer.currentAssignment}
                      </ThemedText>
                    )}
                    
                    <View style={styles.officerExpertise}>
                      {officer.expertise.slice(0, 2).map((skill, index) => (
                        <View key={index} style={[
                          styles.expertiseTag,
                          { backgroundColor: Colors[colorScheme ?? 'light'].primary + '20' }
                        ]}>
                          <ThemedText style={[
                            styles.expertiseText,
                            { color: Colors[colorScheme ?? 'light'].primary }
                          ]}>
                            {skill}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                    
                    <ThemedText style={styles.responseTime}>
                      ⚡ {officer.responseTime} min avg response
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              ))}
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emergencyIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emergencyText: {
    color: 'white',
    fontSize: 10,
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
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  quickActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  channelTabs: {
    paddingLeft: 20,
    marginBottom: 15,
  },
  channelTabsContent: {
    paddingRight: 20,
    gap: 8,
  },
  channelTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  channelTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  unreadCount: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  messageContainer: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
  },
  messageTime: {
    fontSize: 10,
    marginLeft: 8,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 18,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C62828',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
    gap: 2,
    alignSelf: 'flex-start',
  },
  priorityText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
  messageInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  emergencyToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
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
  officerList: {
    flex: 1,
    paddingVertical: 20,
  },
  officerCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  officerInfo: {
    gap: 6,
  },
  officerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  officerName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  officerDetails: {
    fontSize: 14,
    opacity: 0.8,
  },
  officerLocation: {
    fontSize: 12,
    opacity: 0.7,
  },
  officerAssignment: {
    fontSize: 12,
    opacity: 0.7,
  },
  officerExpertise: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  expertiseTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expertiseText: {
    fontSize: 10,
    fontWeight: '600',
  },
  responseTime: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 2,
  },
});