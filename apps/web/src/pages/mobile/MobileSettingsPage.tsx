import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store';
import { Smartphone, Shield, Bell, Battery, RefreshCw } from 'lucide-react';
import { SettingsPageTemplate, type SettingSection, type SettingValueType } from '@/components/templates';

interface MobileSetting {
  key: string;
  label: string;
  value: boolean | string;
  description: string;
  type: 'switch' | 'text' | 'number';
}

const MobileSettingsPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mobileSettings, setMobileSettings] = useState<MobileSetting[]>([
    { key: 'force_update', label: '强制更新', value: false, description: '用户打开应用时强制更新到最新版本', type: 'switch' },
    { key: 'auto_update', label: '自动更新', value: true, description: '在后台自动下载更新包', type: 'switch' },
    { key: 'version_min', label: '最低版本要求', value: '2.0.0', description: '低于此版本的用户将无法使用', type: 'text' },
    { key: 'app_key', label: '应用Key', value: '', description: '用于推送通知的应用标识', type: 'text' },
  ]);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const stored = localStorage.getItem('mobile_settings');
      if (stored) {
        setMobileSettings(JSON.parse(stored));
      }
    } catch (err: unknown) {
      console.error('Error loading mobile settings:', err);
      addNotification({ title: '加载失败', message: '加载设置失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (data: Record<string, SettingValueType>) => {
    try {
      setSaving(true);
      const updatedSettings = mobileSettings.map((s) => ({
        ...s,
        value: data[s.key] !== undefined ? (data[s.key] as boolean | string) : s.value,
      }));
      setMobileSettings(updatedSettings);
      localStorage.setItem('mobile_settings', JSON.stringify(updatedSettings));
      addNotification({ title: '成功', message: '移动应用设置保存成功', type: 'success' });
    } catch (err: unknown) {
      console.error('Error saving mobile settings:', err);
      addNotification({ title: '失败', message: '保存设置失败', type: 'error' });
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleReset = useCallback(() => {
    setMobileSettings([
      { key: 'force_update', label: '强制更新', value: false, description: '用户打开应用时强制更新到最新版本', type: 'switch' },
      { key: 'auto_update', label: '自动更新', value: true, description: '在后台自动下载更新包', type: 'switch' },
      { key: 'version_min', label: '最低版本要求', value: '2.0.0', description: '低于此版本的用户将无法使用', type: 'text' },
      { key: 'app_key', label: '应用Key', value: '', description: '用于推送通知的应用标识', type: 'text' },
    ]);
    addNotification({ title: '已重置', message: '设置已恢复默认值', type: 'info' });
  }, [addNotification]);

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