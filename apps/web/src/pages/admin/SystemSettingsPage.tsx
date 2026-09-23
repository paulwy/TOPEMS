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
import { useTranslation } from 'react-i18next';

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
  { id: 'basic', labelKey: 'admin.system_settings_page.tab_basic', icon: Settings },
  { id: 'mail', labelKey: 'system_settings.email_settings', icon: Mail },
  { id: 'sms', labelKey: 'system_settings.sms_settings', icon: MessageSquare },
  { id: 'log', labelKey: 'system_settings.log_settings', icon: FileText },
];

const SystemSettingsPage: React.FC = () => {
  const { t } = useTranslation();
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
      pushToast('success', t('admin.system_settings_page.save_success'));
    },
    onError: (err: Error) =>
      pushToast('error', t('admin.system_settings_page.save_failed', { message: err.message })),
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
      <FieldGroup title={t('admin.system_settings_page.group_system_info')}>
        <FormField
          label={t('system_settings.system_name')}
          required
        >
          <Input
            value={settings.basic.systemName}
            onChange={(e) => updateField('basic', 'systemName', e.target.value)}
            placeholder={t('admin.system_settings_page.ph_system_name')}
          />
        </FormField>
        <FormField label={t('system_settings.company_name')}>
          <Input
            value={settings.basic.companyName}
            onChange={(e) => updateField('basic', 'companyName', e.target.value)}
            placeholder={t('admin.system_settings_page.ph_company_name')}
          />
        </FormField>
      </FieldGroup>

      <FieldGroup title={t('admin.system_settings_page.group_contact')}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <FormField label={t('system_settings.contact_email')}>
            <Input
              type='email'
              value={settings.basic.contactEmail}
              onChange={(e) => updateField('basic', 'contactEmail', e.target.value)}
              placeholder={t('admin.system_settings_page.ph_contact_email')}
            />
          </FormField>
          <FormField label={t('system_settings.contact_phone')}>
            <Input
              value={settings.basic.contactPhone}
              onChange={(e) => updateField('basic', 'contactPhone', e.target.value)}
              placeholder={t('admin.system_settings_page.ph_contact_phone')}
            />
          </FormField>
        </div>
        <FormField label={t('system_settings.company_address')}>
          <Input
            value={settings.basic.address}
            onChange={(e) => updateField('basic', 'address', e.target.value)}
            placeholder={t('admin.system_settings_page.ph_company_address')}
          />
        </FormField>
      </FieldGroup>
    </div>
  );

  const renderMailTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <FieldGroup title={t('admin.system_settings_page.group_mail_service')}>
        <FormField label={t('system_settings.enable_email_service')}>
          <Toggle
            checked={settings.mail.enabled}
            onChange={(checked) => updateField('mail', 'enabled', checked)}
            label={
              settings.mail.enabled
                ? t('admin.system_settings_page.toggle_on')
                : t('admin.system_settings_page.toggle_off')
            }
          />
        </FormField>
      </FieldGroup>

      <FieldGroup title={t('admin.system_settings_page.group_smtp')}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-3)' }}>
          <FormField
            label={t('admin.system_settings_page.smtp_server')}
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
            label={t('admin.system_settings_page.port')}
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
          <FormField label={t('system_settings.username')}>
            <Input
              value={settings.mail.smtpUsername}
              onChange={(e) => updateField('mail', 'smtpUsername', e.target.value)}
              placeholder='noreply@example.com'
              disabled={!settings.mail.enabled}
            />
          </FormField>
          <FormField label={t('system_settings.password')}>
            <Input
              type='password'
              value={settings.mail.smtpPassword}
              onChange={(e) => updateField('mail', 'smtpPassword', e.target.value)}
              placeholder={t('admin.system_settings_page.ph_smtp_password')}
              disabled={!settings.mail.enabled}
            />
          </FormField>
        </div>
        <FormField label={t('admin.system_settings_page.enable_tls')}>
          <Toggle
            checked={settings.mail.useTLS}
            onChange={(checked) => updateField('mail', 'useTLS', checked)}
            label={
              settings.mail.useTLS
                ? t('admin.system_settings_page.tls_on')
                : t('admin.system_settings_page.tls_off')
            }
            disabled={!settings.mail.enabled}
          />
        </FormField>
      </FieldGroup>

      <FieldGroup title={t('admin.system_settings_page.group_sender')}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <FormField label={t('admin.system_settings_page.sender_email')}>
            <Input
              value={settings.mail.fromEmail}
              onChange={(e) => updateField('mail', 'fromEmail', e.target.value)}
              placeholder='noreply@example.com'
              disabled={!settings.mail.enabled}
            />
          </FormField>
          <FormField label={t('admin.system_settings_page.sender_name')}>
            <Input
              value={settings.mail.fromName}
              onChange={(e) => updateField('mail', 'fromName', e.target.value)}
              placeholder={t('admin.system_settings_page.ph_sender_name')}
              disabled={!settings.mail.enabled}
            />
          </FormField>
        </div>
      </FieldGroup>
    </div>
  );

  const renderSmsTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <FieldGroup title={t('admin.system_settings_page.group_sms_service')}>
        <FormField label={t('system_settings.enable_sms_service')}>
          <Toggle
            checked={settings.sms.enabled}
            onChange={(checked) => updateField('sms', 'enabled', checked)}
            label={
              settings.sms.enabled
                ? t('admin.system_settings_page.toggle_on')
                : t('admin.system_settings_page.toggle_off')
            }
          />
        </FormField>
      </FieldGroup>

      <FieldGroup title={t('admin.system_settings_page.group_provider')}>
        <FormField label={t('system_settings.sms_provider')}>
          <Select
            value={settings.sms.provider}
            onChange={(e) => updateField('sms', 'provider', e.target.value)}
            options={[
              { value: 'aliyun', label: t('admin.system_settings_page.sms_aliyun') },
              { value: 'tencent', label: t('admin.system_settings_page.sms_tencent') },
              { value: 'huawei', label: t('admin.system_settings_page.sms_huawei') },
            ]}
            disabled={!settings.sms.enabled}
          />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <FormField label='Access Key ID'>
            <Input
              value={settings.sms.accessKeyId}
              onChange={(e) => updateField('sms', 'accessKeyId', e.target.value)}
              placeholder={t('admin.system_settings_page.ph_access_key_id')}
              disabled={!settings.sms.enabled}
            />
          </FormField>
          <FormField label='Access Key Secret'>
            <Input
              type='password'
              value={settings.sms.accessKeySecret}
              onChange={(e) => updateField('sms', 'accessKeySecret', e.target.value)}
              placeholder={t('admin.system_settings_page.ph_access_key_secret')}
              disabled={!settings.sms.enabled}
            />
          </FormField>
        </div>
        <FormField label={t('admin.system_settings_page.sms_signature')}>
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
      <FieldGroup title={t('system_settings.log_level')}>
        <FormField label={t('system_settings.log_level')}>
          <Select
            value={settings.log.level}
            onChange={(e) => updateField('log', 'level', e.target.value)}
            options={[
              { value: 'debug', label: t('admin.system_settings_page.log_level_debug') },
              { value: 'info', label: t('admin.system_settings_page.log_level_info') },
              { value: 'warn', label: t('admin.system_settings_page.log_level_warn') },
              { value: 'error', label: t('admin.system_settings_page.log_level_error') },
            ]}
          />
        </FormField>
        <FormField label={t('system_settings.log_retention_days')}>
          <Input
            type='number'
            value={settings.log.retentionDays.toString()}
            onChange={(e) => updateField('log', 'retentionDays', parseInt(e.target.value) || 30)}
            min={1}
            max={365}
          />
        </FormField>
      </FieldGroup>

      <FieldGroup title={t('admin.system_settings_page.group_log_type')}>
        <FormField label={t('admin.system_settings_page.access_log')}>
          <Toggle
            checked={settings.log.enableAccessLog}
            onChange={(checked) => updateField('log', 'enableAccessLog', checked)}
            label={
              settings.log.enableAccessLog
                ? t('admin.system_settings_page.toggle_on')
                : t('admin.system_settings_page.toggle_off')
            }
          />
        </FormField>
        <FormField label={t('admin.system_settings_page.operation_log')}>
          <Toggle
            checked={settings.log.enableOperationLog}
            onChange={(checked) => updateField('log', 'enableOperationLog', checked)}
            label={
              settings.log.enableOperationLog
                ? t('admin.system_settings_page.toggle_on')
                : t('admin.system_settings_page.toggle_off')
            }
          />
        </FormField>
        <FormField label={t('admin.system_settings_page.security_log')}>
          <Toggle
            checked={settings.log.enableSecurityLog}
            onChange={(checked) => updateField('log', 'enableSecurityLog', checked)}
            label={
              settings.log.enableSecurityLog
                ? t('admin.system_settings_page.toggle_on')
                : t('admin.system_settings_page.toggle_off')
            }
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
          title: t('system_settings.system_settings'),
          subtitle: t('admin.system_settings_page.subtitle'),
        }}
        onSubmit={handleSave}
        loading={saveMutation.isPending}
        submitLabel={t('admin.system_settings_page.submit_save')}
        actions={
          <Button
            variant='ghost'
            leftIcon={<RefreshCw size={16} />}
            onClick={() => refetch()}
          >
            {t('system_settings.reset')}
          </Button>
        }
      >
        <Tabs
          tabs={tabsConfig.map((tab) => ({ id: tab.id, label: t(tab.labelKey) }))}
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
              {t('admin.system_settings_page.loading')}
            </div>
          ) : error ? (
            <div
              style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--error-500)' }}
            >
              {t('admin.system_settings_page.load_failed_default')}
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
