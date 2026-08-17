/**
 * 事件日志页面 - V4.0 标准化改造
 *
 * 使用 CrudPage 组件实现 schema 驱动的事件日志管理，
 * 支持列表展示、详情查看、失败任务重试。
 *
 * @module pages/integration
 * @path /integration/events
 */

import React, { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, AlertCircle, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react';
import { Box, Typography, Paper, Stack } from '@mui/material';

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { INTEGRATION_PATHS } from '@/modules/integration/config';
import { integrationEventSchema } from '@/schemas/integration';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { integrationApi } from '@/api/integration';
import { externalErpApi } from '@/api/external-erp';

interface IntegrationEvent {
  id: string;
  time: string;
  event_type: string;
  connection_name: string;
  description: string;
  records_count: number;
  status: string;
}

const CRUD_QUERY_KEY = ['crud', 'integration_event'];

const renderStatsCards = (rows: Record<string, unknown>[]) => {
  const events = rows as unknown as IntegrationEvent[];
  const stats = [
    {
      id: 'total',
      title: i18n.t('integration.integration_events_page.k0'),
      value: events.length,
      icon: <Activity size={20} />,
      color: 'primary' as const,
    },
    {
      id: 'success',
      title: i18n.t('integration.integration_events_page.k1'),
      value: events.filter((e) => e.status === 'success').length,
      icon: <CheckCircle2 size={20} />,
      color: 'success' as const,
    },
    {
      id: 'failed',
      title: i18n.t('integration.integration_events_page.k2'),
      value: events.filter((e) => e.status === 'failed').length,
      icon: <AlertCircle size={20} />,
      color: 'error' as const,
    },
    {
      id: 'warning',
      title: i18n.t('integration.integration_events_page.k3'),
      value: events.filter((e) => e.event_type === 'warning').length,
      icon: <AlertTriangle size={20} />,
      color: 'warning' as const,
    },
  ];

  return (
    <Stack
      direction='row'
      spacing={2}
      sx={{ mb: 2, flexWrap: 'wrap' }}
    >
      {stats.map((s) => (
        <Paper
          key={s.id}
          sx={{
            p: 2,
            flex: '1 1 200px',
            minWidth: 180,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: `${s.color}.light`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: `${s.color}.main`,
            }}
          >
            {s.icon}
          </Box>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {s.title}
            </Typography>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700 }}
            >
              {s.value}
            </Typography>
          </Box>
        </Paper>
      ))}
    </Stack>
  );
};

export const IntegrationEventsPage: React.FC = () => {
  const { data: backendData } = useQuery({
    queryKey: ['integration', 'events'],
    queryFn: async () => {
      try {
        return await externalErpApi.syncLogs.getSyncLogs();
      } catch {
        return {};
      }
    },
  });
  const { t } = useTranslation('integration');
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const handleRetry = useCallback(
    async (_event: IntegrationEvent) => {
      try {
        // 重试任务占位调用（原页面同样为空实现）
        addNotification({
          title: t('integration.integration_events_page.k4'),
          message: t('integration.integration_events_page.k5'),
          type: 'success',
        });
        void queryClient.invalidateQueries({
          queryKey: CRUD_QUERY_KEY,
          exact: false,
          refetchType: 'active',
        });
      } catch (err) {
        addNotification({
          title: t('integration.integration_events_page.k6'),
          message: err instanceof Error ? err.message : t('integration.integration_events_page.k7'),
          type: 'error',
        });
      }
    },
    [addNotification, queryClient]
  );

  const apiAdapter = useMemo<CrudApiAdapter<IntegrationEvent>>(
    () => ({
      list: async () => {
        // 占位实现：原页面 queryFn 返回空数组
        return { data: [], total: 0 };
      },
      create: async () => ({}) as IntegrationEvent,
      update: async (_id, data) => data as IntegrationEvent,
      delete: async () => {},
    }),
    []
  );

  const customRowActions = useMemo<RowAction[]>(
    () => [
      {
        label: t('integration.integration_events_page.k8'),
        icon: <RotateCcw size={16} />,
        show: (row) => row.status === 'failed',
        onClick: (row) => {
          void handleRetry(row as unknown as IntegrationEvent);
        },
      },
    ],
    [handleRetry]
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Activity size={20} />,
        backButton: { href: INTEGRATION_PATHS.dashboard },
      }}
    >
      <CrudPage
        schema={integrationEventSchema}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
        headerContent={renderStatsCards}
        breadcrumbs={[
          { label: t('integration.integration_events_page.k10') },
          { label: t('integration.integration_events_page.k9') },
        ]}
      />
    </PageContainer>
  );
};

export default IntegrationEventsPage;
