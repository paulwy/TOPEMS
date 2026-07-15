/**
 * 事件日志页面 - V4.0 标准化改造
 *
 * @module pages/integration
 * @path /integration/events
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Activity,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
} from 'lucide-react';
import { Box, Typography, Chip, Button } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useNotificationStore } from '@/store';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { PageContainer } from '@/components/common';
import { INTEGRATION_PATHS } from '@/modules/integration/config';
import { ConfirmDialog } from '@topems/shared-components';

const EVENT_TYPE_CONFIG: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'info' }
> = {
  sync: { label: '同步', color: 'success' },
  error: { label: '错误', color: 'error' },
  warning: { label: '警告', color: 'warning' },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
  success: { label: '成功', color: 'success' },
  failed: { label: '失败', color: 'error' },
  pending: { label: '进行中', color: 'warning' },
};

interface IntegrationEvent {
  id: string;
  time: string;
  event_type: string;
  connection_name: string;
  description: string;
  records_count: number;
  status: string;
}

export const IntegrationEventsPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const { data: events = [], isLoading: loading } = useQuery<IntegrationEvent[]>({
    queryKey: ['integration-events'],
    queryFn: async () => {
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const retryMutation = useMutation({
    mutationFn: async (_eventId: string) => {
      return;
    },
    onSuccess: () => {
      addNotification({ title: '成功', message: '重试任务已提交', type: 'success' });
    },
    onError: () => {
      addNotification({ title: '失败', message: '重试任务提交失败', type: 'error' });
    },
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

  const openConfirmDialog = useCallback(
    (config: { title: string; message: string; onConfirm: () => void; danger?: boolean }) => {
      setConfirmDialogConfig(config);
      setConfirmDialogOpen(true);
    },
    []
  );

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['integration-events'] });
  }, [queryClient]);

  const handleRetry = useCallback(
    (eventId: string) => {
      openConfirmDialog({
        title: '确认重试',
        message: '确定要重试此同步任务吗？',
        onConfirm: () => {
          retryMutation.mutate(eventId);
        },
      });
    },
    [retryMutation, openConfirmDialog]
  );

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch =
        !searchQuery ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.connection_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || event.event_type === typeFilter;
      const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [events, searchQuery, typeFilter, statusFilter]);

  const stats = useMemo(
    () => [
      {
        id: 'total',
        title: '今日事件',
        value: events.length,
        icon: <Activity size={20} />,
        color: 'primary' as const,
      },
      {
        id: 'success',
        title: '同步成功',
        value: events.filter((e) => e.status === 'success').length,
        icon: <CheckCircle2 size={20} />,
        color: 'success' as const,
      },
      {
        id: 'failed',
        title: '同步失败',
        value: events.filter((e) => e.status === 'failed').length,
        icon: <AlertCircle size={20} />,
        color: 'error' as const,
      },
      {
        id: 'warning',
        title: '同步警告',
        value: events.filter((e) => e.event_type === 'warning').length,
        icon: <AlertTriangle size={20} />,
        color: 'warning' as const,
      },
    ],
    [events]
  );

  const columns: ColumnDef<IntegrationEvent>[] = useMemo(
    () => [
      {
        id: 'time',
        label: '时间',
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontFamily: 'monospace' }}
          >
            {row.time}
          </Typography>
        ),
      },
      {
        id: 'event_type',
        label: '事件类型',
        render: (row) => {
          const config = EVENT_TYPE_CONFIG[row.event_type] || {
            label: row.event_type,
            color: 'info' as const,
          };
          return (
            <Chip
              size='small'
              color={config.color}
              label={config.label}
            />
          );
        },
      },
      {
        id: 'connection_name',
        label: '连接名称',
        render: (row) => <Typography variant='body2'>{row.connection_name}</Typography>,
      },
      {
        id: 'description',
        label: '描述',
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{
              maxWidth: 300,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.description}
          </Typography>
        ),
      },
      {
        id: 'records_count',
        label: '记录数',
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontFamily: 'monospace' }}
          >
            {row.records_count > 0 ? row.records_count : '-'}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => {
          const config = STATUS_CONFIG[row.status] || {
            label: row.status,
            color: 'default' as const,
          };
          return (
            <Chip
              size='small'
              color={config.color}
              label={config.label}
            />
          );
        },
      },
      {
        id: 'actions',
        label: '操作',
        align: 'right',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
            <Button
              size='small'
              variant='text'
              startIcon={<Eye size={14} />}
            >
              详情
            </Button>
            {row.status === 'failed' && (
              <Button
                size='small'
                variant='text'
                startIcon={<RotateCcw size={14} />}
                onClick={() => handleRetry(row.id)}
              >
                重试
              </Button>
            )}
          </Box>
        ),
      },
    ],
    [handleRetry]
  );

  const filters = useMemo(
    () => [
      {
        id: 'type',
        label: '事件类型',
        type: 'select' as const,
        options: [
          { label: '全部类型', value: 'all' },
          ...Object.entries(EVENT_TYPE_CONFIG).map(([value, config]) => ({
            label: config.label,
            value,
          })),
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: [
          { label: '全部状态', value: 'all' },
          ...Object.entries(STATUS_CONFIG).map(([value, config]) => ({
            label: config.label,
            value,
          })),
        ],
      },
    ],
    []
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Activity size={20} />,
        backButton: { href: INTEGRATION_PATHS.dashboard },
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={filteredEvents}
        loading={loading}
        searchable
        searchPlaceholder='搜索描述、连接名称...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filters}
        filtersValue={{ type: typeFilter, status: statusFilter }}
        onFilterChange={(f) => {
          if (typeof f.type === 'string') setTypeFilter(f.type);
          if (typeof f.status === 'string') setStatusFilter(f.status);
          setPage(1);
        }}
        pagination={{ page, pageSize, total: filteredEvents.length, onPageChange: setPage }}
        actions={[
          {
            label: '刷新',
            icon: <RefreshCw size={16} />,
            onClick: handleRefresh,
            variant: 'outlined',
          },
        ]}
        onRefresh={handleRefresh}
        emptyMessage='暂无事件记录'
      />
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogOpen(false);
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </PageContainer>
  );
};

export default IntegrationEventsPage;
