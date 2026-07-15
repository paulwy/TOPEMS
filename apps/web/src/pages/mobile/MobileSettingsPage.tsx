import React, { useEffect } from 'react';
import { useNotificationStore } from '../../store';
import { Smartphone, Shield, Bell, Battery, RefreshCw } from 'lucide-react';
import {
  SettingsPageTemplate,
  type SettingSection,
  type SettingValueType,
} from '@/components/templates';
import { logger } from '@/utils/logger';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface MobileSetting {
  key: string;
  label: string;
  value: boolean | string;
  description: string;
  type: 'switch' | 'text' | 'number';
}

const defaultMobileSettings: MobileSetting[] = [
  {
    key: 'force_update',
    label: '强制更新',
    value: false,
    description: '用户打开应用时强制更新到最新版本',
    type: 'switch',
  },
  {
    key: 'auto_update',
    label: '自动更新',
    value: true,
    description: '在后台自动下载更新包',
    type: 'switch',
  },
  {
    key: 'version_min',
    label: '最低版本要求',
    value: '2.0.0',
    description: '低于此版本的用户将无法使用',
    type: 'text',
  },
  {
    key: 'app_key',
    label: '应用Key',
    value: '',
    description: '用于推送通知的应用标识',
    type: 'text',
  },
];

const MobileSettingsPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const settingsQuery = useQuery<MobileSetting[]>({
    queryKey: ['mobile-settings'],
    queryFn: async () => {
      const stored = localStorage.getItem('mobile_settings');
      if (stored) {
        return JSON.parse(stored) as MobileSetting[];
      }
      return defaultMobileSettings;
    },
    staleTime: 5 * 60 * 1000,
  });
  const mobileSettings = settingsQuery.data ?? defaultMobileSettings;
  const loading = settingsQuery.isLoading;

  useEffect(() => {
    if (settingsQuery.isError) {
      logger.error('Error loading mobile settings:', settingsQuery.error);
      addNotification({ title: '加载失败', message: '加载设置失败', type: 'error' });
    }
  }, [settingsQuery.isError, settingsQuery.error, addNotification]);

  const saveMutation = useMutation({
    mutationFn: async (settings: MobileSetting[]) => {
      localStorage.setItem('mobile_settings', JSON.stringify(settings));
      return settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-settings'] });
      addNotification({ title: '成功', message: '移动应用设置保存成功', type: 'success' });
    },
    onError: (err: unknown) => {
      logger.error('Error saving mobile settings:', err);
      addNotification({ title: '失败', message: '保存设置失败', type: 'error' });
    },
  });
  const saving = saveMutation.isPending;

  const handleSave = (data: Record<string, SettingValueType>) => {
    const updatedSettings = mobileSettings.map((s) => ({
      ...s,
      value: data[s.key] !== undefined ? (data[s.key] as boolean | string) : s.value,
    }));
    saveMutation.mutate(updatedSettings);
  };

  const resetMutation = useMutation({
    mutationFn: async () => {
      localStorage.setItem('mobile_settings', JSON.stringify(defaultMobileSettings));
      return defaultMobileSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-settings'] });
      addNotification({ title: '已重置', message: '设置已恢复默认值', type: 'info' });
    },
    onError: (err: unknown) => {
      logger.error('Error resetting mobile settings:', err);
      addNotification({ title: '失败', message: '重置设置失败', type: 'error' });
    },
  });

  const handleReset = () => {
    resetMutation.mutate();
  };

  const sections: SettingSection[] = [
    {
      id: 'app',
      title: '应用设置',
      icon: <Smartphone style={{ width: 20, height: 20 }} />,
      color: 'primary',
      fields: [
        {
          id: 'force_update',
          label: '强制更新',
          type: 'switch',
          value: mobileSettings.find((s) => s.key === 'force_update')?.value as boolean,
          description: '用户打开应用时强制更新到最新版本',
        },
        {
          id: 'auto_update',
          label: '自动更新',
          type: 'switch',
          value: mobileSettings.find((s) => s.key === 'auto_update')?.value as boolean,
          description: '在后台自动下载更新包',
        },
        {
          id: 'version_min',
          label: '最低版本要求',
          type: 'text',
          value: mobileSettings.find((s) => s.key === 'version_min')?.value as string,
          description: '低于此版本的用户将无法使用',
        },
      ],
    },
    {
      id: 'security',
      title: '安全设置',
      icon: <Shield style={{ width: 20, height: 20 }} />,
      color: 'success',
      fields: [
        {
          id: 'app_key',
          label: '应用Key',
          type: 'text',
          value: mobileSettings.find((s) => s.key === 'app_key')?.value as string,
          description: '用于推送通知的应用标识',
        },
      ],
    },
    {
      id: 'other',
      title: '其他设置',
      icon: <RefreshCw style={{ width: 20, height: 20 }} />,
      color: 'info',
      fields: [],
    },
  ];

  return (
    <SettingsPageTemplate
      title='移动应用设置'
      subtitle='配置移动客户端的各项参数'
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

export default MobileSettingsPage;
