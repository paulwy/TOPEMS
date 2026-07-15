/**
 * MES-ERP 集成页面
 * 管理 MES 生产订单与 ERP 销售订单的同步
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { PageContainer } from '@/components/common';
import { Plus, RefreshCw, Eye, Trash2 } from 'lucide-react';
import {
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';

import {
  ListPageTemplate,
  FormPageTemplate,
  type ColumnDef,
  type RowAction,
  type FormSection,
} from '@/components/templates';
import { integrationApi } from '@/api/integration';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';
import type { MesErpSync, CreateMesErpSyncRequest } from '@/api/integration';
import { apiLogger } from '@/utils/logger';
import { extractErrorMessage } from '@/utils/errors';

// 状态配置
const STATUS_CONFIG: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
  synced: { label: '已同步', color: 'success' },
  pending: { label: '待同步', color: 'warning' },
  failed: { label: '失败', color: 'error' },
};

// 表单字段配置
const FORM_SECTIONS: FormSection[] = [
  {
    id: 'basic',
    title: '基本信息',
    fields: [
      {
        name: 'mes_order_id',
        label: 'MES 订单 ID',
        type: 'text',
        required: true,
        placeholder: '输入 MES 订单 UUID',
      },
      {
        name: 'order_number',
        label: '订单号',
        type: 'text',
        required: true,
        placeholder: '输入订单号',
      },
      {
        name: 'product_name',
        label: '产品名称',
        type: 'text',
        placeholder: '输入产品名称（可选）',
      },
      {
        name: 'quantity',
        label: '数量',
        type: 'number',
        placeholder: '输入数量（可选）',
      },
    ],
  },
];

const IntegrationMesErpPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  // 数据状态
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10 });
  const [searchValue, setSearchValue] = useState('');

  // 弹窗状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSync, setEditingSync] = useState<MesErpSync | null>(null);

  // 加载数据
  const syncsQuery = useQuery({
    queryKey: QUERY_KEYS.INTEGRATION.MES_ERP_SYNCS,
    queryFn: async () => {
      const res = await integrationApi.listMesErpSyncs();
      if (res.success && res.data !== undefined) {
        return res.data;
      }
      throw new Error(res.message || '加载 MES-ERP 同步数据失败');
    },
  });

  const syncs = syncsQuery.data || [];
  const loading = syncsQuery.isLoading;

  const loadData = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INTEGRATION.MES_ERP_SYNCS });
  };

  const createMutation = useMutation({
    mutationFn: async (data: CreateMesErpSyncRequest) => {
      const res = await integrationApi.createMesErpSync(data);
      if (!res.success) throw new Error(res.message || '创建失败');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INTEGRATION.MES_ERP_SYNCS });
      addNotification({ title: '成功', message: '同步记录创建成功', type: 'success' });
      setShowCreateModal(false);
      setEditingSync(null);
    },
    onError: (err: unknown) => {
      apiLogger.error('创建 MES-ERP 同步失败:', err);
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '创建失败'),
        type: 'error',
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await integrationApi.syncMesErp(id);
      if (!res.success) throw new Error(res.message || '同步失败');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INTEGRATION.MES_ERP_SYNCS });
      addNotification({ title: '成功', message: '同步成功', type: 'success' });
    },
    onError: (err: unknown) => {
      apiLogger.error('MES-ERP 同步失败:', err);
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '同步失败'),
        type: 'error',
      });
    },
  });

  // 筛选数据
  const filteredData = React.useMemo(() => {
    if (!searchValue) return syncs;
    const keyword = searchValue.toLowerCase();
    return syncs.filter(
      (sync) =>
        sync.order_number.toLowerCase().includes(keyword) ||
        sync.product_name?.toLowerCase().includes(keyword) ||
        sync.mes_order_id.toLowerCase().includes(keyword)
    );
  }, [syncs, searchValue]);

  // 表格列定义
  const columns: ColumnDef<MesErpSync>[] = [
    {
      id: 'order_number',
      label: '订单号',
      sortable: true,
      render: (row) => (
        <Box>
          <Box sx={{ fontWeight: 500, color: 'text.primary' }}>{row.order_number}</Box>
          <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            ID: {row.mes_order_id.slice(0, 8)}...
          </Box>
        </Box>
      ),
    },
    {
      id: 'product_name',
      label: '产品',
      render: (row) => <Box sx={{ color: 'text.secondary' }}>{row.product_name || '-'}</Box>,
    },
    {
      id: 'quantity',
      label: '数量',
      sortable: true,
      render: (row) => <Box>{row.quantity ?? '-'}</Box>,
    },
    {
      id: 'sync_status',
      label: '状态',
      sortable: true,
      render: (row) => {
        const config = STATUS_CONFIG[row.sync_status] || STATUS_CONFIG.pending;
        return (
          <Chip
            label={config.label}
            color={config.color}
            size='small'
          />
        );
      },
    },
    {
      id: 'last_synced_at',
      label: '最后同步',
      sortable: true,
      render: (row) => (
        <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
          {row.last_synced_at ? new Date(row.last_synced_at).toLocaleString('zh-CN') : '从未同步'}
        </Box>
      ),
    },
    {
      id: 'created_at',
      label: '创建时间',
      sortable: true,
      render: (row) => (
        <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
          {new Date(row.created_at).toLocaleString('zh-CN')}
        </Box>
      ),
    },
  ];

  // 行操作
  const rowActions: RowAction<MesErpSync>[] = [
    {
      label: '查看详情',
      icon: <Eye size={14} />,
      onClick: (row) => setEditingSync(row),
    },
    {
      label: '同步',
      icon: <RefreshCw size={14} />,
      onClick: (row) => handleSync(row.id),
      show: (row) => !row.synced,
    },
    {
      label: '删除',
      icon: <Trash2 size={14} />,
      color: 'error',
      onClick: (row) => handleDelete(row.id),
    },
  ];

  // 处理创建提交
  const handleSubmit = (data: unknown) => {
    if (editingSync) {
      handleCloseModal();
      return;
    }
    const request: CreateMesErpSyncRequest = {
      mes_order_id: (data as Record<string, unknown>).mes_order_id as string,
      order_number: (data as Record<string, unknown>).order_number as string,
      product_name: ((data as Record<string, unknown>).product_name as string) || undefined,
      quantity: ((data as Record<string, unknown>).quantity as string)
        ? parseFloat((data as Record<string, unknown>).quantity as string)
        : undefined,
    };
    createMutation.mutate(request);
  };

  // 处理同步
  const handleSync = (id: string) => {
    syncMutation.mutate(id);
  };

  // 处理删除（后端未实现，仅关闭弹窗提示）
  const handleDelete = (id: string) => {
    if (!confirm('确定要删除此同步记录吗？')) return;
    addNotification({
      title: '提示',
      message: '删除接口尚未实现',
      type: 'warning',
    });
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingSync(null);
  };

  return (
    <PageContainer
      title='MES ↔ ERP 同步'
      subtitle='管理 MES 生产订单与 ERP 销售订单的同步'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={filteredData}
        loading={loading}
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: filteredData.length,
          onPageChange: (page) => setPagination((p) => ({ ...p, page })),
          onPageSizeChange: (pageSize) => setPagination({ page: 0, pageSize }),
        }}
        searchValue={searchValue}
        onSearch={setSearchValue}
        searchable
        searchPlaceholder='搜索订单号或产品...'
        actions={[
          {
            label: '新建同步',
            icon: <Plus size={16} />,
            onClick: () => setShowCreateModal(true),
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        onRefresh={loadData}
        emptyMessage='暂无 MES-ERP 同步记录'
      />

      {/* 创建/编辑弹窗 */}
      <Dialog
        open={showCreateModal || !!editingSync}
        onClose={handleCloseModal}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{editingSync ? '查看同步详情' : '创建 MES-ERP 同步'}</DialogTitle>
        <DialogContent>
          <FormPageTemplate
            title={editingSync ? '查看同步详情' : '创建 MES-ERP 同步'}
            sections={FORM_SECTIONS}
            defaultValues={(editingSync as unknown as Record<string, unknown>) || {}}
            onSubmit={handleSubmit}
            onCancel={handleCloseModal}
            submitting={createMutation.isPending}
            columns={1}
            submitText={editingSync ? '关闭' : '创建'}
            mode={editingSync ? 'view' : 'edit'}
          />
        </DialogContent>
        {!editingSync && (
          <DialogActions>
            <Button
              variant='outlined'
              onClick={handleCloseModal}
            >
              取消
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </PageContainer>
  );
};

export default IntegrationMesErpPage;
