import React, { useState, useEffect, useMemo } from 'react';
import { Bell, CheckCircle, XCircle, Clock, Check, Play, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Notification, ListParams } from '@/api/workflow';
import { workflowApi } from '@/api/workflow';
import { useNotificationStore, useAuthStore } from '../../store';
import { apiLogger } from '@/utils/logger';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import { LoadingSpinner } from '@topems/shared-components';
import { PageContainer } from '@/components/common';
import { WORKFLOW_PATHS } from '@/modules/workflow/config';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
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
  const notifications = notificationsQuery.data ?? [];
  const loading = notificationsQuery.isLoading;
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
  const handleMarkAsRead = () => {
    const userId = user?.id || 'current-user-id';
    markAsReadMutation.mutate(userId);
  };
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      // In a real app, we'd mark this single notification as read
      // For now, we'll just navigate
    }
    // Navigate based on notification type
    if (notification.workflow_instance_id) {
      navigate(WORKFLOW_PATHS.instances);
    } else if (notification.approval_id) {
      navigate(WORKFLOW_PATHS.approvals);
    }
  };
  const getNotificationIcon = (type: string) => {
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
  };
  const getNotificationText = (type: string) => {
    const typeMap: Record<string, string> = {
      approval_created: i18n.t('workflow.workflow_notification_center_page.k6'),
      approval_completed: i18n.t('workflow.workflow_notification_center_page.k7'),
      workflow_started: i18n.t('workflow.workflow_notification_center_page.k8'),
      workflow_completed: i18n.t('workflow.workflow_notification_center_page.k9'),
      workflow_rejected: i18n.t('workflow.workflow_notification_center_page.k10'),
    };
    return typeMap[type] || type;
  };
  const filteredNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;
  const headerActions = useMemo(() => {
    if (unreadCount <= 0) return [];
    return [
      {
        label: i18n.t('workflow.workflow_notification_center_page.k11'),
        icon: <Check size={18} />,
        onClick: handleMarkAsRead,
        variant: 'contained' as const,
        color: 'primary' as const,
      },
    ];
  }, [unreadCount]);
  const subtitleText = useMemo(() => {
    if (unreadCount > 0) {
      return `${unreadCount}${i18n.t('pages.workflow_notification_center_page.k2')}`;
    }
    return i18n.t('workflow.workflow_notification_center_page.k12');
  }, [unreadCount]);
  return (
    <PageContainer
      title={i18n.t('workflow.workflow_notification_center_page.k13')}
      subtitle={subtitleText}
      headerProps={{
        pageIcon: <Bell size={24} />,
        pageColor: 'warning.main',
        actions: headerActions,
      }}
    >
      {/* Tabs */}
      <Box sx={{ bgcolor: 'background.paper', borderRadius: 1, mb: 3 }}>
        <Tabs
          value={filter}
          onChange={(_, newValue) => setFilter(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            label={`${i18n.t('pages.workflow_notification_center_page.k3')}${notifications.length})`}
            value='all'
            sx={{
              textTransform: 'none',
              fontWeight: filter === 'all' ? 600 : 400,
              color: filter === 'all' ? 'primary.main' : 'text.secondary',
              borderBottom: filter === 'all' ? 2 : 0,
              borderColor: 'primary.main',
            }}
          />
          <Tab
            label={`${i18n.t('pages.workflow_notification_center_page.k4')}${unreadCount})`}
            value='unread'
            sx={{
              textTransform: 'none',
              fontWeight: filter === 'unread' ? 600 : 400,
              color: filter === 'unread' ? 'primary.main' : 'text.secondary',
              borderBottom: filter === 'unread' ? 2 : 0,
              borderColor: 'primary.main',
            }}
          />
        </Tabs>
      </Box>
      {/* Notification List */}
      <Box sx={{ bgcolor: 'background.paper', borderRadius: 1, p: 3 }}>
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              py: 6,
            }}
          >
            <LoadingSpinner size='lg' />
          </Box>
        ) : filteredNotifications.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Bell sx={{ width: 64, height: 64, color: 'grey.300', mb: 2 }} />
            <Typography color='text.secondary'>
              {filter === 'unread'
                ? i18n.t('workflow.workflow_notification_center_page.k15')
                : i18n.t('workflow.workflow_notification_center_page.k14')}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {filteredNotifications.map((notification) => (
              <Box
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  border: 1,
                  borderColor: notification.is_read ? 'grey.200' : 'primary.200',
                  bgcolor: notification.is_read ? 'background.paper' : 'primary.50',
                  borderRadius: 1,
                  p: 2,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: 2,
                  },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.5,
                      flex: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: notification.is_read ? 'grey.100' : 'primary.100',
                      }}
                    >
                      {getNotificationIcon(notification.notification_type)}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          mb: 0.5,
                        }}
                      >
                        <Typography
                          sx={{
                            fontWeight: notification.is_read ? 400 : 500,
                            color: notification.is_read ? 'grey.700' : 'grey.900',
                          }}
                        >
                          {notification.title}
                        </Typography>
                        {!notification.is_read && (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              bgcolor: 'primary.600',
                              borderRadius: '50%',
                            }}
                          />
                        )}
                      </Box>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                        sx={{ mb: 1 }}
                      >
                        {notification.content}
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          color: 'text.disabled',
                          fontSize: '0.75rem',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.25,
                          }}
                        >
                          {getNotificationIcon(notification.notification_type)}
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            {getNotificationText(notification.notification_type)}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.25,
                          }}
                        >
                          <Clock sx={{ width: 12, height: 12 }} />
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            {new Date(notification.created_at).toLocaleString()}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {notification.workflow_instance_id && (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: '0.75rem',
                          color: 'grey.400',
                        }}
                      >
                        <Typography
                          variant='caption'
                          color='text.disabled'
                        >
                          {i18n.t('pages.workflow_notification_center_page.k0')}
                        </Typography>
                      </Box>
                    )}
                    {notification.approval_id && (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: '0.75rem',
                          color: 'grey.400',
                        }}
                      >
                        <Typography
                          variant='caption'
                          color='text.disabled'
                        >
                          {i18n.t('pages.workflow_notification_center_page.k1')}
                        </Typography>
                      </Box>
                    )}
                    {!notification.is_read && (
                      <Box
                        sx={{
                          px: 1,
                          py: 0.5,
                          bgcolor: 'primary.100',
                          color: 'primary.700',
                          borderRadius: 1,
                          fontSize: '0.75rem',
                        }}
                      >
                        <Typography
                          variant='caption'
                          sx={{ color: 'primary.700' }}
                        >
                          {i18n.t('pages.workflow_notification_center_page.k2')}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </PageContainer>
  );
};
export default FlowNotificationCenter;
