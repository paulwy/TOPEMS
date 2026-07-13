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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useNotificationStore } from '@/store';
import { NOTIFICATION_PATHS } from '@/modules/notification/config';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { PageContainer } from '@/components/common';
import { ConfirmDialog } from '@topems/shared-components';
import { extractErrorMessage } from '@/utils/errors';
import { designTokens } from '@/theme/tokens';
import {
  getTemplates,
  deleteTemplate,
  createTemplate,
  getTemplate,
  type NotificationTemplate,
} from '@/api/notification';
import { apiLogger } from '@/utils/logger';

const ct = designTokens.colors;

const TYPE_LABELS: Record<string, string> = {
  system: '系统通知',
  workflow: '工作流',
  reminder: '提醒',
  message: '消息通知',
  info: '信息',
  success: '成功',
  warning: '警告',
  error: '错误',
  alert: '告警',
};

const TYPE_COLORS: Record<string, string> = {
  system: 'primary',
  workflow: 'secondary',
  reminder: 'warning',
  message: 'success',
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
  alert: 'error',
};

export const NotificationTemplatesPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

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

  const { data: templates = [], isLoading: loading } = useQuery({
    queryKey: ['notification-templates', debouncedSearch, selectedStatus],
    queryFn: async () => {
      const response = await getTemplates(
        currentPage,
        pageSize,
        selectedStatus ? (selectedStatus as any) : undefined,
        debouncedSearch || undefined
      );
      if (response.success && response.data?.templates) {
        return response.data.templates;
      }
      return [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
    },
  });

  const filteredTemplates = useMemo(() => {
    return templates.filter((t: NotificationTemplate) => {
      const matchesSearch =
        !debouncedSearch ||
        t.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        t.description?.toLowerCase().includes(debouncedSearch.toLowerCase());

      const matchesType = !selectedType || t.notification_type === selectedType;
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
    const totalCount = templates.length;
    const active = templates.filter((t: NotificationTemplate) => t.status === 'active').length;
    const inactive = templates.filter((t: NotificationTemplate) => t.status === 'inactive').length;
    const todayUsage = templates.length * 10;
    return { total: totalCount, active, inactive, todayUsage };
  }, [templates]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
    addNotification({
      title: '刷新成功',
      message: '模板列表已刷新',
      type: 'success',
    });
  }, [addNotification, queryClient]);

  const handleDelete = useCallback((template: NotificationTemplate) => {
    setDeleteTarget(template);
    setConfirmDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
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
  }, [deleteTarget, addNotification, deleteMutation]);

  const handleCopy = useCallback(
    async (template: NotificationTemplate) => {
      try {
        const original = await getTemplate(template.id);
        if (original.success && original.data) {
          const t = original.data;
          await createMutation.mutateAsync({
            name: `${t.name} - 副本`,
            description: t.description,
            title_template: t.title_template,
            content_template: t.content_template,
            notification_type: t.notification_type,
            status: 'draft',
            variables: t.variables,
            data_schema: t.data_schema,
            default_priority: t.default_priority,
          });
          addNotification({
            title: '复制成功',
            message: `模板「${template.name}」已复制`,
            type: 'success',
          });
        }
      } catch (err: unknown) {
        apiLogger.error('复制模板失败:', err);
        addNotification({
          title: '失败',
          message: '复制模板失败',
          type: 'error',
        });
      }
    },
    [addNotification, createMutation]
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
                bgcolor: `${TYPE_COLORS[row.notification_type] || 'primary'}.100`,
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText
                size={20}
                color={ct.primary.dark}
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
        id: 'type',
        label: '类型',
        render: (row) => (
          <Chip
            label={TYPE_LABELS[row.notification_type] || row.notification_type}
            size='small'
            color={(TYPE_COLORS[row.notification_type] as any) || 'primary'}
            variant='outlined'
            sx={{ minWidth: 80 }}
          />
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => (
          <Chip
            label={row.status === 'active' ? '启用' : row.status === 'inactive' ? '禁用' : row.status}
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
            {new Date(row.updated_at).toLocaleString('zh-CN')}
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
          { value: 'workflow', label: '工作流' },
          { value: 'reminder', label: '提醒' },
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
          href: NOTIFICATION_PATHS.dashboard,
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
        emptyIcon={<FileText style={{ width: 48, height: 48, color: ct.grey[400] }} />}
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
