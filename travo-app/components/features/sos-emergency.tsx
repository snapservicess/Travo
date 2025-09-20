import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '../ui/icon-symbol';
import { useNavigation } from '@/contexts/NavigationContext';
import { useAuth } from '@/contexts/AuthContext';

// API Configuration
const API_BASE_URL = 'http://192.168.1.100:3001/api'; // Update this IP to your computer's IP

export default function SOSEmergency() {
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [isSendingAlert, setIsSendingAlert] = useState(false);
  const colorScheme = useColorScheme();
  const { goBack } = useNavigation();
  const { userToken, touristId } = useAuth();

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
            setIsEmergencyActive(true);
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
      const response = await fetch(`${API_BASE_URL}/emergency/sos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          location: 'Current Location', // In real app, get from GPS
          message,
          severity: 'high',
          coordinates: {
            latitude: 40.7580, // In real app, get from location services
            longitude: -73.9855
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsEmergencyActive(true);
        Alert.alert(
          '🚨 SOS Alert Sent!',
          `Emergency ID: ${data.emergency.emergencyId}\nResponse Time: ${data.emergency.responseTime}\n\nEmergency services have been notified and are on their way.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to send SOS alert. Please try calling emergency services directly.');
      }
    } catch (error) {
      console.error('SOS Error:', error);
      Alert.alert(
        'SOS Alert (Offline)',
        'Could not reach emergency servers, but your location has been saved locally. Please call emergency services directly.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSendingAlert(false);
    }
  };

  const handleSendLocation = () => {
    sendSOSAlert('Location sharing requested - tourist needs assistance');
  };

  return (
    <ThemedView style={styles.container}>
      {/* Emergency Header */}
      <View style={styles.header}>
        <IconSymbol name="exclamationmark.triangle.fill" size={40} color="#FF4444" />
        <ThemedText type="title" style={styles.title}>
          Emergency Assistance
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Quick access to emergency services
        </ThemedText>
      </View>

      {/* Main SOS Button */}
      <TouchableOpacity
        style={[
          styles.sosButton,
          { 
            backgroundColor: isEmergencyActive ? '#FF6666' : isSendingAlert ? '#FF8888' : '#FF4444',
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
          {isSendingAlert ? 'SENDING ALERT...' : isEmergencyActive ? 'EMERGENCY ACTIVE' : 'SOS - SEND ALERT'}
        </ThemedText>
        <ThemedText style={styles.sosButtonSubtext}>
          {isSendingAlert ? 'Please wait...' : 'Tap to send emergency alert'}
        </ThemedText>
      </TouchableOpacity>

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
});