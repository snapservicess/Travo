import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, Switch, Alert } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from './ui/icon-symbol';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

interface SettingsProps {
  visible: boolean;
  onClose: () => void;
}

interface SettingItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  action?: () => void;
  showArrow?: boolean;
  toggle?: boolean;
  value?: boolean;
  onChange?: (value: boolean) => void;
  destructive?: boolean;
}

export default function Settings({ visible, onClose }: SettingsProps) {
  const colorScheme = useColorScheme();
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationTrackingEnabled, setLocationTrackingEnabled] = useState(true);
  const [emergencyAlertsEnabled, setEmergencyAlertsEnabled] = useState(true);
  const [offlineMapsEnabled, setOfflineMapsEnabled] = useState(false);
  const [dataUsageOptimized, setDataUsageOptimized] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const supportedLanguages: Language[] = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
    { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' }
  ];

  const getCurrentLanguage = () => {
    return supportedLanguages.find(lang => lang.code === selectedLanguage) || supportedLanguages[0];
  };

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    setShowLanguageModal(false);
    Alert.alert(
      'Language Changed',
      `Language has been changed to ${supportedLanguages.find(l => l.code === languageCode)?.name}. Some features may require app restart.`
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setSelectedLanguage('en');
            setNotificationsEnabled(true);
            setLocationTrackingEnabled(true);
            setEmergencyAlertsEnabled(true);
            setOfflineMapsEnabled(false);
            setDataUsageOptimized(false);
            Alert.alert('Settings Reset', 'All settings have been reset to default values.');
          }
        }
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data including offline maps and temporary files.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Cache Cleared', 'App cache has been cleared successfully.');
          }
        }
      ]
    );
  };

  const settingSections: { title: string; items: SettingItem[] }[] = [
    {
      title: 'General',
      items: [
        {
          id: 'language',
          title: 'Language',
          subtitle: getCurrentLanguage().nativeName,
          icon: 'globe',
          action: () => setShowLanguageModal(true),
          showArrow: true
        },
        {
          id: 'notifications',
          title: 'Push Notifications',
          subtitle: 'Receive safety and emergency alerts',
          icon: 'bell.fill',
          toggle: true,
          value: notificationsEnabled,
          onChange: setNotificationsEnabled
        }
      ]
    },
    {
      title: 'Safety & Privacy',
      items: [
        {
          id: 'location',
          title: 'Location Tracking',
          subtitle: 'Allow background location for safety',
          icon: 'location.fill',
          toggle: true,
          value: locationTrackingEnabled,
          onChange: setLocationTrackingEnabled
        },
        {
          id: 'emergency',
          title: 'Emergency Alerts',
          subtitle: 'Real-time emergency notifications',
          icon: 'exclamationmark.triangle.fill',
          toggle: true,
          value: emergencyAlertsEnabled,
          onChange: setEmergencyAlertsEnabled
        }
      ]
    },
    {
      title: 'Data & Storage',
      items: [
        {
          id: 'offline-maps',
          title: 'Auto-Download Maps',
          subtitle: 'Download maps for offline use',
          icon: 'square.and.arrow.down',
          toggle: true,
          value: offlineMapsEnabled,
          onChange: setOfflineMapsEnabled
        },
        {
          id: 'data-usage',
          title: 'Optimize Data Usage',
          subtitle: 'Reduce data consumption',
          icon: 'chart.bar.fill',
          toggle: true,
          value: dataUsageOptimized,
          onChange: setDataUsageOptimized
        },
        {
          id: 'clear-cache',
          title: 'Clear Cache',
          subtitle: 'Free up storage space',
          icon: 'trash.fill',
          action: handleClearCache,
          showArrow: true
        }
      ]
    },
    {
      title: 'Advanced',
      items: [
        {
          id: 'reset',
          title: 'Reset Settings',
          subtitle: 'Reset all settings to default',
          icon: 'arrow.counterclockwise.circle.fill',
          action: handleResetSettings,
          showArrow: true,
          destructive: true
        }
      ]
    }
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <ThemedView style={[styles.modalContent, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>Settings</ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={20} color={Colors[colorScheme ?? 'light'].text} />
            </TouchableOpacity>
          </View>

          {/* Settings Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {settingSections.map((section, sectionIndex) => (
              <View key={section.title} style={styles.section}>
                <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
                
                <View style={[styles.sectionContent, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
                  {section.items.map((item, itemIndex) => (
                    <View key={item.id}>
                      <TouchableOpacity
                        style={styles.settingItem}
                        onPress={item.action}
                        disabled={!item.action && !item.toggle}
                        activeOpacity={item.action ? 0.7 : 1}
                      >
                        <View style={styles.settingLeft}>
                          <View style={[
                            styles.settingIcon,
                            { 
                              backgroundColor: item.destructive 
                                ? Colors[colorScheme ?? 'light'].error + '20'
                                : Colors[colorScheme ?? 'light'].primary + '20'
                            }
                          ]}>
                            <IconSymbol
                              name={item.icon as any}
                              size={20}
                              color={item.destructive 
                                ? Colors[colorScheme ?? 'light'].error 
                                : Colors[colorScheme ?? 'light'].primary}
                            />
                          </View>
                          
                          <View style={styles.settingInfo}>
                            <ThemedText style={[
                              styles.settingTitle,
                              item.destructive && { color: Colors[colorScheme ?? 'light'].error }
                            ]}>
                              {item.title}
                            </ThemedText>
                            <ThemedText style={styles.settingSubtitle}>
                              {item.subtitle}
                            </ThemedText>
                          </View>
                        </View>

                        <View style={styles.settingRight}>
                          {item.toggle && item.onChange && (
                            <Switch
                              value={item.value}
                              onValueChange={item.onChange}
                              trackColor={{
                                false: Colors[colorScheme ?? 'light'].tabIconDefault,
                                true: Colors[colorScheme ?? 'light'].primary
                              }}
                              thumbColor="white"
                            />
                          )}
                          
                          {item.showArrow && (
                            <IconSymbol
                              name="chevron.right"
                              size={16}
                              color={Colors[colorScheme ?? 'light'].tabIconDefault}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                      
                      {itemIndex < section.items.length - 1 && (
                        <View style={[styles.separator, { backgroundColor: Colors[colorScheme ?? 'light'].border }]} />
                      )}
                    </View>
                  ))}
                </View>
              </View>
            ))}

            {/* App Info */}
            <View style={styles.appInfo}>
              <ThemedText style={styles.appInfoTitle}>Travo - Tourist Safety App</ThemedText>
              <ThemedText style={styles.appInfoVersion}>Version 1.0.0 (Phase 4B)</ThemedText>
              <ThemedText style={styles.appInfoCopyright}>© 2025 Travo. All rights reserved.</ThemedText>
            </View>
          </ScrollView>

          {/* Language Selection Modal */}
          <Modal
            visible={showLanguageModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowLanguageModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.languageModal, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
                <View style={styles.languageHeader}>
                  <ThemedText type="subtitle">Select Language</ThemedText>
                  <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                    <IconSymbol name="xmark" size={20} color={Colors[colorScheme ?? 'light'].text} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.languageList} showsVerticalScrollIndicator={false}>
                  {supportedLanguages.map((language, index) => (
                    <View key={language.code}>
                      <TouchableOpacity
                        style={styles.languageItem}
                        onPress={() => handleLanguageChange(language.code)}
                      >
                        <View style={styles.languageLeft}>
                          <ThemedText style={styles.languageFlag}>{language.flag}</ThemedText>
                          <View style={styles.languageInfo}>
                            <ThemedText style={styles.languageName}>{language.name}</ThemedText>
                            <ThemedText style={styles.languageNative}>{language.nativeName}</ThemedText>
                          </View>
                        </View>
                        
                        {selectedLanguage === language.code && (
                          <IconSymbol
                            name="checkmark.circle.fill"
                            size={20}
                            color={Colors[colorScheme ?? 'light'].primary}
                          />
                        )}
                      </TouchableOpacity>
                      
                      {index < supportedLanguages.length - 1 && (
                        <View style={[styles.separator, { backgroundColor: Colors[colorScheme ?? 'light'].border }]} />
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionContent: {
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    opacity: 0.7,
  },
  settingRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: 1,
    marginLeft: 64,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 20,
  },
  appInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  appInfoVersion: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 2,
  },
  appInfoCopyright: {
    fontSize: 10,
    opacity: 0.5,
  },
  // Language Modal Styles
  languageModal: {
    height: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
  },
  languageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  languageList: {
    flex: 1,
    paddingVertical: 10,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  languageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  languageNative: {
    fontSize: 12,
    opacity: 0.7,
  },
});