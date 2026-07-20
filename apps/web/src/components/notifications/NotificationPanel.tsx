import React, { useState, useEffect, useCallback } from 'react';
import { useTheme, Box, Chip } from '@mui/material';
import { Check, Settings, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import NotificationItem from './NotificationItem';
import NotificationSettings from './NotificationSettings';
import type { Notification } from '@/api/notification';
import { getNotifications, getUnreadCount, markAllAsRead } from '@/api/notification';
import { logger } from '@/utils/logger';
import { NOTIFICATION_PATHS } from '@/modules/notification/config';
import { useAuthStore } from '@/store/authStore';
import { useNotificationWebSocket } from '@/hooks/useNotificationWebSocket';

interface NotificationPanelProps {
  onClose: () => void;
  onUnreadCountChange: (count: number) => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose, onUnreadCountChange }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  const { user } = useAuthStore();
  const userId = user?.id || '';

  // WebSocket 实时通知
  const {
    isConnected: wsConnected,
    notifications: wsNotifications,
    unreadCount: wsUnreadCount,
  } = useNotificationWebSocket(userId, !!userId);

  // 合并 WebSocket 实时通知到本地状态
  useEffect(() => {
    if (wsNotifications.length > 0) {
      const mapped = wsNotifications.map((ws) => ({
        id: ws.id,
        title: ws.title || '新通知',
        content: ws.message,
        notification_type: ws.type,
        is_read: false,
        created_at: new Date(ws.timestamp).toISOString(),
        data: ws.data,
      } as unknown as Notification));

      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const newItems = mapped.filter((n) => !existingIds.has(n.id));
        return [...newItems, ...prev];
      });
    }
  }, [wsNotifications]);

  // WebSocket 未读数更新
  useEffect(() => {
    if (wsUnreadCount >= 0) {
      setTotalUnread((prev) => {
        const next = Math.max(wsUnreadCount, prev);
        onUnreadCountChange(next);
        return next;
      });
    }
  }, [wsUnreadCount, onUnreadCountChange]);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getNotifications(1, 50);
      if (response.success && response.data) {
        setNotifications(response.data.notifications);
        setTotalUnread(response.data.unread_count);
        onUnreadCountChange(response.data.unread_count);
      }
    } catch (error: unknown) {
      logger.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [onUnreadCountChange]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await getUnreadCount();
      if (response.success && response.data !== undefined) {
        setTotalUnread(response.data);
        onUnreadCountChange(response.data);
      }
    } catch (error: unknown) {
      logger.error('Failed to fetch unread count:', error);
    }
  }, [onUnreadCountChange]);

  const handleMarkAllAsRead = async () => {
    try {
      const response = await markAllAsRead();
      if (response.success) {
        await fetchNotifications();
        await fetchUnreadCount();
      }
    } catch (error: unknown) {
      logger.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationUpdate = (notification: Notification) => {
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? notification : n)));
    fetchUnreadCount();
  };

  const handleNotificationDelete = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    fetchUnreadCount();
  };

  const displayedNotifications =
    activeTab === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  return (
    <div
      className='notification-panel'
      style={{
        position: 'absolute',
        right: 0,
        top: '100%',
        marginTop: 8,
        width: 384,
        backgroundColor: 'white',
        borderRadius: 8,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid grey.200',
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
          borderBottom: '1px solid grey.200',
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 600, color: theme.palette.text.primary }}>
          通知中心
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {wsConnected ? (
            <Chip
              icon={<Wifi size={14} />}
              label='实时'
              size='small'
              color='success'
              variant='outlined'
              sx={{ height: 24, fontSize: 12 }}
            />
          ) : (
            <Chip
              icon={<WifiOff size={14} />}
              label='离线'
              size='small'
              color='default'
              variant='outlined'
              sx={{ height: 24, fontSize: 12 }}
            />
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              padding: 6,
              color: theme.palette.text.secondary,
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            title='通知设置'
          >
            <Settings style={{ width: 20, height: 20 }} />
          </button>
          <button
            onClick={fetchNotifications}
            style={{
              padding: 6,
              color: theme.palette.text.secondary,
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            title='刷新'
          >
            <RefreshCw style={{ width: 20, height: 20 }} />
          </button>
          <button
            onClick={onClose}
            style={{
              padding: 6,
              color: theme.palette.text.secondary,
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <svg
              style={{ width: 20, height: 20 }}
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </button>
        </div>
      </div>

      {showSettings && <NotificationSettings />}

      <div style={{ display: 'flex', borderBottom: '1px solid var(--mui-palette-divider)' }}>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            flex: 1,
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 500,
            transition: 'all 0.15s',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: activeTab === 'all' ? theme.palette.primary.dark : theme.palette.text.secondary,
            borderBottom: activeTab === 'all' ? '2px solid primary.dark' : '2px solid transparent',
          }}
        >
          全部通知
        </button>
        <button
          onClick={() => setActiveTab('unread')}
          style={{
            flex: 1,
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 500,
            transition: 'all 0.15s',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color:
              activeTab === 'unread' ? theme.palette.primary.dark : theme.palette.text.secondary,
            borderBottom:
              activeTab === 'unread' ? '2px solid primary.dark' : '2px solid transparent',
            position: 'relative',
          }}
        >
          未读通知
          {totalUnread > 0 && (
            <span
              style={{
                marginLeft: 6,
                backgroundColor: theme.palette.error.main,
                color: 'white',
                fontSize: 12,
                borderRadius: 9999,
                padding: '2px 6px',
              }}
            >
              {totalUnread}
            </span>
          )}
        </button>
      </div>

      {totalUnread > 0 && !showSettings && (
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: theme.palette.primary.light,
            borderBottom: '1px solid primary.100',
          }}
        >
          <button
            onClick={handleMarkAllAsRead}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              color: theme.palette.primary.dark,
              fontWeight: 500,
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Check style={{ width: 16, height: 16 }} />
            全部标记为已读
          </button>
        </div>
      )}

      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {loading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 48,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '9999px',
                border: '2px solid grey.200',
                borderTopColor: theme.palette.primary.dark,
                animation: 'spin 1s linear infinite',
              }}
            />
          </div>
        ) : displayedNotifications.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 48,
              color: theme.palette.text.secondary,
            }}
          >
            <svg
              style={{
                width: 64,
                height: 64,
                marginBottom: 16,
                color: theme.palette.grey[300],
              }}
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={1.5}
                d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
              />
            </svg>
            <p style={{ fontSize: 14 }}>{activeTab === 'unread' ? '暂无未读通知' : '暂无通知'}</p>
          </div>
        ) : (
          <div style={{ borderTop: '1px solid var(--mui-palette-grey-100)' }}>
            {displayedNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onUpdate={handleNotificationUpdate}
                onDelete={handleNotificationDelete}
              />
            ))}
          </div>
        )}
      </div>

      {displayedNotifications.length > 0 && (
        <div
          style={{
            padding: 12,
            borderTop: '1px solid grey.200',
            backgroundColor: theme.palette.grey[50],
          }}
        >
          <a
            href={NOTIFICATION_PATHS.list}
            style={{
              display: 'block',
              textAlign: 'center',
              fontSize: 14,
              color: theme.palette.primary.dark,
              fontWeight: 500,
            }}
          >
            查看全部通知
          </a>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
