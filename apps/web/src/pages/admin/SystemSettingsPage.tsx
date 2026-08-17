/**
 * 系统设置页面
 * 管理系统基础配置、邮件设置、短信设置、日志设置
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiLogger } from '@/utils/logger';
import { Box, Tabs, Tab, Paper } from '@mui/material';
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
import { adminApi } from '@/api/admin';
// ============ Mock 数据 ============
const mockSettings = {
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
  {
    name: 'systemName',
    label: i18n.t('admin.system_settings_page.k6'),
    type: 'text',
    defaultValue: mockSettings.basic.systemName,
  },
  {
    name: 'companyName',
    label: i18n.t('admin.system_settings_page.k7'),
    type: 'text',
    defaultValue: mockSettings.basic.companyName,
  },
  {
    name: 'contactEmail',
    label: i18n.t('admin.system_settings_page.k8'),
    type: 'email',
    defaultValue: mockSettings.basic.contactEmail,
  },
  {
    name: 'contactPhone',
    label: i18n.t('admin.system_settings_page.k9'),
    type: 'text',
    defaultValue: mockSettings.basic.contactPhone,
  },
  {
    name: 'address',
    label: i18n.t('admin.system_settings_page.k10'),
    type: 'textarea',
    rows: 2,
    defaultValue: mockSettings.basic.address,
  },
];
const getMailFields = (): FormField[] => [
  {
    name: 'enabled',
    label: i18n.t('admin.system_settings_page.k11'),
    type: 'switch',
    defaultValue: mockSettings.mail.enabled,
  },
  {
    name: 'smtpHost',
    label: i18n.t('pages.system_settings_page.smtp_2'),
    type: 'text',
    defaultValue: mockSettings.mail.smtpHost,
    dependsOn: ['enabled'],
  },
  {
    name: 'smtpPort',
    label: i18n.t('pages.system_settings_page.smtp_3'),
    type: 'number',
    defaultValue: mockSettings.mail.smtpPort,
    dependsOn: ['enabled'],
  },
  {
    name: 'smtpUsername',
    label: i18n.t('admin.system_settings_page.k12'),
    type: 'text',
    defaultValue: mockSettings.mail.smtpUsername,
    dependsOn: ['enabled'],
  },
  {
    name: 'smtpPassword',
    label: i18n.t('admin.system_settings_page.k13'),
    type: 'password',
    defaultValue: mockSettings.mail.smtpPassword,
    dependsOn: ['enabled'],
  },
  {
    name: 'useTLS',
    label: i18n.t('admin.system_settings_page.tls_14'),
    type: 'switch',
    defaultValue: mockSettings.mail.useTLS,
    dependsOn: ['enabled'],
  },
  {
    name: 'fromEmail',
    label: i18n.t('admin.system_settings_page.k15'),
    type: 'email',
    defaultValue: mockSettings.mail.fromEmail,
    dependsOn: ['enabled'],
  },
  {
    name: 'fromName',
    label: i18n.t('admin.system_settings_page.k16'),
    type: 'text',
    defaultValue: mockSettings.mail.fromName,
    dependsOn: ['enabled'],
  },
];
const getSmsFields = (): FormField[] => [
  {
    name: 'enabled',
    label: i18n.t('admin.system_settings_page.k17'),
    type: 'switch',
    defaultValue: mockSettings.sms.enabled,
  },
  {
    name: 'provider',
    label: i18n.t('admin.system_settings_page.k18'),
    type: 'select',
    options: [
      { label: i18n.t('admin.system_settings_page.k19'), value: 'aliyun' },
      { label: i18n.t('admin.system_settings_page.k20'), value: 'tencent' },
      { label: i18n.t('admin.system_settings_page.k21'), value: 'huawei' },
    ],
    defaultValue: mockSettings.sms.provider,
    dependsOn: ['enabled'],
  },
  {
    name: 'accessKeyId',
    label: 'AccessKey ID',
    type: 'text',
    defaultValue: mockSettings.sms.accessKeyId,
    dependsOn: ['enabled'],
  },
  {
    name: 'accessKeySecret',
    label: 'AccessKey Secret',
    type: 'password',
    defaultValue: mockSettings.sms.accessKeySecret,
    dependsOn: ['enabled'],
  },
  {
    name: 'signName',
    label: i18n.t('admin.system_settings_page.k22'),
    type: 'text',
    defaultValue: mockSettings.sms.signName,
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
    defaultValue: mockSettings.log.level,
  },
  {
    name: 'retentionDays',
    label: i18n.t('admin.system_settings_page.k24'),
    type: 'number',
    defaultValue: mockSettings.log.retentionDays,
  },
  {
    name: 'enableAccessLog',
    label: i18n.t('admin.system_settings_page.k25'),
    type: 'switch',
    defaultValue: mockSettings.log.enableAccessLog,
  },
  {
    name: 'enableOperationLog',
    label: i18n.t('admin.system_settings_page.k26'),
    type: 'switch',
    defaultValue: mockSettings.log.enableOperationLog,
  },
  {
    name: 'enableSecurityLog',
    label: i18n.t('admin.system_settings_page.k27'),
    type: 'switch',
    defaultValue: mockSettings.log.enableSecurityLog,
  },
];
const getSections = (tabId: string): FormSection[] => {
  switch (tabId) {
    case 'basic':
      return [{ id: 'basic', title: i18n.t('admin.system_settings_page.k28'), fields: getBasicFields() }];
    case 'mail':
      return [{ id: 'mail', title: i18n.t('admin.system_settings_page.k29'), fields: getMailFields() }];
    case 'sms':
      return [{ id: 'sms', title: i18n.t('admin.system_settings_page.k30'), fields: getSmsFields() }];
    case 'log':
      return [{ id: 'log', title: i18n.t('admin.system_settings_page.k31'), fields: getLogFields() }];
    default:
      return [];
  }
};
export default function SystemSettingsPage() {
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
    queryKey: ['admin-system-settings'],
    queryFn: async () => {
      try {
        const res = await adminApi.getSystemConfig();
        if (res.success && res.data) return res.data;
        return {};
      } catch {
        return {};
      }
    },
  });
  const [activeTab, setActiveTab] = useState('basic');
  const [settings, setSettings] = useState(mockSettings);
  // 计算字段依赖：enabled 字段控制其他字段的禁用状态
  const dependencies = useMemo(() => {
    const deps: FieldDependency[] = [];
    // 邮件设置依赖
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
    // 短信设置依赖
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
  // 当前 tab 的默认值
  const defaultValues = useMemo(() => {
    return settings[activeTab as keyof typeof settings];
  }, [activeTab, settings]);
  // 当前 tab 的 sections
  const sections = useMemo(() => getSections(activeTab), [activeTab]);
  const handleSubmit = useCallback(
    async (data: unknown) => {
      const formData = data as unknown as Record<string, unknown>;
      setSettings((prev) => ({
        ...prev,
        [activeTab]: {
          ...prev[activeTab as keyof typeof prev],
          ...formData,
        },
      }));
      apiLogger.info(i18n.t('pages.system_settings_page.k4'), { tab: activeTab, data });
    },
    [activeTab]
  );
  const handleReset = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      [activeTab]: mockSettings[activeTab as keyof typeof mockSettings],
    }));
  }, [activeTab]);
  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };
  return (
    <PageContainer
      title={i18n.t('admin.system_settings_page.k32')}
      subtitle={i18n.t('admin.system_settings_page.k33')}
    >
      {/* Tab 导航 */}
      <Paper sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 56,
            },
          }}
        >
          {tabsConfig.map((tab) => {
            const Icon = tab.icon as React.ComponentType<{
              style?: React.CSSProperties;
            }>;
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
        {/* 表单内容 */}
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
            submitText={i18n.t('admin.system_settings_page.k34')}
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