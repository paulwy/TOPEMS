import { useState, useEffect, useCallback } from 'react';

export interface NotificationSettingsData {
  enableDesktop: boolean;
  enableSound: boolean;
  enableMobilePush: boolean;
  types: {
    system: boolean;
    workflow: boolean;
    reminder: boolean;
    alert: boolean;
    message: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

const DEFAULT_SETTINGS: NotificationSettingsData = {
  enableDesktop: true,
  enableSound: true,
  enableMobilePush: true,
  types: {
    system: true,
    workflow: true,
    reminder: true,
    alert: true,
    message: true,
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
};

const STORAGE_KEY = 'notificationSettings';

// 保持向后兼容的旧 key
const LEGACY_DESKTOP_KEY = 'notificationDesktop';
const LEGACY_SOUND_KEY = 'notificationSound';

// 迁移旧设置到新格式
const migrateLegacySettings = (): NotificationSettingsData => {
  const desktopEnabled = localStorage.getItem(LEGACY_DESKTOP_KEY);
  const soundEnabled = localStorage.getItem(LEGACY_SOUND_KEY);

  const migrated: NotificationSettingsData = { ...DEFAULT_SETTINGS };

  if (desktopEnabled !== null) {
    migrated.enableDesktop = desktopEnabled === 'true';
  }
  if (soundEnabled !== null) {
    migrated.enableSound = soundEnabled === 'true';
  }

  return migrated;
};

export const useNotificationSettings = () => {
  const [settings, setSettingsState] = useState<NotificationSettingsData>(() => {
    // 优先使用新的设置格式
    const savedSettings = localStorage.getItem(STORAGE_KEY);
    if (savedSettings) {
      try {
        return JSON.parse(savedSettings);
      } catch {
        // 如果解析失败，尝试迁移旧格式
        return migrateLegacySettings();
      }
    }
    // 迁移旧格式
    return migrateLegacySettings();
  });

  const setSettings = useCallback(
    (newSettings: NotificationSettingsData | ((prev: NotificationSettingsData) => NotificationSettingsData)) => {
      setSettingsState((prev) => {
        const updated = typeof newSettings === 'function' ? newSettings(prev) : newSettings;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    []
  );

  // 检查是否在免打扰时段
  const isInQuietHours = useCallback((): boolean => {
    if (!settings.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMinute] = settings.quietHours.start.split(':').map(Number);
    const [endHour, endMinute] = settings.quietHours.end.split(':').map(Number);

    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      // 跨天免打扰
      return currentTime >= startTime || currentTime < endTime;
    }
  }, [settings.quietHours]);

  // 检查通知类型是否启用
  const isNotificationTypeEnabled = useCallback(
    (type: string): boolean => {
      return (settings.types as Record<string, boolean>)[type] ?? true;
    },
    [settings.types]
  );

  // 检查通知是否应该显示/播放声音
  const shouldShowNotification = useCallback(
    (type?: string): boolean => {
      if (isInQuietHours()) return false;
      if (type && !isNotificationTypeEnabled(type)) return false;
      return true;
    },
    [isInQuietHours, isNotificationTypeEnabled]
  );

  const shouldPlaySound = useCallback((): boolean => {
    if (!settings.enableSound) return false;
    if (isInQuietHours()) return false;
    return true;
  }, [settings.enableSound, isInQuietHours]);

  const shouldShowDesktopNotification = useCallback((): boolean => {
    if (!settings.enableDesktop) return false;
    if (isInQuietHours()) return false;
    return true;
  }, [settings.enableDesktop, isInQuietHours]);

  // 切换设置
  const toggleSetting = useCallback(
    (key: keyof Omit<NotificationSettingsData, 'types' | 'quietHours'>) => {
      setSettings((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
    },
    [setSettings]
  );

  const toggleNotificationType = useCallback(
    (type: keyof NotificationSettingsData['types']) => {
      setSettings((prev) => ({
        ...prev,
        types: {
          ...prev.types,
          [type]: !prev.types[type],
        },
      }));
    },
    [setSettings]
  );

  const toggleQuietHours = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        enabled: !prev.quietHours.enabled,
      },
    }));
  }, [setSettings]);

  const updateQuietHours = useCallback(
    (field: 'start' | 'end', value: string) => {
      setSettings((prev) => ({
        ...prev,
        quietHours: {
          ...prev.quietHours,
          [field]: value,
        },
      }));
    },
    [setSettings]
  );

  return {
    settings,
    setSettings,
    isInQuietHours,
    isNotificationTypeEnabled,
    shouldShowNotification,
    shouldPlaySound,
    shouldShowDesktopNotification,
    toggleSetting,
    toggleNotificationType,
    toggleQuietHours,
    updateQuietHours,
  };
};

export default useNotificationSettings;
