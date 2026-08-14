import React, { useEffect, useCallback } from 'react';
import { useNotificationStore } from '../../store';
import { Bell, Clock } from 'lucide-react';
import {
  SettingsPageTemplate,
  type SettingSection,
  type SettingValueType,
} from '@/components/templates';
import i18n from '@/i18n';
import { logger } from '@/utils/logger';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
interface NotificationSetting {
  key: string;
  label: string;
  value: boolean | string | number;
  description: string;
  type: 'switch' | 'text' | 'number';
}
const defaultNotificationSettings: NotificationSetting[] = [
  {
    key: 'enabled',
    label: i18n.t('mobile.notification_settings_page.k0'),
    value: true,
    description: i18n.t('mobile.notification_settings_page.k1'),
    type: 'switch',
  },
  {
    key: 'sound',
    label: i18n.t('mobile.notification_settings_page.k2'),
    value: true,
    description: i18n.t('mobile.notification_settings_page.k3'),
    type: 'switch',
  },
  {
    key: 'vibration',
    label: i18n.t('mobile.notification_settings_page.k4'),
    value: true,
    description: i18n.t('mobile.notification_settings_page.k5'),
    type: 'switch',
  },
  {
    key: 'badge',
    label: i18n.t('mobile.notification_settings_page.k6'),
    value: true,
    description: i18n.t('mobile.notification_settings_page.k7'),
    type: 'switch',
  },
  {
    key: 'delay',
    label: i18n.t('mobile.notification_settings_page.k8'),
    value: 0,
    description: i18n.t('mobile.notification_settings_page.k9'),
    type: 'number',
  },
  {
    key: 'ttl',
    label: i18n.t('mobile.notification_settings_page.k10'),
    value: 86400,
    description: i18n.t('mobile.notification_settings_page.k11'),
    type: 'number',
  },
];
const NotificationSettingsPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();
  const settingsQuery = useQuery<NotificationSetting[]>({
    queryKey: QUERY_KEYS.AD_HOC.NOTIFICATION_SETTINGS_BASE,
    queryFn: async () => {
      const stored = localStorage.getItem('notification_settings');
      if (stored) {
        return JSON.parse(stored) as NotificationSetting[];
      }
      return defaultNotificationSettings;
    },
    staleTime: 5 * 60 * 1000,
  });
  const notificationSettings = settingsQuery.data ?? defaultNotificationSettings;
  const loading = settingsQuery.isLoading;
  useEffect(() => {
    if (settingsQuery.isError) {
      logger.error('Error loading notification settings:', settingsQuery.error);
      addNotification({ title: i18n.t('mobile.notification_settings_page.k13'), message: i18n.t('mobile.notification_settings_page.k12'), type: 'error' });
    }
  }, [settingsQuery.isError, settingsQuery.error, addNotification]);
  const saveMutation = useMutation({
    mutationFn: async (settings: NotificationSetting[]) => {
      localStorage.setItem('notification_settings', JSON.stringify(settings));
      return settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.NOTIFICATION_SETTINGS_BASE ,
  exact: false,
  refetchType: 'active',
});
      addNotification({ title: i18n.t('mobile.notification_settings_page.k15'), message: i18n.t('mobile.notification_settings_page.k14'), type: 'success' });
    },
    onError: (err: unknown) => {
      logger.error('Error saving notification settings:', err);
      addNotification({ title: i18n.t('mobile.notification_settings_page.k17'), message: i18n.t('mobile.notification_settings_page.k16'), type: 'error' });
    },
  });
  const saving = saveMutation.isPending;
  const handleSave = (data: Record<string, SettingValueType>) => {
    const updatedSettings = notificationSettings.map((s) => ({
      ...s,
      value: data[s.key] !== undefined ? (data[s.key] as boolean | string | number) : s.value,
    }));
    saveMutation.mutate(updatedSettings);
  };
  const resetMutation = useMutation({
    mutationFn: async () => {
      localStorage.setItem('notification_settings', JSON.stringify(defaultNotificationSettings));
      return defaultNotificationSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.NOTIFICATION_SETTINGS_BASE ,
  exact: false,
  refetchType: 'active',
});
      addNotification({ title: i18n.t('mobile.notification_settings_page.k19'), message: i18n.t('mobile.notification_settings_page.k18'), type: 'info' });
    },
    onError: (err: unknown) => {
      logger.error('Error resetting notification settings:', err);
      addNotification({ title: i18n.t('mobile.notification_settings_page.k21'), message: i18n.t('mobile.notification_settings_page.k20'), type: 'error' });
    },
  });
  const handleReset = useCallback(() => {
    resetMutation.mutate();
  }, [resetMutation]);
  const sections: SettingSection[] = [
    {
      id: 'basic',
      title: i18n.t('mobile.notification_settings_page.k22'),
      icon: <Bell style={{ width: 20, height: 20 }} />,
      color: 'primary',
      fields: [
        {
          id: 'enabled',
          label: i18n.t('mobile.notification_settings_page.k23'),
          type: 'switch',
          value: notificationSettings.find((s) => s.key === 'enabled')?.value as boolean,
          description: i18n.t('mobile.notification_settings_page.k24'),
        },
        {
          id: 'sound',
          label: i18n.t('mobile.notification_settings_page.k25'),
          type: 'switch',
          value: notificationSettings.find((s) => s.key === 'sound')?.value as boolean,
          description: i18n.t('mobile.notification_settings_page.k26'),
        },
        {
          id: 'vibration',
          label: i18n.t('mobile.notification_settings_page.k27'),
          type: 'switch',
          value: notificationSettings.find((s) => s.key === 'vibration')?.value as boolean,
          description: i18n.t('mobile.notification_settings_page.k28'),
        },
        {
          id: 'badge',
          label: i18n.t('mobile.notification_settings_page.k29'),
          type: 'switch',
          value: notificationSettings.find((s) => s.key === 'badge')?.value as boolean,
          description: i18n.t('mobile.notification_settings_page.k30'),
        },
      ],
    },
    {
      id: 'timing',
      title: i18n.t('mobile.notification_settings_page.k31'),
      icon: <Clock style={{ width: 20, height: 20 }} />,
      color: 'warning',
      fields: [
        {
          id: 'delay',
          label: i18n.t('mobile.notification_settings_page.k32'),
          type: 'text',
          value: String(notificationSettings.find((s) => s.key === 'delay')?.value),
          description: i18n.t('mobile.notification_settings_page.k33'),
        },
        {
          id: 'ttl',
          label: i18n.t('mobile.notification_settings_page.k34'),
          type: 'text',
          value: String(notificationSettings.find((s) => s.key === 'ttl')?.value),
          description: i18n.t('mobile.notification_settings_page.k35'),
        },
      ],
    },
  ];
  return (
    <SettingsPageTemplate
      title={i18n.t('mobile.notification_settings_page.k36')}
      subtitle={i18n.t('mobile.notification_settings_page.k37')}
      sections={sections}
      loading={loading}
      saving={saving}
      onSave={handleSave}
      onReset={handleReset}
      saveButtonText={i18n.t('mobile.notification_settings_page.k38')}
      resetButtonText={i18n.t('mobile.notification_settings_page.k39')}
    />
  );
};
export default NotificationSettingsPage;