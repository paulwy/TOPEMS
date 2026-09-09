/**
 * 系统设置页面
 * 管理系统基础配置、邮件设置、短信设置、日志设置
 * 缺口#22：从静态硬编码改为 apiClient 持久化（/api/erp/system/settings）
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { apiLogger } from '@/utils/logger';
import { Box, Tabs, Tab, Paper, CircularProgress, Alert } from '@mui/material';
import { Settings, Mail, MessageSquare, FileText } from 'lucide-react';
import FormPageTemplate from '@/components/templates/FormPageTemplate';
import type {
  FormSection,
  FormField,
  FieldDependency,
} from '@/components/templates/FormPageTemplate';
import i18n from '@/i18n';
import { PageContainer } from '@/components/common';
import { ADMIN_PATHS } from '@/modules/admin/config';
import { systemSettingApi } from '@/api/admin/systemSetting';

// ============ 默认值（API 无数据时的兜底） ============
const defaultSettings = {
  basic: {
    systemName: i18n.t('pages.system_settings_page.topems_0'),
    systemLogo: '',
    companyName: i18n.t('admin.system_settings_page.k0'),
    contactEmail: 'admin@example.com',
    contactPhone: '400-123-4567',
    address: i18n.t('admin.system_settings_page.123_1'),
  },
  mail: {
    enabled: true,
    smtpHost: 'smtp.example.com',
    smtpPort: 465,
    smtpUsername: 'noreply@example.com',
    smtpPassword: '',
    useTLS: true,
    fromEmail: 'noreply@example.com',
    fromName: i18n.t('pages.system_settings_page.topems_1'),
  },
  sms: {
    enabled: false,
    provider: 'aliyun',
    accessKeyId: '',
    accessKeySecret: '',
    signName: 'TOPEMS',
  },
  log: {
    level: 'info',
    retentionDays: 30,
    enableAccessLog: true,
    enableOperationLog: true,
    enableSecurityLog: true,
  },
};

type SettingsType = typeof defaultSettings;
type TabKey = keyof SettingsType;

interface TabConfig {
  id: string;
  label: string;
  icon: React.ElementType;
}

const tabsConfig: TabConfig[] = [
  { id: 'basic', label: i18n.t('admin.system_settings_page.k2'), icon: Settings },
  { id: 'mail', label: i18n.t('admin.system_settings_page.k3'), icon: Mail },
  { id: 'sms', label: i18n.t('admin.system_settings_page.k4'), icon: MessageSquare },
  { id: 'log', label: i18n.t('admin.system_settings_page.k5'), icon: FileText },
];

// ============ 表单字段定义 ============
const getBasicFields = (): FormField[] => [
  { name: 'systemName', label: i18n.t('admin.system_settings_page.k6'), type: 'text' },
  { name: 'companyName', label: i18n.t('admin.system_settings_page.k7'), type: 'text' },
  { name: 'contactEmail', label: i18n.t('admin.system_settings_page.k8'), type: 'email' },
  { name: 'contactPhone', label: i18n.t('admin.system_settings_page.k9'), type: 'text' },
  { name: 'address', label: i18n.t('admin.system_settings_page.k10'), type: 'textarea', rows: 2 },
];

const getMailFields = (): FormField[] => [
  { name: 'enabled', label: i18n.t('admin.system_settings_page.k11'), type: 'switch' },
  {
    name: 'smtpHost',
    label: i18n.t('pages.system_settings_page.smtp_2'),
    type: 'text',
    dependsOn: ['enabled'],
  },
  {
    name: 'smtpPort',
    label: i18n.t('pages.system_settings_page.smtp_3'),
    type: 'number',
    dependsOn: ['enabled'],
  },
  {
    name: 'smtpUsername',
    label: i18n.t('admin.system_settings_page.k12'),
    type: 'text',
    dependsOn: ['enabled'],
  },
  {
    name: 'smtpPassword',
    label: i18n.t('admin.system_settings_page.k13'),
    type: 'password',
    dependsOn: ['enabled'],
  },
  {
    name: 'useTLS',
    label: i18n.t('admin.system_settings_page.tls_14'),
    type: 'switch',
    dependsOn: ['enabled'],
  },
  {
    name: 'fromEmail',
    label: i18n.t('admin.system_settings_page.k15'),
    type: 'email',
    dependsOn: ['enabled'],
  },
  {
    name: 'fromName',
    label: i18n.t('admin.system_settings_page.k16'),
    type: 'text',
    dependsOn: ['enabled'],
  },
];

const getSmsFields = (): FormField[] => [
  { name: 'enabled', label: i18n.t('admin.system_settings_page.k17'), type: 'switch' },
  {
    name: 'provider',
    label: i18n.t('admin.system_settings_page.k18'),
    type: 'select',
    options: [
      { label: i18n.t('admin.system_settings_page.k19'), value: 'aliyun' },
      { label: i18n.t('admin.system_settings_page.k20'), value: 'tencent' },
      { label: i18n.t('admin.system_settings_page.k21'), value: 'huawei' },
    ],
    dependsOn: ['enabled'],
  },
  { name: 'accessKeyId', label: 'AccessKey ID', type: 'text', dependsOn: ['enabled'] },
  { name: 'accessKeySecret', label: 'AccessKey Secret', type: 'password', dependsOn: ['enabled'] },
  {
    name: 'signName',
    label: i18n.t('admin.system_settings_page.k22'),
    type: 'text',
    dependsOn: ['enabled'],
  },
];

const getLogFields = (): FormField[] => [
  {
    name: 'level',
    label: i18n.t('admin.system_settings_page.k23'),
    type: 'select',
    options: [
      { label: 'Debug', value: 'debug' },
      { label: 'Info', value: 'info' },
      { label: 'Warning', value: 'warn' },
      { label: 'Error', value: 'error' },
    ],
  },
  { name: 'retentionDays', label: i18n.t('admin.system_settings_page.k24'), type: 'number' },
  { name: 'enableAccessLog', label: i18n.t('admin.system_settings_page.k25'), type: 'switch' },
  { name: 'enableOperationLog', label: i18n.t('admin.system_settings_page.k26'), type: 'switch' },
  { name: 'enableSecurityLog', label: i18n.t('admin.system_settings_page.k27'), type: 'switch' },
];

const getSections = (tabId: string): FormSection[] => {
  switch (tabId) {
    case 'basic':
      return [
        { id: 'basic', title: i18n.t('admin.system_settings_page.k28'), fields: getBasicFields() },
      ];
    case 'mail':
      return [
        { id: 'mail', title: i18n.t('admin.system_settings_page.k29'), fields: getMailFields() },
      ];
    case 'sms':
      return [
        { id: 'sms', title: i18n.t('admin.system_settings_page.k30'), fields: getSmsFields() },
      ];
    case 'log':
      return [
        { id: 'log', title: i18n.t('admin.system_settings_page.k31'), fields: getLogFields() },
      ];
    default:
      return [];
  }
};

// 将 API 返回的扁平 key-value 列表转换为嵌套结构
function flattenToNested(items: Array<{ key: string; value: string }>): SettingsType {
  const result: SettingsType = JSON.parse(JSON.stringify(defaultSettings));
  for (const item of items) {
    const dotIndex = item.key.indexOf('.');
    if (dotIndex > 0) {
      const category = item.key.substring(0, dotIndex) as TabKey;
      const field = item.key.substring(dotIndex + 1);
      if (result[category] && field in result[category]) {
        const target = result[category] as Record<string, unknown>;
        const currentValue = target[field];
        if (typeof currentValue === 'boolean') {
          target[field] = item.value === 'true';
        } else if (typeof currentValue === 'number') {
          target[field] = Number(item.value) || 0;
        } else {
          target[field] = item.value;
        }
      }
    }
  }
  return result;
}

// 将嵌套结构转换为扁平 key-value 用于批量保存
function nestedToFlatten(settings: SettingsType): Record<string, string> {
  const result: Record<string, string> = {};
  for (const category of Object.keys(settings) as TabKey[]) {
    const categoryData = settings[category] as Record<string, unknown>;
    for (const field of Object.keys(categoryData)) {
      const value = categoryData[field];
      result[`${category}.${field}`] =
        typeof value === 'boolean' ? String(value) : String(value ?? '');
    }
  }
  return result;
}

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState('basic');
  const [settings, setSettings] = useState<SettingsType>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 从 API 加载设置
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await systemSettingApi.listSettings();
        if (!cancelled && res.data) {
          setSettings(flattenToNested(res.data));
        }
      } catch (e) {
        if (!cancelled) {
          apiLogger.error('加载系统设置失败', e);
          setError('加载设置失败，使用默认值');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dependencies = useMemo(() => {
    const deps: FieldDependency[] = [];
    if (activeTab === 'mail') {
      [
        'smtpHost',
        'smtpPort',
        'smtpUsername',
        'smtpPassword',
        'useTLS',
        'fromEmail',
        'fromName',
      ].forEach((field) => {
        deps.push({
          sourceField: 'enabled',
          targetField: field,
          type: 'disabled' as const,
          condition: { type: 'equals' as const, value: false },
          effect: { disabled: true },
        });
      });
    }
    if (activeTab === 'sms') {
      ['provider', 'accessKeyId', 'accessKeySecret', 'signName'].forEach((field) => {
        deps.push({
          sourceField: 'enabled',
          targetField: field,
          type: 'disabled' as const,
          condition: { type: 'equals' as const, value: false },
          effect: { disabled: true },
        });
      });
    }
    return deps;
  }, [activeTab]);

  const defaultValues = useMemo(
    () => settings[activeTab as keyof typeof settings],
    [activeTab, settings]
  );
  const sections = useMemo(() => getSections(activeTab), [activeTab]);

  const handleSubmit = useCallback(
    async (data: unknown) => {
      const formData = data as unknown as Record<string, unknown>;
      const updatedSettings = {
        ...settings,
        [activeTab]: { ...settings[activeTab as keyof typeof settings], ...formData },
      };
      setSettings(updatedSettings);
      try {
        setSaving(true);
        setSaveSuccess(false);
        setError(null);
        const flat = nestedToFlatten(updatedSettings);
        await systemSettingApi.batchUpdateSettings(flat);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (e) {
        apiLogger.error('保存系统设置失败', e);
        setError('保存设置失败，请重试');
      } finally {
        setSaving(false);
      }
      apiLogger.info(i18n.t('pages.system_settings_page.k4'), { tab: activeTab, data });
    },
    [activeTab, settings]
  );

  const handleReset = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      [activeTab]: defaultSettings[activeTab as keyof typeof defaultSettings],
    }));
  }, [activeTab]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return (
      <PageContainer
        title={i18n.t('admin.system_settings_page.k32')}
        subtitle={i18n.t('admin.system_settings_page.k33')}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={i18n.t('admin.system_settings_page.k32')}
      subtitle={i18n.t('admin.system_settings_page.k33')}
    >
      {error && (
        <Alert
          severity='error'
          sx={{ mb: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      {saveSuccess && (
        <Alert
          severity='success'
          sx={{ mb: 2 }}
        >
          设置已保存
        </Alert>
      )}
      <Paper sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { minHeight: 56 } }}
        >
          {tabsConfig.map((tab) => {
            const Icon = tab.icon as React.ComponentType<{ style?: React.CSSProperties }>;
            return (
              <Tab
                key={tab.id}
                value={tab.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Icon style={{ width: 18, height: 18 }} />
                    <span>{tab.label}</span>
                  </Box>
                }
              />
            );
          })}
        </Tabs>
        <Box sx={{ p: 3 }}>
          <FormPageTemplate
            title=''
            subtitle=''
            backHref={ADMIN_PATHS.system}
            sections={sections}
            defaultValues={defaultValues}
            dependencies={dependencies}
            onSubmit={handleSubmit}
            onReset={handleReset}
            submitText={saving ? '保存中...' : i18n.t('admin.system_settings_page.k34')}
            resetText={i18n.t('admin.system_settings_page.k35')}
            columns={2}
            stickyFooter={true}
            showGroupTabs={false}
            showProgress={false}
          />
        </Box>
      </Paper>
    </PageContainer>
  );
}
