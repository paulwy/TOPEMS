/**
 * MES-ERP 集成页面
 * 管理 MES 生产订单与 ERP 销售订单的同步
 */

import React, { useState, useCallback } from 'react';
import { Plus, RefreshCw, Eye, Trash2 } from 'lucide-react';
import { Box, Chip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Button } from '@mui/material';

import {
  ListPageTemplate,
  FormPageTemplate,
  type ColumnDef,
  type RowAction,
  type FormSection,
} from '@/components/templates';
import { integrationApi } from '@/api/integration';
import type { MesErpSync, CreateMesErpSyncRequest } from '@/api/integration';
import { logger } from '@/utils/logger';

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
  // 数据状态
  const [syncs, setSyncs] = useState<MesErpSync[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10 });
  const [searchValue, setSearchValue] = useState('');

  // 弹窗状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSync, setEditingSync] = useState<MesErpSync | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await integrationApi.listMesErpSyncs();
      if (res.success && res.data !== undefined) {
        setSyncs(res.data);
      }
    } catch (error: unknown) {
      logger.error('Error loading MES-ERP syncs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载
  React.useEffect(() => {
    loadData();
  }, [loadData]);

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
  const handleSubmit = async (data: unknown) => {
    try {
      setSubmitting(true);
      if (editingSync) {
        logger.warn('Update not implemented');
      } else {
        const request: CreateMesErpSyncRequest = {
          mes_order_id: (data as Record<string, unknown>).mes_order_id as string,
          order_number: (data as Record<string, unknown>).order_number as string,
          product_name: ((data as Record<string, unknown>).product_name as string) || undefined,
          quantity: ((data as Record<string, unknown>).quantity as string)
            ? parseFloat((data as Record<string, unknown>).quantity as string)
            : undefined,
        };
        await integrationApi.createMesErpSync(request);
      }
      handleCloseModal();
      loadData();
    } catch (error: unknown) {
      logger.error('Error saving sync:', error);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  // 处理同步
  const handleSync = async (id: string) => {
    try {
      await integrationApi.syncMesErp(id);
      loadData();
    } catch (error: unknown) {
      logger.error('Error syncing:', error);
    }
  };

  // 处理删除
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此同步记录吗？')) return;
    try {
      logger.warn('Delete not implemented');
    } catch (error: unknown) {
      logger.error('Error deleting:', error);
    }
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingSync(null);
  };

  return (
    <>
      <ListPageTemplate
        title='MES ↔ ERP 同步'
        subtitle='管理 MES 生产订单与 ERP 销售订单的同步'
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
            defaultValues={editingSync || {}}
            onSubmit={handleSubmit}
            onCancel={handleCloseModal}
            submitting={submitting}
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
    </>
  );
};

export default IntegrationMesErpPage;
