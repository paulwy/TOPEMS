import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Bell, CheckCircle, XCircle, Check, Play, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import type { Notification, ListParams } from '@/api/workflow';
import { workflowApi } from '@/api/workflow';
import { useNotificationStore, useAuthStore } from '../../store';
import { apiLogger } from '@/utils/logger';
import { WORKFLOW_PATHS } from '@/modules/workflow/config';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef } from '@/components/templates/list/types';
import type { FilterConfig } from '@topems/shared-components';
import i18n from '@/i18n';

const FlowNotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const notificationsQuery = useQuery<Notification[]>({
    queryKey: [...QUERY_KEYS.AD_HOC.WORKFLOW_NOTIFICATIONS_BASE, filter],
    queryFn: async (): Promise<Notification[]> => {
      const userId = user?.id || 'current-user-id';
      const params: ListParams = {};
      if (filter === 'unread') {
        // This would need backend support to filter by is_read
      }
      const response = await workflowApi.listNotifications(userId, params);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const notifications = useMemo(() => notificationsQuery.data ?? [], [notificationsQuery.data]);
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  useEffect(() => {
    if (notificationsQuery.isError) {
      apiLogger.error(
        i18n.t('pages.workflow_notification_center_page.k0'),
        notificationsQuery.error
      );
      addNotification({
        title: i18n.t('workflow.workflow_notification_center_page.k0'),
        message: i18n.t('workflow.workflow_notification_center_page.k1'),
        type: 'error',
      });
    }
  }, [notificationsQuery.isError, notificationsQuery.error, addNotification]);

  const markAsReadMutation = useMutation({
    mutationFn: (userId: string) => workflowApi.markNotificationsAsRead(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.WORKFLOW_NOTIFICATIONS_BASE,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        title: i18n.t('workflow.workflow_notification_center_page.k2'),
        message: i18n.t('workflow.workflow_notification_center_page.k3'),
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      addNotification({
        title: i18n.t('workflow.workflow_notification_center_page.k5'),
        message: i18n.t('workflow.workflow_notification_center_page.k4'),
        type: 'error',
      });
      apiLogger.error(i18n.t('pages.workflow_notification_center_page.k1'), err);
    },
  });

  const handleMarkAsRead = useCallback(() => {
    const userId = user?.id || 'current-user-id';
    markAsReadMutation.mutate(userId);
  }, [user?.id, markAsReadMutation]);

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      if (notification.workflow_instance_id) {
        navigate(WORKFLOW_PATHS.instances);
      } else if (notification.approval_id) {
        navigate(WORKFLOW_PATHS.approvals);
      }
    },
    [navigate]
  );

  const getNotificationIcon = useCallback((type: string) => {
    switch (type) {
      case 'approval_created':
        return <CheckCircle sx={{ width: 20, height: 20, color: 'blue.600' }} />;
      case 'approval_completed':
        return <CheckCircle2 sx={{ width: 20, height: 20, color: 'green.600' }} />;
      case 'workflow_started':
        return <Play sx={{ width: 20, height: 20, color: 'indigo.600' }} />;
      case 'workflow_completed':
        return <CheckCircle sx={{ width: 20, height: 20, color: 'green.600' }} />;
      case 'workflow_rejected':
        return <XCircle sx={{ width: 20, height: 20, color: 'red.600' }} />;
      default:
        return <Bell sx={{ width: 20, height: 20, color: 'grey.600' }} />;
    }
  }, []);

  const getNotificationText = useCallback((type: string) => {
    const typeMap: Record<string, string> = {
      approval_created: i18n.t('workflow.workflow_notification_center_page.k6'),
      approval_completed: i18n.t('workflow.workflow_notification_center_page.k7'),
      workflow_started: i18n.t('workflow.workflow_notification_center_page.k8'),
      workflow_completed: i18n.t('workflow.workflow_notification_center_page.k9'),
      workflow_rejected: i18n.t('workflow.workflow_notification_center_page.k10'),
    };
    return typeMap[type] || type;
  }, []);

  const filteredNotifications = useMemo(
    () => (filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications),
    [filter, notifications]
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'readStatus',
        label: i18n.t('shared.notification.k28'),
        type: 'select',
        options: [
          {
            value: 'all',
            label: `${i18n.t('pages.workflow_notification_center_page.k3')}${notifications.length})`,
          },
          {
            value: 'unread',
            label: `${i18n.t('pages.workflow_notification_center_page.k4')}${unreadCount})`,
          },
        ],
      },
    ],
    [notifications.length, unreadCount]
  );

  const filtersValue = useMemo(() => ({ readStatus: filter }), [filter]);

  const handleFilterChange = useCallback((newFilters: Record<string, unknown>) => {
    const newValue = newFilters.readStatus as 'all' | 'unread' | undefined;
    if (newValue === 'all' || newValue === 'unread') {
      setFilter(newValue);
    }
  }, []);

  const columns: ColumnDef<Notification>[] = useMemo(
    () => [
      {
        id: 'notification_type',
        label: i18n.t('shared.notification.k22'),
        width: 160,
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getNotificationIcon(row.notification_type)}
            <Typography variant='body2'>{getNotificationText(row.notification_type)}</Typography>
          </Box>
        ),
      },
      {
        id: 'message',
        label: i18n.t('shared.notification.k27'),
        render: (row) => (
          <Box>
            <Typography sx={{ fontWeight: row.is_read ? 400 : 600 }}>{row.title}</Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {row.content}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'created_at',
        label: i18n.t('shared.notification.k19'),
        width: 180,
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {new Date(row.created_at).toLocaleString()}
          </Typography>
        ),
      },
      {
        id: 'is_read',
        label: i18n.t('shared.notification.k28'),
        width: 120,
        render: (row) =>
          row.is_read ? (
            <Chip
              label={i18n.t('shared.notification.k20')}
              size='small'
              color='default'
              variant='outlined'
            />
          ) : (
            <Chip
              label={i18n.t('shared.notification.k21')}
              size='small'
              color='primary'
              variant='outlined'
            />
          ),
      },
    ],
    [getNotificationIcon, getNotificationText]
  );

  const actions = useMemo(
    () => [
      {
        label: i18n.t('workflow.workflow_notification_center_page.k11'),
        icon: <Check size={18} />,
        onClick: handleMarkAsRead,
        variant: 'contained' as const,
        disabled: markAsReadMutation.isPending || unreadCount === 0,
      },
    ],
    [handleMarkAsRead, markAsReadMutation.isPending, unreadCount]
  );

  const renderRowActions = useCallback(
    (row: Notification) => (
      <Box sx={{ display: 'flex', gap: 1 }}>
        {!row.is_read && (
          <Tooltip title={i18n.t('workflow.workflow_notification_center_page.k11')}>
            <span>
              <IconButton
                size='small'
                color='primary'
                onClick={() => handleMarkAsRead()}
                disabled={markAsReadMutation.isPending}
                aria-label={i18n.t('workflow.workflow_notification_center_page.k11')}
              >
                <Check size={18} />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>
    ),
    [handleMarkAsRead, markAsReadMutation.isPending]
  );

  const subtitleText = useMemo(() => {
    if (unreadCount > 0) {
      return `${unreadCount}${i18n.t('pages.workflow_notification_center_page.k2')}`;
    }
    return i18n.t('workflow.workflow_notification_center_page.k12');
  }, [unreadCount]);

  const emptyMessage = useMemo(() => {
    if (filter === 'unread') {
      return i18n.t('workflow.workflow_notification_center_page.k15');
    }
    return i18n.t('workflow.workflow_notification_center_page.k14');
  }, [filter]);

  return (
    <ListPageTemplate<Notification>
      title={i18n.t('workflow.workflow_notification_center_page.k13')}
      subtitle={subtitleText}
      columns={columns}
      data={filteredNotifications}
      loading={notificationsQuery.isLoading}
      actions={actions}
      renderRowActions={renderRowActions}
      onRowClick={handleNotificationClick}
      filters={filters}
      filtersValue={filtersValue}
      onFilterChange={handleFilterChange}
      emptyMessage={emptyMessage}
      emptyIcon={<Bell size={64} />}
    />
  );
};

export default FlowNotificationCenter;
