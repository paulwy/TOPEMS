import { sendNotification, isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';
import { useNotificationStore, type Notification } from '../store/notificationStore';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface SystemNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  sound?: boolean;
  urgency?: 'normal' | 'low' | 'critical';
}

export const notificationService = {
  async checkPermission(): Promise<boolean> {
    try {
      return await isPermissionGranted();
    } catch (error) {
      console.error('Failed to check notification permission:', error);
      return false;
    }
  },

  async requestPermission(): Promise<boolean> {
    try {
      const permission = await requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  },

  async ensurePermission(): Promise<boolean> {
    const granted = await notificationService.checkPermission();
    if (granted) return true;
    return await notificationService.requestPermission();
  },

  async sendSystem(options: SystemNotificationOptions): Promise<void> {
    try {
      const granted = await notificationService.ensurePermission();
      if (!granted) return;

      await sendNotification({
        title: options.title,
        body: options.body,
      });
    } catch (error) {
      console.error('Failed to send system notification:', error);
    }
  },

  addLocal(notification: Omit<Notification, 'id' | 'read' | 'createdAt'>): void {
    const { addNotification } = useNotificationStore.getState();
    addNotification({
      id: generateId(),
      read: false,
      createdAt: new Date().toISOString(),
      ...notification,
    });
  },

  async notify(
    type: NotificationType,
    title: string,
    message: string,
    system: boolean = true
  ): Promise<void> {
    notificationService.addLocal({ title, message, type });

    if (system) {
      await notificationService.sendSystem({
        title,
        body: message,
      });
    }
  },

  async info(title: string, message: string, system: boolean = true): Promise<void> {
    await notificationService.notify('info', title, message, system);
  },

  async success(title: string, message: string, system: boolean = true): Promise<void> {
    await notificationService.notify('success', title, message, system);
  },

  async warning(title: string, message: string, system: boolean = true): Promise<void> {
    await notificationService.notify('warning', title, message, system);
  },

  async error(title: string, message: string, system: boolean = true): Promise<void> {
    await notificationService.notify('error', title, message, system);
  },
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export default notificationService;
