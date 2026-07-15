import React, { useState, useMemo, useCallback } from 'react';
import {
  Bell,
  Check,
  Trash2,
  Archive,
  Settings,
  Volume2,
  VolumeX,
  Monitor,
  Search,
  BarChart3,
  FileText,
  Eye,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Chip, Button, Tooltip, IconButton } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { NOTIFICATION_PATHS } from '@/modules/notification/config';
import { designTokens } from '@/theme/tokens';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

type NotificationFilterType = 'all' | NotificationTypeEnum;

const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<NotificationFilterType>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const { settings, toggleSetting } = useNotificationSettings();

  const notificationsQuery = useQuery({
    queryKey: [...QUERY_KEYS.NOTIFICATION.NOTIFICATIONS, activeFilter, page],
    queryFn: async () => {
      const typeParam = activeFilter === 'all' ? undefined : activeFilter;
      const response = await getNotifications(page + 1, 20, typeParam);
      if (response.success && response.data) {
        return {
          notifications: response.data.notifications,
          total: response.data.total,
          unread_count: response.data.unread_count,
        };
      }
      return { notifications: [] as Notification[], total: 0, unread_count: 0 };
    },
  });

  const notifications = notificationsQuery.data?.notifications ?? [];
  const total = notificationsQuery.data?.total ?? 0;
  const unreadCount = notificationsQuery.data?.unread_count ?? 0;
  const loading = notificationsQuery.isLoading;

  const fetchNotifications = useCallback(() => {
    notificationsQuery.refetch();
  }, [notificationsQuery]);

  const invalidateNotifications = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATION.NOTIFICATIONS });
  }, [queryClient]);

  const filteredNotifications = useMemo(() => {
    if (!searchQuery.trim()) return notifications;
    const query = searchQuery.toLowerCase();
    return notifications.filter(
      (n) => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query)
    );
  }, [notifications, searchQuery]);

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => markAsRead(id),
    onSuccess: () => {
      invalidateNotifications();
    },
    onError: (error: unknown) => {
      apiLogger.error('Failed to mark as read:', error);
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => markAllAsRead(),
    onSuccess: () => {
      invalidateNotifications();
    },
    onError: (error: unknown) => {
      apiLogger.error('Failed to mark all as read:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteNotification(id),
    onSuccess: () => {
      invalidateNotifications();
    },
    onError: (error: unknown) => {
      apiLogger.error('Failed to delete notification:', error);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => bulkDeleteNotifications(ids),
    onSuccess: () => {
      invalidateNotifications();
      setSelectedNotifications(new Set());
    },
    onError: (error: unknown) => {
      apiLogger.error('Failed to bulk delete:', error);
    },
  });

  const bulkMarkAsReadMutation = useMutation({
    mutationFn: async (ids: string[]) => bulkMarkAsRead(ids),
    onSuccess: () => {
      invalidateNotifications();
      setSelectedNotifications(new Set());
    },
    onError: (error: unknown) => {
      apiLogger.error('Failed to bulk mark as read:', error);
    },
  });

  const handleMarkAsRead = useCallback(
    (notification: Notification) => {
      markAsReadMutation.mutate(notification.id);
    },
    [markAsReadMutation]
  );

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
      setSelectedNotifications((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    },
    [deleteMutation]
  );

  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(selectedNotifications);
    bulkDeleteMutation.mutate(ids);
  }, [bulkDeleteMutation, selectedNotifications]);

  const handleBulkMarkAsRead = useCallback(() => {
    const ids = Array.from(selectedNotifications);
    bulkMarkAsReadMutation.mutate(ids);
  }, [bulkMarkAsReadMutation, selectedNotifications]);

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

  const getTypeIcon = (type: NotificationTypeEnum) => {
    switch (type) {
      case 'system':
        return <Settings size={16} />;
      case 'workflow':
        return <FileText size={16} />;
      case 'reminder':
        return <Bell size={16} />;
      case 'alert':
        return <Bell size={16} />;
      case 'message':
        return <Bell size={16} />;
      default:
        return <Bell size={16} />;
    }
  };

  const getTypeColor = (type: NotificationTypeEnum) => {
    switch (type) {
      case 'system':
        return 'info';
      case 'workflow':
        return 'success';
      case 'reminder':
        return 'warning';
      case 'alert':
        return 'error';
      case 'message':
        return 'primary';
      default:
        return 'default';
    }
  };

  const columns: ColumnDef<Notification>[] = useMemo(
    () => [
      {
        id: 'type',
        label: '类型',
        width: 100,
        render: (row) => (
          <Chip
            size='small'
            color={getTypeColor(row.notification_type) as any}
            label={getFilterLabel(row.notification_type)}
            variant='outlined'
            icon={getTypeIcon(row.notification_type)}
          />
        ),
      },
      {
        id: 'title',
        label: '标题',
        minWidth: 200,
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant='body2'
              sx={{
                fontWeight: 500,
                color: row.is_read ? 'text.primary' : 'text.secondary',
                textDecoration: row.is_read ? 'none' : 'none',
              }}
            >
              {row.title}
            </Typography>
            {!row.is_read && (
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                }}
              />
            )}
            <Tooltip title='查看详情'>
              <IconButton
                size='small'
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNotification(row);
                  setDetailOpen(true);
                }}
              >
                <Eye size={14} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
      {
        id: 'content',
        label: '内容',
        minWidth: 250,
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 300,
            }}
          >
            {row.content}
          </Typography>
        ),
      },
      {
        id: 'created_at',
        label: '时间',
        width: 160,
        render: (row) => {
          const date = new Date(row.created_at);
          const now = new Date();
          const diff = now.getTime() - date.getTime();
          const minutes = Math.floor(diff / 60000);
          const hours = Math.floor(diff / 3600000);
          const days = Math.floor(diff / 86400000);

          if (minutes < 1) return '刚刚';
          if (minutes < 60) return `${minutes}分钟前`;
          if (hours < 24) return `${hours}小时前`;
          if (days < 7) return `${days}天前`;
          return date.toLocaleDateString('zh-CN');
        },
      },
      {
        id: 'actions',
        label: '操作',
        align: 'right',
        width: 150,
        render: (row) => (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {!row.is_read && (
              <Tooltip title='标记已读'>
                <Button
                  size='small'
                  variant='outlined'
                  color='primary'
                  startIcon={<Check size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(row);
                  }}
                >
                  已读
                </Button>
              </Tooltip>
            )}
            <Tooltip title='删除'>
              <Button
                size='small'
                variant='outlined'
                color='error'
                startIcon={<Trash2 size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(row.id);
                }}
              >
                删除
              </Button>
            </Tooltip>
          </Box>
        ),
      },
    ],
    []
  );

  const filters = useMemo(
    () => [
      {
        id: 'type',
        label: '通知类型',
        type: 'select' as const,
        options: [
          { label: '全部', value: 'all' },
          { label: '系统通知', value: 'system' },
          { label: '审批通知', value: 'workflow' },
          { label: '提醒通知', value: 'reminder' },
          { label: '告警通知', value: 'alert' },
          { label: '消息通知', value: 'message' },
        ],
      },
    ],
    []
  );

  const handleFilterChange = (filters: Record<string, unknown>) => {
    if (typeof filters.type === 'string') {
      setActiveFilter(filters.type as NotificationFilterType);
    }
    setPage(0);
  };

  const handleSelectionChange = (selection: (string | number)[]) => {
    setSelectedNotifications(new Set(selection.map(String)));
  };

  const headerContent = (
    <>
      {showSettings && (
        <Box sx={{ px: { xs: 2, sm: 3 }, pb: 3 }}>
          <NotificationSettings />
        </Box>
      )}
      {unreadCount > 0 && (
        <Box sx={{ px: { xs: 2, sm: 3 }, pb: 3 }}>
          <Button
            variant='outlined'
            color='primary'
            startIcon={<Check size={16} />}
            onClick={handleMarkAllAsRead}
          >
            全部标记已读 ({unreadCount})
          </Button>
        </Box>
      )}
    </>
  );

  return (
    <PageContainer
      maxWidth={false}
      padding={false}
      title='通知中心'
      subtitle={`共 ${total} 条通知，${unreadCount} 条未读`}
      headerProps={{
        pageIcon: (
          <Bell
            size={24}
            color={ct.primary.dark}
          />
        ),
        pageColor: 'primary.100',
        customToolbar: (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              component='button'
              onClick={() => navigate(NOTIFICATION_PATHS.statistics)}
              sx={{
                p: 1,
                borderRadius: 3,
                bgcolor: 'grey.200',
                color: 'grey.600',
                '&:hover': { bgcolor: 'grey.300' },
                transition: 'background-color 0.2s',
              }}
              title='统计'
            >
              <BarChart3 size={20} />
            </Box>
            <Box
              component='button'
              onClick={() => navigate(NOTIFICATION_PATHS.templates)}
              sx={{
                p: 1,
                borderRadius: 3,
                bgcolor: 'grey.200',
                color: 'grey.600',
                '&:hover': { bgcolor: 'grey.300' },
                transition: 'background-color 0.2s',
              }}
              title='模板管理'
            >
              <FileText size={20} />
            </Box>
            <Box
              component='button'
              onClick={() => navigate(NOTIFICATION_PATHS.archive)}
              sx={{
                p: 1,
                borderRadius: 3,
                bgcolor: 'grey.200',
                color: 'grey.600',
                '&:hover': { bgcolor: 'grey.300' },
                transition: 'background-color 0.2s',
              }}
              title='归档管理'
            >
              <Archive size={20} />
            </Box>
            <Box
              component='button'
              onClick={() => toggleSetting('enableSound')}
              sx={{
                p: 1,
                borderRadius: 3,
                bgcolor: settings.enableSound ? 'primary.50' : 'grey.200',
                color: settings.enableSound ? 'primary.main' : 'grey.600',
                '&:hover': {
                  bgcolor: settings.enableSound ? 'primary.100' : 'grey.300',
                },
                transition: 'background-color 0.2s',
              }}
              title={settings.enableSound ? '关闭声音' : '开启声音'}
            >
              {settings.enableSound ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </Box>
            <Box
              component='button'
              onClick={() => toggleSetting('enableDesktop')}
              sx={{
                p: 1,
                borderRadius: 3,
                bgcolor: settings.enableDesktop ? 'primary.50' : 'grey.200',
                color: settings.enableDesktop ? 'primary.main' : 'grey.600',
                '&:hover': {
                  bgcolor: settings.enableDesktop ? 'primary.100' : 'grey.300',
                },
                transition: 'background-color 0.2s',
              }}
              title={settings.enableDesktop ? '关闭桌面通知' : '开启桌面通知'}
            >
              <Monitor size={20} />
            </Box>
            <Box
              component='button'
              onClick={() => setShowSettings(!showSettings)}
              sx={{
                p: 1,
                borderRadius: 3,
                bgcolor: showSettings ? 'primary.50' : 'grey.200',
                color: showSettings ? 'primary.main' : 'grey.600',
                '&:hover': {
                  bgcolor: showSettings ? 'primary.100' : 'grey.300',
                },
                transition: 'background-color 0.2s',
              }}
              title='通知设置'
            >
              <Settings size={20} />
            </Box>
          </Box>
        ),
        showDivider: true,
      }}
    >
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100' }}>
        <Box sx={{ maxWidth: 1400, mx: 'auto', px: 2, py: 4 }}>
          <ListPageTemplate
            title=''
            subtitle=''
            columns={columns}
            data={filteredNotifications}
            loading={loading}
            searchable
            searchPlaceholder='搜索通知标题或内容...'
            searchValue={searchQuery}
            onSearch={setSearchQuery}
            filters={filters}
            filtersValue={{
              type: activeFilter,
            }}
            onFilterChange={handleFilterChange}
            pagination={{
              page,
              pageSize: 20,
              total: total,
              onPageChange: setPage,
            }}
            selectable
            selection={{
              selected: Array.from(selectedNotifications),
              onChange: handleSelectionChange,
            }}
            actions={[
              {
                label: '批量标记已读',
                icon: <Check size={16} />,
                onClick: handleBulkMarkAsRead,
                variant: 'outlined',
              },
              {
                label: '批量删除',
                icon: <Trash2 size={16} />,
                onClick: handleBulkDelete,
                variant: 'outlined',
              },
            ]}
            onRefresh={fetchNotifications}
            headerContent={headerContent}
            emptyMessage={
              searchQuery
                ? '未找到匹配的通知'
                : activeFilter === 'all'
                  ? '暂无通知'
                  : `暂无${getFilterLabel(activeFilter)}`
            }
            getRowId={(row) => row.id}
          />
        </Box>
      </Box>

      {detailOpen && selectedNotification && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            bgcolor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            p: 2,
          }}
          onClick={() => setDetailOpen(false)}
        >
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 3,
              maxWidth: 600,
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              p: 4,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Chip
                size='small'
                color={getTypeColor(selectedNotification.notification_type) as any}
                label={getFilterLabel(selectedNotification.notification_type)}
                icon={getTypeIcon(selectedNotification.notification_type)}
              />
              {!selectedNotification.is_read && (
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                  }}
                />
              )}
            </Box>
            <Typography
              variant='h6'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {selectedNotification.title}
            </Typography>
            <Typography
              variant='body1'
              color='text.secondary'
              sx={{ whiteSpace: 'pre-wrap' }}
            >
              {selectedNotification.content}
            </Typography>
            {selectedNotification.data && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ display: 'block', mb: 1 }}
                >
                  附加信息
                </Typography>
                <Typography variant='body2'>
                  {typeof selectedNotification.data === 'object'
                    ? JSON.stringify(selectedNotification.data, null, 2)
                    : selectedNotification.data}
                </Typography>
              </Box>
            )}
            <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              {!selectedNotification.is_read && (
                <Button
                  variant='outlined'
                  color='primary'
                  startIcon={<Check size={16} />}
                  onClick={() => {
                    handleMarkAsRead(selectedNotification);
                    setDetailOpen(false);
                  }}
                >
                  标记已读
                </Button>
              )}
              <Button
                variant='contained'
                onClick={() => setDetailOpen(false)}
              >
                关闭
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </PageContainer>
  );
};

export default NotificationCenter;
