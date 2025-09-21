import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface NotificationData {
  type: 'emergency' | 'safety_alert' | 'geofence' | 'system' | 'recommendation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  body: string;
  data?: {
    emergencyId?: string;
    geofenceId?: string;
    locationId?: string;
    actionUrl?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
}

export interface NotificationPreferences {
  emergencyAlerts: boolean;
  safetyAlerts: boolean;
  geofenceAlerts: boolean;
  systemNotifications: boolean;
  recommendations: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string;   // HH:mm format
  };
}

class NotificationService {
  private pushToken: string | null = null;
  private baseUrl = 'http://localhost:3001/api';
  private authToken: string | null = null;
  private preferences: NotificationPreferences = {
    emergencyAlerts: true,
    safetyAlerts: true,
    geofenceAlerts: true,
    systemNotifications: true,
    recommendations: true,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '07:00',
    },
  };

  constructor() {
    this.setupNotificationHandlers();
  }

  // Set authentication token for API calls
  setAuthToken(token: string) {
    this.authToken = token;
  }

  // Update notification preferences
  setPreferences(newPreferences: Partial<NotificationPreferences>) {
    this.preferences = { ...this.preferences, ...newPreferences };
  }

  // Initialize notification system
  async initialize(): Promise<boolean> {
    try {
      // Configure notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          const { type, severity } = notification.request.content.data as any;
          
          // Check if notifications should be shown based on preferences
          if (!this.shouldShowNotification(type)) {
            return { 
              shouldShowAlert: false, 
              shouldPlaySound: false, 
              shouldSetBadge: false,
              shouldShowBanner: false,
              shouldShowList: false,
            };
          }

          // Check quiet hours
          if (this.isQuietHours()) {
            return {
              shouldShowAlert: severity === 'critical',
              shouldPlaySound: severity === 'critical' && this.preferences.soundEnabled,
              shouldSetBadge: true,
              shouldShowBanner: severity === 'critical',
              shouldShowList: true,
            };
          }

          return {
            shouldShowAlert: true,
            shouldPlaySound: this.preferences.soundEnabled,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          };
        },
      });

      // Request permissions
      const granted = await this.requestPermissions();
      if (!granted) {
        console.warn('Notification permissions not granted');
        return false;
      }

      // Get push token
      await this.registerForPushNotifications();
      
      console.log('✅ Notification service initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing notification service:', error);
      return false;
    }
  }

  // Request notification permissions
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permission not granted');
        return false;
      }

      // For Android, create notification channels
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Set up Android notification channels
  private async setupAndroidChannels() {
    await Notifications.setNotificationChannelAsync('emergency', {
      name: 'Emergency Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'emergency_alert.wav',
    });

    await Notifications.setNotificationChannelAsync('safety', {
      name: 'Safety Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF9800',
    });

    await Notifications.setNotificationChannelAsync('geofence', {
      name: 'Location Alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 150, 150, 150],
      lightColor: '#2196F3',
    });

    await Notifications.setNotificationChannelAsync('system', {
      name: 'System Notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // Register for push notifications and get token
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const token = await Notifications.getExpoPushTokenAsync();
      this.pushToken = token.data;

      // Register token with backend
      if (this.authToken) {
        await this.registerTokenWithBackend(this.pushToken);
      }

      console.log('✅ Push token registered:', this.pushToken);
      return this.pushToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  // Register push token with backend
  private async registerTokenWithBackend(token: string) {
    try {
      const response = await fetch(`${this.baseUrl}/notifications/register-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          pushToken: token,
          platform: Platform.OS,
          preferences: this.preferences,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register push token with backend');
      }

      console.log('✅ Push token registered with backend');
    } catch (error) {
      console.error('Error registering token with backend:', error);
    }
  }

  // Send local notification
  async sendLocalNotification(notificationData: NotificationData): Promise<string | null> {
    try {
      if (!this.shouldShowNotification(notificationData.type)) {
        return null;
      }

      const channelId = this.getChannelForType(notificationData.type);
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data,
          sound: this.preferences.soundEnabled ? 'default' : false,
          priority: this.getPriorityForSeverity(notificationData.severity),
        },
        trigger: null, // Send immediately
        ...(Platform.OS === 'android' && { 
          identifier: channelId,
        }),
      });

      console.log('✅ Local notification sent:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error sending local notification:', error);
      return null;
    }
  }

  // Send push notification through backend
  async sendPushNotification(notificationData: NotificationData, targetUsers?: string[]): Promise<boolean> {
    try {
      if (!this.authToken) {
        console.warn('No auth token available for push notification');
        return false;
      }

      const response = await fetch(`${this.baseUrl}/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          notification: notificationData,
          targetUsers,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send push notification');
      }

      const result = await response.json();
      console.log('✅ Push notification sent:', result);
      return result.success;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  // Send emergency alert
  async sendEmergencyAlert(emergencyId: string, location?: { latitude: number; longitude: number }): Promise<boolean> {
    const notification: NotificationData = {
      type: 'emergency',
      severity: 'critical',
      title: '🚨 EMERGENCY ALERT',
      body: 'Emergency assistance has been activated. Authorities have been notified.',
      data: {
        emergencyId,
        coordinates: location,
        actionUrl: `/emergency/${emergencyId}`,
      },
    };

    // Send both local and push notifications
    await this.sendLocalNotification(notification);
    return await this.sendPushNotification(notification);
  }

  // Send safety alert
  async sendSafetyAlert(title: string, message: string, severity: 'low' | 'medium' | 'high' = 'medium'): Promise<boolean> {
    const notification: NotificationData = {
      type: 'safety_alert',
      severity,
      title: `⚠️ ${title}`,
      body: message,
    };

    await this.sendLocalNotification(notification);
    return await this.sendPushNotification(notification);
  }

  // Send geofence notification
  async sendGeofenceAlert(
    type: 'entry' | 'exit',
    geofenceName: string,
    safetyLevel: string,
    coordinates: { latitude: number; longitude: number }
  ): Promise<boolean> {
    const isEntry = type === 'entry';
    const notification: NotificationData = {
      type: 'geofence',
      severity: safetyLevel === 'danger' ? 'high' : safetyLevel === 'warning' ? 'medium' : 'low',
      title: `📍 ${isEntry ? 'Entered' : 'Exited'} ${geofenceName}`,
      body: `You have ${isEntry ? 'entered' : 'left'} a ${safetyLevel} safety zone: ${geofenceName}`,
      data: {
        coordinates,
        actionUrl: '/location/geofences',
      },
    };

    await this.sendLocalNotification(notification);
    return await this.sendPushNotification(notification);
  }

  // Send safety recommendation
  async sendRecommendation(title: string, message: string): Promise<boolean> {
    const notification: NotificationData = {
      type: 'recommendation',
      severity: 'low',
      title: `💡 ${title}`,
      body: message,
    };

    await this.sendLocalNotification(notification);
    return await this.sendPushNotification(notification);
  }

  // Setup notification event handlers
  private setupNotificationHandlers() {
    // Handle notification received while app is foregrounded
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('📱 Notification received:', notification);
    });

    // Handle notification response (user tapped notification)
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('📱 Notification response:', response);
      
      const { data } = response.notification.request.content;
      if (data && typeof data === 'object' && 'actionUrl' in data) {
        // Handle navigation based on actionUrl
        this.handleNotificationAction(data.actionUrl as string, data);
      }
    });
  }

  // Handle notification tap actions
  private handleNotificationAction(actionUrl: string, data: any) {
    console.log('🔄 Handling notification action:', actionUrl, data);
    // This would integrate with your navigation system
    // For now, just log the action
  }

  // Check if notification should be shown based on preferences
  private shouldShowNotification(type: NotificationData['type']): boolean {
    switch (type) {
      case 'emergency':
        return this.preferences.emergencyAlerts;
      case 'safety_alert':
        return this.preferences.safetyAlerts;
      case 'geofence':
        return this.preferences.geofenceAlerts;
      case 'system':
        return this.preferences.systemNotifications;
      case 'recommendation':
        return this.preferences.recommendations;
      default:
        return true;
    }
  }

  // Check if current time is in quiet hours
  private isQuietHours(): boolean {
    if (!this.preferences.quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { startTime, endTime } = this.preferences.quietHours;
    
    if (startTime < endTime) {
      // Same day quiet hours (e.g., 14:00 - 18:00)
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight quiet hours (e.g., 22:00 - 07:00)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  // Get notification channel for notification type
  private getChannelForType(type: NotificationData['type']): string {
    switch (type) {
      case 'emergency':
        return 'emergency';
      case 'safety_alert':
        return 'safety';
      case 'geofence':
        return 'geofence';
      default:
        return 'system';
    }
  }

  // Get priority based on severity
  private getPriorityForSeverity(severity: NotificationData['severity']): Notifications.AndroidNotificationPriority {
    switch (severity) {
      case 'critical':
        return Notifications.AndroidNotificationPriority.MAX;
      case 'high':
        return Notifications.AndroidNotificationPriority.HIGH;
      case 'medium':
        return Notifications.AndroidNotificationPriority.DEFAULT;
      case 'low':
        return Notifications.AndroidNotificationPriority.MIN;
      default:
        return Notifications.AndroidNotificationPriority.DEFAULT;
    }
  }

  // Get current push token
  getPushToken(): string | null {
    return this.pushToken;
  }

  // Get notification history from backend
  async getNotificationHistory(limit = 50): Promise<any[]> {
    try {
      if (!this.authToken) {
        return [];
      }

      const response = await fetch(`${this.baseUrl}/notifications/history?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.notifications || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching notification history:', error);
      return [];
    }
  }

  // Clear all notifications
  async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      console.log('✅ All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }
}

export default new NotificationService();