import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Divider,
  Avatar,
  CircularProgress,
} from '@mui/material';
import { Bell, CheckCheck, Trash2, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NOTIFICATION_PATHS } from '@/modules/notification/config';
import {
  getNotifications,
  markAllAsRead,
  markAsRead,
  deleteNotification,
} from '@/api/notification';
import type { Notification, NotificationTypeEnum } from '@/api/notification';
import { formatRelativeTime } from '@/utils/format';
import { useUnreadNotificationCount, useNotificationBadgeStore } from '@/store';

export const HeaderNotifications: React.FC = () => {
  const navigate = useNavigate();

  const [notificationAnchorEl, setNotificationAnchorEl] = useState<HTMLElement | null>(null);
  const notificationOpen = Boolean(notificationAnchorEl);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = useUnreadNotificationCount();
  const decrementBadge = useNotificationBadgeStore((s) => s.decrement);
  const setBadgeToZero = useNotificationBadgeStore((s) => s.setUnreadCount);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const fetchNotificationsData = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const res = await getNotifications(1, 20);
      if (res.success && res.data) {
        setNotifications(res.data.notifications ?? []);
        // 同步徽章计数：用 API 返回的精确值覆盖 store（避免手动减计数偏差）
        setBadgeToZero(res.data.unread_count ?? 0);
      }
    } catch (_e) {
      /* swallow: API 未就绪时保持空列表 */
    } finally {
      setNotificationsLoading(false);
    }
  }, [setBadgeToZero]);

  useEffect(() => {
    if (notificationOpen) {
      fetchNotificationsData();
    }
  }, [notificationOpen, fetchNotificationsData]);

  const handleNotificationOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setBadgeToZero(0);
    } catch (_e) {
      /* swallow */
    }
  };

  const handleMarkOneAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      decrementBadge(1);
    } catch (_e) {
      /* swallow */
    }
  };

  const handleDeleteOne = async (id: string, read: boolean) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (!read) decrementBadge(1);
    } catch (_e) {
      /* swallow */
    }
  };

  const mapTypeToAvatar = (type: NotificationTypeEnum) => {
    switch (type) {
      case 'success':
        return { color: 'success.main', icon: '✓' };
      case 'warning':
      case 'alert':
      case 'error':
        return { color: 'warning.main', icon: '!' };
      default:
        return { color: 'primary.main', icon: 'i' };
    }
  };

  return (
    <>
      <Tooltip title='通知'>
        <IconButton
          size='small'
          aria-label='通知'
          onClick={handleNotificationOpen}
          sx={{ width: 36, height: 36, '&:hover': { bgcolor: 'action.hover' } }}
        >
          <Badge
            badgeContent={unreadCount}
            color='error'
            max={99}
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.625rem',
                height: 18,
                minWidth: 18,
                top: 2,
                right: 2,
              },
            }}
          >
            <Bell style={{ width: 18, height: 18 }} />
          </Badge>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={notificationAnchorEl}
        open={notificationOpen}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 360,
              maxHeight: 480,
              borderRadius: 3,
              mt: 1.5,
            },
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem' }}>
            通知中心
            {unreadCount > 0 && (
              <Typography
                component='span'
                sx={{ ml: 1, color: 'error.main', fontSize: '0.75rem' }}
              >
                ({unreadCount}条未读)
              </Typography>
            )}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title='全部已读'>
              <IconButton
                size='small'
                sx={{ width: 28, height: 28 }}
                aria-label='全部确认'
                onClick={handleMarkAllAsRead}
                disabled={notificationsLoading || unreadCount === 0}
              >
                <CheckCheck style={{ width: 16, height: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title='通知设置'>
              <IconButton
                size='small'
                sx={{ width: 28, height: 28 }}
                aria-label='设置'
                onClick={() => {
                  navigate(NOTIFICATION_PATHS.settings);
                  handleNotificationClose();
                }}
              >
                <Settings style={{ width: 16, height: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Divider />
        <Box sx={{ py: 0, maxHeight: 340, overflowY: 'auto' }}>
          {notificationsLoading ? (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box
              sx={{
                p: 6,
                textAlign: 'center',
                color: 'text.secondary',
                fontSize: '0.875rem',
              }}
            >
              暂无通知
            </Box>
          ) : (
            notifications.map((notification) => {
              const avatar = mapTypeToAvatar(notification.notification_type);
              const read = notification.is_read;
              return (
                <Box
                  key={notification.id}
                  sx={{
                    px: 2,
                    py: 1.5,
                    cursor: 'pointer',
                    bgcolor: !read ? 'action.hover' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' },
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    position: 'relative',
                  }}
                  onClick={() => {
                    if (!read) handleMarkOneAsRead(notification.id);
                    if (notification.link_url) {
                      navigate(notification.link_url);
                      handleNotificationClose();
                    }
                  }}
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      flexShrink: 0,
                      bgcolor: avatar.color,
                      fontSize: '0.75rem',
                    }}
                  >
                    {avatar.icon}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0, pr: 4 }}>
                    <Typography
                      sx={{
                        fontSize: '0.875rem',
                        fontWeight: read ? 400 : 600,
                        color: 'text.primary',
                      }}
                    >
                      {notification.title}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.8125rem',
                        color: 'text.secondary',
                        mt: 0.25,
                        display: 'block',
                      }}
                    >
                      {notification.content}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
                        color: 'text.disabled',
                        mt: 0.5,
                        display: 'block',
                      }}
                    >
                      {formatRelativeTime(notification.created_at)}
                    </Typography>
                  </Box>
                  <IconButton
                    size='small'
                    sx={{
                      width: 24,
                      height: 24,
                      opacity: 0.5,
                      '&:hover': { opacity: 1 },
                      position: 'absolute',
                      right: 8,
                      top: 8,
                    }}
                    aria-label='删除'
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteOne(notification.id, read);
                    }}
                  >
                    <Trash2 style={{ width: 14, height: 14 }} />
                  </IconButton>
                </Box>
              );
            })
          )}
        </Box>
        <Divider />
        <MenuItem
          sx={{ justifyContent: 'center', py: 1.5, fontSize: '0.8125rem' }}
          onClick={() => {
            navigate(NOTIFICATION_PATHS.list);
            handleNotificationClose();
          }}
        >
          查看全部通知
        </MenuItem>
      </Menu>
    </>
  );
};

export default HeaderNotifications;
