import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from './ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';

interface TouristProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  nationality: string;
  passportNumber?: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  preferences: {
    language: string;
    currency: string;
    notifications: boolean;
    locationSharing: boolean;
  };
  travelStats: {
    joinDate: Date;
    placesVisited: number;
    totalDistance: number;
    averageSafety: number;
    emergencyCalls: number;
  };
  safetyProfile: {
    currentSafetyScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    verificationStatus: 'verified' | 'pending' | 'unverified';
  };
}

export default function Profile() {
  const colorScheme = useColorScheme();
  const { touristId, logout } = useAuth();
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingField, setEditingField] = useState<string>('');
  const [editValue, setEditValue] = useState('');

  // Mock profile data
  const [profile, setProfile] = useState<TouristProfile>({
    id: touristId || 'TOUR001',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    phone: '+91-98765-43210',
    nationality: 'United States',
    passportNumber: 'US123456789',
    emergencyContact: {
      name: 'John Johnson',
      phone: '+1-555-0123',
      relationship: 'Husband'
    },
    preferences: {
      language: 'English',
      currency: 'USD',
      notifications: true,
      locationSharing: true
    },
    travelStats: {
      joinDate: new Date('2025-09-15'),
      placesVisited: 12,
      totalDistance: 45.6,
      averageSafety: 92,
      emergencyCalls: 1
    },
    safetyProfile: {
      currentSafetyScore: 92,
      riskLevel: 'low',
      verificationStatus: 'verified'
    }
  });

  const profileSections = [
    {
      title: 'Personal Information',
      items: [
        { key: 'name', label: 'Full Name', value: profile.name, icon: 'person.circle', editable: true },
        { key: 'email', label: 'Email', value: profile.email, icon: 'envelope', editable: true },
        { key: 'phone', label: 'Phone', value: profile.phone, icon: 'phone', editable: true },
        { key: 'nationality', label: 'Nationality', value: profile.nationality, icon: 'flag', editable: true },
        { key: 'passportNumber', label: 'Passport', value: profile.passportNumber || 'Not provided', icon: 'doc.text', editable: true }
      ]
    },
    {
      title: 'Emergency Contact',
      items: [
        { key: 'emergencyName', label: 'Name', value: profile.emergencyContact.name, icon: 'person.fill.badge.plus', editable: true },
        { key: 'emergencyPhone', label: 'Phone', value: profile.emergencyContact.phone, icon: 'phone.badge.plus', editable: true },
        { key: 'emergencyRelation', label: 'Relationship', value: profile.emergencyContact.relationship, icon: 'heart', editable: true }
      ]
    },
    {
      title: 'Travel Statistics',
      items: [
        { key: 'joinDate', label: 'Member Since', value: profile.travelStats.joinDate.toLocaleDateString('en-IN'), icon: 'calendar.badge.plus', editable: false },
        { key: 'placesVisited', label: 'Places Visited', value: profile.travelStats.placesVisited.toString(), icon: 'location.circle', editable: false },
        { key: 'totalDistance', label: 'Distance Traveled', value: `${profile.travelStats.totalDistance} km`, icon: 'map', editable: false },
        { key: 'averageSafety', label: 'Average Safety Score', value: `${profile.travelStats.averageSafety}%`, icon: 'shield.checkered', editable: false }
      ]
    }
  ];

  const handleEditField = (key: string, currentValue: string) => {
    setEditingField(key);
    setEditValue(currentValue);
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editValue.trim()) {
      Alert.alert('Error', 'Please enter a valid value.');
      return;
    }

    setProfile(prev => {
      const newProfile = { ...prev };
      
      switch (editingField) {
        case 'name':
          newProfile.name = editValue;
          break;
        case 'email':
          newProfile.email = editValue;
          break;
        case 'phone':
          newProfile.phone = editValue;
          break;
        case 'nationality':
          newProfile.nationality = editValue;
          break;
        case 'passportNumber':
          newProfile.passportNumber = editValue;
          break;
        case 'emergencyName':
          newProfile.emergencyContact.name = editValue;
          break;
        case 'emergencyPhone':
          newProfile.emergencyContact.phone = editValue;
          break;
        case 'emergencyRelation':
          newProfile.emergencyContact.relationship = editValue;
          break;
      }
      
      return newProfile;
    });

    setShowEditModal(false);
    setEditingField('');
    setEditValue('');
    
    Alert.alert('Success', 'Profile updated successfully!');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: logout 
        }
      ]
    );
  };

  const handleEmergencyCall = () => {
    Alert.alert(
      'Emergency Call',
      'This will call your emergency contact. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          style: 'destructive',
          onPress: () => {
            // In a real app, this would make the actual call
            Alert.alert('Calling...', `Calling ${profile.emergencyContact.name} at ${profile.emergencyContact.phone}`);
          }
        }
      ]
    );
  };

  const getSafetyColor = (score: number) => {
    if (score >= 90) return Colors[colorScheme ?? 'light'].success;
    if (score >= 75) return Colors[colorScheme ?? 'light'].warning;
    return Colors[colorScheme ?? 'light'].error;
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return Colors[colorScheme ?? 'light'].success;
      case 'medium': return Colors[colorScheme ?? 'light'].warning;
      case 'high': return Colors[colorScheme ?? 'light'].error;
      default: return Colors[colorScheme ?? 'light'].tabIconDefault;
    }
  };

  const getVerificationColor = (status: string) => {
    switch (status) {
      case 'verified': return Colors[colorScheme ?? 'light'].success;
      case 'pending': return Colors[colorScheme ?? 'light'].warning;
      case 'unverified': return Colors[colorScheme ?? 'light'].error;
      default: return Colors[colorScheme ?? 'light'].tabIconDefault;
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.profileImage, { backgroundColor: Colors[colorScheme ?? 'light'].primary }]}>
            <ThemedText style={styles.profileInitial}>
              {profile.name.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
          <View style={styles.headerInfo}>
            <ThemedText type="title" style={styles.headerName}>{profile.name}</ThemedText>
            <ThemedText style={styles.headerSubtitle}>Tourist ID: {profile.id}</ThemedText>
            <View style={styles.verificationBadge}>
              <IconSymbol 
                name={profile.safetyProfile.verificationStatus === 'verified' ? 'checkmark.seal.fill' : 'exclamationmark.triangle'} 
                size={12} 
                color={getVerificationColor(profile.safetyProfile.verificationStatus)} 
              />
              <ThemedText style={[styles.verificationText, { color: getVerificationColor(profile.safetyProfile.verificationStatus) }]}>
                {profile.safetyProfile.verificationStatus.charAt(0).toUpperCase() + profile.safetyProfile.verificationStatus.slice(1)}
              </ThemedText>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color={Colors[colorScheme ?? 'light'].error} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Safety Overview */}
        <View style={[styles.safetyCard, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
          <View style={styles.safetyHeader}>
            <ThemedText style={styles.sectionTitle}>Safety Overview</ThemedText>
            <View style={styles.safetyBadge}>
              <IconSymbol name="shield.checkered" size={16} color={getSafetyColor(profile.safetyProfile.currentSafetyScore)} />
              <ThemedText style={[styles.safetyScore, { color: getSafetyColor(profile.safetyProfile.currentSafetyScore) }]}>
                {profile.safetyProfile.currentSafetyScore}%
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.safetyDetails}>
            <View style={styles.safetyItem}>
              <ThemedText style={styles.safetyLabel}>Risk Level</ThemedText>
              <View style={[styles.riskBadge, { backgroundColor: getRiskLevelColor(profile.safetyProfile.riskLevel) + '20' }]}>
                <ThemedText style={[styles.riskText, { color: getRiskLevelColor(profile.safetyProfile.riskLevel) }]}>
                  {profile.safetyProfile.riskLevel.toUpperCase()}
                </ThemedText>
              </View>
            </View>
            
            <View style={styles.safetyItem}>
              <ThemedText style={styles.safetyLabel}>Emergency Calls</ThemedText>
              <ThemedText style={styles.emergencyCount}>{profile.travelStats.emergencyCalls}</ThemedText>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: Colors[colorScheme ?? 'light'].error }]}
            onPress={handleEmergencyCall}
          >
            <IconSymbol name="phone.badge.plus" size={20} color="white" />
            <ThemedText style={styles.actionButtonText}>Emergency Call</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: Colors[colorScheme ?? 'light'].primary }]}
            onPress={() => Alert.alert('Share Profile', 'Profile sharing feature coming soon!')}
          >
            <IconSymbol name="square.and.arrow.up" size={20} color="white" />
            <ThemedText style={styles.actionButtonText}>Share Profile</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Profile Sections */}
        {profileSections.map(section => (
          <View key={section.title} style={styles.section}>
            <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
            
            <View style={[styles.sectionContent, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
              {section.items.map((item, index) => (
                <View key={item.key}>
                  <TouchableOpacity
                    style={styles.profileItem}
                    onPress={item.editable ? () => handleEditField(item.key, item.value) : undefined}
                    disabled={!item.editable}
                  >
                    <View style={styles.itemLeft}>
                      <View style={[styles.itemIcon, { backgroundColor: Colors[colorScheme ?? 'light'].primary + '20' }]}>
                        <IconSymbol name={item.icon as any} size={16} color={Colors[colorScheme ?? 'light'].primary} />
                      </View>
                      <View style={styles.itemInfo}>
                        <ThemedText style={styles.itemLabel}>{item.label}</ThemedText>
                        <ThemedText style={styles.itemValue}>{item.value}</ThemedText>
                      </View>
                    </View>
                    
                    {item.editable && (
                      <IconSymbol name="chevron.right" size={16} color={Colors[colorScheme ?? 'light'].tabIconDefault} />
                    )}
                  </TouchableOpacity>
                  
                  {index < section.items.length - 1 && (
                    <View style={[styles.separator, { backgroundColor: Colors[colorScheme ?? 'light'].border }]} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* App Information */}
        <View style={styles.appInfo}>
          <ThemedText style={styles.appInfoTitle}>Travo - Tourist Safety App</ThemedText>
          <ThemedText style={styles.appInfoVersion}>Version 1.0.0</ThemedText>
          <ThemedText style={styles.appInfoText}>
            Your safety and security while traveling is our top priority.
          </ThemedText>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.editModal, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
            <View style={styles.editHeader}>
              <ThemedText type="subtitle">Edit Profile</ThemedText>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <IconSymbol name="xmark" size={20} color={Colors[colorScheme ?? 'light'].text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.editContent}>
              <ThemedText style={styles.editLabel}>
                {profileSections
                  .flatMap(s => s.items)
                  .find(item => item.key === editingField)?.label}
              </ThemedText>
              
              <TextInput
                style={[
                  styles.editInput,
                  { 
                    backgroundColor: Colors[colorScheme ?? 'light'].card,
                    color: Colors[colorScheme ?? 'light'].text,
                    borderColor: Colors[colorScheme ?? 'light'].border
                  }
                ]}
                value={editValue}
                onChangeText={setEditValue}
                placeholder="Enter new value"
                placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
                autoFocus
              />
            </View>
            
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}
                onPress={() => setShowEditModal(false)}
              >
                <ThemedText style={styles.editCancelText}>Cancel</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: Colors[colorScheme ?? 'light'].primary }]}
                onPress={handleSaveEdit}
              >
                <ThemedText style={styles.editSaveText}>Save</ThemedText>
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
    paddingVertical: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verificationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  safetyCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  safetyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  safetyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  safetyScore: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  safetyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  safetyItem: {
    alignItems: 'center',
  },
  safetyLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  riskText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  emergencyCount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionContent: {
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  profileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemValue: {
    fontSize: 12,
    opacity: 0.7,
  },
  separator: {
    height: 1,
    marginLeft: 60,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 100, // Extra space for bottom navigation
  },
  appInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  appInfoVersion: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 8,
  },
  appInfoText: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModal: {
    width: '90%',
    borderRadius: 16,
    padding: 20,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  editContent: {
    marginBottom: 24,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  editSaveText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});