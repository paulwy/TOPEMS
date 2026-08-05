/**
 * 通知渠道配置页面
 *
 * 使用 CrudPage 组件实现 schema 驱动的通知渠道管理，
 * 支持列表展示、创建、编辑、删除、测试通知、启用/停用等操作。
 *
 * @module pages/monitor
 * @path /monitor/notifications
 */

import React, { useMemo, useRef, useCallback, useState } from 'react';
import { Box, Typography, Paper, Alert } from '@mui/material';
import { Bell, TestTube, Power } from 'lucide-react';
import { LoadingSpinner } from '@topems/shared-components';

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { ColumnDef, RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { useNotification } from '@/hooks/useNotification';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import {
  notificationChannelSchema,
  CHANNEL_TYPE_OPTIONS,
  getChannelTypeInfo,
  ToggleSwitch,
} from '@/schemas/monitor';

const ct = designTokens.colors;

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

const buildConfigMap = (
  data: Partial<NotificationChannel> & Record<string, unknown>
): Record<string, string> => {
  const type = data.type as NotificationChannel['type'];
  const configMap: Record<string, Record<string, string>> = {
    email: {
      email_address: (data.email_address as string) || '',
      smtp_host: (data.email_smtp_host as string) || '',
      smtp_port: (data.email_smtp_port as string) || '465',
      username: (data.email_username as string) || '',
      password: (data.email_password as string) || '',
    },
    dingtalk: {
      webhook: (data.dingtalk_webhook as string) || '',
      secret: (data.dingtalk_secret as string) || '',
    },
    wechat: {
      webhook: (data.wechat_webhook as string) || '',
      corp_id: (data.wechat_corp_id as string) || '',
      agent_id: (data.wechat_agent_id as string) || '',
    },
    sms: {
      provider: (data.sms_provider as string) || 'aliyun',
      access_key: (data.sms_access_key as string) || '',
      access_secret: (data.sms_access_secret as string) || '',
      sign_name: (data.sms_sign_name as string) || '',
      template_code: (data.sms_template_code as string) || '',
    },
    webhook: {
      url: (data.webhook_url as string) || '',
      method: (data.webhook_method as string) || 'POST',
      headers: (data.webhook_headers as string) || '',
    },
  };
  return configMap[type] || {};
};

const MonitorNotificationPage: React.FC = () => {
  const { error: notifyError, success: notifySuccess } = useNotification();
  const channelsRef = useRef<NotificationChannel[]>(MOCK_CHANNELS);
  const [testLoading, setTestLoading] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    channelId: string;
    success: boolean;
    message: string;
  } | null>(null);

  const handleToggleEnabled = useCallback(
    (channel: NotificationChannel) => {
      channelsRef.current = channelsRef.current.map((ch) =>
        ch.id === channel.id
          ? { ...ch, enabled: !ch.enabled, updated_at: new Date().toISOString() }
          : ch
      );
      notifySuccess(channel.enabled ? '渠道已停用' : '渠道已启用');
    },
    [notifySuccess]
  );

  const handleTest = useCallback(
    async (channel: NotificationChannel) => {
      setTestLoading(channel.id);
      setTestResult(null);

      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const success = channel.last_test_status !== 'failed';
        channelsRef.current = channelsRef.current.map((ch) =>
          ch.id === channel.id
            ? {
                ...ch,
                last_test_at: new Date().toISOString(),
                last_test_status: success ? ('success' as const) : ('failed' as const),
              }
            : ch
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
      } catch (err: unknown) {
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

  const apiAdapter = useMemo<CrudApiAdapter<NotificationChannel>>(
    () => ({
      list: async (params) => {
        let filtered = channelsRef.current;
        const type = params?.type as string | undefined;
        if (type && type !== 'all') {
          filtered = filtered.filter((c) => c.type === type);
        }
        const search = params?.search as string | undefined;
        if (search) {
          const query = search.toLowerCase();
          filtered = filtered.filter(
            (c) =>
              c.name.toLowerCase().includes(query) ||
              (c.description || '').toLowerCase().includes(query)
          );
        }
        return { data: [...filtered], total: filtered.length };
      },
      create: async (data) => {
        const newChannel: NotificationChannel = {
          id: `CH${String(channelsRef.current.length + 1).padStart(3, '0')}`,
          name: (data.name as string) || '',
          type: (data.type as NotificationChannel['type']) || 'email',
          config: buildConfigMap(data),
          enabled: data.enabled !== undefined ? !!data.enabled : true,
          description: (data.description as string) || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        channelsRef.current = [...channelsRef.current, newChannel];
        notifySuccess('通知渠道已创建');
        return newChannel;
      },
      update: async (id, data) => {
        const existing = channelsRef.current.find((c) => c.id === id);
        if (!existing) throw new Error('渠道不存在');
        const updated: NotificationChannel = {
          ...existing,
          name: (data.name as string) ?? existing.name,
          type: (data.type as NotificationChannel['type']) ?? existing.type,
          enabled: data.enabled !== undefined ? !!data.enabled : existing.enabled,
          description: (data.description as string) ?? existing.description,
          config: data.type !== undefined ? buildConfigMap(data) : existing.config,
          updated_at: new Date().toISOString(),
        };
        channelsRef.current = channelsRef.current.map((c) => (c.id === id ? updated : c));
        notifySuccess('通知渠道已更新');
        return updated;
      },
      delete: async (id) => {
        channelsRef.current = channelsRef.current.filter((c) => c.id !== id);
        notifySuccess('通知渠道已删除');
      },
    }),
    [notifySuccess, notifyError]
  );

  const customColumns = useMemo<ColumnDef[]>(
    () => [
      {
        id: 'name',
        label: '渠道名称',
        minWidth: 240,
        render: (row) => {
          const channel = row as unknown as NotificationChannel;
          const typeInfo = getChannelTypeInfo(channel.type);
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
                  {channel.name}
                </Typography>
                {channel.description && (
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {channel.description}
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
        width: 140,
        render: (row) => {
          const channel = row as unknown as NotificationChannel;
          const typeInfo = getChannelTypeInfo(channel.type);
          return (
            <Box
              component='span'
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                bgcolor: `${typeInfo.color}15`,
                color: typeInfo.color,
                border: `1px solid ${typeInfo.color}30`,
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
            >
              {typeInfo.label}
            </Box>
          );
        },
      },
      {
        id: 'enabled',
        label: '状态',
        width: 200,
        render: (row) => {
          const channel = row as unknown as NotificationChannel;
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ToggleSwitch
                  checked={channel.enabled}
                  size='small'
                  color={channel.enabled ? 'success' : 'default'}
                  onChange={() => handleToggleEnabled(channel)}
                />
                <Typography
                  variant='body2'
                  color={channel.enabled ? 'success.main' : 'text.disabled'}
                >
                  {channel.enabled ? '已启用' : '已停用'}
                </Typography>
              </Box>
              {channel.last_test_at && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {channel.last_test_status === 'success' ? (
                    <Box
                      component='span'
                      sx={{ color: 'success.main', display: 'inline-flex' }}
                    >
                      ✓
                    </Box>
                  ) : (
                    <Box
                      component='span'
                      sx={{ color: 'error.main', display: 'inline-flex' }}
                    >
                      ✗
                    </Box>
                  )}
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    上次测试: {new Date(channel.last_test_at).toLocaleString('zh-CN')}
                  </Typography>
                </Box>
              )}
            </Box>
          );
        },
      },
    ],
    [handleToggleEnabled]
  );

  const customRowActions = useMemo<RowAction[]>(
    () => [
      {
        label: '启用/停用',
        icon: <Power size={16} />,
        onClick: (row: Record<string, unknown>) => {
          const channel = row as unknown as NotificationChannel;
          handleToggleEnabled(channel);
        },
      },
      {
        label: '发送测试通知',
        icon: testLoading ? <LoadingSpinner size='sm' /> : <TestTube size={16} />,
        onClick: (row: Record<string, unknown>) => {
          const channel = row as unknown as NotificationChannel;
          void handleTest(channel);
        },
      },
    ],
    [handleToggleEnabled, handleTest, testLoading]
  );

  const headerContent = useCallback(
    (rows: Record<string, unknown>[]) => {
      const channels = rows as unknown as NotificationChannel[];
      return (
        <>
          {testResult && (
            <Alert
              severity={testResult.success ? 'success' : 'error'}
              sx={{ mb: 2 }}
              onClose={() => setTestResult(null)}
            >
              {testResult.message}
            </Alert>
          )}
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
        </>
      );
    },
    [testResult]
  );

  return (
    <PageContainer
      title='通知渠道配置'
      subtitle='管理系统告警的通知发送渠道'
      headerProps={{
        pageIcon: <Bell size={20} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.dark} 0%, ${ct.primary[800]} 100%)`,
      }}
    >
      <CrudPage
        schema={notificationChannelSchema}
        apiAdapter={apiAdapter}
        customColumns={customColumns}
        customRowActions={customRowActions}
        headerContent={headerContent}
        breadcrumbs={[{ label: '监控' }, { label: '通知渠道' }]}
      />
    </PageContainer>
  );
};

export default MonitorNotificationPage;
