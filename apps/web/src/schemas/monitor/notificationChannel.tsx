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

const ct= designTokens.colors;

type ChannelType = 'email' | 'dingtalk' | 'wechat' | 'sms' | 'webhook';

export const CHANNEL_TYPE_OPTIONS: {
  value: ChannelType;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  { value: 'email', label: '邮件', icon: <Mail size={18} />, color: ct.primary.dark },
  { value: 'dingtalk', label: '钉钉', icon: <MessageSquare size={18} />, color: ct.success.main },
  { value: 'wechat', label: '企业微信', icon: <MessageSquare size={18} />, color: 'success.main' },
  { value: 'sms', label: '短信', icon: <Smartphone size={18} />, color: 'secondary.main' },
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
    label: '渠道名称',
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
    label: '渠道类型',
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
    label: '渠道描述',
    type: 'textarea',
    showInList: false,
    placeholder: '描述此通知渠道的用途',
  },
  {
    name: 'enabled',
    label: '启用状态',
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
            {row.enabled ? '已启用' : '已停用'}
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
              上次测试: {new Date(row.last_test_at as string).toLocaleString('zh-CN')}
            </Typography>
          </Box>
        )}
      </Box>
    ),
  },
  {
    name: 'last_test_at',
    label: '上次测试时间',
    type: 'datetime',
    showInList: false,
    showInDetail: true,
    hideInForm: true,
  },
  {
    name: 'last_test_status',
    label: '上次测试状态',
    type: 'text',
    showInList: false,
    showInDetail: true,
    hideInForm: true,
  },
  {
    name: 'created_at',
    label: '创建时间',
    type: 'datetime',
    showInList: false,
    showInDetail: true,
    hideInForm: true,
    sortable: true,
  },
  {
    name: 'updated_at',
    label: '更新时间',
    type: 'datetime',
    showInList: false,
    showInDetail: true,
    hideInForm: true,
    sortable: true,
  },
  // ── 邮件配置 ──
  {
    name: 'email_smtp_host',
    label: 'SMTP 服务器地址',
    type: 'text',
    showInList: false,
    placeholder: 'smtp.example.com',
    visibleWhen: isEmail,
  },
  {
    name: 'email_smtp_port',
    label: 'SMTP 端口',
    type: 'text',
    defaultValue: '465',
    showInList: false,
    placeholder: '465',
    visibleWhen: isEmail,
  },
  {
    name: 'email_address',
    label: '发件人邮箱',
    type: 'text',
    showInList: false,
    placeholder: 'noreply@example.com',
    visibleWhen: isEmail,
  },
  {
    name: 'email_username',
    label: 'SMTP 用户名',
    type: 'text',
    showInList: false,
    placeholder: 'user@example.com',
    visibleWhen: isEmail,
  },
  {
    name: 'email_password',
    label: 'SMTP 密码',
    type: 'text',
    showInList: false,
    visibleWhen: isEmail,
  },
  // ── 钉钉配置 ──
  {
    name: 'dingtalk_webhook',
    label: 'Webhook 地址',
    type: 'text',
    showInList: false,
    placeholder: 'https://oapi.dingtalk.com/robot/send?access_token=...',
    visibleWhen: isDingtalk,
  },
  {
    name: 'dingtalk_secret',
    label: '加签密钥 (可选)',
    type: 'text',
    showInList: false,
    placeholder: 'SEC...',
    visibleWhen: isDingtalk,
  },
  // ── 企业微信配置 ──
  {
    name: 'wechat_webhook',
    label: 'Webhook 地址',
    type: 'text',
    showInList: false,
    placeholder: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...',
    visibleWhen: isWechat,
  },
  {
    name: 'wechat_corp_id',
    label: '企业 ID (可选)',
    type: 'text',
    showInList: false,
    placeholder: 'ww...',
    visibleWhen: isWechat,
  },
  {
    name: 'wechat_agent_id',
    label: '应用 ID (可选)',
    type: 'text',
    showInList: false,
    placeholder: '1000001',
    visibleWhen: isWechat,
  },
  // ── 短信配置 ──
  {
    name: 'sms_provider',
    label: '短信服务商',
    type: 'select',
    defaultValue: 'aliyun',
    showInList: false,
    options: {
      type: 'static',
      options: [
        { value: 'aliyun', label: '阿里云短信' },
        { value: 'tencent', label: '腾讯云短信' },
        { value: 'huawei', label: '华为云短信' },
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
    label: '短信签名',
    type: 'text',
    showInList: false,
    placeholder: 'TOPEMS',
    visibleWhen: isSms,
  },
  {
    name: 'sms_template_code',
    label: '模板编码',
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
    label: '请求方法',
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
    label: '自定义 Headers (JSON 格式)',
    type: 'textarea',
    showInList: false,
    placeholder: '{"Content-Type": "application/json"}',
    visibleWhen: isWebhook,
  },
];

export const notificationChannelSchema: EntitySchema = {
  entity: 'monitor_notification_channel',
  title: '通知渠道',
  description: '管理系统告警的通知发送渠道',

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
        label: '渠道类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          ...CHANNEL_TYPE_OPTIONS.map((t) => ({ label: t.label, value: t.value })),
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'description', 'type'],
    },
    {
      title: '渠道配置',
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
      title: '启用状态',
      fields: ['enabled'],
    },
  ],

  formColCount: 2,
  createTitle: '添加通知渠道',
  editTitle: '编辑通知渠道',
  detailTitle: '通知渠道详情',
  detailMaxWidth: 'md',
};
