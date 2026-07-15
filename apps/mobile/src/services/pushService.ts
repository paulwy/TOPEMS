import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { pushApi } from '@/api/push';

export interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface NotificationHandler {
  (notification: PushNotificationData): void;
}

export class PushService {
  private static notificationHandler: NotificationHandler | null = null;

  static async initialize(): Promise<void> {
    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    this.setupNotificationListeners();
  }

  static setupNotificationListeners(): void {
    Notifications.addNotificationReceivedListener((notification) => {
      const data: PushNotificationData = {
        title: notification.request.content.title || '',
        body: notification.request.content.body || '',
        data: notification.request.content.data,
      };

      if (this.notificationHandler) {
        this.notificationHandler(data);
      }
    });

    Notifications.addNotificationResponseReceivedListener((response) => {
      const data: PushNotificationData = {
        title: response.notification.request.content.title || '',
        body: response.notification.request.content.body || '',
        data: response.notification.request.content.data,
      };

      if (this.notificationHandler) {
        this.notificationHandler(data);
      }
    });
  }

  static async getPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn('Push notifications not available on simulator');
        return null;
      }

      const permission = await Notifications.getPermissionsAsync();
      if (!permission.granted) {
        const result = await Notifications.requestPermissionsAsync();
        if (!result.granted) {
          console.warn('Push notification permission denied');
          return null;
        }
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id',
      });

      return token.data;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  static async registerDevice(): Promise<boolean> {
    const token = await this.getPushToken();
    if (!token) {
      return false;
    }

    try {
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      const deviceModel = Device.modelName || '';
      const osVersion = Device.osVersion || '';

      await pushApi.registerDevice({
        device_token: token,
        platform,
        device_model: deviceModel,
        device_os: osVersion,
      });

      return true;
    } catch (error) {
      console.error('Failed to register device:', error);
      return false;
    }
  }

  static setNotificationHandler(handler: NotificationHandler): void {
    this.notificationHandler = handler;
  }

  static clearNotificationHandler(): void {
    this.notificationHandler = null;
  }

  static async sendLocalNotification(data: PushNotificationData): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: data.data || {},
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Failed to send local notification:', error);
    }
  }

  static async scheduleNotification(
    data: PushNotificationData,
    trigger: Notifications.NotificationTriggerInput,
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: data.data || {},
        },
        trigger,
      });
    } catch (error) {
      console.error('Failed to schedule notification:', error);
    }
  }

  static async cancelAllScheduledNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
    }
  }

  static async getPendingNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to get pending notifications:', error);
      return [];
    }
  }
}
