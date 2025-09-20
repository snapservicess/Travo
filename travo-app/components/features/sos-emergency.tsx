import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '../ui/icon-symbol';

export default function SOSEmergency() {
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const colorScheme = useColorScheme();

  const emergencyContacts = [
    { name: 'Police', number: '911', icon: 'shield.fill' },
    { name: 'Medical', number: '911', icon: 'cross.fill' },
    { name: 'Fire', number: '911', icon: 'flame.fill' },
    { name: 'Tourist Helpline', number: '1-800-TRAVEL', icon: 'phone.fill' },
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

  const handleSendLocation = () => {
    Alert.alert(
      'Location Sent',
      'Your current location has been shared with emergency contacts and local authorities.',
      [{ text: 'OK' }]
    );
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
          { backgroundColor: isEmergencyActive ? '#FF6666' : '#FF4444' }
        ]}
        onPress={() => handleEmergencyCall('911', 'Emergency Services')}
      >
        <IconSymbol name="exclamationmark.triangle.fill" size={60} color="white" />
        <ThemedText style={styles.sosButtonText}>
          {isEmergencyActive ? 'EMERGENCY ACTIVE' : 'SOS - CALL FOR HELP'}
        </ThemedText>
        <ThemedText style={styles.sosButtonSubtext}>
          Tap to call emergency services
        </ThemedText>
      </TouchableOpacity>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
          onPress={handleSendLocation}
        >
          <IconSymbol name="location.fill" size={24} color="white" />
          <ThemedText style={styles.actionButtonText}>Send Location</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
          onPress={() => Alert.alert('Alert Sent', 'Emergency alert sent to your emergency contacts.')}
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
            style={[styles.contactCard, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
            onPress={() => handleEmergencyCall(contact.number, contact.name)}
          >
            <View style={styles.contactIcon}>
              <IconSymbol name={contact.icon as any} size={24} color="#FF4444" />
            </View>
            <View style={styles.contactInfo}>
              <ThemedText style={styles.contactName}>{contact.name}</ThemedText>
              <ThemedText style={styles.contactNumber}>{contact.number}</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={16} color={Colors[colorScheme ?? 'light'].tabIconDefault} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Safety Tips */}
      <View style={[styles.safetyTips, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
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