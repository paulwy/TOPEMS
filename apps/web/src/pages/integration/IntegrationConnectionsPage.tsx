/**
 * 连接管理页面 - V4.0 标准化改造
 *
 * @module pages/integration
 * @path /integration/connections
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Plug,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Play,
  Pause,
  TestTube,
  Database,
  Cloud,
} from 'lucide-react';
import { Box, Typography, Chip, Button } from '@mui/material';

import { useAppStore } from '../../store';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { PageContainer } from '@/components/common';
import ConfirmDialog from '@/components/common/ConfirmDialog';

const CONNECTION_TYPE_CONFIG: Record<string, { label: string; color: 'primary' | 'success' | 'info' | 'warning' | 'default' }> = {
  erp: { label: 'ERP', color: 'primary' },
  crm: { label: 'CRM', color: 'success' },
  scm: { label: 'SCM', color: 'info' },
  wms: { label: 'WMS', color: 'warning' },
  mes: { label: 'MES', color: 'default' },
};

const STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  active: { label: '活跃', color: 'success' },
  inactive: { label: '停用', color: 'default' },
  error: { label: '异常', color: 'error' },
  pending: { label: '待配置', color: 'warning' },
};

interface IntegrationConnection {
  id: string;
  name: string;
  type: string;
  status: string;
  sync_frequency: string;
  last_sync_at: string;
  success_count: number;
  error_count: number;
  description?: string;
}

const mockConnections: IntegrationConnection[] = [
  { id: '1', name: '金蝶云星空 ERP', type: 'erp', status: 'active', sync_frequency: '每30分钟', last_sync_at: '2024-01-15 10:30:00', success_count: 1256, error_count: 3, description: '财务、采购、库存数据同步' },
  { id: '2', name: 'Salesforce CRM', type: 'crm', status: 'active', sync_frequency: '每小时', last_sync_at: '2024-01-15 10:00:00', success_count: 890, error_count: 12, description: '客户、商机数据同步' },
  { id: '3', name: '用友 U8 WMS', type: 'wms', status: 'active', sync_frequency: '实时', last_sync_at: '2024-01-15 10:29:00', success_count: 2340, error_count: 5, description: '库存、出入库数据同步' },
  { id: '4', name: '鼎捷 MES', type: 'mes', status: 'inactive', sync_frequency: '每2小时', last_sync_at: '2024-01-14 20:00:00', success_count: 456, error_count: 23, description: '工单、报工数据同步' },
  { id: '5', name: 'SAP S/4 HANA', type: 'erp', status: 'active', sync_frequency: '每6小时', last_sync_at: '2024-01-15 06:00:00', success_count: 234, error_count: 1, description: '财务主数据同步' },
];

export const IntegrationConnectionsPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);
  const [connections, setConnections] = useState<IntegrationConnection[]>(mockConnections);
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
      setConnections(mockConnections);
    } catch (_err: unknown) {
      addNotification({ title: '加载失败', message: extractErrorMessage(_err, '加载连接列表失败'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const handleDelete = useCallback((connectionId: string) => {
    const conn = connections.find((c) => c.id === connectionId);
    openConfirmDialog({
      title: '确认删除',
      message: `确定要删除连接"${conn?.name || ''}"吗？`,
      danger: true,
      onConfirm: () => {
        setConnections((prev) => prev.filter((c) => c.id !== connectionId));
        addNotification({ title: '成功', message: '连接删除成功', type: 'success' });
      },
    });
  }, [connections, addNotification, openConfirmDialog]);

  const filteredConnections = useMemo(() => {
    return connections.filter((conn) => {
      const matchesSearch = !searchQuery || conn.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || conn.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || conn.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [connections, searchQuery, typeFilter, statusFilter]);

  const stats = useMemo(() => [
    { id: 'total', title: '总连接数', value: connections.length, icon: <Plug size={20} />, color: 'primary' as const },
    { id: 'active', title: '活跃连接', value: connections.filter((c) => c.status === 'active').length, icon: <Cloud size={20} />, color: 'success' as const },
    { id: 'inactive', title: '停用连接', value: connections.filter((c) => c.status === 'inactive').length, icon: <Database size={20} />, color: 'default' as const },
    { id: 'errors', title: '异常连接', value: connections.filter((c) => c.status === 'error').length, icon: <Plug size={20} />, color: 'error' as const },
  ], [connections]);

  const columns: ColumnDef<IntegrationConnection>[] = useMemo(() => [
    {
      id: 'name',
      label: '连接名称',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: 'primary.light', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Database size={18} color='primary.main' />
          </Box>
          <Box>
            <Typography variant='body2' sx={{ fontWeight: 500 }}>{row.name}</Typography>
            <Typography variant='caption' color='text.secondary'>{row.description}</Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'type',
      label: '系统类型',
      render: (row) => {
        const config = CONNECTION_TYPE_CONFIG[row.type] || { label: row.type, color: 'default' as const };
        return <Chip size='small' color={config.color} label={config.label} variant='outlined' />;
      },
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
      id: 'sync_frequency',
      label: '同步频率',
      render: (row) => <Typography variant='body2' color='text.secondary'>{row.sync_frequency}</Typography>,
    },
    {
      id: 'last_sync_at',
      label: '最后同步',
      render: (row) => <Typography variant='body2' color='text.secondary'>{row.last_sync_at}</Typography>,
    },
    {
      id: 'stats',
      label: '同步统计',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip size='small' color='success' label={`成功 ${row.success_count}`} sx={{ height: 22 }} />
          {row.error_count > 0 && <Chip size='small' color='error' label={`失败 ${row.error_count}`} sx={{ height: 22 }} />}
        </Box>
      ),
    },
    {
      id: 'actions',
      label: '操作',
      align: 'right',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
          <Button size='small' variant='text' startIcon={<TestTube size={14} />}>测试</Button>
          <Button size='small' variant='text' startIcon={<Edit size={14} />}>编辑</Button>
          <Button size='small' color='error' variant='text' onClick={() => handleDelete(row.id)} startIcon={<Trash2 size={14} />}>删除</Button>
        </Box>
      ),
    },
  ], [handleDelete]);

  const filters = useMemo(() => [
    { id: 'type', label: '系统类型', type: 'select' as const, options: [{ label: '全部类型', value: 'all' }, ...Object.entries(CONNECTION_TYPE_CONFIG).map(([value, config]) => ({ label: config.label, value }))] },
    { id: 'status', label: '状态', type: 'select' as const, options: [{ label: '全部状态', value: 'all' }, ...Object.entries(STATUS_CONFIG).map(([value, config]) => ({ label: config.label, value }))] },
  ], []);

  return (
    <PageContainer headerProps={{ pageIcon: <Plug size={20} />, backButton: { href: '/integration/dashboard' } }}>
      <ListPageTemplate
        title='' subtitle='' columns={columns} data={filteredConnections} loading={loading}
        searchable searchPlaceholder='搜索连接名称...' searchValue={searchQuery} onSearch={setSearchQuery}
        filters={filters} filtersValue={{ type: typeFilter, status: statusFilter }} onFilterChange={(f) => { if (typeof f.type === 'string') setTypeFilter(f.type); if (typeof f.status === 'string') setStatusFilter(f.status); setPage(1); }}
        pagination={{ page, pageSize, total: filteredConnections.length, onPageChange: setPage }}
        actions={[{ label: '刷新', icon: <RefreshCw size={16} />, onClick: loadData, variant: 'outlined' }, { label: '新建连接', icon: <Plus size={16} />, onClick: () => {}, variant: 'contained' }]}
        onRefresh={loadData} emptyMessage='暂无连接'
      />
      <ConfirmDialog isOpen={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} onConfirm={() => { confirmDialogConfig?.onConfirm(); setConfirmDialogOpen(false); }} title={confirmDialogConfig?.title || ''} message={confirmDialogConfig?.message || ''} danger={confirmDialogConfig?.danger} />
    </PageContainer>
  );
};

export default IntegrationConnectionsPage;
