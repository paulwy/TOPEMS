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

import { useAppStore } from '../../store';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { PageContainer } from '@/components/common';
import ConfirmDialog from '@/components/common/ConfirmDialog';

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' }> = {
  sync: { label: '同步', color: 'success' },
  error: { label: '错误', color: 'error' },
  warning: { label: '警告', color: 'warning' },
};

const STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
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

const mockEvents: IntegrationEvent[] = [
  { id: '1', time: '2024-01-15 10:30:25', event_type: 'sync', connection_name: '金蝶云星空 ERP', description: '采购订单同步完成', records_count: 156, status: 'success' },
  { id: '2', time: '2024-01-15 10:29:10', event_type: 'error', connection_name: 'Salesforce CRM', description: '连接超时，API限流', records_count: 0, status: 'failed' },
  { id: '3', time: '2024-01-15 10:28:45', event_type: 'warning', connection_name: '用友 U8 WMS', description: '部分数据校验失败', records_count: 3, status: 'success' },
  { id: '4', time: '2024-01-15 10:25:00', event_type: 'sync', connection_name: '鼎捷 MES', description: '工单数据同步完成', records_count: 89, status: 'success' },
  { id: '5', time: '2024-01-15 10:20:30', event_type: 'sync', connection_name: 'SAP S/4 HANA', description: '财务主数据同步完成', records_count: 234, status: 'success' },
  { id: '6', time: '2024-01-15 10:15:00', event_type: 'error', connection_name: 'SCM 供应链', description: '网络异常，连接断开', records_count: 0, status: 'failed' },
  { id: '7', time: '2024-01-15 10:10:00', event_type: 'warning', connection_name: 'CRM 客户关系', description: '字段映射缺失，请检查配置', records_count: 12, status: 'success' },
  { id: '8', time: '2024-01-15 10:00:00', event_type: 'sync', connection_name: '金蝶云星空 ERP', description: '库存数据同步完成', records_count: 567, status: 'success' },
];

export const IntegrationEventsPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);
  const [events, setEvents] = useState<IntegrationEvent[]>(mockEvents);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{ title: string; message: string; onConfirm: () => void; danger?: boolean } | null>(null);

  const openConfirmDialog = useCallback((config: { title: string; message: string; onConfirm: () => void; danger?: boolean }) => {
    setConfirmDialogConfig(config);
    setConfirmDialogOpen(true);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setEvents(mockEvents);
    } catch (_err: unknown) {
      addNotification({ title: '加载失败', message: extractErrorMessage(_err, '加载事件日志失败'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const handleRetry = useCallback((eventId: string) => {
    openConfirmDialog({
      title: '确认重试',
      message: '确定要重试此同步任务吗？',
      onConfirm: () => {
        addNotification({ title: '成功', message: '重试任务已提交', type: 'success' });
      },
    });
  }, [addNotification, openConfirmDialog]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch = !searchQuery || event.description.toLowerCase().includes(searchQuery.toLowerCase()) || event.connection_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || event.event_type === typeFilter;
      const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [events, searchQuery, typeFilter, statusFilter]);

  const stats = useMemo(() => [
    { id: 'total', title: '今日事件', value: events.length, icon: <Activity size={20} />, color: 'primary' as const },
    { id: 'success', title: '同步成功', value: events.filter((e) => e.status === 'success').length, icon: <CheckCircle2 size={20} />, color: 'success' as const },
    { id: 'failed', title: '同步失败', value: events.filter((e) => e.status === 'failed').length, icon: <AlertCircle size={20} />, color: 'error' as const },
    { id: 'warning', title: '同步警告', value: events.filter((e) => e.event_type === 'warning').length, icon: <AlertTriangle size={20} />, color: 'warning' as const },
  ], [events]);

  const columns: ColumnDef<IntegrationEvent>[] = useMemo(() => [
    {
      id: 'time',
      label: '时间',
      render: (row) => <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{row.time}</Typography>,
    },
    {
      id: 'event_type',
      label: '事件类型',
      render: (row) => {
        const config = EVENT_TYPE_CONFIG[row.event_type] || { label: row.event_type, color: 'info' as const };
        return <Chip size='small' color={config.color} label={config.label} />;
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
      render: (row) => <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.description}</Typography>,
    },
    {
      id: 'records_count',
      label: '记录数',
      render: (row) => <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{row.records_count > 0 ? row.records_count : '-'}</Typography>,
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => {
        const config = STATUS_CONFIG[row.status] || { label: row.status, color: 'default' as const };
        return <Chip size='small' color={config.color} label={config.label} />;
      },
    },
    {
      id: 'actions',
      label: '操作',
      align: 'right',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
          <Button size='small' variant='text' startIcon={<Eye size={14} />}>详情</Button>
          {row.status === 'failed' && <Button size='small' variant='text' startIcon={<RotateCcw size={14} />} onClick={() => handleRetry(row.id)}>重试</Button>}
        </Box>
      ),
    },
  ], [handleRetry]);

  const filters = useMemo(() => [
    { id: 'type', label: '事件类型', type: 'select' as const, options: [{ label: '全部类型', value: 'all' }, ...Object.entries(EVENT_TYPE_CONFIG).map(([value, config]) => ({ label: config.label, value }))] },
    { id: 'status', label: '状态', type: 'select' as const, options: [{ label: '全部状态', value: 'all' }, ...Object.entries(STATUS_CONFIG).map(([value, config]) => ({ label: config.label, value }))] },
  ], []);

  return (
    <PageContainer headerProps={{ pageIcon: <Activity size={20} />, backButton: { href: '/integration/dashboard' } }}>
      <ListPageTemplate
        title='' subtitle='' columns={columns} data={filteredEvents} loading={loading}
        searchable searchPlaceholder='搜索描述、连接名称...' searchValue={searchQuery} onSearch={setSearchQuery}
        filters={filters} filtersValue={{ type: typeFilter, status: statusFilter }} onFilterChange={(f) => { if (typeof f.type === 'string') setTypeFilter(f.type); if (typeof f.status === 'string') setStatusFilter(f.status); setPage(1); }}
        pagination={{ page, pageSize, total: filteredEvents.length, onPageChange: setPage }}
        actions={[{ label: '刷新', icon: <RefreshCw size={16} />, onClick: loadData, variant: 'outlined' }]}
        onRefresh={loadData} emptyMessage='暂无事件记录' stats={stats}
      />
      <ConfirmDialog isOpen={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} onConfirm={() => { confirmDialogConfig?.onConfirm(); setConfirmDialogOpen(false); }} title={confirmDialogConfig?.title || ''} message={confirmDialogConfig?.message || ''} danger={confirmDialogConfig?.danger} />
    </PageContainer>
  );
};

export default IntegrationEventsPage;
