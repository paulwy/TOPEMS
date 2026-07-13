import { emit } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

export async function showWindow() {
  await emit('tray-action', 'show');
}

export async function hideWindow() {
  await emit('tray-action', 'hide');
}

export async function quitApp() {
  await emit('tray-action', 'quit');
}

export interface TrayStatusOptions {
  status: string;
  badgeCount?: number;
}

export async function updateTrayStatus(options: TrayStatusOptions): Promise<void> {
  try {
    await invoke('update_tray_status', {
      status: options.status,
      badgeCount: options.badgeCount ?? null,
    });
  } catch (error) {
    console.error('Failed to update tray status:', error);
  }
}

export interface NotificationOptions {
  title: string;
  body: string;
}

export async function sendSystemNotification(options: NotificationOptions): Promise<void> {
  try {
    await invoke('send_system_notification', {
      title: options.title,
      body: options.body,
    });
  } catch (error) {
    console.error('Failed to send system notification:', error);
  }
}

export async function triggerTrayNotification(badgeCount?: number): Promise<void> {
  try {
    await invoke('trigger_tray_notification', {
      count: badgeCount ?? null,
    });
  } catch (error) {
    console.error('Failed to trigger tray notification:', error);
  }
}