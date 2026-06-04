import React, { useState, useEffect } from 'react';
import { Check, Trash2, Settings, RefreshCw } from 'lucide-react';
import NotificationItem from './NotificationItem';
import NotificationSettings from './NotificationSettings';
import { Notification, getNotifications, getUnreadCount, markAllAsRead } from '../../api/notification';

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
      console.error('Failed to fetch notifications:', error);
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
      console.error('Failed to fetch unread count:', error);
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
      console.error('Failed to mark all as read:', error);
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

  const displayedNotifications = activeTab === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  return (
    <div className='absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50'>
      <div className='flex items-center justify-between p-4 border-b border-gray-200'>
        <h3 className='text-lg font-semibold text-gray-900'>通知中心</h3>
        <div className='flex items-center gap-2'>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className='p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors'
            title='通知设置'
          >
            <Settings className='w-5 h-5' />
          </button>
          <button
            onClick={fetchNotifications}
            className='p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors'
            title='刷新'
          >
            <RefreshCw className='w-5 h-5' />
          </button>
          <button
            onClick={onClose}
            className='p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors'
          >
            <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        </div>
      </div>

      {showSettings && <NotificationSettings />}

      <div className='flex border-b border-gray-200'>
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'all' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          全部通知
        </button>
        <button
          onClick={() => setActiveTab('unread')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors relative ${
            activeTab === 'unread' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          未读通知
          {totalUnread > 0 && (
            <span className='ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5'>{totalUnread}</span>
          )}
        </button>
      </div>

      {totalUnread > 0 && !showSettings && (
        <div className='px-4 py-2 bg-blue-50 border-b border-blue-100'>
          <button
            onClick={handleMarkAllAsRead}
            className='flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium'
          >
            <Check className='w-4 h-4' />
            全部标记为已读
          </button>
        </div>
      )}

      <div className='max-h-[400px] overflow-y-auto'>
        {loading ? (
          <div className='flex items-center justify-center py-12'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600' />
          </div>
        ) : displayedNotifications.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12 text-gray-500'>
            <svg className='w-16 h-16 mb-4 text-gray-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={1.5}
                d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
              />
            </svg>
            <p className='text-sm'>{activeTab === 'unread' ? '暂无未读通知' : '暂无通知'}</p>
          </div>
        ) : (
          <div className='divide-y divide-gray-100'>
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
        <div className='p-3 border-t border-gray-200 bg-gray-50'>
          <a href='/notifications' className='block text-center text-sm text-blue-600 hover:text-blue-700 font-medium'>
            查看全部通知
          </a>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
