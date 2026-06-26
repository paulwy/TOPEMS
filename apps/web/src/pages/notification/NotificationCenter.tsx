import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Check,
  Trash2,
  Filter,
  Archive,
  Settings,
  Volume2,
  VolumeX,
  Monitor,
  Search,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
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
import { PageHeader } from '@/components';

type NotificationFilterType = 'all' | NotificationTypeEnum;

const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<NotificationFilterType>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const { settings, toggleSetting } = useNotificationSettings();

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, page]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const typeParam = activeFilter === 'all' ? undefined : activeFilter;
      const response = await getNotifications(page, 20, typeParam);
      if (response.success && response.data) {
        setNotifications(response.data.notifications);
        setTotal(response.data.total);
        setUnreadCount(response.data.unread_count);
      }
    } catch (error: unknown) {
      apiLogger.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNotifications = useMemo(() => {
    if (!searchQuery.trim()) return notifications;
    const query = searchQuery.toLowerCase();
    return notifications.filter(
      (n) => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query)
    );
  }, [notifications, searchQuery]);

  const handleMarkAsRead = async (notification: Notification) => {
    try {
      const response = await markAsRead(notification.id);
      if (response.success && response.data) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? response.data! : n))
        );
        if (unreadCount > 0) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    } catch (error: unknown) {
      apiLogger.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await markAllAsRead();
      if (response.success) {
        await fetchNotifications();
      }
    } catch (error: unknown) {
      apiLogger.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await deleteNotification(id);
      if (response.success) {
        const notification = notifications.find((n) => n.id === id);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        setSelectedNotifications((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        if (notification && !notification.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
        setTotal((prev) => prev - 1);
      }
    } catch (error: unknown) {
      apiLogger.error('Failed to delete notification:', error);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedNotifications);
    try {
      const response = await bulkDeleteNotifications(ids);
      if (response.success) {
        await fetchNotifications();
        setSelectedNotifications(new Set());
      }
    } catch (error: unknown) {
      apiLogger.error('Failed to bulk delete:', error);
    }
  };

  const handleBulkMarkAsRead = async () => {
    const ids = Array.from(selectedNotifications);
    try {
      const response = await bulkMarkAsRead(ids);
      if (response.success) {
        await fetchNotifications();
        setSelectedNotifications(new Set());
      }
    } catch (error: unknown) {
      apiLogger.error('Failed to bulk mark as read:', error);
    }
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
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100' }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 2, py: 4 }}>
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
          <PageHeader
            title='通知中心'
            subtitle={`共 ${total} 条通知，${unreadCount} 条未读`}
            pageIcon={<Bell size={24} color='#1976d2' />}
            pageColor='primary.100'
            rightContent={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  component='button'
                  onClick={() => navigate('/notifications/stats')}
                  sx={{
                    p: 1,
                    borderRadius: 2,
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
                  onClick={() => navigate('/notifications/templates')}
                  sx={{
                    p: 1,
                    borderRadius: 2,
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
                  onClick={() => navigate('/notifications/archive')}
                  sx={{
                    p: 1,
                    borderRadius: 2,
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
                    borderRadius: 2,
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
                    borderRadius: 2,
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
                    borderRadius: 2,
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
            }
            showDivider
          />

          {showSettings && (
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <NotificationSettings />
            </Box>
          )}

          <Box
            sx={{
              p: 2,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'grey.100',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 2,
              }}
            >
              <Box sx={{ flex: 1, position: 'relative' }}>
                <Box
                  sx={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                >
                  <Search
                    size={16}
                    color='#666'
                  />
                </Box>
                <Box
                  component='input'
                  type='text'
                  placeholder='搜索通知...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{
                    width: '100%',
                    pl: 5,
                    pr: 2,
                    py: 1,
                    border: 1,
                    borderColor: 'grey.300',
                    borderRadius: 2,
                    '&:focus': {
                      outline: 'none',
                      borderColor: 'primary.main',
                      boxShadow: 2,
                    },
                  }}
                />
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flexWrap: 'wrap',
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
                  <Box
                    key={filter}
                    component='button'
                    onClick={() => {
                      setActiveFilter(filter);
                      setPage(1);
                    }}
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderRadius: 2,
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                      bgcolor: activeFilter === filter ? 'primary.main' : 'background.paper',
                      color: activeFilter === filter ? 'white' : 'grey.700',
                      border: activeFilter === filter ? 'none' : 1,
                      borderColor: 'grey.300',
                      '&:hover': {
                        bgcolor: activeFilter === filter ? 'primary.dark' : 'grey.100',
                      },
                    }}
                  >
                    {getFilterLabel(filter)}
                  </Box>
                ))}
              </Box>
            </Box>

            {selectedNotifications.size > 0 && (
              <Box
                sx={{
                  mt: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.5,
                  bgcolor: 'primary.50',
                  borderRadius: 2,
                }}
              >
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.600' }}
                >
                  已选择 {selectedNotifications.size} 项
                </Typography>
                <Box
                  component='button'
                  onClick={handleBulkMarkAsRead}
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'primary.100' },
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <Check size={16} />
                  批量标记已读
                </Box>
                <Box
                  component='button'
                  onClick={handleBulkDelete}
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'error.main',
                    '&:hover': { bgcolor: 'error.50' },
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <Trash2 size={16} />
                  批量删除
                </Box>
                <Box
                  component='button'
                  onClick={() => setSelectedNotifications(new Set())}
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'grey.600',
                    '&:hover': { bgcolor: 'grey.100' },
                    borderRadius: 2,
                    transition: 'all 0.2s',
                  }}
                >
                  取消选择
                </Box>
              </Box>
            )}
          </Box>

          {unreadCount > 0 && (
            <Box
              sx={{
                p: 2,
                bgcolor: 'primary.50',
                borderBottom: 1,
                borderColor: 'primary.100',
              }}
            >
              <Box
                component='button'
                onClick={handleMarkAllAsRead}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'primary.main',
                  '&:hover': { color: 'primary.dark' },
                }}
              >
                <Check size={16} />
                全部标记已读
              </Box>
            </Box>
          )}

          <Box sx={{ '& > * + *': { borderTop: 1, borderColor: 'grey.200' } }}>
            {loading ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 10,
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    border: 3,
                    borderColor: 'primary.light',
                    borderTopColor: 'primary.main',
                    animation: 'spin 1s linear infinite',
                  }}
                />
              </Box>
            ) : filteredNotifications.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 10,
                }}
              >
                <Bell
                  size={80}
                  color='#666'
                  style={{ marginBottom: 8 }}
                />
                <Typography
                  variant='body1'
                  sx={{ color: 'grey.500', mb: 1 }}
                >
                  {searchQuery
                    ? '未找到匹配的通知'
                    : activeFilter === 'all'
                      ? '暂无通知'
                      : `暂无${getFilterLabel(activeFilter)}`}
                </Typography>
                {searchQuery && (
                  <Box
                    component='button'
                    onClick={() => setSearchQuery('')}
                    sx={{
                      fontSize: '0.875rem',
                      color: 'primary.main',
                      '&:hover': { color: 'primary.dark' },
                    }}
                  >
                    清除搜索
                  </Box>
                )}
              </Box>
            ) : (
              <>
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    bgcolor: 'grey.100',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <Box
                    component='input'
                    type='checkbox'
                    checked={
                      selectedNotifications.size === filteredNotifications.length &&
                      filteredNotifications.length > 0
                    }
                    onChange={toggleSelectAll}
                    sx={{
                      width: 16,
                      height: 16,
                      color: 'primary.main',
                      borderColor: 'grey.300',
                      borderRadius: 0.5,
                    }}
                  />
                  <Typography
                    variant='body2'
                    sx={{ color: 'grey.600', fontSize: '0.75rem' }}
                  >
                    全选
                  </Typography>
                </Box>
                {filteredNotifications.map((notification) => (
                  <Box
                    key={notification.id}
                    sx={{ position: 'relative' }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 4,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 10,
                      }}
                    >
                      <Box
                        component='input'
                        type='checkbox'
                        checked={selectedNotifications.has(notification.id)}
                        onChange={() => toggleSelect(notification.id)}
                        sx={{
                          width: 16,
                          height: 16,
                          color: 'primary.main',
                          borderColor: 'grey.300',
                          borderRadius: 0.5,
                        }}
                      />
                    </Box>
                    <Box sx={{ pl: 6 }}>
                      <NotificationItem
                        notification={notification}
                        onUpdate={handleMarkAsRead}
                        onDelete={handleDelete}
                      />
                    </Box>
                  </Box>
                ))}
              </>
            )}
          </Box>

          {!loading && total > 20 && (
            <Box
              sx={{
                p: 2,
                borderTop: 1,
                borderColor: 'divider',
                bgcolor: 'grey.100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography
                variant='body2'
                sx={{ color: 'grey.600' }}
              >
                第 {page} 页，共 {totalPages} 页
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  component='button'
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'grey.700',
                    bgcolor: 'background.paper',
                    border: 1,
                    borderColor: 'grey.300',
                    borderRadius: 2,
                    '&:hover': { bgcolor: 'grey.50' },
                    disabled: { opacity: 0.5, cursor: 'not-allowed' },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <ChevronLeft size={16} />
                  上一页
                </Box>
                <Box
                  component='button'
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'grey.700',
                    bgcolor: 'background.paper',
                    border: 1,
                    borderColor: 'grey.300',
                    borderRadius: 2,
                    '&:hover': { bgcolor: 'grey.50' },
                    disabled: { opacity: 0.5, cursor: 'not-allowed' },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  下一页
                  <ChevronRight size={16} />
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default NotificationCenter;
