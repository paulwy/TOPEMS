/**
 * LIMS-QMS 集成页面
 * 管理 LIMS 样本与 QMS 检验的同步
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  RefreshCw,
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';
import {
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Button } from '@mui/material';

import {
  ListPageTemplate,
  FormPageTemplate,
  type ColumnDef,
  type RowAction,
  type FormSection,
} from '@/components/templates';
import { integrationApi } from '@/api/integration';
import type { LimsQmsSync, CreateLimsQmsSyncRequest } from '@/api/integration';
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
  const navigate = useNavigate();

  // 数据状态
  const [syncs, setSyncs] = useState<LimsQmsSync[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10 });
  const [searchValue, setSearchValue] = useState('');

  // 弹窗状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSync, setEditingSync] = useState<LimsQmsSync | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await integrationApi.listLimsQmsSyncs();
      if (res.success && res.data !== undefined) {
        setSyncs(res.data);
      }
    } catch (error: unknown) {
      logger.error('Error loading LIMS-QMS syncs:', error);
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
        sync.sample_name.toLowerCase().includes(keyword) ||
        sync.lims_sample_id.toLowerCase().includes(keyword)
    );
  }, [syncs, searchValue]);

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
  const handleSubmit = async (data: unknown) => {
    try {
      setSubmitting(true);
      if (editingSync) {
        // 编辑模式暂不支持更新（后端未实现）
        logger.warn('Update not implemented');
      } else {
        const request: CreateLimsQmsSyncRequest = {
          lims_sample_id: (data as Record<string, unknown>).lims_sample_id as string,
          sample_name: (data as Record<string, unknown>).sample_name as string,
          inspection_result:
            ((data as Record<string, unknown>).inspection_result as string) || undefined,
          inspection_notes:
            ((data as Record<string, unknown>).inspection_notes as string) || undefined,
        };
        await integrationApi.createLimsQmsSync(request);
      }
      setShowCreateModal(false);
      setEditingSync(null);
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
      await integrationApi.syncLimsQms(id);
      loadData();
    } catch (error: unknown) {
      logger.error('Error syncing:', error);
    }
  };

  // 处理删除
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此同步记录吗？')) return;
    try {
      // 后端可能未实现删除接口
      logger.warn('Delete not implemented');
    } catch (error: unknown) {
      logger.error('Error deleting:', error);
    }
  };

  // 打开编辑弹窗
  const handleOpenEdit = (sync: LimsQmsSync) => {
    setEditingSync(sync);
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingSync(null);
  };

  return (
    <>
      <ListPageTemplate
        title='LIMS ↔ QMS 同步'
        subtitle='管理 LIMS 样本与 QMS 检验的同步'
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

export default IntegrationLimsQmsPage;
