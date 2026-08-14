/**
 * 通知渠道 Schema — 驱动 MonitorNotificationPage 的 CrudPage
 *
 * 使用 CrudPage 组件实现 schema 驱动的通知渠道管理，
 * 支持列表展示、创建、编辑、删除、测试通知等操作。
 */

import React from 'react';
import { Box, Chip, Typography, Switch } from '@mui/material';
import { Mail, MessageSquare, Smartphone, Webhook, Bell, CheckCircle, XCircle } from 'lucide-react';
import type { EntitySchema, SchemaField } from '@/schema';
import { designTokens } from '@/theme/tokens';
import i18n from '@/i18n';

const ct= designTokens.colors;

type ChannelType = 'email' | 'dingtalk' | 'wechat' | 'sms' | 'webhook';

export const CHANNEL_TYPE_OPTIONS: {
  value: ChannelType;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  { value: 'email', label: i18n.t('shared.notification_channel.k0'), icon: <Mail size={18} />, color: ct.primary.dark },
  { value: 'dingtalk', label: i18n.t('shared.notification_channel.k1'), icon: <MessageSquare size={18} />, color: ct.success.main },
  { value: 'wechat', label: i18n.t('shared.notification_channel.k2'), icon: <MessageSquare size={18} />, color: 'success.main' },
  { value: 'sms', label: i18n.t('shared.notification_channel.k3'), icon: <Smartphone size={18} />, color: 'secondary.main' },
  { value: 'webhook', label: 'Webhook', icon: <Webhook size={18} />, color: 'warning.main' },
];

export const getChannelTypeInfo = (
  type: string
): { label: string; icon: React.ReactNode; color: string } => {
  return (
    CHANNEL_TYPE_OPTIONS.find((t) => t.value === type) || {
      label: type,
      icon: <Bell size={18} />,
      color: 'grey.500',
    }
  );
};

type SwitchWithMissingProps = React.ComponentProps<typeof Switch> & {
  checked?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
};

export const ToggleSwitch = Switch as React.ComponentType<SwitchWithMissingProps>;

const isEmail = (v: Record<string, unknown>) => v.type === 'email';
const isDingtalk = (v: Record<string, unknown>) => v.type === 'dingtalk';
const isWechat = (v: Record<string, unknown>) => v.type === 'wechat';
const isSms = (v: Record<string, unknown>) => v.type === 'sms';
const isWebhook = (v: Record<string, unknown>) => v.type === 'webhook';

const channelFields: SchemaField[] = [
  {
    name: 'name',
    label: i18n.t('shared.notification_channel.k4'),
    type: 'text',
    required: true,
    sortable: true,
    listWidth: 240,
    renderCell: (row: Record<string, unknown>) => {
      const typeInfo = getChannelTypeInfo(row.type as string);
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: `${typeInfo.color}15`,
              color: typeInfo.color,
            }}
          >
            {typeInfo.icon}
          </Box>
          <Box>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              {row.name as string}
            </Typography>
            {!!row.description && (
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {row.description as string}
              </Typography>
            )}
          </Box>
        </Box>
      );
    },
  },
  {
    name: 'type',
    label: i18n.t('shared.notification_channel.k5'),
    type: 'select',
    required: true,
    defaultValue: 'email',
    listWidth: 140,
    options: {
      type: 'static',
      options: CHANNEL_TYPE_OPTIONS.map((t) => ({ value: t.value, label: t.label })),
    },
    renderCell: (row: Record<string, unknown>) => {
      const typeInfo = getChannelTypeInfo(row.type as string);
      return (
        <Chip
          size='small'
          label={typeInfo.label}
          sx={{
            fontWeight: 500,
            bgcolor: `${typeInfo.color}15`,
            color: typeInfo.color,
            border: `1px solid ${typeInfo.color}30`,
          }}
        />
      );
    },
  },
  {
    name: 'description',
    label: i18n.t('shared.notification_channel.k6'),
    type: 'textarea',
    showInList: false,
    placeholder: i18n.t('shared.notification_channel.k7'),
  },
  {
    name: 'enabled',
    label: i18n.t('shared.notification_channel.k8'),
    type: 'switch',
    defaultValue: true,
    listWidth: 200,
    renderCell: (row: Record<string, unknown>) => (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ToggleSwitch
            checked={!!row.enabled}
            size='small'
            color={row.enabled ? 'success' : 'default'}
          />
          <Typography
            variant='body2'
            color={row.enabled ? 'success.main' : 'text.disabled'}
          >
            {row.enabled ? i18n.t('shared.notification_channel.k10') : i18n.t('shared.notification_channel.k9')}
          </Typography>
        </Box>
        {!!row.last_test_at && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {row.last_test_status === 'success' ? (
              <CheckCircle
                size={12}
                sx={{ color: 'success.main' }}
              />
            ) : (
              <XCircle
                size={12}
                sx={{ color: 'error.main' }}
              />
            )}
            <Typography
              variant='caption'
              color='text.secondary'
            >
              [i18n.t('schemas.notification_channel.k0')]: {new Date(row.last_test_at as string).toLocaleString('zh-CN')}
            </Typography>
          </Box>
        )}
      </Box>
    ),
  },
  {
    name: 'last_test_at',
    label: i18n.t('shared.notification_channel.k11'),
    type: 'datetime',
    showInList: false,
    showInDetail: true,
    hideInForm: true,
  },
  {
    name: 'last_test_status',
    label: i18n.t('shared.notification_channel.k12'),
    type: 'text',
    showInList: false,
    showInDetail: true,
    hideInForm: true,
  },
  {
    name: 'created_at',
    label: i18n.t('shared.notification_channel.k13'),
    type: 'datetime',
    showInList: false,
    showInDetail: true,
    hideInForm: true,
    sortable: true,
  },
  {
    name: 'updated_at',
    label: i18n.t('shared.notification_channel.k14'),
    type: 'datetime',
    showInList: false,
    showInDetail: true,
    hideInForm: true,
    sortable: true,
  },
  // ── 邮件配置 ──
  {
    name: 'email_smtp_host',
    label: i18n.t('shared.notification_channel.smtp_15'),
    type: 'text',
    showInList: false,
    placeholder: 'smtp.example.com',
    visibleWhen: isEmail,
  },
  {
    name: 'email_smtp_port',
    label: i18n.t('shared.notification_channel.smtp_16'),
    type: 'text',
    defaultValue: '465',
    showInList: false,
    placeholder: '465',
    visibleWhen: isEmail,
  },
  {
    name: 'email_address',
    label: i18n.t('shared.notification_channel.k17'),
    type: 'text',
    showInList: false,
    placeholder: 'noreply@example.com',
    visibleWhen: isEmail,
  },
  {
    name: 'email_username',
    label: i18n.t('shared.notification_channel.smtp_18'),
    type: 'text',
    showInList: false,
    placeholder: 'user@example.com',
    visibleWhen: isEmail,
  },
  {
    name: 'email_password',
    label: i18n.t('shared.notification_channel.smtp_19'),
    type: 'text',
    showInList: false,
    visibleWhen: isEmail,
  },
  // ── 钉钉配置 ──
  {
    name: 'dingtalk_webhook',
    label: i18n.t('shared.notification_channel.webhook_20'),
    type: 'text',
    showInList: false,
    placeholder: 'https://oapi.dingtalk.com/robot/send?access_token=...',
    visibleWhen: isDingtalk,
  },
  {
    name: 'dingtalk_secret',
    label: i18n.t('shared.notification_channel.k21'),
    type: 'text',
    showInList: false,
    placeholder: 'SEC...',
    visibleWhen: isDingtalk,
  },
  // ── 企业微信配置 ──
  {
    name: 'wechat_webhook',
    label: i18n.t('shared.notification_channel.webhook_22'),
    type: 'text',
    showInList: false,
    placeholder: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...',
    visibleWhen: isWechat,
  },
  {
    name: 'wechat_corp_id',
    label: i18n.t('shared.notification_channel.id_23'),
    type: 'text',
    showInList: false,
    placeholder: 'ww...',
    visibleWhen: isWechat,
  },
  {
    name: 'wechat_agent_id',
    label: i18n.t('shared.notification_channel.id_24'),
    type: 'text',
    showInList: false,
    placeholder: '1000001',
    visibleWhen: isWechat,
  },
  // ── 短信配置 ──
  {
    name: 'sms_provider',
    label: i18n.t('shared.notification_channel.k25'),
    type: 'select',
    defaultValue: 'aliyun',
    showInList: false,
    options: {
      type: 'static',
      options: [
        { value: 'aliyun', label: i18n.t('shared.notification_channel.k26') },
        { value: 'tencent', label: i18n.t('shared.notification_channel.k27') },
        { value: 'huawei', label: i18n.t('shared.notification_channel.k28') },
      ],
    },
    visibleWhen: isSms,
  },
  {
    name: 'sms_access_key',
    label: 'Access Key',
    type: 'text',
    showInList: false,
    placeholder: 'LTAI...',
    visibleWhen: isSms,
  },
  {
    name: 'sms_access_secret',
    label: 'Access Secret',
    type: 'text',
    showInList: false,
    visibleWhen: isSms,
  },
  {
    name: 'sms_sign_name',
    label: i18n.t('shared.notification_channel.k29'),
    type: 'text',
    showInList: false,
    placeholder: 'TOPEMS',
    visibleWhen: isSms,
  },
  {
    name: 'sms_template_code',
    label: i18n.t('shared.notification_channel.k30'),
    type: 'text',
    showInList: false,
    placeholder: 'SMS_123456',
    visibleWhen: isSms,
  },
  // ── Webhook 配置 ──
  {
    name: 'webhook_url',
    label: 'Webhook URL',
    type: 'text',
    required: true,
    showInList: false,
    placeholder: 'https://hooks.example.com/monitor',
    visibleWhen: isWebhook,
  },
  {
    name: 'webhook_method',
    label: i18n.t('shared.notification_channel.k31'),
    type: 'select',
    defaultValue: 'POST',
    showInList: false,
    options: {
      type: 'static',
      options: [
        { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' },
        { value: 'GET', label: 'GET' },
      ],
    },
    visibleWhen: isWebhook,
  },
  {
    name: 'webhook_headers',
    label: i18n.t('shared.notification_channel.k32'),
    type: 'textarea',
    showInList: false,
    placeholder: '{"Content-Type": "application/json"}',
    visibleWhen: isWebhook,
  },
];

export const notificationChannelSchema: EntitySchema = {
  entity: 'monitor_notification_channel',
  title: i18n.t('shared.notification_channel.k33'),
  description: i18n.t('shared.notification_channel.k34'),

  api: {
    module: 'monitor',
    resource: 'notificationChannels',
  },

  fields: channelFields,

  list: {
    searchFields: ['name', 'description'],
    pageSize: 10,
    filters: [
      {
        id: 'type',
        label: i18n.t('shared.notification_channel.k35'),
        type: 'select',
        options: [
          { label: i18n.t('shared.notification_channel.k36'), value: 'all' },
          ...CHANNEL_TYPE_OPTIONS.map((t) => ({ label: t.label, value: t.value })),
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('shared.notification_channel.k37'),
      fields: ['name', 'description', 'type'],
    },
    {
      title: i18n.t('shared.notification_channel.k38'),
      fields: [
        'email_smtp_host',
        'email_smtp_port',
        'email_address',
        'email_username',
        'email_password',
        'dingtalk_webhook',
        'dingtalk_secret',
        'wechat_webhook',
        'wechat_corp_id',
        'wechat_agent_id',
        'sms_provider',
        'sms_access_key',
        'sms_access_secret',
        'sms_sign_name',
        'sms_template_code',
        'webhook_url',
        'webhook_method',
        'webhook_headers',
      ],
    },
    {
      title: i18n.t('shared.notification_channel.k39'),
      fields: ['enabled'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('shared.notification_channel.k40'),
  editTitle: i18n.t('shared.notification_channel.k41'),
  detailTitle: i18n.t('shared.notification_channel.k42'),
  detailMaxWidth: 'md',
};
