import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store';
import { Bell, MessageCircle, Mail, Smartphone, Clock, Shield } from 'lucide-react';
import { SettingsPageTemplate, type SettingSection, type SettingValueType } from '@/components/templates';

interface NotificationSetting {
  key: string;
  label: string;
  value: boolean | string | number;
  description: string;
  type: 'switch' | 'text' | 'number';
}

const NotificationSettingsPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>([
    { key: 'enabled', label: '启用推送', value: true, description: '允许向移动设备发送推送通知', type: 'switch' },
    { key: 'sound', label: '通知声音', value: true, description: '通知到达时播放声音', type: 'switch' },
    { key: 'vibration', label: '振动提醒', value: true, description: '通知到达时触发振动', type: 'switch' },
    { key: 'badge', label: '角标显示', value: true, description: '在应用图标上显示未读数量', type: 'switch' },
    { key: 'delay', label: '延迟推送', value: 0, description: '通知延迟发送时间（分钟）', type: 'number' },
    { key: 'ttl', label: '存活时间', value: 86400, description: '通知在设备上的存活时间（秒）', type: 'number' },
  ]);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const stored = localStorage.getItem('notification_settings');
      if (stored) {
        setNotificationSettings(JSON.parse(stored));
      }
    } catch (err: unknown) {
      console.error('Error loading notification settings:', err);
      addNotification({ title: '加载失败', message: '加载通知设置失败', type: 'error' });
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
      const updatedSettings = notificationSettings.map((s) => ({
        ...s,
        value: data[s.key] !== undefined ? (data[s.key] as boolean | string | number) : s.value,
      }));
      setNotificationSettings(updatedSettings);
      localStorage.setItem('notification_settings', JSON.stringify(updatedSettings));
      addNotification({ title: '成功', message: '通知设置保存成功', type: 'success' });
    } catch (err: unknown) {
      console.error('Error saving notification settings:', err);
      addNotification({ title: '失败', message: '保存设置失败', type: 'error' });
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleReset = useCallback(() => {
    setNotificationSettings([
      { key: 'enabled', label: '启用推送', value: true, description: '允许向移动设备发送推送通知', type: 'switch' },
      { key: 'sound', label: '通知声音', value: true, description: '通知到达时播放声音', type: 'switch' },
      { key: 'vibration', label: '振动提醒', value: true, description: '通知到达时触发振动', type: 'switch' },
      { key: 'badge', label: '角标显示', value: true, description: '在应用图标上显示未读数量', type: 'switch' },
      { key: 'delay', label: '延迟推送', value: 0, description: '通知延迟发送时间（分钟）', type: 'number' },
      { key: 'ttl', label: '存活时间', value: 86400, description: '通知在设备上的存活时间（秒）', type: 'number' },
    ]);
    addNotification({ title: '已重置', message: '通知设置已恢复默认值', type: 'info' });
  }, [addNotification]);

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