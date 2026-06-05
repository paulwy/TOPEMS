import React from 'react';
import { Notification } from '../api/portal';

interface NotificationPanelProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  onClose,
  onMarkRead,
  onMarkAllRead,
}) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'approval':
        return '✏️';
      case 'warning':
        return '⚠️';
      case 'system':
        return '⚙️';
      default:
        return '📢';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'approval':
        return '审批';
      case 'warning':
        return '警告';
      case 'system':
        return '系统';
      default:
        return '信息';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'approval':
        return 'bg-blue-100 text-blue-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'system':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mr-4 mt-20 overflow-hidden" style={{ maxHeight: '70vh' }}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-xl mr-2">🔔</span>
            <h3 className="text-lg font-semibold text-gray-900">通知中心</h3>
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onMarkAllRead}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              全部标为已读
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 80px)' }}>
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              暂无通知
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-blue-50/50' : ''
                  }`}
                  onClick={() => {
                    onMarkRead(notification.id);
                    if (notification.link_url) {
                      window.open(notification.link_url, '_blank');
                    }
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-lg">{getTypeIcon(notification.notification_type)}</span>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900">{notification.title}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getTypeColor(notification.notification_type)}`}>
                          {getTypeText(notification.notification_type)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {notification.content}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">{notification.service_name}</span>
                        <span className="text-xs text-gray-400">{formatTime(notification.created_at)}</span>
                      </div>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary-500 rounded-full mt-1"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;