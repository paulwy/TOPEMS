import React, { useState, useEffect } from 'react';
import { Check, Settings, RefreshCw } from 'lucide-react';
import NotificationItem from './NotificationItem';
import NotificationSettings from './NotificationSettings';
import type { Notification } from '@/api/notification';
import { getNotifications, getUnreadCount, markAllAsRead } from '@/api/notification';
import { logger } from '@/utils/logger';

interface NotificationPanelProps {
  onClose: () => void;
  onUnreadCountChange: (count: number) => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose, onUnreadCountChange }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await getNotifications(1, 50);
      if (response.success && response.data) {
        setNotifications(response.data.notifications);
        setTotalUnread(response.data.unread_count);
        onUnreadCountChange(response.data.unread_count);
      }
    } catch (error) {
      logger.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await getUnreadCount();
      if (response.success && response.data !== undefined) {
        setTotalUnread(response.data);
        onUnreadCountChange(response.data);
      }
    } catch (error) {
      logger.error('Failed to fetch unread count:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await markAllAsRead();
      if (response.success) {
        await fetchNotifications();
        await fetchUnreadCount();
      }
    } catch (error) {
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
      style={{
        position: 'absolute',
        right: 0,
        top: '100%',
        marginTop: 8,
        width: 384,
        backgroundColor: '#ffffff',
        borderRadius: 8,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e5e7eb',
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>通知中心</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              padding: 6,
              color: '#6b7280',
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
              color: '#6b7280',
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
              color: '#6b7280',
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

      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
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
            color: activeTab === 'all' ? '#2563eb' : '#4b5563',
            borderBottom: activeTab === 'all' ? '2px solid #2563eb' : '2px solid transparent',
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
            color: activeTab === 'unread' ? '#2563eb' : '#4b5563',
            borderBottom: activeTab === 'unread' ? '2px solid #2563eb' : '2px solid transparent',
            position: 'relative',
          }}
        >
          未读通知
          {totalUnread > 0 && (
            <span
              style={{
                marginLeft: 6,
                backgroundColor: '#ef4444',
                color: '#ffffff',
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
            backgroundColor: '#eff6ff',
            borderBottom: '1px solid #dbeafe',
          }}
        >
          <button
            onClick={handleMarkAllAsRead}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              color: '#2563eb',
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
                border: '2px solid #e5e7eb',
                borderTopColor: '#2563eb',
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
              color: '#6b7280',
            }}
          >
            <svg
              style={{
                width: 64,
                height: 64,
                marginBottom: 16,
                color: '#d1d5db',
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
          <div style={{ borderTop: '1px solid #f3f4f6' }}>
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
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
          }}
        >
          <a
            href='/notifications'
            style={{
              display: 'block',
              textAlign: 'center',
              fontSize: 14,
              color: '#2563eb',
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
