import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Switch,
  IconButton,
  Tooltip,
  Chip,
  Paper,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  InputAdornment,
  Grid,
  Divider,
} from '@mui/material';
import {
  Plus,
  Edit3,
  Trash2,
  TestTube,
  Mail,
  MessageSquare,
  Smartphone,
  Webhook,
  CheckCircle,
  XCircle,
  Settings,
  Bell,
  Send,
  Link,
  Radio,
} from 'lucide-react';
import { PageContainer, Dialog } from '@/components/common';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import type { ColumnDef } from '@/components/templates/ListPageTemplate';
import { useNotification } from '@/hooks/useNotification';
import { apiLogger } from '@/utils/logger';

// ============ 类型定义 ============

interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'dingtalk' | 'wechat' | 'sms' | 'webhook';
  config: Record<string, string>;
  enabled: boolean;
  description?: string;
  last_test_at?: string;
  last_test_status?: 'success' | 'failed';
  created_at?: string;
  updated_at?: string;
}

interface ChannelFormData {
  name: string;
  type: NotificationChannel['type'];
  enabled: boolean;
  description: string;
  email_address?: string;
  email_smtp_host?: string;
  email_smtp_port?: string;
  email_username?: string;
  email_password?: string;
  dingtalk_webhook?: string;
  dingtalk_secret?: string;
  wechat_webhook?: string;
  wechat_corp_id?: string;
  wechat_agent_id?: string;
  sms_provider?: string;
  sms_access_key?: string;
  sms_access_secret?: string;
  sms_sign_name?: string;
  sms_template_code?: string;
  webhook_url?: string;
  webhook_method?: string;
  webhook_headers?: string;
}

const initialFormData: ChannelFormData = {
  name: '',
  type: 'email',
  enabled: true,
  description: '',
  email_address: '',
  email_smtp_host: '',
  email_smtp_port: '465',
  email_username: '',
  email_password: '',
  dingtalk_webhook: '',
  dingtalk_secret: '',
  wechat_webhook: '',
  wechat_corp_id: '',
  wechat_agent_id: '',
  sms_provider: 'aliyun',
  sms_access_key: '',
  sms_access_secret: '',
  sms_sign_name: '',
  sms_template_code: '',
  webhook_url: '',
  webhook_method: 'POST',
  webhook_headers: '',
};

const CHANNEL_TYPE_OPTIONS: {
  value: NotificationChannel['type'];
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  { value: 'email', label: '邮件', icon: <Mail size={18} />, color: '#1976D2' },
  { value: 'dingtalk', label: '钉钉', icon: <MessageSquare size={18} />, color: '#00C897' },
  { value: 'wechat', label: '企业微信', icon: <MessageSquare size={18} />, color: '#22C55E' },
  { value: 'sms', label: '短信', icon: <Smartphone size={18} />, color: '#8B5CF6' },
  { value: 'webhook', label: 'Webhook', icon: <Webhook size={18} />, color: '#F59E0B' },
];

// ============ 示例数据 ============

const MOCK_CHANNELS: NotificationChannel[] = [
  {
    id: 'CH001',
    name: '运维组邮件通知',
    type: 'email',
    config: { email_address: 'ops@company.com', smtp_host: 'smtp.company.com' },
    enabled: true,
    description: '运维团队邮件告警通知',
    last_test_at: '2025-06-20T10:00:00Z',
    last_test_status: 'success',
    created_at: '2025-05-01T08:00:00Z',
    updated_at: '2025-06-20T10:00:00Z',
  },
  {
    id: 'CH002',
    name: '钉钉告警机器人',
    type: 'dingtalk',
    config: { webhook: 'https://oapi.dingtalk.com/robot/send?access_token=xxx' },
    enabled: true,
    description: '钉钉群告警通知机器人',
    last_test_at: '2025-06-19T14:30:00Z',
    last_test_status: 'success',
    created_at: '2025-05-15T09:00:00Z',
    updated_at: '2025-06-19T14:30:00Z',
  },
  {
    id: 'CH003',
    name: '企业微信通知',
    type: 'wechat',
    config: { webhook: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx' },
    enabled: true,
    description: '企业微信告警通知',
    last_test_at: '2025-06-18T16:00:00Z',
    last_test_status: 'success',
    created_at: '2025-05-20T11:00:00Z',
    updated_at: '2025-06-18T16:00:00Z',
  },
  {
    id: 'CH004',
    name: '紧急短信通知',
    type: 'sms',
    config: { provider: 'aliyun', sign_name: 'TOPEMS' },
    enabled: false,
    description: '仅严重告警时发送短信',
    last_test_at: '2025-06-15T08:00:00Z',
    last_test_status: 'failed',
    created_at: '2025-06-01T10:00:00Z',
    updated_at: '2025-06-15T08:00:00Z',
  },
  {
    id: 'CH005',
    name: '自定义 Webhook',
    type: 'webhook',
    config: { url: 'https://hooks.example.com/monitor', method: 'POST' },
    enabled: true,
    description: '自定义系统告警 Webhook 回调',
    last_test_at: '2025-06-21T09:00:00Z',
    last_test_status: 'success',
    created_at: '2025-06-10T13:00:00Z',
    updated_at: '2025-06-21T09:00:00Z',
  },
];

// ============ 通知渠道配置页面 ============

const MonitorNotificationPage: React.FC = () => {
  const { error: notifyError, success: notifySuccess } = useNotification();
  const [channels, setChannels] = useState<NotificationChannel[]>(MOCK_CHANNELS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null);
  const [formData, setFormData] = useState<ChannelFormData>(initialFormData);
  const [testLoading, setTestLoading] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    channelId: string;
    success: boolean;
    message: string;
  } | null>(null);

  // 打开新建对话框
  const handleCreate = useCallback(() => {
    setEditingChannel(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  }, []);

  // 打开编辑对话框
  const handleEdit = useCallback((channel: NotificationChannel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      type: channel.type,
      enabled: channel.enabled,
      description: channel.description || '',
      email_address: channel.config.email_address || '',
      email_smtp_host: channel.config.smtp_host || '',
      email_smtp_port: channel.config.smtp_port || '465',
      email_username: channel.config.username || '',
      email_password: channel.config.password || '',
      dingtalk_webhook: channel.config.webhook || '',
      dingtalk_secret: channel.config.secret || '',
      wechat_webhook: channel.config.webhook || '',
      wechat_corp_id: channel.config.corp_id || '',
      wechat_agent_id: channel.config.agent_id || '',
      sms_provider: channel.config.provider || 'aliyun',
      sms_access_key: channel.config.access_key || '',
      sms_access_secret: channel.config.access_secret || '',
      sms_sign_name: channel.config.sign_name || '',
      sms_template_code: channel.config.template_code || '',
      webhook_url: channel.config.url || '',
      webhook_method: channel.config.method || 'POST',
      webhook_headers: channel.config.headers || '',
    });
    setDialogOpen(true);
  }, []);

  // 保存渠道
  const handleSave = useCallback(() => {
    if (!formData.name.trim()) {
      notifyError('请输入渠道名称');
      return;
    }

    const configMap: Record<string, Record<string, string>> = {
      email: {
        email_address: formData.email_address || '',
        smtp_host: formData.email_smtp_host || '',
        smtp_port: formData.email_smtp_port || '465',
        username: formData.email_username || '',
        password: formData.email_password || '',
      },
      dingtalk: {
        webhook: formData.dingtalk_webhook || '',
        secret: formData.dingtalk_secret || '',
      },
      wechat: {
        webhook: formData.wechat_webhook || '',
        corp_id: formData.wechat_corp_id || '',
        agent_id: formData.wechat_agent_id || '',
      },
      sms: {
        provider: formData.sms_provider || 'aliyun',
        access_key: formData.sms_access_key || '',
        access_secret: formData.sms_access_secret || '',
        sign_name: formData.sms_sign_name || '',
        template_code: formData.sms_template_code || '',
      },
      webhook: {
        url: formData.webhook_url || '',
        method: formData.webhook_method || 'POST',
        headers: formData.webhook_headers || '',
      },
    };

    if (editingChannel) {
      setChannels((prev) =>
        prev.map((ch) =>
          ch.id === editingChannel.id
            ? {
                ...ch,
                name: formData.name,
                type: formData.type,
                enabled: formData.enabled,
                description: formData.description,
                config: configMap[formData.type],
                updated_at: new Date().toISOString(),
              }
            : ch
        )
      );
      notifySuccess('通知渠道已更新');
    } else {
      const newChannel: NotificationChannel = {
        id: `CH${String(channels.length + 1).padStart(3, '0')}`,
        name: formData.name,
        type: formData.type,
        config: configMap[formData.type],
        enabled: formData.enabled,
        description: formData.description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setChannels((prev) => [...prev, newChannel]);
      notifySuccess('通知渠道已创建');
    }
    setDialogOpen(false);
  }, [formData, editingChannel, channels.length, notifySuccess, notifyError]);

  // 删除渠道
  const handleDelete = useCallback(
    (channel: NotificationChannel) => {
      setChannels((prev) => prev.filter((ch) => ch.id !== channel.id));
      notifySuccess('通知渠道已删除');
    },
    [notifySuccess]
  );

  // 切换渠道启用状态
  const handleToggleEnabled = useCallback(
    (channel: NotificationChannel) => {
      setChannels((prev) =>
        prev.map((ch) =>
          ch.id === channel.id
            ? { ...ch, enabled: !ch.enabled, updated_at: new Date().toISOString() }
            : ch
        )
      );
      notifySuccess(channel.enabled ? '渠道已停用' : '渠道已启用');
    },
    [notifySuccess]
  );

  // 测试通知
  const handleTest = useCallback(
    async (channel: NotificationChannel) => {
      setTestLoading(channel.id);
      setTestResult(null);

      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // 模拟测试结果
        const success = channel.last_test_status !== 'failed';
        setChannels((prev) =>
          prev.map((ch) =>
            ch.id === channel.id
              ? {
                  ...ch,
                  last_test_at: new Date().toISOString(),
                  last_test_status: success ? 'success' : 'failed',
                }
              : ch
          )
        );
        setTestResult({
          channelId: channel.id,
          success,
          message: success
            ? `测试通知已通过 ${CHANNEL_TYPE_OPTIONS.find((t) => t.value === channel.type)?.label} 渠道发送成功`
            : `测试通知发送失败，请检查 ${channel.name} 的配置`,
        });
        if (success) {
          notifySuccess('测试通知发送成功');
        } else {
          notifyError('测试通知发送失败');
        }
      } catch (err: any) {
        apiLogger.error('测试通知失败:', err);
        setTestResult({
          channelId: channel.id,
          success: false,
          message: '测试通知发送异常，请稍后重试',
        });
        notifyError('测试通知发送异常');
      } finally {
        setTestLoading(null);
      }
    },
    [notifySuccess, notifyError]
  );

  const getChannelTypeInfo = (type: string) => {
    return (
      CHANNEL_TYPE_OPTIONS.find((t) => t.value === type) || {
        label: type,
        icon: <Bell size={18} />,
        color: '#6B7280',
      }
    );
  };

  const renderConfigFields = () => {
    switch (formData.type) {
      case 'email':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography
              variant='subtitle2'
              color='text.secondary'
            >
              邮件服务器配置
            </Typography>
            <TextField
              label='SMTP 服务器地址'
              value={formData.email_smtp_host}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email_smtp_host: e.target.value }))
              }
              placeholder='smtp.example.com'
              fullWidth
              size='small'
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label='SMTP 端口'
                value={formData.email_smtp_port}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email_smtp_port: e.target.value }))
                }
                placeholder='465'
                size='small'
                sx={{ flex: 0.5 }}
              />
            </Box>
            <TextField
              label='发件人邮箱'
              value={formData.email_address}
              onChange={(e) => setFormData((prev) => ({ ...prev, email_address: e.target.value }))}
              placeholder='noreply@example.com'
              fullWidth
              size='small'
            />
            <TextField
              label='SMTP 用户名'
              value={formData.email_username}
              onChange={(e) => setFormData((prev) => ({ ...prev, email_username: e.target.value }))}
              placeholder='user@example.com'
              fullWidth
              size='small'
            />
            <TextField
              label='SMTP 密码'
              value={formData.email_password}
              onChange={(e) => setFormData((prev) => ({ ...prev, email_password: e.target.value }))}
              type='password'
              fullWidth
              size='small'
            />
          </Box>
        );
      case 'dingtalk':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography
              variant='subtitle2'
              color='text.secondary'
            >
              钉钉机器人配置
            </Typography>
            <TextField
              label='Webhook 地址'
              value={formData.dingtalk_webhook}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, dingtalk_webhook: e.target.value }))
              }
              placeholder='https://oapi.dingtalk.com/robot/send?access_token=...'
              fullWidth
              size='small'
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Link size={16} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              label='加签密钥 (可选)'
              value={formData.dingtalk_secret}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, dingtalk_secret: e.target.value }))
              }
              placeholder='SEC...'
              fullWidth
              size='small'
            />
          </Box>
        );
      case 'wechat':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography
              variant='subtitle2'
              color='text.secondary'
            >
              企业微信配置
            </Typography>
            <TextField
              label='Webhook 地址'
              value={formData.wechat_webhook}
              onChange={(e) => setFormData((prev) => ({ ...prev, wechat_webhook: e.target.value }))}
              placeholder='https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...'
              fullWidth
              size='small'
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Link size={16} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              label='企业 ID (可选)'
              value={formData.wechat_corp_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, wechat_corp_id: e.target.value }))}
              placeholder='ww...'
              fullWidth
              size='small'
            />
            <TextField
              label='应用 ID (可选)'
              value={formData.wechat_agent_id}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, wechat_agent_id: e.target.value }))
              }
              placeholder='1000001'
              fullWidth
              size='small'
            />
          </Box>
        );
      case 'sms':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography
              variant='subtitle2'
              color='text.secondary'
            >
              短信服务配置
            </Typography>
            <FormControl
              size='small'
              fullWidth
            >
              <InputLabel>短信服务商</InputLabel>
              <Select
                value={formData.sms_provider}
                label='短信服务商'
                onChange={(e) => setFormData((prev) => ({ ...prev, sms_provider: e.target.value }))}
              >
                <MenuItem value='aliyun'>阿里云短信</MenuItem>
                <MenuItem value='tencent'>腾讯云短信</MenuItem>
                <MenuItem value='huawei'>华为云短信</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label='Access Key'
              value={formData.sms_access_key}
              onChange={(e) => setFormData((prev) => ({ ...prev, sms_access_key: e.target.value }))}
              placeholder='LTAI...'
              fullWidth
              size='small'
            />
            <TextField
              label='Access Secret'
              value={formData.sms_access_secret}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, sms_access_secret: e.target.value }))
              }
              type='password'
              fullWidth
              size='small'
            />
            <TextField
              label='短信签名'
              value={formData.sms_sign_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, sms_sign_name: e.target.value }))}
              placeholder='TOPEMS'
              fullWidth
              size='small'
            />
            <TextField
              label='模板编码'
              value={formData.sms_template_code}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, sms_template_code: e.target.value }))
              }
              placeholder='SMS_123456'
              fullWidth
              size='small'
            />
          </Box>
        );
      case 'webhook':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography
              variant='subtitle2'
              color='text.secondary'
            >
              Webhook 配置
            </Typography>
            <TextField
              label='Webhook URL'
              value={formData.webhook_url}
              onChange={(e) => setFormData((prev) => ({ ...prev, webhook_url: e.target.value }))}
              placeholder='https://hooks.example.com/monitor'
              fullWidth
              size='small'
              required
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Link size={16} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <FormControl
              size='small'
              fullWidth
            >
              <InputLabel>请求方法</InputLabel>
              <Select
                value={formData.webhook_method}
                label='请求方法'
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, webhook_method: e.target.value }))
                }
              >
                <MenuItem value='POST'>POST</MenuItem>
                <MenuItem value='PUT'>PUT</MenuItem>
                <MenuItem value='GET'>GET</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label='自定义 Headers (JSON 格式)'
              value={formData.webhook_headers}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, webhook_headers: e.target.value }))
              }
              placeholder='{"Content-Type": "application/json"}'
              fullWidth
              size='small'
              multiline
              rows={2}
            />
          </Box>
        );
      default:
        return null;
    }
  };

  const columns = useMemo(
    (): ColumnDef<NotificationChannel>[] => [
      {
        id: 'name',
        label: '渠道名称',
        sortable: true,
        render: (row: NotificationChannel) => {
          const typeInfo = getChannelTypeInfo(row.type);
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
                  {row.name}
                </Typography>
                {row.description && (
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {row.description}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        },
      },
      {
        id: 'type',
        label: '渠道类型',
        render: (row: NotificationChannel) => {
          const typeInfo = getChannelTypeInfo(row.type);
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
        id: 'status',
        label: '状态',
        render: (row: NotificationChannel) => (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Switch
                checked={row.enabled}
                onChange={() => handleToggleEnabled(row)}
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
            {/* 上次测试状态 */}
            {row.last_test_at && (
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
                  上次测试: {new Date(row.last_test_at).toLocaleString('zh-CN')}
                </Typography>
              </Box>
            )}
          </Box>
        ),
      },
      {
        id: 'actions',
        label: '操作',
        align: 'right',
        render: (row: NotificationChannel) => (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
            <Tooltip title='编辑'>
              <IconButton
                size='small'
                onClick={() => handleEdit(row)}
              >
                <Edit3 size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title='发送测试通知'>
              <IconButton
                size='small'
                onClick={() => handleTest(row)}
              >
                {testLoading === row.id ? <CircularProgress size={16} /> : <TestTube size={16} />}
              </IconButton>
            </Tooltip>
            <Tooltip title='删除'>
              <IconButton
                size='small'
                color='error'
                onClick={() => handleDelete(row)}
              >
                <Trash2 size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [handleToggleEnabled, handleEdit, handleDelete, handleTest, testLoading]
  );

  return (
    <PageContainer
      title='通知渠道配置'
      subtitle='管理系统告警的通知发送渠道'
      headerProps={{
        pageIcon: <Bell style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)',
      }}
    >
      {/* 测试结果提示 */}
      {testResult && (
        <Alert
          severity={testResult.success ? 'success' : 'error'}
          sx={{ mb: 2 }}
          onClose={() => setTestResult(null)}
        >
          {testResult.message}
        </Alert>
      )}

      {/* 渠道类型概览 */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Typography
          variant='subtitle2'
          sx={{ mb: 1.5, fontWeight: 600 }}
        >
          支持的通知渠道类型
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {CHANNEL_TYPE_OPTIONS.map((type) => {
            const count = channels.filter((ch) => ch.type === type.value).length;
            const enabledCount = channels.filter(
              (ch) => ch.type === type.value && ch.enabled
            ).length;
            return (
              <Box
                key={type.value}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  py: 1.5,
                  borderRadius: 1.5,
                  bgcolor: `${type.color}08`,
                  border: `1px solid ${type.color}20`,
                  minWidth: 140,
                }}
              >
                <Box sx={{ color: type.color }}>{type.icon}</Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {type.label}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {count} 个渠道, {enabledCount} 已启用
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Paper>

      <ListPageTemplate<NotificationChannel>
        title='通知渠道'
        subtitle={`共 ${channels.length} 个渠道`}
        columns={columns}
        data={channels}
        getRowId={(row) => row.id}
        searchable
        searchPlaceholder='搜索渠道名称...'
        primaryActionButton={{
          label: '添加渠道',
          icon: <Plus size={18} />,
          onClick: handleCreate,
        }}
        onRefresh={() => {}}
        filters={[
          {
            id: 'type',
            label: '渠道类型',
            options: CHANNEL_TYPE_OPTIONS.map((t) => ({ label: t.label, value: t.value })),
          },
        ]}
      />

      {/* 渠道创建/编辑对话框 */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingChannel ? '编辑通知渠道' : '添加通知渠道'}
        maxWidth='md'
        confirmButton={{
          label: editingChannel ? '保存' : '创建',
          onClick: handleSave,
        }}
        cancelButton={{
          label: '取消',
          onClick: () => setDialogOpen(false),
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          {/* 渠道名称 */}
          <TextField
            label='渠道名称'
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder='例如：运维组钉钉通知'
            fullWidth
            size='small'
            required
          />

          {/* 描述 */}
          <TextField
            label='渠道描述'
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder='描述此通知渠道的用途'
            fullWidth
            size='small'
            multiline
            rows={2}
          />

          {/* 渠道类型 */}
          <FormControl
            size='small'
            fullWidth
          >
            <InputLabel>渠道类型</InputLabel>
            <Select
              value={formData.type}
              label='渠道类型'
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  type: e.target.value as NotificationChannel['type'],
                }))
              }
            >
              {CHANNEL_TYPE_OPTIONS.map((opt) => (
                <MenuItem
                  key={opt.value}
                  value={opt.value}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ color: opt.color }}>{opt.icon}</Box>
                    {opt.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider />

          {/* 动态配置字段 */}
          {renderConfigFields()}

          <Divider />

          {/* 启用状态 */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                启用此渠道
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                启用后，关联的告警规则将通过此渠道发送通知
              </Typography>
            </Box>
            <Switch
              checked={formData.enabled}
              onChange={(e) => setFormData((prev) => ({ ...prev, enabled: e.target.checked }))}
            />
          </Box>
        </Box>
      </Dialog>
    </PageContainer>
  );
};

export default MonitorNotificationPage;
