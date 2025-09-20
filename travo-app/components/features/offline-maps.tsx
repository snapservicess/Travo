import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '../ui/icon-symbol';
import { useNavigation } from '@/contexts/NavigationContext';

export default function OfflineMaps() {
  const colorScheme = useColorScheme();
  const { goBack } = useNavigation();
  const [downloadedMaps, setDownloadedMaps] = useState([
    { id: 1, name: 'Paris City Center', size: '45 MB', downloaded: true, lastUpdated: '2 days ago' },
    { id: 2, name: 'Rome Historical District', size: '38 MB', downloaded: true, lastUpdated: '1 week ago' },
  ]);

  const availableMaps = [
    { id: 3, name: 'Barcelona Metro Area', size: '67 MB', region: 'Spain', popular: true },
    { id: 4, name: 'Tokyo Central Districts', size: '89 MB', region: 'Japan', popular: true },
    { id: 5, name: 'London City & Suburbs', size: '78 MB', region: 'UK', popular: false },
    { id: 6, name: 'Amsterdam Complete', size: '42 MB', region: 'Netherlands', popular: false },
    { id: 7, name: 'New York Manhattan', size: '95 MB', region: 'USA', popular: true },
  ];

  const handleDownloadMap = (mapId: number, mapName: string, size: string) => {
    Alert.alert(
      'Download Map',
      `Download ${mapName} (${size})?\n\nThis will use your data connection.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: () => {
            // Simulate download
            Alert.alert('Download Started', `${mapName} is downloading in the background.`);
            // In real app, you'd start the actual download process
          }
        }
      ]
    );
  };

  const handleDeleteMap = (mapId: number, mapName: string) => {
    Alert.alert(
      'Delete Map',
      `Remove ${mapName} from your device?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setDownloadedMaps(prev => prev.filter(map => map.id !== mapId));
            Alert.alert('Map Deleted', `${mapName} has been removed from your device.`);
          }
        }
      ]
    );
  };

  const handleUpdateMap = (mapId: number, mapName: string) => {
    Alert.alert('Update Started', `${mapName} is being updated in the background.`);
  };

  const totalStorage = downloadedMaps.reduce((total, map) => {
    return total + parseInt(map.size);
  }, 0);

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Back Button */}
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <IconSymbol name="house.fill" size={20} color="white" />
          <ThemedText style={styles.backText}>Home</ThemedText>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Offline Maps
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Download maps for offline navigation
          </ThemedText>
        </View>

        {/* Storage Summary */}
        <View style={[styles.storageCard, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
          <View style={styles.storageHeader}>
            <IconSymbol name="internaldrive.fill" size={24} color={Colors[colorScheme ?? 'light'].tint} />
            <ThemedText style={styles.storageTitle}>Storage Usage</ThemedText>
          </View>
          <View style={styles.storageInfo}>
            <ThemedText style={styles.storageUsed}>{totalStorage} MB used</ThemedText>
            <ThemedText style={styles.storageTotal}>of 2 GB available</ThemedText>
          </View>
          <View style={styles.storageBar}>
            <View 
              style={[
                styles.storageProgress,
                { 
                  width: `${(totalStorage / 2048) * 100}%`,
                  backgroundColor: Colors[colorScheme ?? 'light'].tint
                }
              ]}
            />
          </View>
        </View>

        {/* Downloaded Maps */}
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Downloaded Maps ({downloadedMaps.length})
        </ThemedText>

        {downloadedMaps.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
            <IconSymbol name="map" size={48} color={Colors[colorScheme ?? 'light'].tabIconDefault} />
            <ThemedText style={styles.emptyStateText}>No downloaded maps</ThemedText>
            <ThemedText style={styles.emptyStateSubtext}>
              Download maps below for offline access
            </ThemedText>
          </View>
        ) : (
          <View style={styles.mapsList}>
            {downloadedMaps.map((map) => (
              <View
                key={map.id}
                style={[styles.mapCard, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
              >
                <View style={styles.mapInfo}>
                  <View style={[styles.mapIcon, { backgroundColor: '#4CAF50' + '20' }]}>
                    <IconSymbol name="map.fill" size={20} color="#4CAF50" />
                  </View>
                  <View style={styles.mapDetails}>
                    <ThemedText style={styles.mapName}>{map.name}</ThemedText>
                    <ThemedText style={styles.mapMeta}>
                      {map.size} • Updated {map.lastUpdated}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.mapActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleUpdateMap(map.id, map.name)}
                  >
                    <IconSymbol name="arrow.clockwise" size={18} color={Colors[colorScheme ?? 'light'].tint} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteMap(map.id, map.name)}
                  >
                    <IconSymbol name="trash" size={18} color="#FF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Available Maps */}
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Available for Download
        </ThemedText>

        <View style={styles.mapsList}>
          {availableMaps.map((map) => (
            <View
              key={map.id}
              style={[styles.mapCard, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
            >
              <View style={styles.mapInfo}>
                <View style={[styles.mapIcon, { backgroundColor: Colors[colorScheme ?? 'light'].tint + '20' }]}>
                  <IconSymbol name="map" size={20} color={Colors[colorScheme ?? 'light'].tint} />
                </View>
                <View style={styles.mapDetails}>
                  <View style={styles.mapNameRow}>
                    <ThemedText style={styles.mapName}>{map.name}</ThemedText>
                    {map.popular && (
                      <View style={styles.popularBadge}>
                        <ThemedText style={styles.popularText}>Popular</ThemedText>
                      </View>
                    )}
                  </View>
                  <ThemedText style={styles.mapMeta}>
                    {map.region} • {map.size}
                  </ThemedText>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.downloadButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
                onPress={() => handleDownloadMap(map.id, map.name, map.size)}
              >
                <IconSymbol name="arrow.down.circle.fill" size={18} color="white" />
                <ThemedText style={styles.downloadButtonText}>Download</ThemedText>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Tips */}
        <View style={[styles.tipsCard, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
          <ThemedText style={styles.tipsTitle}>💡 Tips for Offline Maps</ThemedText>
          <ThemedText style={styles.tipText}>
            • Download maps on Wi-Fi to save mobile data
          </ThemedText>
          <ThemedText style={styles.tipText}>
            • Maps work without internet connection
          </ThemedText>
          <ThemedText style={styles.tipText}>
            • Update maps regularly for accuracy
          </ThemedText>
          <ThemedText style={styles.tipText}>
            • GPS still works offline for navigation
          </ThemedText>
        </View>
      </ScrollView>
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
    marginBottom: 25,
  },
  title: {
    fontSize: 24,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  storageCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 15,
  },
  storageTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  storageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  storageUsed: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  storageTotal: {
    fontSize: 14,
    opacity: 0.7,
  },
  storageBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
  },
  storageProgress: {
    height: 6,
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 15,
  },
  emptyState: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  mapsList: {
    marginBottom: 25,
  },
  mapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  mapInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mapIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  mapDetails: {
    flex: 1,
  },
  mapNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  mapName: {
    fontSize: 16,
    fontWeight: '600',
  },
  popularBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  popularText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mapMeta: {
    fontSize: 14,
    opacity: 0.7,
  },
  mapActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  downloadButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  tipsCard: {
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 6,
  },
});