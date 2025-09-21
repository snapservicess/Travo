import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from './ui/icon-symbol';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@/contexts/NavigationContext';
import MainDashboard from './main-dashboard';
import SOSEmergency from './features/sos-emergency';
import SafetyScoreDashboard from './features/safety-score-dashboard';
import OfflineMaps from './features/offline-maps';
import AdvancedAnalyticsDashboard from './features/advanced-analytics-dashboard';
import IntelligentRouteRecommendations from './features/intelligent-route-recommendations';
import RiskAssessmentSystem from './features/risk-assessment-system';
import EventsFestivals from './features/events-festivals';
import NearbyPlaces from './nearby-places';
import History from './history';
import Profile from './profile';
import Settings from './settings';

export default function AppRouter() {
  const { currentScreen, navigateTo } = useNavigation();
  const colorScheme = useColorScheme();

  const getScreenTitle = () => {
    switch (currentScreen) {
      case 'sos': return 'SOS Emergency';
      case 'safety': return 'Safety Score';
      case 'ai-analytics': return 'AI Analytics Dashboard';
      case 'intelligent-routes': return 'Smart Route Recommendations';
      case 'risk-assessment': return 'AI Risk Assessment';
      case 'map': return 'Offline Maps';
      case 'events': return 'Events & Festivals';
      case 'language': return 'Language Help';
      case 'transport': return 'Transport & Stay';
      case 'weather': return 'Weather & Terrain';
      case 'eco': return 'Eco Tourism';
      case 'nearby-places': return 'Nearby Places';
      case 'history': return 'Travel History';
      case 'profile': return 'Profile';
      case 'settings': return 'Settings';
      default: return '';
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <MainDashboard />;
      case 'sos':
        return <SOSEmergency />;
      case 'safety':
        return <SafetyScoreDashboard />;
      case 'ai-analytics':
        return <AdvancedAnalyticsDashboard />;
      case 'intelligent-routes':
        return <IntelligentRouteRecommendations />;
      case 'risk-assessment':
        return <RiskAssessmentSystem />;
      case 'map':
        return <OfflineMaps />;
      case 'events':
        return <EventsFestivals />;
      case 'language':
        return <PlaceholderScreen title="Language Help" />;
      case 'transport':
        return <PlaceholderScreen title="Transport & Stay" />;
      case 'weather':
        return <PlaceholderScreen title="Weather & Terrain" />;
      case 'eco':
        return <PlaceholderScreen title="Eco Tourism Tips" />;
      case 'nearby-places':
        return <NearbyPlaces />;
      case 'history':
        return <History />;
      case 'profile':
        return <Profile />;
      case 'settings':
        return <Settings visible={true} onClose={() => navigateTo('dashboard')} />;
      default:
        return <MainDashboard />;
    }
  };

  return (
    <View style={styles.container}>
      {currentScreen !== 'dashboard' && (
        <View style={[styles.header, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}> 
          <TouchableOpacity onPress={() => navigateTo('dashboard')} style={styles.headerBackButton} accessibilityLabel="Back to Dashboard">
            <MaterialIcons name="chevron-left" size={24} color="#000" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>{getScreenTitle()}</ThemedText>
          <View style={styles.headerSpacer} />
        </View>
      )}
      {renderScreen()}
    </View>
  );
}

function PlaceholderScreen({ title }: { title: string }) {
  const colorScheme = useColorScheme();
  return (
    <View style={styles.container}>
      <View style={styles.placeholderContainer}>
        <View style={[styles.placeholder, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
          <IconSymbol name="gear" size={48} color={Colors[colorScheme ?? 'light'].tabIconDefault} />
          <ThemedText style={styles.placeholderTitle}>{title}</ThemedText>
          <ThemedText style={styles.placeholderText}>
            This feature is coming soon!
          </ThemedText>
          <ThemedText style={styles.placeholderSubtext}>
            We&apos;re working hard to bring you amazing travel tools.
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerBackButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  placeholderContainer: {
    flex: 1,
    padding: 20,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  placeholderText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
});