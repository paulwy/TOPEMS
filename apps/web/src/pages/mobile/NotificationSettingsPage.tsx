import React, { useEffect, useCallback } from 'react';
import { useNotificationStore } from '../../store';
import { Bell, Clock } from 'lucide-react';
import {
  SettingsPageTemplate,
  type SettingSection,
  type SettingValueType,
} from '@/components/templates';
import { logger } from '@/utils/logger';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
    label: '启用推送',
    value: true,
    description: '允许向移动设备发送推送通知',
    type: 'switch',
  },
  {
    key: 'sound',
    label: '通知声音',
    value: true,
    description: '通知到达时播放声音',
    type: 'switch',
  },
  {
    key: 'vibration',
    label: '振动提醒',
    value: true,
    description: '通知到达时触发振动',
    type: 'switch',
  },
  {
    key: 'badge',
    label: '角标显示',
    value: true,
    description: '在应用图标上显示未读数量',
    type: 'switch',
  },
  {
    key: 'delay',
    label: '延迟推送',
    value: 0,
    description: '通知延迟发送时间（分钟）',
    type: 'number',
  },
  {
    key: 'ttl',
    label: '存活时间',
    value: 86400,
    description: '通知在设备上的存活时间（秒）',
    type: 'number',
  },
];

const NotificationSettingsPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const settingsQuery = useQuery<NotificationSetting[]>({
    queryKey: ['notification-settings'],
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
      addNotification({ title: '加载失败', message: '加载通知设置失败', type: 'error' });
    }
  }, [settingsQuery.isError, settingsQuery.error, addNotification]);

  const saveMutation = useMutation({
    mutationFn: async (settings: NotificationSetting[]) => {
      localStorage.setItem('notification_settings', JSON.stringify(settings));
      return settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      addNotification({ title: '成功', message: '通知设置保存成功', type: 'success' });
    },
    onError: (err: unknown) => {
      logger.error('Error saving notification settings:', err);
      addNotification({ title: '失败', message: '保存设置失败', type: 'error' });
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
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      addNotification({ title: '已重置', message: '通知设置已恢复默认值', type: 'info' });
    },
    onError: (err: unknown) => {
      logger.error('Error resetting notification settings:', err);
      addNotification({ title: '失败', message: '重置设置失败', type: 'error' });
    },
  });

  const handleReset = useCallback(() => {
    resetMutation.mutate();
  }, [resetMutation]);

  const sections: SettingSection[] = [
    {
      id: 'basic',
      title: '基础设置',
      icon: <Bell style={{ width: 20, height: 20 }} />,
      color: 'primary',
      fields: [
        {
          id: 'enabled',
          label: '启用推送',
          type: 'switch',
          value: notificationSettings.find((s) => s.key === 'enabled')?.value as boolean,
          description: '允许向移动设备发送推送通知',
        },
        {
          id: 'sound',
          label: '通知声音',
          type: 'switch',
          value: notificationSettings.find((s) => s.key === 'sound')?.value as boolean,
          description: '通知到达时播放声音',
        },
        {
          id: 'vibration',
          label: '振动提醒',
          type: 'switch',
          value: notificationSettings.find((s) => s.key === 'vibration')?.value as boolean,
          description: '通知到达时触发振动',
        },
        {
          id: 'badge',
          label: '角标显示',
          type: 'switch',
          value: notificationSettings.find((s) => s.key === 'badge')?.value as boolean,
          description: '在应用图标上显示未读数量',
        },
      ],
    },
    {
      id: 'timing',
      title: '定时设置',
      icon: <Clock style={{ width: 20, height: 20 }} />,
      color: 'warning',
      fields: [
        {
          id: 'delay',
          label: '延迟推送',
          type: 'text',
          value: String(notificationSettings.find((s) => s.key === 'delay')?.value),
          description: '通知延迟发送时间（分钟）',
        },
        {
          id: 'ttl',
          label: '存活时间',
          type: 'text',
          value: String(notificationSettings.find((s) => s.key === 'ttl')?.value),
          description: '通知在设备上的存活时间（秒）',
        },
      ],
    },
  ];

  return (
    <SettingsPageTemplate
      title='通知设置'
      subtitle='配置移动应用的推送通知参数'
      sections={sections}
      loading={loading}
      saving={saving}
      onSave={handleSave}
      onReset={handleReset}
      saveButtonText='保存设置'
      resetButtonText='重置默认'
    />
  );
};

export default NotificationSettingsPage;
