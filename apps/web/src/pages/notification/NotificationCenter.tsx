import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Settings, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Box, Typography, Dialog, DialogTitle, DialogContent } from '@mui/material';
import type { Notification, NotificationTypeEnum } from '@/api/notification';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  bulkMarkAsRead,
  bulkDeleteNotifications,
} from '@/api/notification';
import NotificationItem from '@/components/notifications/NotificationItem';
import NotificationSettings from '@/components/notifications/NotificationSettings';
import useNotificationSettings from '@/hooks/useNotificationSettings';
import { apiLogger } from '@/utils/logger';
import { PageContainer } from '@/components';
import { designTokens } from '@/theme/tokens';
import { useNotificationStore } from '@/store';

const ct = designTokens.colors;

type NotificationFilterType = 'all' | NotificationTypeEnum;

const NotificationCenter: React.FC = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const [activeFilter, setActiveFilter] = useState<NotificationFilterType>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const { settings, toggleSetting } = useNotificationSettings();

  const { data, isError, error, isLoading } = useQuery({
    queryKey: ['notifications', activeFilter, page],
    queryFn: async () => {
      const typeParam = activeFilter === 'all' ? undefined : activeFilter;
      const response = await getNotifications(page, 20, typeParam);
      if (response.success && response.data) {
        return {
          notifications: response.data.notifications,
          total: response.data.total,
          unread_count: response.data.unread_count,
        };
      }
      return { notifications: [], total: 0, unread_count: 0 };
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (isError && error) {
      apiLogger.error('Failed to fetch notifications:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载通知列表',
      });
    }
  }, [isError, error]);

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => markAsRead(id),
    onSuccess: (response) => {
      if (response.success && response.data) {
        queryClient.setQueryData<{
          notifications: Notification[];
          total: number;
          unread_count: number;
        }>(['notifications', activeFilter, page], (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            notifications: prev.notifications.map((n) =>
              n.id === response.data!.id ? response.data! : n
            ),
            unread_count: Math.max(0, prev.unread_count - 1),
          };
        });
      }
    },
    onError: (error) => {
      apiLogger.error('Failed to mark as read:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '标记已读失败',
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      apiLogger.error('Failed to mark all as read:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '全部标记已读失败',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<{
        notifications: Notification[];
        total: number;
        unread_count: number;
      }>(['notifications', activeFilter, page], (prev) => {
        if (!prev) return prev;
        const notification = prev.notifications.find((n) => n.id === id);
        return {
          ...prev,
          notifications: prev.notifications.filter((n) => n.id !== id),
          total: prev.total - 1,
          unread_count:
            notification && !notification.is_read
              ? Math.max(0, prev.unread_count - 1)
              : prev.unread_count,
        };
      });
      setSelectedNotifications((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    },
    onError: (error) => {
      apiLogger.error('Failed to delete notification:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '删除通知失败',
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteNotifications(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setSelectedNotifications(new Set());
    },
    onError: (error) => {
      apiLogger.error('Failed to bulk delete:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '批量删除失败',
      });
    },
  });

  const bulkMarkAsReadMutation = useMutation({
    mutationFn: (ids: string[]) => bulkMarkAsRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setSelectedNotifications(new Set());
    },
    onError: (error) => {
      apiLogger.error('Failed to bulk mark as read:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '批量标记已读失败',
      });
    },
  });

  const notifications = data?.notifications || [];
  const total = data?.total || 0;
  const unreadCount = data?.unread_count || 0;
  const loading = isLoading;

  const filteredNotifications = useMemo(() => {
    if (!searchQuery.trim()) return notifications;
    const query = searchQuery.toLowerCase();
    return notifications.filter(
      (n) => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query)
    );
  }, [notifications, searchQuery]);

  const handleMarkAsRead = (notification: Notification) => {
    markAsReadMutation.mutate(notification.id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedNotifications);
    bulkDeleteMutation.mutate(ids);
  };

  const handleBulkMarkAsRead = () => {
    const ids = Array.from(selectedNotifications);
    bulkMarkAsReadMutation.mutate(ids);
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedNotifications(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map((n) => n.id)));
    }
  };

  const getFilterLabel = (filter: NotificationFilterType) => {
    switch (filter) {
      case 'all':
        return '全部';
      case 'system':
        return '系统通知';
      case 'workflow':
        return '审批通知';
      case 'reminder':
        return '提醒通知';
      case 'alert':
        return '告警通知';
      case 'message':
        return '消息通知';
      default:
        return '全部';
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <PageContainer
      maxWidth={false}
      padding={false}
      title='通知中心'
      subtitle={`共 ${total} 条通知，${unreadCount} 条未读`}
      headerProps={{
        pageIcon: <Bell size={20} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main}, ${ct.primary.dark})`,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Box sx={{ maxWidth: 600, mx: 'auto', position: 'relative' }}>
            <Search
              sx={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'text.disabled',
              }}
            />
            <input
              type='text'
              placeholder='搜索通知...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px 12px 48px',
                borderRadius: '12px',
                border: '1px solid',
                borderColor: 'action.hover',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            gap: 2,
            p: 3,
            borderBottom: 1,
            borderColor: 'divider',
            overflowX: 'auto',
          }}
        >
          {(
            [
              'all',
              'system',
              'workflow',
              'reminder',
              'alert',
              'message',
            ] as NotificationFilterType[]
          ).map((filter) => (
            <button
              key={filter}
              onClick={() => {
                setActiveFilter(filter);
                setPage(1);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: activeFilter === filter ? ct.primary.main : 'rgba(0,0,0,0.04)',
                color: activeFilter === filter ? '#fff' : 'inherit',
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {getFilterLabel(filter)}
            </button>
          ))}
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '200px',
              }}
            >
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
            </Box>
          ) : filteredNotifications.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 12,
                color: 'text.disabled',
              }}
            >
              <Bell
                size={48}
                strokeWidth={1}
              />
              <Typography
                variant='h6'
                sx={{ mt: 2 }}
              >
                暂无通知
              </Typography>
              <Typography variant='body2'>您还没有任何通知消息</Typography>
            </Box>
          ) : (
            <div>
              {selectedNotifications.size > 0 && (
                <Box
                  sx={{
                    p: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    display: 'flex',
                    gap: 2,
                  }}
                >
                  <button
                    onClick={toggleSelectAll}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 16px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type='checkbox'
                      checked={selectedNotifications.size === filteredNotifications.length}
                      onChange={() => toggleSelectAll()}
                    />
                    <span>全选</span>
                  </button>
                  <div style={{ flex: 1 }}></div>
                  <button
                    onClick={handleBulkMarkAsRead}
                    disabled={bulkMarkAsReadMutation.isPending}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: ct.primary.main,
                      color: ct.primary.main,
                      cursor: 'pointer',
                    }}
                  >
                    标记已读
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleteMutation.isPending}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      backgroundColor: ct.error.main,
                      color: 'common.white',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    删除
                  </button>
                </Box>
              )}

              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  role='button'
                  tabIndex={0}
                  onClick={() => toggleSelect(notification.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleSelect(notification.id);
                    }
                  }}
                  style={{ cursor: 'pointer', borderBottom: 1, borderColor: 'divider' }}
                >
                  <NotificationItem
                    notification={notification}
                    onUpdate={() => handleMarkAsRead(notification)}
                    onDelete={() => handleDelete(notification.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </Box>

        <Box
          sx={{
            p: 3,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography
            variant='body2'
            color='text.disabled'
          >
            第 {page} / {totalPages} 页
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: 'divider',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: 'divider',
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronRight size={16} />
            </button>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <button
          onClick={handleMarkAllAsRead}
          disabled={markAllAsReadMutation.isPending}
          style={{
            padding: '12px',
            borderRadius: '50%',
            backgroundColor: ct.primary.main,
            color: 'common.white',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          <Check size={20} />
        </button>
        <button
          onClick={() => setShowSettings(true)}
          style={{
            padding: '12px',
            borderRadius: '50%',
            backgroundColor: 'background.paper',
            color: 'inherit',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          <Settings size={20} />
        </button>
      </Box>

      <Dialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>通知设置</DialogTitle>
        <DialogContent>
          <NotificationSettings />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default NotificationCenter;
