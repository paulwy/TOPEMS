import React, { useState, useMemo, useCallback } from 'react';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Copy,
  RefreshCw,
  Download,
  Upload,
  Search,
} from 'lucide-react';
import { Box, Typography, Chip, Button, Grid } from '@mui/material';

import { useAppStore } from '../../store';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { PageContainer } from '@/components/common';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { extractErrorMessage } from '@/utils/errors';

interface NotificationTemplate {
  id: string;
  name: string;
  code: string;
  type: 'system' | 'approval' | 'task' | 'message';
  channels: string[];
  status: 'active' | 'inactive';
  updatedAt: string;
  description?: string;
  usageCount: number;
}

const MOCK_TEMPLATES: NotificationTemplate[] = [
  {
    id: '1',
    name: '系统维护通知',
    code: 'SYS_MAINTENANCE_001',
    type: 'system',
    channels: ['站内信', '邮件', '推送'],
    status: 'active',
    updatedAt: '2024-01-15 10:30:00',
    description: '系统维护期间发送给所有用户的通知',
    usageCount: 128,
  },
  {
    id: '2',
    name: '审批待办提醒',
    code: 'APPROVAL_TODO_001',
    type: 'approval',
    channels: ['站内信', '企业微信'],
    status: 'active',
    updatedAt: '2024-01-14 15:20:00',
    description: '新的审批待办任务通知',
    usageCount: 856,
  },
  {
    id: '3',
    name: '任务分配通知',
    code: 'TASK_ASSIGN_001',
    type: 'task',
    channels: ['站内信', '推送'],
    status: 'active',
    updatedAt: '2024-01-13 09:45:00',
    description: '新任务分配时的通知模板',
    usageCount: 432,
  },
  {
    id: '4',
    name: '消息回复提醒',
    code: 'MSG_REPLY_001',
    type: 'message',
    channels: ['站内信'],
    status: 'active',
    updatedAt: '2024-01-12 14:10:00',
    description: '收到新消息回复时的通知',
    usageCount: 1024,
  },
  {
    id: '5',
    name: '系统异常告警',
    code: 'SYS_ALERT_001',
    type: 'system',
    channels: ['站内信', '短信', '邮件'],
    status: 'active',
    updatedAt: '2024-01-11 16:55:00',
    description: '系统发生异常时的告警通知',
    usageCount: 56,
  },
  {
    id: '6',
    name: '审批通过通知',
    code: 'APPROVAL_PASS_001',
    type: 'approval',
    channels: ['站内信', '邮件'],
    status: 'inactive',
    updatedAt: '2024-01-10 11:30:00',
    description: '审批通过后发送的通知',
    usageCount: 234,
  },
  {
    id: '7',
    name: '任务截止提醒',
    code: 'TASK_DEADLINE_001',
    type: 'task',
    channels: ['站内信', '推送', '短信'],
    status: 'inactive',
    updatedAt: '2024-01-09 08:20:00',
    description: '任务截止前的提醒通知',
    usageCount: 178,
  },
];

const TYPE_LABELS: Record<NotificationTemplate['type'], string> = {
  system: '系统通知',
  approval: '审批通知',
  task: '任务通知',
  message: '消息通知',
};

const TYPE_COLORS: Record<NotificationTemplate['type'], string> = {
  system: 'primary',
  approval: 'secondary',
  task: 'warning',
  message: 'success',
};

export const NotificationTemplatesPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [templates, setTemplates] = useState<NotificationTemplate[]>(MOCK_TEMPLATES);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NotificationTemplate | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesSearch =
        !debouncedSearch ||
        t.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        t.code.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        t.description?.toLowerCase().includes(debouncedSearch.toLowerCase());

      const matchesType = !selectedType || t.type === selectedType;
      const matchesStatus = !selectedStatus || t.status === selectedStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [templates, debouncedSearch, selectedType, selectedStatus]);

  const total = filteredTemplates.length;
  const pagedTemplates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTemplates.slice(start, start + pageSize);
  }, [filteredTemplates, currentPage, pageSize]);

  const stats = useMemo(() => {
    const total = templates.length;
    const active = templates.filter((t) => t.status === 'active').length;
    const inactive = templates.filter((t) => t.status === 'inactive').length;
    const todayUsage = templates.reduce((sum, t) => sum + t.usageCount, 0);
    return { total, active, inactive, todayUsage };
  }, [templates]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      addNotification({
        title: '刷新成功',
        message: '模板列表已刷新',
        type: 'success',
      });
    } catch (_err: unknown) {
      const errorMsg = extractErrorMessage(_err, '刷新失败');
      addNotification({ title: '失败', message: errorMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const handleDelete = useCallback((template: NotificationTemplate) => {
    setDeleteTarget(template);
    setConfirmDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      addNotification({
        title: '删除成功',
        message: `模板「${deleteTarget.name}」已删除`,
        type: 'success',
      });
    } catch (_err: unknown) {
      const errorMsg = extractErrorMessage(_err, '删除失败');
      addNotification({ title: '失败', message: errorMsg, type: 'error' });
    } finally {
      setConfirmDialogOpen(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, addNotification]);

  const handleCopy = useCallback(
    (template: NotificationTemplate) => {
      const newTemplate: NotificationTemplate = {
        ...template,
        id: Date.now().toString(),
        name: `${template.name} - 副本`,
        code: `${template.code}_COPY`,
        status: 'inactive',
        updatedAt: new Date().toLocaleString('zh-CN'),
        usageCount: 0,
      };
      setTemplates((prev) => [newTemplate, ...prev]);
      addNotification({
        title: '复制成功',
        message: `模板「${template.name}」已复制`,
        type: 'success',
      });
    },
    [addNotification]
  );

  const handleEdit = useCallback(
    (template: NotificationTemplate) => {
      addNotification({
        title: '编辑模板',
        message: `正在编辑模板「${template.name}」`,
        type: 'info',
      });
    },
    [addNotification]
  );

  const handleCreate = useCallback(() => {
    addNotification({
      title: '新建模板',
      message: '正在打开新建模板表单',
      type: 'info',
    });
  }, [addNotification]);

  const handleImport = useCallback(() => {
    addNotification({
      title: '导入模板',
      message: '请选择要导入的模板文件',
      type: 'info',
    });
  }, [addNotification]);

  const handleExport = useCallback(() => {
    addNotification({
      title: '导出成功',
      message: '模板数据已导出',
      type: 'success',
    });
  }, [addNotification]);

  const handleFilterChange = useCallback((filters: Record<string, any>) => {
    if (filters.type !== undefined) {
      setSelectedType(filters.type);
      setCurrentPage(1);
    }
    if (filters.status !== undefined) {
      setSelectedStatus(filters.status);
      setCurrentPage(1);
    }
  }, []);

  const columns: ColumnDef<NotificationTemplate>[] = useMemo(
    () => [
      {
        id: 'name',
        label: '模板名称',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: `${TYPE_COLORS[row.type]}.100`,
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText
                size={20}
                color={
                  row.type === 'system'
                    ? '#1976d2'
                    : row.type === 'approval'
                      ? '#9c27b0'
                      : row.type === 'task'
                        ? '#ed6c02'
                        : '#2e7d32'
                }
              />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500, color: 'grey.900' }}
              >
                {row.name}
              </Typography>
              {row.description && (
                <Typography
                  variant='caption'
                  sx={{
                    color: 'grey.500',
                    display: 'block',
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.description}
                </Typography>
              )}
            </Box>
          </Box>
        ),
      },
      {
        id: 'code',
        label: '模板编码',
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
          >
            {row.code}
          </Typography>
        ),
      },
      {
        id: 'type',
        label: '类型',
        render: (row) => (
          <Chip
            label={TYPE_LABELS[row.type]}
            size='small'
            color={TYPE_COLORS[row.type] as any}
            variant='outlined'
            sx={{ minWidth: 80 }}
          />
        ),
      },
      {
        id: 'channels',
        label: '通知渠道',
        render: (row) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {row.channels.map((channel) => (
              <Chip
                key={channel}
                label={channel}
                size='small'
                variant='outlined'
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            ))}
          </Box>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => (
          <Chip
            label={row.status === 'active' ? '启用' : '禁用'}
            size='small'
            color={row.status === 'active' ? 'success' : 'default'}
            variant={row.status === 'active' ? 'filled' : 'outlined'}
            sx={{ minWidth: 60 }}
          />
        ),
      },
      {
        id: 'updatedAt',
        label: '更新时间',
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {row.updatedAt}
          </Typography>
        ),
      },
    ],
    []
  );

  const rowActions: RowAction<NotificationTemplate>[] = useMemo(
    () => [
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: (row) => handleEdit(row),
      },
      {
        label: '复制',
        icon: <Copy size={16} />,
        onClick: (row) => handleCopy(row),
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row),
      },
    ],
    [handleEdit, handleCopy, handleDelete]
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'type',
        label: '类型',
        type: 'select',
        options: [
          { value: '', label: '全部类型' },
          { value: 'system', label: '系统通知' },
          { value: 'approval', label: '审批通知' },
          { value: 'task', label: '任务通知' },
          { value: 'message', label: '消息通知' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: '', label: '全部状态' },
          { value: 'active', label: '启用' },
          { value: 'inactive', label: '禁用' },
        ],
      },
    ],
    []
  );

  const headerContent = (
    <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, borderBottom: 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: '50%', md: 'calc(25% - 8px)' } }}>
          <Box
            sx={{
              p: 2,
              bgcolor: 'primary.50',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'primary.main',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText
                size={24}
                color='white'
              />
            </Box>
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                模板总数
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'primary.main' }}
              >
                {stats.total}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: '50%', md: 'calc(25% - 8px)' } }}>
          <Box
            sx={{
              p: 2,
              bgcolor: 'success.50',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'success.main',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText
                size={24}
                color='white'
              />
            </Box>
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                启用模板
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'success.main' }}
              >
                {stats.active}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: '50%', md: 'calc(25% - 8px)' } }}>
          <Box
            sx={{
              p: 2,
              bgcolor: 'grey.100',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'grey.500',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText
                size={24}
                color='white'
              />
            </Box>
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                禁用模板
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'grey.600' }}
              >
                {stats.inactive}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: '50%', md: 'calc(25% - 8px)' } }}>
          <Box
            sx={{
              p: 2,
              bgcolor: 'warning.50',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'warning.main',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText
                size={24}
                color='white'
              />
            </Box>
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                今日使用次数
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'warning.main' }}
              >
                {stats.todayUsage}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <FileText size={20} />,
        backButton: {
          href: '/notification/dashboard',
        },
      }}
    >
      <ListPageTemplate
        title='通知模板管理'
        subtitle='管理系统通知模板配置'
        columns={columns}
        data={pagedTemplates}
        loading={loading}
        getRowId={(row) => row.id}
        rowActions={rowActions}
        searchable
        searchPlaceholder='搜索模板名称、编码...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filters}
        filtersValue={{ type: selectedType, status: selectedStatus }}
        onFilterChange={handleFilterChange}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: (p) => setCurrentPage(p + 1),
        }}
        onRefresh={handleRefresh}
        headerContent={headerContent}
        actions={[
          {
            label: '新建模板',
            icon: <Plus size={16} />,
            onClick: handleCreate,
            variant: 'contained',
          },
          {
            label: '导入',
            icon: <Upload size={16} />,
            onClick: handleImport,
            variant: 'outlined',
          },
          {
            label: '导出',
            icon: <Download size={16} />,
            onClick: handleExport,
            variant: 'outlined',
          },
        ]}
        emptyIcon={<FileText style={{ width: 48, height: 48, color: '#9e9e9e' }} />}
        emptyMessage='暂无模板数据'
      />

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => {
          setConfirmDialogOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title='确认删除'
        message={`确定要删除模板「${deleteTarget?.name}」吗？此操作不可恢复。`}
        danger
        confirmLabel='删除'
      />
    </PageContainer>
  );
};

export default NotificationTemplatesPage;
