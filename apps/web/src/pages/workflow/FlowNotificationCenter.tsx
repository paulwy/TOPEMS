import React, { useState, useEffect, useMemo } from 'react';
import { Bell, CheckCircle, XCircle, Clock, Check, Play, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '@/api/workflow';
import { workflowApi } from '@/api/workflow';
import { useAppStore } from '../../store';
import { apiLogger } from '@/utils/logger';
import { Box, Typography, Tabs, Tab, CircularProgress, Button } from '@mui/material';
import { PageContainer } from '@/components/common';

const FlowNotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  const user = useAppStore((state) => state.user);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);

      const userId = user?.id || 'current-user-id';

      const params: any = {};
      if (filter === 'unread') {
        // This would need backend support to filter by is_read
      }

      const response = await workflowApi.listNotifications(userId, params);
      if (response.success && response.data) {
        const data = response.data as any;
        const notificationList = Array.isArray(data) ? data : data.items || [];
        setNotifications(notificationList);

        // Count unread
        const unread = notificationList.filter((n: any) => !n.is_read).length;
        setUnreadCount(unread);
      } else {
        setNotifications([]);
      }
    } catch (err: unknown) {
      apiLogger.error('加载通知失败:', err);
      addNotification({
        title: '错误',
        message: '加载通知失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async () => {
    try {
      const userId = user?.id || 'current-user-id';
      const response = await workflowApi.markNotificationsAsRead(userId);
      if (response.success) {
        addNotification({
          title: '成功',
          message: '所有通知已标记为已读',
          type: 'success',
        });
        loadNotifications();
      }
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '标记失败', type: 'error' });
      apiLogger.error('标记失败:', err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      // In a real app, we'd mark this single notification as read
      // For now, we'll just navigate
    }

    // Navigate based on notification type
    if (notification.workflow_instance_id) {
      navigate(`/flow/instances`);
    } else if (notification.approval_id) {
      navigate(`/flow/approvals`);
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconProps = { sx: { width: 20, height: 20 } };
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
      approval_created: '新审批任务',
      approval_completed: '审批已完成',
      workflow_started: '工作流已启动',
      workflow_completed: '工作流已完成',
      workflow_rejected: '工作流被拒绝',
    };
    return typeMap[type] || type;
  };

  const filteredNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  const headerActions = useMemo(() => {
    if (unreadCount <= 0) return [];
    return [
      {
        label: '全部标记为已读',
        icon: <Check size={18} />,
        onClick: handleMarkAsRead,
        variant: 'contained' as const,
        color: 'primary' as const,
      },
    ];
  }, [unreadCount]);

  const subtitleText = useMemo(() => {
    if (unreadCount > 0) {
      return `${unreadCount} 条未读通知`;
    }
    return '暂无未读通知';
  }, [unreadCount]);

  return (
    <PageContainer
      title='通知中心'
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
            label={`全部通知 (${notifications.length})`}
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
            label={`未读 (${unreadCount})`}
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
            <CircularProgress sx={{ color: 'primary.main' }} />
          </Box>
        ) : filteredNotifications.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Bell sx={{ width: 64, height: 64, color: 'grey.300', mb: 2 }} />
            <Typography color='text.secondary'>
              {filter === 'unread' ? '暂无未读通知' : '暂无通知'}
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
                          实例
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
                          审批
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
                          未读
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
