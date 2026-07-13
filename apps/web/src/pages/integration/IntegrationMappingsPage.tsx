/**
 * 数据映射管理页面
 *
 * @module pages/integration
 * @path /integration/mappings
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Card,
  CardContent,
  IconButton,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Search,
  Plus,
  Download,
  Upload,
  Filter,
  RefreshCw,
  GitMerge,
  ArrowRight,
  Trash2,
  Edit2,
  Copy,
  Play,
  Pause,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { PageContainer, ConfirmDialog } from '@/components/common';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { useNotificationStore } from '@/store';
import { extractErrorMessage } from '@/utils/errors';

type MappingType = 'field' | 'transform' | 'filter' | 'validate';
type MappingStatus = 'active' | 'inactive' | 'draft';

interface Mapping {
  id: string;
  name: string;
  type: MappingType;
  source: string;
  target: string;
  status: MappingStatus;
  fieldCount: number;
  lastSyncTime: string;
  description: string;
}

const MOCK_MAPPINGS: Mapping[] = [
  {
    id: 'map-001',
    name: '用户数据同步映射',
    type: 'field',
    source: 'IAM用户表',
    target: 'CRM客户表',
    status: 'active',
    fieldCount: 15,
    lastSyncTime: '2024-01-15 14:30:00',
    description: '将IAM系统用户信息同步到CRM作为客户',
  },
  {
    id: 'map-002',
    name: '订单金额转换映射',
    type: 'transform',
    source: 'ERP订单表',
    target: 'BI销售报表',
    status: 'active',
    fieldCount: 8,
    lastSyncTime: '2024-01-15 13:20:00',
    description: '将订单金额从分转换为元并计算汇率',
  },
  {
    id: 'map-003',
    name: '库存数据过滤映射',
    type: 'filter',
    source: 'WMS库存表',
    target: 'SCM供货表',
    status: 'inactive',
    fieldCount: 12,
    lastSyncTime: '2024-01-14 22:00:00',
    description: '过滤掉虚拟库存和预占库存',
  },
  {
    id: 'map-004',
    name: '产品质量验证映射',
    type: 'validate',
    source: 'QMS质检表',
    target: 'MES工序表',
    status: 'active',
    fieldCount: 20,
    lastSyncTime: '2024-01-15 10:15:00',
    description: '质检数据验证后写入生产工序',
  },
  {
    id: 'map-005',
    name: '供应商数据映射',
    type: 'field',
    source: 'SRM供应商表',
    target: 'ERP供应商表',
    status: 'draft',
    fieldCount: 25,
    lastSyncTime: '-',
    description: '供应商主数据同步映射规则',
  },
];

const TYPE_LABELS: Record<MappingType, string> = {
  field: '字段映射',
  transform: '数据转换',
  filter: '数据过滤',
  validate: '数据验证',
};

const TYPE_COLORS: Record<MappingType, 'primary' | 'secondary' | 'warning' | 'error'> = {
  field: 'primary',
  transform: 'secondary',
  filter: 'warning',
  validate: 'error',
};

const STATUS_LABELS: Record<MappingStatus, string> = {
  active: '启用',
  inactive: '停用',
  draft: '草稿',
};

const STATUS_COLORS: Record<MappingStatus, 'success' | 'default' | 'warning'> = {
  active: 'success',
  inactive: 'default',
  draft: 'warning',
};

export const IntegrationMappingsPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const { data: mappings = [], isLoading: loading } = useQuery({
    queryKey: ['integration-mappings'],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return MOCK_MAPPINGS;
    },
    staleTime: 5 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (mappingId: string) => {
      return mappingId;
    },
    onMutate: async (mappingId) => {
      await queryClient.cancelQueries({ queryKey: ['integration-mappings'] });
      const previousMappings = queryClient.getQueryData<Mapping[]>(['integration-mappings']);
      queryClient.setQueryData<Mapping[]>(['integration-mappings'], (old) =>
        old ? old.filter((m) => m.id !== mappingId) : []
      );
      return { previousMappings };
    },
    onError: (_err, _id, context) => {
      if (context?.previousMappings) {
        queryClient.setQueryData(['integration-mappings'], context.previousMappings);
      }
      addNotification({
        title: '删除失败',
        message: '删除操作失败',
        type: 'error',
      });
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return ids;
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ['integration-mappings'] });
      const previousMappings = queryClient.getQueryData<Mapping[]>(['integration-mappings']);
      queryClient.setQueryData<Mapping[]>(['integration-mappings'], (old) =>
        old ? old.filter((m) => !ids.includes(m.id)) : []
      );
      return { previousMappings };
    },
    onError: (_err, _ids, context) => {
      if (context?.previousMappings) {
        queryClient.setQueryData(['integration-mappings'], context.previousMappings);
      }
      addNotification({
        title: '删除失败',
        message: '批量删除失败',
        type: 'error',
      });
    },
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);

  const filteredMappings = useMemo(() => {
    let result = mappings;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.source.toLowerCase().includes(query) ||
          m.target.toLowerCase().includes(query)
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter((m) => m.type === typeFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter((m) => m.status === statusFilter);
    }

    return result;
  }, [mappings, searchQuery, typeFilter, statusFilter]);

  const stats = useMemo(() => {
    const activeCount = mappings.filter((m) => m.status === 'active').length;
    const fieldCount = mappings.filter((m) => m.type === 'field').length;
    const transformCount = mappings.filter((m) => m.type === 'transform').length;

    return [
      {
        id: 'total',
        title: '映射规则',
        value: mappings.length,
        icon: <GitMerge size={20} />,
        color: 'primary' as const,
      },
      {
        id: 'active',
        title: '启用中',
        value: activeCount,
        icon: <Play size={20} />,
        color: 'success' as const,
      },
      {
        id: 'field',
        title: '字段映射',
        value: fieldCount,
        icon: <ArrowRight size={20} />,
        color: 'info' as const,
      },
      {
        id: 'transform',
        title: '数据转换',
        value: transformCount,
        icon: <Copy size={20} />,
        color: 'warning' as const,
      },
    ];
  }, [mappings]);

  const actionLoading = deleteMutation.isPending || batchDeleteMutation.isPending;

  const handleDelete = useCallback(
    (mapping: Mapping) => {
      deleteMutation.mutate(mapping.id, {
        onSuccess: () => {
          addNotification({
            title: '删除成功',
            message: `已删除映射规则「${mapping.name}」`,
            type: 'success',
          });
          setDeleteDialogOpen(false);
        },
      });
    },
    [deleteMutation, addNotification]
  );

  const handleBatchDelete = useCallback(async () => {
    const ids = selectedIds.map((id) => String(id));
    batchDeleteMutation.mutate(ids, {
      onSuccess: () => {
        addNotification({
          title: '批量删除成功',
          message: `已删除 ${selectedIds.length} 条映射规则`,
          type: 'success',
        });
        setSelectedIds([]);
        setBatchDeleteDialogOpen(false);
      },
    });
  }, [selectedIds, batchDeleteMutation, addNotification]);

  const handleToggleStatus = useCallback(
    (mapping: Mapping) => {
      queryClient.setQueryData<Mapping[]>(['integration-mappings'], (old) =>
        old
          ? old.map((m) =>
              m.id === mapping.id
                ? { ...m, status: m.status === 'active' ? 'inactive' : 'active' }
                : m
            )
          : []
      );
      addNotification({
        title: '状态更新',
        message: `映射规则「${mapping.name}」已${mapping.status === 'active' ? '停用' : '启用'}`,
        type: 'success',
      });
    },
    [queryClient, addNotification]
  );

  const handleExport = useCallback(() => {
    try {
      const exportData = filteredMappings.map((m) => ({
        映射名称: m.name,
        映射类型: TYPE_LABELS[m.type],
        源表: m.source,
        目标表: m.target,
        状态: STATUS_LABELS[m.status],
        字段数: m.fieldCount,
        最后同步: m.lastSyncTime,
        描述: m.description,
      }));

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mappings_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addNotification({
        title: '导出成功',
        message: '映射规则导出成功',
        type: 'success',
      });
    } catch (_err: unknown) {
      addNotification({
        title: '导出失败',
        message: extractErrorMessage(_err, '导出失败'),
        type: 'error',
      });
    }
  }, [filteredMappings, addNotification]);

  const columns: ColumnDef<Mapping>[] = useMemo(
    () => [
      {
        id: 'name',
        label: '映射名称',
        minWidth: 180,
        render: (row) => (
          <Box>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              {row.name}
            </Typography>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {row.description}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'type',
        label: '类型',
        width: 100,
        render: (row) => (
          <Chip
            size='small'
            color={TYPE_COLORS[row.type]}
            label={TYPE_LABELS[row.type]}
          />
        ),
      },
      {
        id: 'source',
        label: '源表',
        width: 120,
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {row.source}
          </Typography>
        ),
      },
      {
        id: 'target',
        label: '目标表',
        width: 120,
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {row.target}
          </Typography>
        ),
      },
      {
        id: 'fieldCount',
        label: '字段数',
        width: 80,
        align: 'center',
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            {row.fieldCount}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: '状态',
        width: 80,
        render: (row) => (
          <Chip
            size='small'
            color={STATUS_COLORS[row.status]}
            variant='outlined'
            label={STATUS_LABELS[row.status]}
          />
        ),
      },
      {
        id: 'lastSyncTime',
        label: '最后同步',
        width: 150,
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {row.lastSyncTime}
          </Typography>
        ),
      },
      {
        id: 'actions',
        label: '操作',
        width: 150,
        fixed: 'right',
        render: (row) => (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton
              size='small'
              onClick={() =>
                addNotification({
                  title: '编辑映射',
                  message: `编辑「${row.name}」`,
                  type: 'info',
                })
              }
            >
              <Edit2 size={16} />
            </IconButton>
            <IconButton
              size='small'
              onClick={() => handleToggleStatus(row)}
            >
              {row.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
            </IconButton>
            <IconButton
              size='small'
              onClick={() => setDeleteDialogOpen(true)}
              sx={{ color: 'error.main' }}
            >
              <Trash2 size={16} />
            </IconButton>
          </Box>
        ),
      },
    ],
    [addNotification, handleToggleStatus]
  );

  return (
    <PageContainer
      title='数据映射'
      subtitle='管理数据映射规则和转换逻辑'
    >
      <ListPageTemplate
        columns={columns}
        data={filteredMappings}
        loading={loading}
        searchable
        searchPlaceholder='搜索映射名称、源表、目标表...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={[
          {
            id: 'type',
            label: '类型',
            type: 'select',
            options: [
              { label: '全部', value: 'all' },
              { label: '字段映射', value: 'field' },
              { label: '数据转换', value: 'transform' },
              { label: '数据过滤', value: 'filter' },
              { label: '数据验证', value: 'validate' },
            ],
          },
          {
            id: 'status',
            label: '状态',
            type: 'select',
            options: [
              { label: '全部', value: 'all' },
              { label: '启用', value: 'active' },
              { label: '停用', value: 'inactive' },
              { label: '草稿', value: 'draft' },
            ],
          },
        ]}
        filtersValue={{ type: typeFilter, status: statusFilter }}
        onFilterChange={(f) => {
          if (typeof f.type === 'string') setTypeFilter(f.type);
          if (typeof f.status === 'string') setStatusFilter(f.status);
        }}
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids as string[])}
        actions={[
          {
            label: '导入',
            icon: <Upload size={16} />,
            onClick: () =>
              addNotification({
                title: '导入映射',
                message: '导入映射规则功能',
                type: 'info',
              }),
            variant: 'outlined',
          },
          {
            label: '导出',
            icon: <Download size={16} />,
            onClick: handleExport,
            variant: 'outlined',
          },
          {
            label: '新建',
            icon: <Plus size={16} />,
            onClick: () =>
              addNotification({
                title: '新建映射',
                message: '创建新映射规则',
                type: 'info',
              }),
            variant: 'contained',
          },
        ]}
        emptyMessage='暂无映射规则，请点击新建创建'
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title='删除映射规则'
        message='确定要删除这条映射规则吗？此操作不可恢复。'
        confirmLabel='删除'
        onConfirm={() => {
          const mapping = mappings.find((m) => selectedIds.includes(m.id) || false);
          if (mapping) handleDelete(mapping);
        }}
        onClose={() => setDeleteDialogOpen(false)}
      />

      <ConfirmDialog
        isOpen={batchDeleteDialogOpen}
        title='批量删除映射规则'
        message={`确定要删除选中的 ${selectedIds.length} 条映射规则吗？此操作不可恢复。`}
        confirmLabel='删除'
        onConfirm={handleBatchDelete}
        onClose={() => setBatchDeleteDialogOpen(false)}
      />
    </PageContainer>
  );
};

export default IntegrationMappingsPage;
