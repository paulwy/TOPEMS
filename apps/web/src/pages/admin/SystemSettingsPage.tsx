import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Mail, MessageSquare, FileText, Save, RefreshCw } from 'lucide-react';

import {
  Button,
  Card,
  FormPageTemplate,
  Input,
  Select,
  Tabs,
  ToastContainer,
  Toggle,
} from '@/components/redesign';
import type { Toast } from '@/components/redesign';
import { systemSettingApi } from '@/api/admin/systemSetting';
import i18n from '@/i18n';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['admin', 'system-settings'];

// 默认设置
const defaultSettings = {
  basic: {
    systemName: 'TOPEMS 工业操作系统',
    systemLogo: '',
    companyName: '示例科技有限公司',
    contactEmail: 'admin@example.com',
    contactPhone: '400-123-4567',
    address: '北京市朝阳区示例路 123 号',
  },
  mail: {
    enabled: true,
    smtpHost: 'smtp.example.com',
    smtpPort: 465,
    smtpUsername: 'noreply@example.com',
    smtpPassword: '',
    useTLS: true,
    fromEmail: 'noreply@example.com',
    fromName: 'TOPEMS 系统通知',
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

const tabsConfig = [
  { id: 'basic', label: '基础设置', icon: Settings },
  { id: 'mail', label: '邮件设置', icon: Mail },
  { id: 'sms', label: '短信设置', icon: MessageSquare },
  { id: 'log', label: '日志设置', icon: FileText },
];

const SystemSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('basic');
  const [settings, setSettings] = useState<SettingsType>(defaultSettings);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = (type: Toast['variant'], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, variant: type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      try {
        const response = await systemSettingApi.listSettings();
        if (response.success && response.data) {
          const merged: SettingsType = { ...defaultSettings };
          // 后端为扁平 key-value（如 mail.smtpHost），按分组路径写入
          for (const item of response.data) {
            const parts = item.key.split('.');
            if (parts.length < 2) continue;
            const [group, field] = parts as [keyof SettingsType, string];
            const grp = merged[group] as Record<string, unknown>;
            if (grp && field in grp) {
              const current = grp[field];
              if (typeof current === 'boolean')
                grp[field] = item.value === 'true' || item.value === '1';
              else if (typeof current === 'number') grp[field] = Number(item.value);
              else grp[field] = item.value;
            }
          }
          return merged;
        }
      } catch (e) {
        // API 不可用时使用默认值
      }
      return defaultSettings;
    },
  });

  useEffect(() => {
    if (data) {
      setSettings(data);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (newSettings: SettingsType) =>
      systemSettingApi.updateSystemConfig(newSettings as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      pushToast('success', '系统设置保存成功');
    },
    onError: (err: Error) => pushToast('error', `保存失败：${err.message}`),
  });

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  const updateField = (tab: TabKey, field: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        [field]: value,
      },
    }));
  };

  const renderBasicTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <FieldGroup title='系统信息'>
        <FormField
          label='系统名称'
          required
        >
          <Input
            value={settings.basic.systemName}
            onChange={(e) => updateField('basic', 'systemName', e.target.value)}
            placeholder='请输入系统名称'
          />
        </FormField>
        <FormField label='公司名称'>
          <Input
            value={settings.basic.companyName}
            onChange={(e) => updateField('basic', 'companyName', e.target.value)}
            placeholder='请输入公司名称'
          />
        </FormField>
      </FieldGroup>

      <FieldGroup title='联系方式'>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <FormField label='联系邮箱'>
            <Input
              type='email'
              value={settings.basic.contactEmail}
              onChange={(e) => updateField('basic', 'contactEmail', e.target.value)}
              placeholder='请输入联系邮箱'
            />
          </FormField>
          <FormField label='联系电话'>
            <Input
              value={settings.basic.contactPhone}
              onChange={(e) => updateField('basic', 'contactPhone', e.target.value)}
              placeholder='请输入联系电话'
            />
          </FormField>
        </div>
        <FormField label='公司地址'>
          <Input
            value={settings.basic.address}
            onChange={(e) => updateField('basic', 'address', e.target.value)}
            placeholder='请输入公司地址'
          />
        </FormField>
      </FieldGroup>
    </div>
  );

  const renderMailTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <FieldGroup title='邮件服务'>
        <FormField label='启用邮件服务'>
          <Toggle
            checked={settings.mail.enabled}
            onChange={(checked) => updateField('mail', 'enabled', checked)}
            label={settings.mail.enabled ? '已启用' : '已禁用'}
          />
        </FormField>
      </FieldGroup>

      <FieldGroup title='SMTP 配置'>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-3)' }}>
          <FormField
            label='SMTP 服务器'
            required
          >
            <Input
              value={settings.mail.smtpHost}
              onChange={(e) => updateField('mail', 'smtpHost', e.target.value)}
              placeholder='smtp.example.com'
              disabled={!settings.mail.enabled}
            />
          </FormField>
          <FormField
            label='端口'
            required
          >
            <Input
              type='number'
              value={settings.mail.smtpPort.toString()}
              onChange={(e) => updateField('mail', 'smtpPort', parseInt(e.target.value) || 465)}
              disabled={!settings.mail.enabled}
            />
          </FormField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <FormField label='用户名'>
            <Input
              value={settings.mail.smtpUsername}
              onChange={(e) => updateField('mail', 'smtpUsername', e.target.value)}
              placeholder='noreply@example.com'
              disabled={!settings.mail.enabled}
            />
          </FormField>
          <FormField label='密码'>
            <Input
              type='password'
              value={settings.mail.smtpPassword}
              onChange={(e) => updateField('mail', 'smtpPassword', e.target.value)}
              placeholder='请输入 SMTP 密码'
              disabled={!settings.mail.enabled}
            />
          </FormField>
        </div>
        <FormField label='启用 TLS'>
          <Toggle
            checked={settings.mail.useTLS}
            onChange={(checked) => updateField('mail', 'useTLS', checked)}
            label={settings.mail.useTLS ? '已启用 TLS' : '未启用 TLS'}
            disabled={!settings.mail.enabled}
          />
        </FormField>
      </FieldGroup>

      <FieldGroup title='发件人配置'>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <FormField label='发件人邮箱'>
            <Input
              value={settings.mail.fromEmail}
              onChange={(e) => updateField('mail', 'fromEmail', e.target.value)}
              placeholder='noreply@example.com'
              disabled={!settings.mail.enabled}
            />
          </FormField>
          <FormField label='发件人名称'>
            <Input
              value={settings.mail.fromName}
              onChange={(e) => updateField('mail', 'fromName', e.target.value)}
              placeholder='TOPEMS 系统通知'
              disabled={!settings.mail.enabled}
            />
          </FormField>
        </div>
      </FieldGroup>
    </div>
  );

  const renderSmsTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <FieldGroup title='短信服务'>
        <FormField label='启用短信服务'>
          <Toggle
            checked={settings.sms.enabled}
            onChange={(checked) => updateField('sms', 'enabled', checked)}
            label={settings.sms.enabled ? '已启用' : '已禁用'}
          />
        </FormField>
      </FieldGroup>

      <FieldGroup title='服务商配置'>
        <FormField label='短信服务商'>
          <Select
            value={settings.sms.provider}
            onChange={(e) => updateField('sms', 'provider', e.target.value)}
            options={[
              { value: 'aliyun', label: '阿里云短信' },
              { value: 'tencent', label: '腾讯云短信' },
              { value: 'huawei', label: '华为云短信' },
            ]}
            disabled={!settings.sms.enabled}
          />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <FormField label='Access Key ID'>
            <Input
              value={settings.sms.accessKeyId}
              onChange={(e) => updateField('sms', 'accessKeyId', e.target.value)}
              placeholder='请输入 Access Key ID'
              disabled={!settings.sms.enabled}
            />
          </FormField>
          <FormField label='Access Key Secret'>
            <Input
              type='password'
              value={settings.sms.accessKeySecret}
              onChange={(e) => updateField('sms', 'accessKeySecret', e.target.value)}
              placeholder='请输入 Access Key Secret'
              disabled={!settings.sms.enabled}
            />
          </FormField>
        </div>
        <FormField label='短信签名'>
          <Input
            value={settings.sms.signName}
            onChange={(e) => updateField('sms', 'signName', e.target.value)}
            placeholder='TOPEMS'
            disabled={!settings.sms.enabled}
          />
        </FormField>
      </FieldGroup>
    </div>
  );

  const renderLogTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <FieldGroup title='日志级别'>
        <FormField label='日志级别'>
          <Select
            value={settings.log.level}
            onChange={(e) => updateField('log', 'level', e.target.value)}
            options={[
              { value: 'debug', label: 'Debug（详细调试）' },
              { value: 'info', label: 'Info（常规信息）' },
              { value: 'warn', label: 'Warn（警告）' },
              { value: 'error', label: 'Error（仅错误）' },
            ]}
          />
        </FormField>
        <FormField label='日志保留天数'>
          <Input
            type='number'
            value={settings.log.retentionDays.toString()}
            onChange={(e) => updateField('log', 'retentionDays', parseInt(e.target.value) || 30)}
            min={1}
            max={365}
          />
        </FormField>
      </FieldGroup>

      <FieldGroup title='日志类型'>
        <FormField label='访问日志'>
          <Toggle
            checked={settings.log.enableAccessLog}
            onChange={(checked) => updateField('log', 'enableAccessLog', checked)}
            label={settings.log.enableAccessLog ? '已启用' : '已禁用'}
          />
        </FormField>
        <FormField label='操作日志'>
          <Toggle
            checked={settings.log.enableOperationLog}
            onChange={(checked) => updateField('log', 'enableOperationLog', checked)}
            label={settings.log.enableOperationLog ? '已启用' : '已禁用'}
          />
        </FormField>
        <FormField label='安全日志'>
          <Toggle
            checked={settings.log.enableSecurityLog}
            onChange={(checked) => updateField('log', 'enableSecurityLog', checked)}
            label={settings.log.enableSecurityLog ? '已启用' : '已禁用'}
          />
        </FormField>
      </FieldGroup>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return renderBasicTab();
      case 'mail':
        return renderMailTab();
      case 'sms':
        return renderSmsTab();
      case 'log':
        return renderLogTab();
      default:
        return null;
    }
  };

  return (
    <>
      <FormPageTemplate
        header={{
          title: '系统设置',
          subtitle: '管理系统基础配置、邮件服务、短信服务和日志设置',
        }}
        onSubmit={handleSave}
        loading={saveMutation.isPending}
        submitLabel='保存设置'
        actions={
          <Button
            variant='ghost'
            leftIcon={<RefreshCw size={16} />}
            onClick={() => refetch()}
          >
            重置
          </Button>
        }
      >
        <Tabs
          tabs={tabsConfig.map((t) => ({ id: t.id, label: t.label }))}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as TabKey)}
        />

        <div style={{ marginTop: 'var(--space-4)' }}>
          {isLoading ? (
            <div
              style={{
                padding: 'var(--space-8)',
                textAlign: 'center',
                color: 'var(--text-secondary)',
              }}
            >
              加载中...
            </div>
          ) : error ? (
            <div
              style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--error-500)' }}
            >
              加载失败，使用默认设置
            </div>
          ) : (
            renderTabContent()
          )}
        </div>
      </FormPageTemplate>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </>
  );
};

// 表单字段分组组件
const FieldGroup: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div
    style={{
      padding: 'var(--space-4)',
      backgroundColor: 'var(--surface-2)',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border-default)',
    }}
  >
    <h4
      style={{
        margin: '0 0 var(--space-3) 0',
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--text-primary)',
      }}
    >
      {title}
    </h4>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {children}
    </div>
  </div>
);

// 表单字段组件
const FormField: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({
  label,
  required,
  children,
}) => (
  <div>
    <label
      style={{
        display: 'block',
        marginBottom: 'var(--space-1)',
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--text-secondary)',
      }}
    >
      {label}
      {required && <span style={{ color: 'var(--error-500)', marginLeft: 2 }}>*</span>}
    </label>
    {children}
  </div>
);

export default SystemSettingsPage;
