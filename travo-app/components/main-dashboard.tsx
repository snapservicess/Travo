import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { IconSymbol } from './ui/icon-symbol';

const { width } = Dimensions.get('window');

export default function MainDashboard() {
  const colorScheme = useColorScheme();
  const { touristId, logout } = useAuth();
  const { navigateTo } = useNavigation();

  const features = [
    {
      id: 'sos',
      title: 'SOS Emergency',
      subtitle: 'Quick help access',
      icon: 'exclamationmark.triangle.fill',
      color: '#FF4444',
      urgent: true
    },
    {
      id: 'safety',
      title: 'Safety Score',
      subtitle: 'Check your safety',
      icon: 'shield.checkered',
      color: '#4CAF50',
    },
    {
      id: 'map',
      title: 'Offline Maps',
      subtitle: 'Download maps',
      icon: 'map.fill',
      color: '#2196F3',
    },
    {
      id: 'events',
      title: 'Events & Festivals',
      subtitle: 'Local activities',
      icon: 'calendar.badge.plus',
      color: '#FF9800',
    },
    {
      id: 'language',
      title: 'Language Help',
      subtitle: 'Translation & community',
      icon: 'bubble.left.and.bubble.right.fill',
      color: '#9C27B0',
    },
    {
      id: 'transport',
      title: 'Transport & Stay',
      subtitle: 'Verified options',
      icon: 'car.fill',
      color: '#607D8B',
    },
    {
      id: 'weather',
      title: 'Weather & Terrain',
      subtitle: 'Current conditions',
      icon: 'cloud.sun.fill',
      color: '#00BCD4',
    },
    {
      id: 'eco',
      title: 'Eco Tourism Tips',
      subtitle: 'Responsible travel',
      icon: 'leaf.fill',
      color: '#4CAF50',
    }
  ];

  const handleFeaturePress = (featureId: string) => {
    navigateTo(featureId as any);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.homeIndicator, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
              <IconSymbol name="house.fill" size={20} color="white" />
            </View>
            <View>
              <ThemedText type="title" style={styles.welcomeText}>
                Welcome back!
              </ThemedText>
              <ThemedText style={styles.touristId}>Tourist ID: {touristId}</ThemedText>
            </View>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={24} color={Colors[colorScheme ?? 'light'].text} />
          </TouchableOpacity>
        </View>

        {/* SOS Button - Prominent placement */}
        <TouchableOpacity 
          style={[styles.sosButton, { backgroundColor: '#FF4444' }]}
          onPress={() => handleFeaturePress('sos')}
        >
          <IconSymbol name="exclamationmark.triangle.fill" size={32} color="white" />
          <ThemedText style={styles.sosText}>SOS EMERGENCY</ThemedText>
          <ThemedText style={styles.sosSubtext}>Tap for immediate help</ThemedText>
        </TouchableOpacity>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
            <IconSymbol name="shield.checkered" size={24} color="#4CAF50" />
            <ThemedText style={styles.statNumber}>85%</ThemedText>
            <ThemedText style={styles.statLabel}>Safety Score</ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
            <IconSymbol name="location.fill" size={24} color="#2196F3" />
            <ThemedText style={styles.statNumber}>3</ThemedText>
            <ThemedText style={styles.statLabel}>Maps Downloaded</ThemedText>
          </View>
        </View>

        {/* Features Grid */}
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Travel Tools
        </ThemedText>
        
        <View style={styles.featuresGrid}>
          {features.filter(f => f.id !== 'sos').map((feature, index) => (
            <TouchableOpacity
              key={feature.id}
              style={[
                styles.featureCard,
                { backgroundColor: Colors[colorScheme ?? 'light'].background },
                index % 2 === 0 ? styles.featureCardLeft : styles.featureCardRight
              ]}
              onPress={() => handleFeaturePress(feature.id)}
            >
              <View style={[styles.featureIcon, { backgroundColor: feature.color + '20' }]}>
                <IconSymbol name={feature.icon as any} size={28} color={feature.color} />
              </View>
              <ThemedText style={styles.featureTitle}>{feature.title}</ThemedText>
              <ThemedText style={styles.featureSubtitle}>{feature.subtitle}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  homeIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    marginBottom: 4,
  },
  touristId: {
    fontSize: 14,
    opacity: 0.7,
  },
  logoutButton: {
    padding: 8,
  },
  sosButton: {
    margin: 20,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  sosText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  sosSubtext: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 15,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  sectionTitle: {
    paddingHorizontal: 20,
    marginBottom: 15,
    fontSize: 18,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  featureCard: {
    width: (width - 55) / 2,
    padding: 16,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  featureCardLeft: {
    marginRight: 15,
  },
  featureCardRight: {
    marginLeft: 0,
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 12,
    opacity: 0.7,
  },
});