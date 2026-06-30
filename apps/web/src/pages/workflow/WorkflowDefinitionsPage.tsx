/**
 * 流程定义页面 - V4.0 标准化改造
 *
 * @module pages/workflow
 * @path /workflow/definitions
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  FileCode,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Download,
  Upload,
  Play,
  Eye,
  Clock,
  Layers,
} from 'lucide-react';
import { Box, Typography, Chip, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { useAppStore } from '../../store';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { PageContainer } from '@/components/common';
import ConfirmDialog from '@/components/common/ConfirmDialog';

/**
 * 流程状态配置
 */
const STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'warning' | 'default' | 'error' }> = {
  active: { label: '已发布', color: 'success' },
  draft: { label: '草稿', color: 'default' },
  archived: { label: '已归档', color: 'warning' },
  disabled: { label: '已停用', color: 'error' },
};

/**
 * 流程类型配置
 */
const CATEGORY_CONFIG: Record<string, { label: string; color: 'primary' | 'success' | 'info' | 'warning' | 'default' }> = {
  approval: { label: '审批流', color: 'primary' },
  business: { label: '业务流', color: 'success' },
  notification: { label: '通知流', color: 'info' },
  automation: { label: '自动化', color: 'warning' },
};

interface WorkflowDefinition {
  id: string;
  name: string;
  code: string;
  category: string;
  version: string;
  status: string;
  description?: string;
  node_count: number;
  instance_count: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

const mockDefinitions: WorkflowDefinition[] = [
  {
    id: '1',
    name: '采购订单审批',
    code: 'purchase-order-approval',
    category: 'approval',
    version: 'v2.3',
    status: 'active',
    description: '采购订单多级审批流程',
    node_count: 8,
    instance_count: 245,
    created_at: '2024-01-01',
    updated_at: '2024-01-15',
    created_by: '张三',
  },
  {
    id: '2',
    name: '请假审批',
    code: 'leave-approval',
    category: 'approval',
    version: 'v1.5',
    status: 'active',
    description: '员工请假申请审批流程',
    node_count: 5,
    instance_count: 1280,
    created_at: '2024-01-02',
    updated_at: '2024-01-10',
    created_by: '李四',
  },
  {
    id: '3',
    name: '费用报销',
    code: 'expense-reimbursement',
    category: 'approval',
    version: 'v3.0',
    status: 'active',
    description: '差旅及日常费用报销',
    node_count: 6,
    instance_count: 890,
    created_at: '2024-01-03',
    updated_at: '2024-01-12',
    created_by: '王五',
  },
  {
    id: '4',
    name: '合同审批',
    code: 'contract-approval',
    category: 'approval',
    version: 'v1.2',
    status: 'draft',
    description: '供应商合同审批流程',
    node_count: 10,
    instance_count: 0,
    created_at: '2024-01-14',
    updated_at: '2024-01-14',
    created_by: '赵六',
  },
];

export const WorkflowDefinitionsPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>(mockDefinitions);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setDefinitions(mockDefinitions);
    } catch (_err: unknown) {
      addNotification({
        title: '加载失败',
        message: extractErrorMessage(_err, '加载流程定义失败'),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const handleDelete = useCallback(
    (definitionId: string) => {
      const def = definitions.find((d) => d.id === definitionId);
      openConfirmDialog({
        title: '确认删除',
        message: `确定要删除流程"${def?.name || ''}"吗？`,
        danger: true,
        onConfirm: () => {
          try {
            setDefinitions((prev) => prev.filter((d) => d.id !== definitionId));
            addNotification({
              title: '成功',
              message: '流程删除成功',
              type: 'success',
            });
          } catch (_err: unknown) {
            addNotification({
              title: '失败',
              message: extractErrorMessage(_err, '删除流程失败'),
              type: 'error',
            });
          }
        },
      });
    },
    [definitions, addNotification, openConfirmDialog]
  );

  const filteredDefinitions = useMemo(() => {
    return definitions.filter((def) => {
      const matchesSearch =
        !searchQuery ||
        def.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        def.code.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || def.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || def.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [definitions, searchQuery, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = definitions.length;
    const activeCount = definitions.filter((d) => d.status === 'active').length;
    const totalInstances = definitions.reduce((sum, d) => sum + d.instance_count, 0);
    return [
      { id: 'total', title: '流程总数', value: total, icon: <Layers size={20} />, color: 'primary' as const },
      { id: 'active', title: '已发布', value: activeCount, icon: <FileCode size={20} />, color: 'success' as const },
      { id: 'instances', title: '总实例数', value: totalInstances.toLocaleString(), icon: <Play size={20} />, color: 'info' as const },
    ];
  }, [definitions]);

  const columns: ColumnDef<WorkflowDefinition>[] = useMemo(
    () => [
      {
        id: 'name',
        label: '流程名称',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                bgcolor: 'primary.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileCode size={18} color='primary.main' />
            </Box>
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                {row.name}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {row.code}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        id: 'category',
        label: '类型',
        render: (row) => {
          const config = CATEGORY_CONFIG[row.category] || {
            label: row.category,
            color: 'default' as const,
          };
          return <Chip size='small' color={config.color} label={config.label} variant='outlined' />;
        },
      },
      {
        id: 'version',
        label: '版本',
        render: (row) => (
          <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
            {row.version}
          </Typography>
        ),
      },
      {
        id: 'node_count',
        label: '节点数',
        render: (row) => (
          <Typography variant='body2' color='text.secondary'>
            {row.node_count} 个节点
          </Typography>
        ),
      },
      {
        id: 'instance_count',
        label: '实例数',
        render: (row) => (
          <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
            {row.instance_count.toLocaleString()}
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
          return <Chip size='small' color={config.color} label={config.label} />;
        },
      },
      {
        id: 'updated_at',
        label: '更新时间',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Clock size={14} color='action' />
            <Typography variant='body2' color='text.secondary'>
              {row.updated_at}
            </Typography>
          </Box>
        ),
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
              onClick={() => navigate(`/workflow/designer?id=${row.id}`)}
              startIcon={<Eye size={14} />}
            >
              查看
            </Button>
            <Button
              size='small'
              variant='text'
              onClick={() => navigate(`/workflow/instances?definition=${row.id}`)}
              startIcon={<Play size={14} />}
              disabled={row.status !== 'active'}
            >
              发起
            </Button>
            <Button
              size='small'
              variant='text'
              onClick={() => navigate(`/workflow/designer?id=${row.id}&mode=edit`)}
              startIcon={<Edit size={14} />}
            >
              编辑
            </Button>
            <Button
              size='small'
              color='error'
              variant='text'
              onClick={() => handleDelete(row.id)}
              startIcon={<Trash2 size={14} />}
            >
              删除
            </Button>
          </Box>
        ),
      },
    ],
    [navigate, handleDelete]
  );

  const filters = useMemo(
    () => [
      {
        id: 'category',
        label: '流程类型',
        type: 'select' as const,
        options: [
          { label: '全部类型', value: 'all' },
          ...Object.entries(CATEGORY_CONFIG).map(([value, config]) => ({
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

  const handleFilterChange = useCallback((filters: Record<string, unknown>) => {
    if (typeof filters.category === 'string') {
      setCategoryFilter(filters.category);
    }
    if (typeof filters.status === 'string') {
      setStatusFilter(filters.status);
    }
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleCreate = useCallback(() => {
    navigate('/workflow/designer?mode=create');
  }, [navigate]);

  return (
    <PageContainer
      headerProps={{
        pageIcon: <FileCode size={20} />,
        backButton: {
          href: '/workflow/dashboard',
        },
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={filteredDefinitions}
        loading={loading}
        searchable
        searchPlaceholder='搜索流程名称、编码...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filters}
        filtersValue={{
          category: categoryFilter,
          status: statusFilter,
        }}
        onFilterChange={handleFilterChange}
        pagination={{
          page,
          pageSize,
          total: filteredDefinitions.length,
          onPageChange: handlePageChange,
        }}
        actions={[
          {
            label: '刷新',
            icon: <RefreshCw size={16} />,
            onClick: loadData,
            variant: 'outlined',
          },
          {
            label: '导出',
            icon: <Download size={16} />,
            onClick: () => {},
            variant: 'outlined',
          },
          {
            label: '导入',
            icon: <Upload size={16} />,
            onClick: () => {},
            variant: 'outlined',
          },
          {
            label: '新建流程',
            icon: <Plus size={16} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        onRefresh={loadData}
        emptyMessage='暂无流程定义'
        stats={stats}
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

export default WorkflowDefinitionsPage;
