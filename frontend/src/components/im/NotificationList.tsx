import React, { useEffect, useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { imApi, type Notification } from '../../api/im';
import { useAppStore } from '../../store';

interface NotificationListProps {
  userId?: string;
}

export const NotificationList: React.FC<NotificationListProps> = ({
  userId = 'current-user'
}) => {
  const addNotification = useAppStore((state) => state.addNotification);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await imApi.listNotifications(userId);
      if (response.success && response.data) {
        const data: any = response.data;
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
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
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await imApi.markAllNotificationsRead(userId);
      if (response.success) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        addNotification({
          title: 'Success',
          message: '所有通知已标记为已读',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
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
  };

  const getNotificationIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'chat':
      case 'message':
        return <Bell className="w-5 h-5 text-blue-500" />;
      case 'warning':
        return <Bell className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <Bell className="w-5 h-5 text-red-500" />;
      case 'success':
        return <Bell className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5" />
            通知
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </h2>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-sm"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              全部已读
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>暂无通知</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  !notification.is_read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-gray-900">
                        {notification.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(notification.created_at)}
                        </span>
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
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
