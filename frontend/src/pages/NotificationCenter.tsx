import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Filter, Archive, Settings, Volume2, VolumeX, Monitor } from 'lucide-react';
import { Notification, getNotifications, markAsRead, markAllAsRead, deleteNotification } from '../api/notification';

type NotificationType = 'all' | 'system' | 'workflow' | 'reminder' | 'alert' | 'message';

const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<NotificationType>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [desktopEnabled, setDesktopEnabled] = useState(true);

  useEffect(() => {
    fetchNotifications();
    
    const savedSound = localStorage.getItem('notificationSound');
    if (savedSound !== null) {
      setSoundEnabled(savedSound === 'true');
    }
    
    const savedDesktop = localStorage.getItem('notificationDesktop');
    if (savedDesktop !== null) {
      setDesktopEnabled(savedDesktop === 'true');
    }
  }, [activeFilter, page]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const type = activeFilter === 'all' ? undefined : activeFilter;
      const response = await getNotifications(page, 20, type);
      if (response.success && response.data) {
        let filteredNotifications = response.data.notifications;
        
        // 如果有类型过滤，在前端进行过滤（因为后端不支持）
        if (type && type !== 'all') {
          filteredNotifications = filteredNotifications.filter(n => n.notification_type === type);
        }
        
        setNotifications(filteredNotifications);
        setTotal(response.data.total);
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await markAsRead(id);
      if (response.success && response.data) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, status: 'read' as const } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await markAllAsRead();
      if (response.success) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, status: 'read' as const }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await deleteNotification(id);
      if (response.success) {
        const notification = notifications.find(n => n.id === id);
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (notification && notification.status === 'unread') {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        setTotal(prev => prev - 1);
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedNotifications);
    for (const id of ids) {
      await handleDelete(id);
    }
    setSelectedNotifications(new Set());
  };

  const handleBulkMarkAsRead = async () => {
    const ids = Array.from(selectedNotifications);
    for (const id of ids) {
      await handleMarkAsRead(id);
    }
    setSelectedNotifications(new Set());
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
    if (selectedNotifications.size === notifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(notifications.map(n => n.id)));
    }
  };

  const handleSoundToggle = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('notificationSound', String(newValue));
  };

  const handleDesktopToggle = () => {
    const newValue = !desktopEnabled;
    setDesktopEnabled(newValue);
    localStorage.setItem('notificationDesktop', String(newValue));
  };

  const getFilterLabel = (filter: NotificationType) => {
    switch (filter) {
      case 'all': return '全部';
      case 'system': return '系统通知';
      case 'workflow': return '审批通知';
      case 'reminder': return '提醒通知';
      case 'alert': return '告警通知';
      case 'message': return '消息通知';
    }
  };

  // 简单的通知项组件，因为 NotificationItem 组件可能不存在或需要更新
  const SimpleNotificationItem = ({ notification, onDelete, onMarkAsRead }: { 
    notification: Notification; 
    onDelete: (id: string) => void;
    onMarkAsRead: (id: string) => void;
  }) => {
    const isUnread = notification.status === 'unread';
    
    return (
      <div className={`p-4 pl-12 ${isUnread ? 'bg-blue-50' : 'bg-white'}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-gray-900">{notification.title}</h3>
              {isUnread && (
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2">{notification.content}</p>
            <p className="text-xs text-gray-400">
              {new Date(notification.created_at).toLocaleString('zh-CN')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isUnread && (
              <button
                onClick={() => onMarkAsRead(notification.id)}
                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                title="标记已读"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onDelete(notification.id)}
              className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Bell className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">通知中心</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    共 {total} 条通知，{unreadCount} 条未读
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSoundToggle}
                  className={`p-2 rounded-lg transition-colors ${
                    soundEnabled ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}
                  title={soundEnabled ? '关闭声音' : '开启声音'}
                >
                  {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
                <button
                  onClick={handleDesktopToggle}
                  className={`p-2 rounded-lg transition-colors ${
                    desktopEnabled ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}
                  title={desktopEnabled ? '关闭桌面通知' : '开启桌面通知'}
                >
                  <Monitor className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-2 rounded-lg transition-colors ${
                    showSettings ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}
                  title="通知设置"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {showSettings && (
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="text-center text-gray-500">
                <p>通知设置功能开发中...</p>
              </div>
            </div>
          )}

          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                {(['all', 'system', 'workflow', 'reminder', 'alert', 'message'] as NotificationType[]).map(filter => (
                  <button
                    key={filter}
                    onClick={() => {
                      setActiveFilter(filter);
                      setPage(1);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeFilter === filter
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    {getFilterLabel(filter)}
                  </button>
                ))}
              </div>
              
              {selectedNotifications.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    已选择 {selectedNotifications.size} 项
                  </span>
                  <button
                    onClick={handleBulkMarkAsRead}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    批量标记已读
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    批量删除
                  </button>
                </div>
              )}
            </div>
          </div>

          {unreadCount > 0 && (
            <div className="p-4 bg-blue-50 border-b border-blue-100">
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <Check className="w-4 h-4" />
                全部标记为已读
              </button>
            </div>
          )}

          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Bell className="w-20 h-20 text-gray-300 mb-4" />
                <p className="text-lg text-gray-500 mb-2">暂无通知</p>
                <p className="text-sm text-gray-400">
                  {activeFilter === 'all' 
                    ? '你还没有收到任何通知' 
                    : `暂无${getFilterLabel(activeFilter)}`}
                </p>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 bg-gray-50 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedNotifications.size === notifications.length && notifications.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-600">全选</span>
                </div>
                {notifications.map(notification => (
                  <div key={notification.id} className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedNotifications.has(notification.id)}
                        onChange={() => toggleSelect(notification.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                    <SimpleNotificationItem
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                      onDelete={handleDelete}
                    />
                  </div>
                ))}
              </>
            )}
          </div>

          {notifications.length > 0 && total > 20 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                第 {page} 页，共 {Math.ceil(total / 20)} 页
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <button
                  onClick={() => setPage(p => Math.min(Math.ceil(total / 20), p + 1))}
                  disabled={page >= Math.ceil(total / 20)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
