import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiLogger } from '@/utils/logger';
import { workflowApi } from '@/api/workflow';
import { useAppStore } from '../../store';
import { Bell, Clock, Shield, Database } from 'lucide-react';
import {
  SettingsPageTemplate,
  type SettingTab,
  type SettingSection,
  type SettingField,
  type SettingValueType,
} from '@/components/templates';
import { PageContainer } from '@/components/common';

interface WorkflowSetting {
  id: string;
  key: string;
  value: string;
  description: string;
  category: string;
}

const categories = [
  { id: 'notification', label: '通知设置', icon: <Bell style={{ width: 20, height: 20 }} /> },
  { id: 'timeout', label: '超时设置', icon: <Clock style={{ width: 20, height: 20 }} /> },
  { id: 'security', label: '安全设置', icon: <Shield style={{ width: 20, height: 20 }} /> },
  { id: 'storage', label: '存储设置', icon: <Database style={{ width: 20, height: 20 }} /> },
];

const FlowSettingsPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [settings, setSettings] = useState<WorkflowSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await workflowApi.listSettings();
      if (res.success && res.data) {
        setSettings(res.data.items || []);
      }
    } catch (err: unknown) {
      apiLogger.error('Error loading settings:', err);
      const msg = err instanceof Error ? err.message : '加载设置失败';
      setError(msg);
      addNotification({ title: '加载失败', message: msg, type: 'error' });
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
      setError('');
      setSuccess('');
      for (const setting of settings) {
        await workflowApi.updateSetting(setting.id, { value: String(data[setting.id]) });
      }
      setSuccess('设置保存成功');
      addNotification({ title: '成功', message: '设置保存成功', type: 'success' });
    } catch (err: unknown) {
      apiLogger.error('Error saving settings:', err);
      const msg = err instanceof Error ? err.message : '保存设置失败';
      setError(msg);
      addNotification({ title: '失败', message: msg, type: 'error' });
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleReset = useCallback(() => {
    loadSettings();
  }, [loadSettings]);

  const tabs: SettingTab[] = useMemo(() => {
    return categories.map((category) => {
      const categorySettings = settings.filter((s) => s.category === category.id);
      const fields: SettingField[] = categorySettings.map((setting) => ({
        id: setting.id,
        label: setting.description,
        type: 'text',
        value: setting.value,
        defaultValue: setting.value,
        placeholder: '请输入设置值',
      }));

      const sections: SettingSection[] = [
        {
          id: category.id,
          title: category.label,
          icon: category.icon,
          fields,
        },
      ];

      return {
        id: category.id,
        label: category.label,
        icon: category.icon,
        sections,
      };
    });
  }, [settings]);

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title='流程设置'
        subtitle='管理工作流系统的全局设置'
        tabs={tabs}
        loading={loading}
        saving={saving}
        error={error}
        success={success}
        onSave={handleSave}
        onReset={handleReset}
        saveButtonText='保存设置'
        resetButtonText='重置'
      />
    </PageContainer>
  );
};

export default FlowSettingsPage;
