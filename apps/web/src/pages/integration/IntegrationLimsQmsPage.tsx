/**
 * LIMS-QMS 集成页面
 * 管理 LIMS 样本与 QMS 检验的同步
 */

import React, { useState } from 'react';
import { useUrlListState } from '@/hooks';
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
import type { LimsQmsSync, CreateLimsQmsSyncRequest } from '@/api/integration';
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
        name: 'lims_sample_id',
        label: 'LIMS 样本 ID',
        type: 'text',
        required: true,
        placeholder: '输入 LIMS 样本 UUID',
      },
      {
        name: 'sample_name',
        label: '样本名称',
        type: 'text',
        required: true,
        placeholder: '输入样本名称',
      },
      {
        name: 'inspection_result',
        label: '检验结果',
        type: 'text',
        placeholder: '输入检验结果（可选）',
      },
      {
        name: 'inspection_notes',
        label: '备注',
        type: 'textarea',
        placeholder: '输入备注信息（可选）',
        rows: 3,
      },
    ],
  },
];

const IntegrationLimsQmsPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  // 数据状态
  const listState = useUrlListState({
    defaultSearch: '',
    defaultPageSize: 10,
    baseIndex: 0,
    historyMode: 'replace',
  });
  const {
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    currentPage: page,
    setCurrentPage: setPage,
    pageSize,
    setPageSize,
  } = listState;

  // 弹窗状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSync, setEditingSync] = useState<LimsQmsSync | null>(null);

  // 加载数据
  const syncsQuery = useQuery({
    queryKey: QUERY_KEYS.INTEGRATION.LIMS_QMS_SYNCS,
    queryFn: async () => {
      const res = await integrationApi.listLimsQmsSyncs();
      if (res.success && res.data !== undefined) {
        return res.data;
      }
      throw new Error(res.message || '加载 LIMS-QMS 同步数据失败');
    },
  });

  const syncs = syncsQuery.data || [];
  const loading = syncsQuery.isLoading;

  const loadData = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INTEGRATION.LIMS_QMS_SYNCS });
  };

  const createMutation = useMutation({
    mutationFn: async (data: CreateLimsQmsSyncRequest) => {
      const res = await integrationApi.createLimsQmsSync(data);
      if (!res.success) throw new Error(res.message || '创建失败');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INTEGRATION.LIMS_QMS_SYNCS });
      addNotification({ title: '成功', message: '同步记录创建成功', type: 'success' });
      setShowCreateModal(false);
      setEditingSync(null);
    },
    onError: (err: unknown) => {
      apiLogger.error('创建 LIMS-QMS 同步失败:', err);
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '保存同步记录失败'),
        type: 'error',
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await integrationApi.syncLimsQms(id);
      if (!res.success) throw new Error(res.message || '同步失败');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INTEGRATION.LIMS_QMS_SYNCS });
      addNotification({ title: '成功', message: '同步成功', type: 'success' });
    },
    onError: (err: unknown) => {
      apiLogger.error('LIMS-QMS 同步失败:', err);
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '同步失败'),
        type: 'error',
      });
    },
  });

  // 筛选数据
  const filteredData = React.useMemo(() => {
    if (!debouncedSearch) return syncs;
    const keyword = debouncedSearch.toLowerCase();
    return syncs.filter(
      (sync) =>
        sync.sample_name.toLowerCase().includes(keyword) ||
        sync.lims_sample_id.toLowerCase().includes(keyword)
    );
  }, [syncs, debouncedSearch]);

  // 表格列定义
  const columns: ColumnDef<LimsQmsSync>[] = [
    {
      id: 'sample_name',
      label: '样本名称',
      sortable: true,
      render: (row) => (
        <Box>
          <Box sx={{ fontWeight: 500, color: 'text.primary' }}>{row.sample_name}</Box>
          <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            ID: {row.lims_sample_id.slice(0, 8)}...
          </Box>
        </Box>
      ),
    },
    {
      id: 'inspection_result',
      label: '检验结果',
      render: (row) => <Box sx={{ color: 'text.secondary' }}>{row.inspection_result || '-'}</Box>,
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
  const rowActions: RowAction<LimsQmsSync>[] = [
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

  // 处理创建/编辑提交
  const handleSubmit = (data: unknown) => {
    if (editingSync) {
      handleCloseModal();
      return;
    }
    const request: CreateLimsQmsSyncRequest = {
      lims_sample_id: (data as unknown as Record<string, unknown>).lims_sample_id as string,
      sample_name: (data as unknown as Record<string, unknown>).sample_name as string,
      inspection_result:
        ((data as unknown as Record<string, unknown>).inspection_result as string) || undefined,
      inspection_notes: ((data as unknown as Record<string, unknown>).inspection_notes as string) || undefined,
    };
    createMutation.mutate(request);
  };

  // 处理同步
  const handleSync = (id: string) => {
    syncMutation.mutate(id);
  };

  // 处理删除（后端未实现，仅提示）
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
      title='LIMS ↔ QMS 同步'
      subtitle='管理 LIMS 样本与 QMS 检验的同步'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={filteredData}
        loading={loading}
        pagination={{
          page,
          pageSize,
          total: filteredData.length,
          onPageChange: setPage,
          onPageSizeChange: (newSize) => { setPageSize(newSize); setPage(0); },
        }}
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        searchable
        searchPlaceholder='搜索样本名称或 ID...'
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
        emptyMessage='暂无 LIMS-QMS 同步记录'
      />

      {/* 创建/编辑弹窗 */}
      <Dialog
        open={showCreateModal || !!editingSync}
        onClose={handleCloseModal}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{editingSync ? '查看同步详情' : '创建 LIMS-QMS 同步'}</DialogTitle>
        <DialogContent>
          <FormPageTemplate
            title={editingSync ? '查看同步详情' : '创建 LIMS-QMS 同步'}
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

export default IntegrationLimsQmsPage;
