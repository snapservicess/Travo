import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from './ui/icon-symbol';
import { useNavigation } from '@/contexts/NavigationContext';
import MainDashboard from './main-dashboard';
import SOSEmergency from './features/sos-emergency';
import SafetyScoreDashboard from './features/safety-score-dashboard';
import OfflineMaps from './features/offline-maps';

export default function AppRouter() {
  const { currentScreen, goBack } = useNavigation();
  const colorScheme = useColorScheme();

  const getScreenTitle = () => {
    switch (currentScreen) {
      case 'sos': return 'SOS Emergency';
      case 'safety': return 'Safety Score';
      case 'map': return 'Offline Maps';
      case 'events': return 'Events & Festivals';
      case 'language': return 'Language Help';
      case 'transport': return 'Transport & Stay';
      case 'weather': return 'Weather & Terrain';
      case 'eco': return 'Eco Tourism';
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
      case 'map':
        return <OfflineMaps />;
      case 'events':
        return <PlaceholderScreen title="Events & Festivals" />;
      case 'language':
        return <PlaceholderScreen title="Language Help" />;
      case 'transport':
        return <PlaceholderScreen title="Transport & Stay" />;
      case 'weather':
        return <PlaceholderScreen title="Weather & Terrain" />;
      case 'eco':
        return <PlaceholderScreen title="Eco Tourism Tips" />;
      default:
        return <MainDashboard />;
    }
  };

  return (
    <View style={styles.container}>
      {currentScreen !== 'dashboard' && (
        <View style={[styles.header, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={Colors[colorScheme ?? 'light'].text} />
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
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
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