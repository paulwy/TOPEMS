/**
 * 系统设置页面
 * 管理系统基础配置、邮件设置、短信设置、日志设置
 */

import React, { useState, useMemo, useCallback } from 'react';
import { apiLogger } from '@/utils/logger';
import { Box, Tabs, Tab, Paper } from '@mui/material';
import { Settings, Mail, MessageSquare, FileText } from 'lucide-react';
import FormPageTemplate from '@/components/templates/FormPageTemplate';
import type {
  FormSection,
  FormField,
  FieldDependency,
} from '@/components/templates/FormPageTemplate';
import { PageContainer } from '@/components/common';

// ============ Mock 数据 ============
const mockSettings = {
  basic: {
    systemName: 'TOPEMS 企业管理系统',
    systemLogo: '',
    companyName: '示例公司',
    contactEmail: 'admin@example.com',
    contactPhone: '400-123-4567',
    address: '北京市朝阳区某某路123号',
  },
  mail: {
    enabled: true,
    smtpHost: 'smtp.example.com',
    smtpPort: 465,
    smtpUsername: 'noreply@example.com',
    smtpPassword: '',
    useTLS: true,
    fromEmail: 'noreply@example.com',
    fromName: 'TOPEMS 系统',
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
  { id: 'basic', label: '基础配置', icon: Settings },
  { id: 'mail', label: '邮件设置', icon: Mail },
  { id: 'sms', label: '短信设置', icon: MessageSquare },
  { id: 'log', label: '日志设置', icon: FileText },
];

// ============ 表单字段定义 ============

const getBasicFields = (): FormField[] => [
  {
    name: 'systemName',
    label: '系统名称',
    type: 'text',
    defaultValue: mockSettings.basic.systemName,
  },
  {
    name: 'companyName',
    label: '公司名称',
    type: 'text',
    defaultValue: mockSettings.basic.companyName,
  },
  {
    name: 'contactEmail',
    label: '联系邮箱',
    type: 'email',
    defaultValue: mockSettings.basic.contactEmail,
  },
  {
    name: 'contactPhone',
    label: '联系电话',
    type: 'text',
    defaultValue: mockSettings.basic.contactPhone,
  },
  {
    name: 'address',
    label: '公司地址',
    type: 'textarea',
    rows: 2,
    defaultValue: mockSettings.basic.address,
  },
];

const getMailFields = (): FormField[] => [
  {
    name: 'enabled',
    label: '启用邮件服务',
    type: 'switch',
    defaultValue: mockSettings.mail.enabled,
  },
  {
    name: 'smtpHost',
    label: 'SMTP 服务器',
    type: 'text',
    defaultValue: mockSettings.mail.smtpHost,
    dependsOn: ['enabled'],
  },
  {
    name: 'smtpPort',
    label: 'SMTP 端口',
    type: 'number',
    defaultValue: mockSettings.mail.smtpPort,
    dependsOn: ['enabled'],
  },
  {
    name: 'smtpUsername',
    label: '用户名',
    type: 'text',
    defaultValue: mockSettings.mail.smtpUsername,
    dependsOn: ['enabled'],
  },
  {
    name: 'smtpPassword',
    label: '密码',
    type: 'password',
    defaultValue: mockSettings.mail.smtpPassword,
    dependsOn: ['enabled'],
  },
  {
    name: 'useTLS',
    label: '使用 TLS',
    type: 'switch',
    defaultValue: mockSettings.mail.useTLS,
    dependsOn: ['enabled'],
  },
  {
    name: 'fromEmail',
    label: '发件人邮箱',
    type: 'email',
    defaultValue: mockSettings.mail.fromEmail,
    dependsOn: ['enabled'],
  },
  {
    name: 'fromName',
    label: '发件人名称',
    type: 'text',
    defaultValue: mockSettings.mail.fromName,
    dependsOn: ['enabled'],
  },
];

const getSmsFields = (): FormField[] => [
  {
    name: 'enabled',
    label: '启用短信服务',
    type: 'switch',
    defaultValue: mockSettings.sms.enabled,
  },
  {
    name: 'provider',
    label: '短信服务商',
    type: 'select',
    options: [
      { label: '阿里云', value: 'aliyun' },
      { label: '腾讯云', value: 'tencent' },
      { label: '华为云', value: 'huawei' },
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
    label: '签名名称',
    type: 'text',
    defaultValue: mockSettings.sms.signName,
    dependsOn: ['enabled'],
  },
];

const getLogFields = (): FormField[] => [
  {
    name: 'level',
    label: '日志级别',
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
    label: '日志保留天数',
    type: 'number',
    defaultValue: mockSettings.log.retentionDays,
  },
  {
    name: 'enableAccessLog',
    label: '启用访问日志',
    type: 'switch',
    defaultValue: mockSettings.log.enableAccessLog,
  },
  {
    name: 'enableOperationLog',
    label: '启用操作日志',
    type: 'switch',
    defaultValue: mockSettings.log.enableOperationLog,
  },
  {
    name: 'enableSecurityLog',
    label: '启用安全日志',
    type: 'switch',
    defaultValue: mockSettings.log.enableSecurityLog,
  },
];

const getSections = (tabId: string): FormSection[] => {
  switch (tabId) {
    case 'basic':
      return [{ id: 'basic', title: '基础配置', fields: getBasicFields() }];
    case 'mail':
      return [{ id: 'mail', title: '邮件设置', fields: getMailFields() }];
    case 'sms':
      return [{ id: 'sms', title: '短信设置', fields: getSmsFields() }];
    case 'log':
      return [{ id: 'log', title: '日志设置', fields: getLogFields() }];
    default:
      return [];
  }
};

export default function SystemSettingsPage() {
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
      apiLogger.info('保存设置:', { tab: activeTab, data });
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
      title='系统设置'
      subtitle='管理系统基础配置、邮件设置、短信设置、日志设置'
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
            sections={sections}
            defaultValues={defaultValues}
            dependencies={dependencies}
            onSubmit={handleSubmit}
            onReset={handleReset}
            submitText='保存'
            resetText='重置'
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
