import React, { useMemo, useState, useCallback } from 'react';
import { Bell, Check, Star, Eye, EyeOff, Calendar, Mail } from 'lucide-react';
import { Box, Typography } from '@mui/material';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

import { notificationSchema } from '@/schemas/notification';
import {
  getNotifications,
  markAsRead,
  deleteNotification,
  markAllAsRead,
  bulkMarkAsRead,
  bulkDeleteNotifications,
  type Notification,
} from '@/api/notification';
import { NOTIFICATION_PATHS } from '@/modules/notification/config';
import { useNotificationStore } from '@/store';
import { extractErrorMessage } from '@/utils/errors';
import { PageContainer } from '@/components/common';
import CrudPage, { type CrudApiAdapter, type CrudTab } from '@/components/templates/CrudPage';

type NotificationTab = 'all' | 'unread' | 'read' | 'important';

export const NotificationListPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<NotificationTab>('all');
  const [importantFilter, setImportantFilter] = useState<string>('all');

  const { data: allNotifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications-all'],
    queryFn: async () => {
      const response = await getNotifications(1, 100);
      if (response.success && response.data?.notifications) {
        return response.data.notifications;
      }
      return [];
    },
  });

  const stats = useMemo(() => {
    const notifications = allNotifications as Notification[];
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = notifications.filter((n) => new Date(n.created_at) >= today).length;
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekCount = notifications.filter((n) => new Date(n.created_at) >= weekAgo).length;
    const readCount = notifications.filter((n) => n.is_read).length;
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
  }, [allNotifications]);

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-all'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-all'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-all'] });
    },
  });

  const bulkMarkReadMutation = useMutation({
    mutationFn: (ids: string[]) => bulkMarkAsRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-all'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteNotifications(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-all'] });
    },
  });

  const createApiAdapter = (tab: NotificationTab): CrudApiAdapter => ({
    list: async (params) => {
      const page = params?.page || 1;
      const pageSize = params?.pageSize || 10;
      const typeFilter = params?.notification_type as string | undefined;
      const search = params?.search as string | undefined;

      const response = await getNotifications(
        1,
        100,
        typeFilter && typeFilter !== 'all' ? (typeFilter as any) : undefined
      );

      let notifications: Notification[] = [];
      let total = 0;

      if (response.success && response.data?.notifications) {
        notifications = response.data.notifications;

        switch (tab) {
          case 'unread':
            notifications = notifications.filter((n) => !n.is_read);
            break;
          case 'read':
            notifications = notifications.filter((n) => n.is_read);
            break;
          case 'important':
            notifications = notifications.filter((n) => (n as any).important);
            break;
        }

        if (search) {
          const query = search.toLowerCase();
          notifications = notifications.filter(
            (n) => n.title.toLowerCase().includes(query) || n.content?.toLowerCase().includes(query)
          );
        }

        if (importantFilter !== 'all') {
          notifications = notifications.filter((n) =>
            importantFilter === 'important' ? (n as any).important : !(n as any).important
          );
        }

        total = notifications.length;
        const start = (page - 1) * pageSize;
        notifications = notifications.slice(start, start + pageSize);
      }

      return { data: notifications as any[], total };
    },
    create: async () => ({}) as any,
    update: async () => ({}) as any,
    delete: async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
  });

  const handleMarkAsRead = useCallback(
    async (row: any) => {
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
    (_row: any) => {
      addNotification({
        title: '提示',
        message: '标记为未读功能开发中',
        type: 'info',
      });
    },
    [addNotification]
  );

  const handleToggleImportant = useCallback(
    (_row: any) => {
      addNotification({
        title: '提示',
        message: '重要标记功能开发中',
        type: 'info',
      });
    },
    [addNotification]
  );

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

  const handleFilterImportant = useCallback(() => {
    if (importantFilter === 'important') {
      setImportantFilter('all');
    } else {
      setImportantFilter('important');
    }
  }, [importantFilter]);

  const handleBulkMarkRead = useCallback(
    async (selectedIds: string[]) => {
      try {
        await bulkMarkReadMutation.mutateAsync(selectedIds);
        addNotification({
          title: '操作成功',
          message: `已将 ${selectedIds.length} 条通知标记为已读`,
          type: 'success',
        });
      } catch (err) {
        addNotification({
          title: '操作失败',
          message: extractErrorMessage(err, '批量标记已读失败'),
          type: 'error',
        });
      }
    },
    [addNotification, bulkMarkReadMutation]
  );

  const handleBulkDelete = useCallback(
    async (selectedIds: string[]) => {
      try {
        await bulkDeleteMutation.mutateAsync(selectedIds);
        addNotification({
          title: '删除成功',
          message: `已删除 ${selectedIds.length} 条通知`,
          type: 'success',
        });
      } catch (err) {
        addNotification({
          title: '删除失败',
          message: extractErrorMessage(err, '批量删除失败'),
          type: 'error',
        });
      }
    },
    [addNotification, bulkDeleteMutation]
  );

  const headerContent = useMemo(
    () => (
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
                  color: 'common.white',
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
      </Box>
    ),
    [stats]
  );

  const customRowActions = [
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
  ];

  const schemaWithActions = {
    ...notificationSchema,
    batchActions: [
      {
        key: 'markRead',
        label: '标记已读',
        icon: <Check size={16} />,
        color: 'primary' as const,
        onClick: handleBulkMarkRead,
        confirm: true,
        confirmMessage: '确定要将选中的通知标记为已读吗？',
      },
      {
        key: 'bulkDelete',
        label: '批量删除',
        icon: <Check size={16} />,
        color: 'error' as const,
        onClick: handleBulkDelete,
        confirm: true,
      },
    ],
  };

  const tabs: CrudTab[] = [
    {
      id: 'all',
      label: '全部通知',
      content: (
        <CrudPage
          schema={schemaWithActions}
          apiAdapter={createApiAdapter('all')}
          customRowActions={customRowActions}
          headerContent={headerContent}
          key='all'
        />
      ),
    },
    {
      id: 'unread',
      label: '未读通知',
      content: (
        <CrudPage
          schema={schemaWithActions}
          apiAdapter={createApiAdapter('unread')}
          customRowActions={customRowActions}
          headerContent={headerContent}
          key='unread'
        />
      ),
    },
    {
      id: 'read',
      label: '已读通知',
      content: (
        <CrudPage
          schema={schemaWithActions}
          apiAdapter={createApiAdapter('read')}
          customRowActions={customRowActions}
          headerContent={headerContent}
          key='read'
        />
      ),
    },
    {
      id: 'important',
      label: '重要通知',
      content: (
        <CrudPage
          schema={schemaWithActions}
          apiAdapter={createApiAdapter('important')}
          customRowActions={customRowActions}
          headerContent={headerContent}
          key='important'
        />
      ),
    },
  ];

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Bell size={20} />,
        backButton: {
          href: NOTIFICATION_PATHS.dashboard,
        },
      }}
    >
      <CrudPage
        schema={schemaWithActions}
        apiAdapter={createApiAdapter(activeTab)}
        tabs={tabs}
        defaultTab={activeTab}
        customRowActions={customRowActions}
        headerContent={headerContent}
      />
    </PageContainer>
  );
};

export default NotificationListPage;
