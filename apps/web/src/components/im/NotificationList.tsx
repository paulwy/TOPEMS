import { Button, useTheme } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Bell, Check, CheckCheck, Clock } from 'lucide-react';

import { imApi, type Notification } from '../../api/im';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

interface NotificationListProps {
  userId?: string;
}

export const NotificationList: React.FC<NotificationListProps> = ({ userId = 'current-user' }) => {
  const theme = useTheme();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await imApi.listNotifications(userId);
      if (response.success && response.data) {
        const data: unknown = response.data;
        setNotifications(
          ((data as unknown as Record<string, unknown>).notifications || []) as Notification[]
        );
      }
    } catch (error: unknown) {
      logger.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [userId]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await imApi.markNotificationRead(notificationId);
      if (response.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
        );
      }
    } catch (error: unknown) {
      logger.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await imApi.markAllNotificationsRead(userId);
      if (response.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        addNotification({
          title: 'Success',
          message: i18n.t('im.notification_list.k0'),
          type: 'success',
        });
      }
    } catch (error: unknown) {
      logger.error('Failed to mark all notifications as read:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return i18n.t('im.notification_list.k1');
    if (minutes < 60) return `${minutes}${i18n.t('components.notification_list.k0')}`;
    if (hours < 24) return `${hours}${i18n.t('components.notification_list.k1')}`;
    if (days < 7) return `${days}${i18n.t('components.notification_list.k2')}`;
    return date.toLocaleDateString('zh-CN');
  };

  const getNotificationIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'chat':
      case 'message':
        return <Bell sx={{ width: 20, height: 20, color: 'primary.main' }} />;
      case 'warning':
        return <Bell sx={{ width: 20, height: 20, color: 'warning.main' }} />;
      case 'error':
        return <Bell sx={{ width: 20, height: 20, color: 'error.main' }} />;
      case 'success':
        return <Bell sx={{ width: 20, height: 20, color: 'success.dark' }} />;
      default:
        return <Bell sx={{ width: 20, height: 20, color: 'text.secondary' }} />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 16, borderBottom: '1px solid var(--mui-palette-divider)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Bell sx={{ width: 20, height: 20 }} />
            {i18n.t('components.notification_list.k0')}
            {unreadCount > 0 && (
              <span
                style={{
                  backgroundColor: theme.palette.error.main,
                  color: 'common.white',
                  fontSize: 12,
                  padding: `${designTokens.spacing.xs} ${designTokens.spacing.sm}px`,
                  borderRadius: 9999,
                }}
              >
                {unreadCount}
              </span>
            )}
          </h2>
          {unreadCount > 0 && (
            <Button
              variant='text'
              size='small'
              onClick={handleMarkAllAsRead}
              sx={{ fontSize: 14 }}
            >
              <CheckCheck sx={{ width: 16, height: 16, mr: 1 }} />
              {i18n.t('components.notification_list.k1')}
            </Button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 32,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'full',
                border: '4px solid primary.light',
                borderTopColor: 'transparent',
                animation: 'spin 1s linear infinite',
              }}
            />
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: theme.palette.text.secondary }}>
            <Bell
              sx={{
                width: 48,
                height: 48,
                mx: 'auto',
                mb: 3,
                color: 'grey.300',
              }}
            />
            <p>{i18n.t('im.notification_list.k2')}</p>
          </div>
        ) : (
          <div style={{ borderTop: '1px solid var(--mui-palette-grey-100)' }}>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                style={{
                  padding: 16,
                  transition: 'background-color 0.15s',
                  backgroundColor: !notification.is_read ? theme.palette.primary.light : undefined,
                }}
              >
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flexShrink: 0, marginTop: 4 }}>
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <h3 style={{ fontWeight: 500, color: theme.palette.text.primary }}>
                        {notification.title}
                      </h3>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            color: theme.palette.text.secondary,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Clock sx={{ width: 12, height: 12 }} />
                          {formatTime(notification.created_at)}
                        </span>
                        {!notification.is_read && (
                          <Button
                            variant='text'
                            size='small'
                            sx={{ minWidth: 24, width: 24, height: 24, p: 0 }}
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <Check sx={{ width: 12, height: 12 }} />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: 14, color: theme.palette.text.secondary, marginTop: 4 }}>
                      {notification.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
