import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { ThemedText } from './themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from './ui/icon-symbol';
import { useNavigation } from '@/contexts/NavigationContext';

const { width } = Dimensions.get('window');

interface BottomNavigationProps {
  activeTab?: string;
}

export default function BottomNavigation({ activeTab = 'map' }: BottomNavigationProps) {
  const colorScheme = useColorScheme();
  const { navigateTo } = useNavigation();

  const navigationItems = [
    {
      id: 'map',
      title: 'Map',
      icon: 'map.fill',
      activeIcon: 'map.fill',
      color: '#2196F3'
    },
    {
      id: 'nearby-places',
      title: 'Nearby',
      icon: 'location.circle',
      activeIcon: 'location.circle.fill',
      color: '#4CAF50'
    },
    {
      id: 'history',
      title: 'History',
      icon: 'clock.arrow.circlepath',
      activeIcon: 'clock.arrow.circlepath',
      color: '#FF9800'
    },
    {
      id: 'profile',
      title: 'Profile',
      icon: 'person.circle',
      activeIcon: 'person.circle.fill',
      color: '#9C27B0'
    }
  ];

  const handleTabPress = (tabId: string) => {
    navigateTo(tabId as any);
  };

  return (
    <View style={[
      styles.container,
      { 
        backgroundColor: Colors[colorScheme ?? 'light'].background,
        borderTopColor: Colors[colorScheme ?? 'light'].border
      }
    ]}>
      <View style={styles.navigationContainer}>
        {navigationItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.navigationItem,
                isActive && { 
                  backgroundColor: item.color + '20'
                }
              ]}
              onPress={() => handleTabPress(item.id)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.iconContainer,
                isActive && {
                  backgroundColor: item.color + '30',
                }
              ]}>
                <IconSymbol
                  name={isActive ? item.activeIcon as any : item.icon as any}
                  size={24}
                  color={isActive ? item.color : Colors[colorScheme ?? 'light'].tabIconDefault}
                />
              </View>
              <ThemedText style={[
                styles.navigationLabel,
                {
                  color: isActive 
                    ? item.color 
                    : Colors[colorScheme ?? 'light'].tabIconDefault
                },
                isActive && { fontWeight: '600' }
              ]}>
                {item.title}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  navigationItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    minWidth: (width - 80) / 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  navigationLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
});