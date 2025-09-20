import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Dimensions, Image } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { IconSymbol } from './ui/icon-symbol';

const { width } = Dimensions.get('window');

const travelTools: {
  title: string;
  description: string;
  color: string; // Background color for the icon container
  iconColor?: string; // Color for the icon symbol
  screen: Screen;
  iconName?: React.ComponentProps<typeof IconSymbol>['name'];
  image?: any;
}[] = [
  {
    title: 'Safety Score',
    description: 'Check your safety',
    color: '#D4EFDF',
    screen: 'safety-score',
    image: require('../assets/images/profile-icon.png'),
  },
  {
    title: 'Offline Maps',
    description: 'Download maps',
    color: '#D6EAF8',
    iconColor: '#2980B9',
    screen: 'offline-maps',
    iconName: 'map.fill',
  },
  {
    title: 'Events & Festivals',
    description: 'Local activities',
    color: '#FDEBD0',
    screen: 'events-festivals',
    iconName: 'calendar.badge.plus',
  },
  {
    title: 'Language Help',
    description: 'Translation & community',
    color: '#E8F8F5',
    screen: 'language-help',
    iconName: 'bubble.left.and.bubble.right.fill',
  },
  {
    title: 'Transport & Stay',
    description: 'Verified options',
    color: '#D1E8FF',
    iconColor: '#007BFF',
    screen: 'transport-stay',
    iconName: 'car.fill',
  },
  {
    title: 'Weather & Terrain',
    description: 'Current conditions',
    color: '#E8DAEF',
    screen: 'weather-terrain',
    iconName: 'cloud.sun.fill',
  },
  {
    title: 'Eco Tourism Tips',
    description: 'Responsible travel',
    color: '#D5E8D4',
    screen: 'eco-tourism-tips',
    iconName: 'leaf.fill',
  },
];

export default function MainDashboard() {
  const colorScheme = useColorScheme();
  const { touristId, logout } = useAuth();
  const { navigateTo } = useNavigation();

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
            <IconSymbol name="shield.checkmark.fill" size={24} color="#4CAF50" />
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
        
        <View style={styles.toolsGrid}>
          {travelTools.map((tool) => (
            <TouchableOpacity
              key={tool.title}
              style={[styles.toolCard, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}
              onPress={() => navigate(tool.screen)}
            >
              <View style={[styles.toolIconContainer, { backgroundColor: tool.color }]}>
                {tool.image ? (
                  <Image source={tool.image} style={styles.toolImage} />
                ) : (
                  <IconSymbol name={tool.iconName!} size={24} color={tool.iconColor!} />
                )}
              </View>
              <ThemedText style={styles.toolTitle}>{tool.title}</ThemedText>
              <ThemedText style={styles.toolDescription}>{tool.description}</ThemedText>
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
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  toolCard: {
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
  toolIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  toolImage: {
    width: 28,
    height: 28,
  },
  toolTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 12,
    opacity: 0.7,
  },
});