import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface NotificationSettings {
  email_enabled: boolean;
  system_enabled: boolean;
  workflow_enabled: boolean;
  document_enabled: boolean;
  security_enabled: boolean;
}

const defaultNotificationSettings: NotificationSettings = {
  email_enabled: true,
  system_enabled: true,
  workflow_enabled: true,
  document_enabled: true,
  security_enabled: true,
};

interface NotificationSettingsState {
  notificationSettings: NotificationSettings;
  setNotificationSettings: (settings: NotificationSettings) => void;
  updateNotificationSetting: (key: keyof NotificationSettings, value: boolean) => void;
}

export const useNotificationSettingsStore = create<NotificationSettingsState>()(
  persist(
    (set) => ({
      notificationSettings: defaultNotificationSettings,
      setNotificationSettings: (settings) => set({ notificationSettings: settings }),
      updateNotificationSetting: (key, value) =>
        set((state) => ({
          notificationSettings: {
            ...state.notificationSettings,
            [key]: value,
          },
        })),
    }),
    {
      name: 'topems-notification-settings-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export const useNotificationSettings = () =>
  useNotificationSettingsStore((state) => state.notificationSettings);
