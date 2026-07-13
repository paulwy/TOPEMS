import { Box, Typography, Chip, Tabs, Tab } from '@mui/material';
import React, { useState, useMemo, useCallback } from 'react';
import {
  Bell,
  Check,
  Trash2,
  Star,
  StarOff,
  Mail,
  Settings,
  CheckSquare,
  MessageSquare,
  Calendar,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useNotificationStore } from '../../store';
import { NOTIFICATION_PATHS } from '@/modules/notification/config';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { PageContainer, ConfirmDialog } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import {
  getNotifications,
  markAsRead,
  deleteNotification,
  markAllAsRead,
  type Notification,
} from '@/api/notification';

const ct = designTokens.colors;

type NotificationType = 'system' | 'approval' | 'task' | 'message';
type NotificationTab = 'all' | 'unread' | 'read' | 'important';

const TYPE_LABELS: Record<NotificationType, string> = {
  system: '系统通知',
  approval: '审批通知',
  task: '任务通知',
  message: '消息通知',
};

const TYPE_COLORS: Record<NotificationType, 'primary' | 'success' | 'warning' | 'info'> = {
  system: 'primary',
  approval: 'warning',
  task: 'success',
  message: 'info',
};

const TYPE_BG_COLORS: Record<NotificationType, { bg: string; color: string }> = {
  system: { bg: 'rgba(59, 130, 246, 0.1)', color: 'primary.main' },
  approval: { bg: 'rgba(245, 158, 11, 0.1)', color: 'warning.main' },
  task: { bg: 'rgba(34, 197, 94, 0.1)', color: 'success.main' },
  message: { bg: 'rgba(14, 165, 233, 0.1)', color: ct.info.main },
};

const TYPE_ICONS: Record<NotificationType, React.ReactNode> = {
  system: <Settings size={16} />,
  approval: <CheckSquare size={16} />,
  task: <Calendar size={16} />,
  message: <MessageSquare size={16} />,
};

export const NotificationListPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<NotificationTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [importantFilter, setImportantFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Notification | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const { data: notifications = [], isLoading: loading } = useQuery({
    queryKey: ['notifications', activeTab, typeFilter],
    queryFn: async () => {
      const response = await getNotifications(
        page,
        100,
        typeFilter !== 'all' ? (typeFilter as any) : undefined
      );
      if (response.success && response.data?.notifications) {
        return response.data.notifications.map((n: Notification) => ({
          ...n,
          important: (n as any).important || false,
        }));
      }
      return [];
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const filteredByTab = useMemo(() => {
    let result = notifications as Notification[];
    switch (activeTab) {
      case 'unread':
        result = result.filter((n) => !n.is_read);
        break;
      case 'read':
        result = result.filter((n) => n.is_read);
        break;
      case 'important':
        result = result.filter((n) => (n as any).important);
        break;
      default:
        break;
    }
    return result;
  }, [notifications, activeTab]);

  const filteredData = useMemo(() => {
    let result = filteredByTab;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (n) => n.title.toLowerCase().includes(query) || n.content?.toLowerCase().includes(query)
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter((n) => n.notification_type === typeFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter((n) =>
        statusFilter === 'unread' ? !n.is_read : !!n.is_read
      );
    }

    if (importantFilter !== 'all') {
      result = result.filter((n) =>
        importantFilter === 'important' ? (n as any).important : !(n as any).important
      );
    }

    return result;
  }, [filteredByTab, searchQuery, typeFilter, statusFilter, importantFilter]);

  const total = filteredData.length;
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const stats = useMemo(() => {
    const unreadCount = (notifications as Notification[]).filter((n) => !n.is_read).length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = (notifications as Notification[]).filter(
      (n) => new Date(n.created_at) >= today
    ).length;
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekCount = (notifications as Notification[]).filter(
      (n) => new Date(n.created_at) >= weekAgo
    ).length;
    const readCount = (notifications as Notification[]).filter((n) => n.is_read).length;
    const readRate =
      notifications.length > 0 ? Math.round((readCount / notifications.length) * 100) : 0;

    return [
      {
        id: 'unread',
        title: '未读数',
        value: unreadCount,
        icon: <Bell size={20} />,
        color: 'primary' as const,
      },
      {
        id: 'today',
        title: '今日通知',
        value: todayCount,
        icon: <Calendar size={20} />,
        color: 'success' as const,
      },
      {
        id: 'week',
        title: '本周通知',
        value: weekCount,
        icon: <Mail size={20} />,
        color: 'warning' as const,
      },
      {
        id: 'readRate',
        title: '已读率',
        value: `${readRate}%`,
        icon: <Check size={20} />,
        color: 'info' as const,
      },
    ];
  }, [notifications]);

  const handleMarkAsRead = useCallback(
    async (row: Notification) => {
      try {
        await markAsReadMutation.mutateAsync(row.id);
        addNotification({
          title: '操作成功',
          message: '通知已标记为已读',
          type: 'success',
        });
      } catch (err) {
        addNotification({
          title: '操作失败',
          message: extractErrorMessage(err, '标记已读失败'),
          type: 'error',
        });
      }
    },
    [addNotification, markAsReadMutation]
  );

  const handleMarkAsUnread = useCallback(
    (row: Notification) => {
      addNotification({
        title: '提示',
        message: '标记为未读功能开发中',
        type: 'info',
      });
    },
    [addNotification]
  );

  const handleToggleImportant = useCallback(
    (row: Notification) => {
      addNotification({
        title: '提示',
        message: '重要标记功能开发中',
        type: 'info',
      });
    },
    [addNotification]
  );

  const handleDeleteClick = useCallback((row: Notification) => {
    setDeleteTarget(row);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      addNotification({
        title: '删除成功',
        message: '通知已删除',
        type: 'success',
      });
    } catch (_err: unknown) {
      addNotification({
        title: '删除失败',
        message: extractErrorMessage(_err, '删除通知失败'),
        type: 'error',
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, addNotification, deleteMutation]);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
      addNotification({
        title: '操作成功',
        message: '已将全部通知标记为已读',
        type: 'success',
      });
    } catch (err) {
      addNotification({
        title: '操作失败',
        message: extractErrorMessage(err, '标记已读失败'),
        type: 'error',
      });
    }
  }, [addNotification, markAllAsReadMutation]);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.length === 0) {
      addNotification({
        title: '提示',
        message: '请先选择要删除的通知',
        type: 'warning',
      });
      return;
    }
    setBulkDeleteDialogOpen(true);
  }, [selectedIds.length, addNotification]);

  const handleConfirmBulkDelete = useCallback(async () => {
    try {
      for (const id of selectedIds) {
        await deleteMutation.mutateAsync(id);
      }
      setSelectedIds([]);
      addNotification({
        title: '删除成功',
        message: `已删除 ${selectedIds.length} 条通知`,
        type: 'success',
      });
    } catch (_err: unknown) {
      addNotification({
        title: '删除失败',
        message: extractErrorMessage(_err, '批量删除失败'),
        type: 'error',
      });
    } finally {
      setBulkDeleteDialogOpen(false);
    }
  }, [selectedIds, addNotification, deleteMutation]);

  const handleFilterImportant = useCallback(() => {
    if (importantFilter === 'important') {
      setImportantFilter('all');
    } else {
      setImportantFilter('important');
    }
    setPage(1);
  }, [importantFilter]);

  const columns: ColumnDef<Notification>[] = useMemo(
    () => [
      {
        id: 'title',
        label: '通知标题',
        minWidth: 280,
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: TYPE_BG_COLORS[row.notification_type as NotificationType].bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: TYPE_BG_COLORS[row.notification_type as NotificationType].color,
                flexShrink: 0,
              }}
            >
              {TYPE_ICONS[row.notification_type as NotificationType]}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant='body2'
                sx={{
                  fontWeight: !row.is_read ? 600 : 400,
                  color: !row.is_read ? 'text.primary' : 'text.secondary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.title}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.content}
              </Typography>
            </Box>
            {(row as any).important && (
              <Star
                size={14}
                color='warning.main'
                fill='warning.main'
              />
            )}
          </Box>
        ),
      },
      {
        id: 'type',
        label: '类型',
        width: 120,
        render: (row) => (
          <Chip
            size='small'
            color={TYPE_COLORS[row.notification_type as NotificationType]}
            label={TYPE_LABELS[row.notification_type as NotificationType]}
            variant='outlined'
          />
        ),
      },
      {
        id: 'createdAt',
        label: '发送时间',
        width: 160,
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {new Date(row.created_at).toLocaleString('zh-CN')}
          </Typography>
        ),
      },
    ],
    []
  );

  const rowActions = useMemo(
    () => [
      {
        label: '标记已读',
        icon: <Eye size={16} />,
        onClick: handleMarkAsRead,
      },
      {
        label: '标记未读',
        icon: <EyeOff size={16} />,
        onClick: handleMarkAsUnread,
      },
      {
        label: '重要',
        icon: <Star size={16} />,
        onClick: handleToggleImportant,
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        onClick: handleDeleteClick,
        color: 'error' as const,
      },
    ],
    [handleMarkAsRead, handleMarkAsUnread, handleToggleImportant, handleDeleteClick]
  );

  const tabActions = useMemo(
    () => [
      {
        label: '全部已读',
        icon: <Check size={16} />,
        onClick: handleMarkAllAsRead,
      },
      {
        label: '重要筛选',
        icon: <Star size={16} />,
        onClick: handleFilterImportant,
        color: importantFilter === 'important' ? 'warning' : undefined,
      },
      {
        label: '批量删除',
        icon: <Trash2 size={16} />,
        onClick: handleBulkDelete,
        color: 'error' as const,
      },
    ],
    [handleMarkAllAsRead, handleFilterImportant, handleBulkDelete, importantFilter]
  );

  const headerContent = (
    <Box sx={{ px: { xs: 2, sm: 3 }, py: 3, borderBottom: 1, borderColor: 'divider' }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        {stats.map((stat) => (
          <Box
            key={stat.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 2,
              bgcolor: `${stat.color}.50`,
              borderRadius: 3,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: `${stat.color}.main`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              {stat.icon}
            </Box>
            <Box>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {stat.title}
              </Typography>
              <Typography
                variant='h6'
                sx={{ fontWeight: 700, color: `${stat.color}.main` }}
              >
                {stat.value}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, newValue) => {
          setActiveTab(newValue);
          setPage(1);
        }}
        sx={{
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 500,
            minHeight: 40,
          },
        }}
      >
        <Tab
          label='全部通知'
          value='all'
        />
        <Tab
          label='未读通知'
          value='unread'
        />
        <Tab
          label='已读通知'
          value='read'
        />
        <Tab
          label='重要通知'
          value='important'
        />
      </Tabs>
    </Box>
  );

  const filters = useMemo(
    () => [
      {
        id: 'type',
        label: '通知类型',
        type: 'select' as const,
        options: [
          { value: 'all', label: '全部类型' },
          { value: 'system', label: '系统通知' },
          { value: 'approval', label: '审批通知' },
          { value: 'task', label: '任务通知' },
          { value: 'message', label: '消息通知' },
        ],
      },
      {
        id: 'status',
        label: '阅读状态',
        type: 'select' as const,
        options: [
          { value: 'all', label: '全部状态' },
          { value: 'unread', label: '未读' },
          { value: 'read', label: '已读' },
        ],
      },
    ],
    []
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Bell size={20} />,
        backButton: {
          href: NOTIFICATION_PATHS.dashboard,
        },
      }}
    >
      <ListPageTemplate
        title='通知中心'
        subtitle='查看和管理您的所有通知'
        columns={columns}
        data={paginatedData}
        loading={loading}
        getRowId={(row) => row.id}
        rowActions={rowActions}
        searchable
        searchPlaceholder='搜索通知标题、内容...'
        searchValue={searchQuery}
        onSearch={(value) => {
          setSearchQuery(value);
          setPage(1);
        }}
        filters={filters}
        filtersValue={{ type: typeFilter, status: statusFilter }}
        onFilterChange={(filters) => {
          if (filters.type !== undefined) {
            setTypeFilter(filters.type);
            setPage(1);
          }
          if (filters.status !== undefined) {
            setStatusFilter(filters.status);
            setPage(1);
          }
        }}
        pagination={{
          page: page - 1,
          pageSize,
          total,
          onPageChange: (p) => setPage(p + 1),
        }}
        headerContent={headerContent}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids.map(String))}
        emptyIcon={<Bell style={{ width: 48, height: 48, color: ct.grey[400] }} />}
        emptyMessage='暂无通知数据'
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title='确认删除'
        message='确定要删除这条通知吗？此操作不可恢复。'
        danger
        confirmLabel='删除'
      />

      <ConfirmDialog
        isOpen={bulkDeleteDialogOpen}
        onClose={() => setBulkDeleteDialogOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title='确认批量删除'
        message={`确定要删除选中的 ${selectedIds.length} 条通知吗？此操作不可恢复。`}
        danger
        confirmLabel='删除'
      />
    </PageContainer>
  );
};

export default NotificationListPage;
