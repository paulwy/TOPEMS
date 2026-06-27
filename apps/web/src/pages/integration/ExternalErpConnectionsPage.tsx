/**
 * 外部ERP连接管理页面
 * 管理金蝶、用友、SAP等外部ERP系统的连接配置
 */

import React, { useState, useMemo, useCallback } from 'react';
import { PageContainer } from '@/components/common';
import { apiLogger } from '@/utils/logger';
import { useAppStore } from '@/store';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, RefreshCw, Trash2, Edit, Power, TestTube, Eye } from 'lucide-react';

import {
  Box,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
} from '@mui/material';

import {
  ListPageTemplate,
  FormPageTemplate,
  type ColumnDef,
  type RowAction,
  type FormSection,
} from '@/components/templates';

import {
  useErpConnections,
  useCreateErpConnection,
  useUpdateErpConnection,
  useDeleteErpConnection,
  useToggleErpConnection,
  useTestErpConnection,
} from '@/hooks/useExternalErp';

// ERP系统类型配置
const ERP_TYPE_CONFIG: Record<string, { name: string; logo: string; color: string }> = {
  kingdee: {
    name: '金蝶K/3',
    logo: 'K',
    color: 'primary.main',
  },
  yonyou: {
    name: '用友U8',
    logo: 'Y',
    color: 'warning.main',
  },
  sap: {
    name: 'SAP S/4',
    logo: 'S',
    color: 'success.dark',
  },
};

// 状态配置
const STATUS_CONFIG: Record<
  string,
  { label: string; color: 'success' | 'default' | 'error' | 'warning' }
> = {
  connected: {
    label: '已连接',
    color: 'success',
  },
  disconnected: {
    label: '未连接',
    color: 'default',
  },
  error: {
    label: '连接错误',
    color: 'error',
  },
  syncing: {
    label: '同步中',
    color: 'warning',
  },
};

interface ErpConnection {
  id: string;
  type: string;
  name: string;
  api_url: string;
  app_key?: string;
  app_secret?: string;
  sync_direction: string;
  sync_mode: string;
  timeout?: number;
  is_active?: boolean;
  status?: string;
  last_sync_at?: string;
}

// 创建/编辑表单配置
const CONNECTION_FORM_SECTIONS: FormSection[] = [
  {
    id: 'basic',
    title: '基本信息',
    fields: [
      {
        name: 'type',
        label: 'ERP类型',
        type: 'select',
        required: true,
        options: [
          { label: '金蝶K/3', value: 'kingdee' },
          { label: '用友U8', value: 'yonyou' },
          { label: 'SAP S/4', value: 'sap' },
        ],
      },
      {
        name: 'name',
        label: '连接名称',
        type: 'text',
        required: true,
        placeholder: '输入连接名称',
      },
    ],
  },
  {
    id: 'api',
    title: 'API配置',
    fields: [
      {
        name: 'api_url',
        label: 'API地址',
        type: 'text',
        required: true,
        placeholder: '输入API地址，如 https://api.example.com',
      },
      {
        name: 'app_key',
        label: 'App Key',
        type: 'text',
        placeholder: '输入App Key（可选）',
      },
      {
        name: 'app_secret',
        label: 'App Secret',
        type: 'text',
        placeholder: '输入App Secret（可选）',
      },
      {
        name: 'timeout',
        label: '超时时间（毫秒）',
        type: 'number',
        placeholder: '默认30000',
      },
    ],
  },
  {
    id: 'sync',
    title: '同步配置',
    fields: [
      {
        name: 'sync_direction',
        label: '同步方向',
        type: 'select',
        required: true,
        options: [
          { label: '双向同步', value: 'bidirectional' },
          { label: '仅导入', value: 'import' },
          { label: '仅导出', value: 'export' },
        ],
      },
      {
        name: 'sync_mode',
        label: '同步模式',
        type: 'select',
        required: true,
        options: [
          { label: '实时同步', value: 'realtime' },
          { label: '定时同步', value: 'scheduled' },
          { label: '手动同步', value: 'manual' },
        ],
      },
    ],
  },
];

export default function ExternalErpConnectionsPage() {
  const navigate = useNavigate();

  // 查询连接列表
  const { data: connectionsData, isLoading, refetch } = useErpConnections();

  // mutations
  const createConnection = useCreateErpConnection();
  const updateConnection = useUpdateErpConnection();
  const deleteConnection = useDeleteErpConnection();
  const toggleConnection = useToggleErpConnection();
  const testConnection = useTestErpConnection();

  // 状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ErpConnection | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10 });
  const [submitting, setSubmitting] = useState(false);

  // 筛选后的数据
  const filteredData = useMemo(() => {
    const list = connectionsData?.data?.items ?? [];
    if (!searchValue) return list;
    const keyword = searchValue.toLowerCase();
    return list.filter(
      (conn: ErpConnection) =>
        conn.name.toLowerCase().includes(keyword) ||
        ERP_TYPE_CONFIG[conn.type]?.name.toLowerCase().includes(keyword)
    );
  }, [connectionsData, searchValue]);

  // 表格列定义
  const columns: ColumnDef<ErpConnection>[] = [
    {
      id: 'name',
      label: '连接名称',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: ERP_TYPE_CONFIG[row.type]?.color || 'text.disabled',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.875rem',
            }}
          >
            {ERP_TYPE_CONFIG[row.type]?.logo || '?'}
          </Box>
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
              {ERP_TYPE_CONFIG[row.type]?.name || row.type}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'api_url',
      label: 'API地址',
      render: (row) => (
        <Typography
          variant='body2'
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            maxWidth: 200,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={row.api_url}
        >
          {row.api_url}
        </Typography>
      ),
    },
    {
      id: 'sync_direction',
      label: '同步方向',
      render: (row) => {
        const directionMap: Record<string, string> = {
          bidirectional: '双向同步',
          import: '导入',
          export: '导出',
        };
        return (
          <Typography variant='body2'>
            {directionMap[row.sync_direction] || row.sync_direction}
          </Typography>
        );
      },
    },
    {
      id: 'sync_mode',
      label: '同步模式',
      render: (row) => {
        const modeMap: Record<string, string> = {
          realtime: '实时',
          scheduled: '定时',
          manual: '手动',
        };
        return <Typography variant='body2'>{modeMap[row.sync_mode] || row.sync_mode}</Typography>;
      },
    },
    {
      id: 'last_sync_at',
      label: '最后同步',
      render: (row) => (
        <Typography
          variant='body2'
          sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
        >
          {row.last_sync_at ? new Date(row.last_sync_at).toLocaleString('zh-CN') : '从未同步'}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => {
        const status = row.status || 'disconnected';
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.disconnected;
        return (
          <Chip
            label={config.label}
            color={config.color}
            size='small'
          />
        );
      },
    },
  ];

  // 行操作
  const rowActions: RowAction<ErpConnection>[] = [
    {
      label: '查看',
      icon: <Eye size={14} />,
      onClick: (row) => setEditingConnection(row),
    },
    {
      label: '编辑',
      icon: <Edit size={14} />,
      onClick: (row) => setEditingConnection(row),
    },
    {
      label: '测试',
      icon: <TestTube size={14} />,
      onClick: (row) => handleTestConnection(row),
    },
    {
      label: '映射管理',
      icon: <Settings size={14} />,
      onClick: (row) => navigate(`/integration/external-erp/${row.id}/mappings`),
    },
    {
      label: '删除',
      icon: <Trash2 size={14} />,
      color: 'error',
      onClick: (row) => handleDelete(row.id),
    },
  ];

  // 处理测试连接
  const handleTestConnection = useCallback(
    async (connection: ErpConnection) => {
      try {
        await testConnection.mutateAsync({
          api_url: connection.api_url,
          app_key: connection.app_key || '',
          app_secret: connection.app_secret || '',
          timeout: connection.timeout || 30000,
        });
      } catch (error: unknown) {
        apiLogger.error('Test connection failed:', error);
      }
    },
    [testConnection]
  );

  // 处理删除
  const handleDelete = useCallback(
    async (connectionId: string) => {
      try {
        await deleteConnection.mutateAsync(connectionId);
      } catch (error: unknown) {
        apiLogger.error('Delete connection failed:', error);
      }
    },
    [deleteConnection]
  );

  // 处理创建/更新提交
  const handleSubmit = async (data: unknown) => {
    try {
      setSubmitting(true);
      if (editingConnection) {
        await updateConnection.mutateAsync({
          connectionId: editingConnection.id,
          data: {
            name: (data as Record<string, unknown>).name as string,
            api_url: (data as Record<string, unknown>).api_url as string,
            app_key: (data as Record<string, unknown>).app_key as string,
            app_secret: (data as Record<string, unknown>).app_secret as string,
            timeout: (data as Record<string, unknown>).timeout as number,
            sync_direction: (data as Record<string, unknown>).sync_direction as any,
            sync_mode: (data as Record<string, unknown>).sync_mode as any,
          },
        });
        setEditingConnection(null);
      } else {
        await createConnection.mutateAsync({
          type: (data as Record<string, unknown>).type as any,
          name: (data as Record<string, unknown>).name as string,
          api_url: (data as Record<string, unknown>).api_url as string,
          app_key: (data as Record<string, unknown>).app_key as string,
          app_secret: (data as Record<string, unknown>).app_secret as string,
          sync_direction: (data as Record<string, unknown>).sync_direction as any,
          sync_mode: (data as Record<string, unknown>).sync_mode as any,
        });
        setShowCreateModal(false);
      }
    } catch (error: unknown) {
      apiLogger.error('Save connection failed:', error);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingConnection(null);
  };

  return (
    <PageContainer
      title='外部ERP连接管理'
      subtitle='管理金蝶、用友、SAP等外部ERP系统的连接配置'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={filteredData}
        loading={isLoading}
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
        searchPlaceholder='搜索连接名称...'
        actions={[
          {
            label: '新建连接',
            icon: <Plus size={16} />,
            onClick: () => setShowCreateModal(true),
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        onRefresh={refetch}
        emptyMessage='暂无外部ERP连接'
      />

      {/* 创建弹窗 */}
      <Dialog
        open={showCreateModal}
        onClose={handleCloseModal}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>新建ERP连接</DialogTitle>
        <DialogContent>
          <FormPageTemplate
            title='新建ERP连接'
            sections={CONNECTION_FORM_SECTIONS}
            defaultValues={{
              type: 'kingdee',
              sync_direction: 'bidirectional',
              sync_mode: 'realtime',
              timeout: 30000,
            }}
            onSubmit={handleSubmit}
            onCancel={handleCloseModal}
            submitting={submitting}
            columns={2}
          />
        </DialogContent>
      </Dialog>

      {/* 编辑/查看弹窗 */}
      <Dialog
        open={!!editingConnection}
        onClose={handleCloseModal}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>编辑ERP连接</DialogTitle>
        <DialogContent>
          <FormPageTemplate
            title='编辑ERP连接'
            sections={CONNECTION_FORM_SECTIONS}
            defaultValues={editingConnection || {}}
            onSubmit={handleSubmit}
            onCancel={handleCloseModal}
            submitting={submitting}
            columns={2}
          />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
