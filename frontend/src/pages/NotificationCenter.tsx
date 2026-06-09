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
import type { Notification, NotificationTypeEnum } from '../api/notification';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  bulkMarkAsRead,
  bulkDeleteNotifications,
} from '../api/notification';
import NotificationItem from '../components/notifications/NotificationItem';
import NotificationSettings from '../components/notifications/NotificationSettings';
import useNotificationSettings from '../hooks/useNotificationSettings';

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
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
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
        setNotifications((prev) => prev.map((n) => (n.id === notification.id ? response.data! : n)));
        if (unreadCount > 0) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await markAllAsRead();
      if (response.success) {
        await fetchNotifications();
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
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
    } catch (error) {
      console.error('Failed to delete notification:', error);
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
    } catch (error) {
      console.error('Failed to bulk delete:', error);
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
    } catch (error) {
      console.error('Failed to bulk mark as read:', error);
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
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-6xl mx-auto px-4 py-8'>
        <div className='bg-white rounded-lg shadow-sm'>
          <div className='p-6 border-b border-gray-200'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center'>
                  <Bell className='w-6 h-6 text-blue-600' />
                </div>
                <div>
                  <h1 className='text-2xl font-bold text-gray-900'>通知中心</h1>
                  <p className='text-sm text-gray-500 mt-1'>
                    共 {total} 条通知，{unreadCount} 条未读
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-2'>
                <button
                  onClick={() => navigate('/notifications/stats')}
                  className='p-2 rounded-lg transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200'
                  title='统计'
                >
                  <BarChart3 className='w-5 h-5' />
                </button>
                <button
                  onClick={() => navigate('/notifications/templates')}
                  className='p-2 rounded-lg transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200'
                  title='模板管理'
                >
                  <FileText className='w-5 h-5' />
                </button>
                <button
                  onClick={() => navigate('/notifications/archive')}
                  className='p-2 rounded-lg transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200'
                  title='归档管理'
                >
                  <Archive className='w-5 h-5' />
                </button>
                <button
                  onClick={() => toggleSetting('enableSound')}
                  className={`p-2 rounded-lg transition-colors ${
                    settings.enableSound ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}
                  title={settings.enableSound ? '关闭声音' : '开启声音'}
                >
                  {settings.enableSound ? <Volume2 className='w-5 h-5' /> : <VolumeX className='w-5 h-5' />}
                </button>
                <button
                  onClick={() => toggleSetting('enableDesktop')}
                  className={`p-2 rounded-lg transition-colors ${
                    settings.enableDesktop ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}
                  title={settings.enableDesktop ? '关闭桌面通知' : '开启桌面通知'}
                >
                  <Monitor className='w-5 h-5' />
                </button>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-2 rounded-lg transition-colors ${
                    showSettings ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}
                  title='通知设置'
                >
                  <Settings className='w-5 h-5' />
                </button>
              </div>
            </div>
          </div>

          {showSettings && (
            <div className='border-b border-gray-200'>
              <NotificationSettings />
            </div>
          )}

          <div className='p-4 border-b border-gray-200 bg-gray-50'>
            <div className='flex flex-col md:flex-row gap-4'>
              <div className='relative flex-1'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
                <input
                  type='text'
                  placeholder='搜索通知...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                />
              </div>

              <div className='flex items-center gap-2 flex-wrap'>
                {(['all', 'system', 'workflow', 'reminder', 'alert', 'message'] as NotificationFilterType[]).map(
                  (filter) => (
                    <button
                      key={filter}
                      onClick={() => {
                        setActiveFilter(filter);
                        setPage(1);
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeFilter === filter
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      {getFilterLabel(filter)}
                    </button>
                  )
                )}
              </div>
            </div>

            {selectedNotifications.size > 0 && (
              <div className='mt-4 flex items-center gap-3 p-3 bg-blue-50 rounded-lg'>
                <span className='text-sm text-gray-600'>已选择 {selectedNotifications.size} 项</span>
                <button
                  onClick={handleBulkMarkAsRead}
                  className='px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1'
                >
                  <Check className='w-4 h-4' />
                  批量标记已读
                </button>
                <button
                  onClick={handleBulkDelete}
                  className='px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1'
                >
                  <Trash2 className='w-4 h-4' />
                  批量删除
                </button>
                <button
                  onClick={() => setSelectedNotifications(new Set())}
                  className='px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors'
                >
                  取消选择
                </button>
              </div>
            )}
          </div>

          {unreadCount > 0 && (
            <div className='p-4 bg-blue-50 border-b border-blue-100'>
              <button
                onClick={handleMarkAllAsRead}
                className='flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium'
              >
                <Check className='w-4 h-4' />
                全部标记已读
              </button>
            </div>
          )}

          <div className='divide-y divide-gray-100'>
            {loading ? (
              <div className='flex items-center justify-center py-20'>
                <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600' />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-20'>
                <Bell className='w-20 h-20 text-gray-300 mb-4' />
                <p className='text-lg text-gray-500 mb-2'>
                  {searchQuery
                    ? '未找到匹配的通知'
                    : activeFilter === 'all'
                      ? '暂无通知'
                      : `暂无${getFilterLabel(activeFilter)}`}
                </p>
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className='text-sm text-blue-600 hover:text-blue-700'>
                    清除搜索
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className='px-4 py-3 bg-gray-50 flex items-center gap-2'>
                  <input
                    type='checkbox'
                    checked={
                      selectedNotifications.size === filteredNotifications.length && filteredNotifications.length > 0
                    }
                    onChange={toggleSelectAll}
                    className='w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500'
                  />
                  <span className='text-xs text-gray-600'>全选</span>
                </div>
                {filteredNotifications.map((notification) => (
                  <div key={notification.id} className='relative'>
                    <div className='absolute left-4 top-1/2 -translate-y-1/2 z-10'>
                      <input
                        type='checkbox'
                        checked={selectedNotifications.has(notification.id)}
                        onChange={() => toggleSelect(notification.id)}
                        className='w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500'
                      />
                    </div>
                    <div className='pl-12'>
                      <NotificationItem
                        notification={notification}
                        onUpdate={handleMarkAsRead}
                        onDelete={handleDelete}
                      />
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {!loading && total > 20 && (
            <div className='p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between'>
              <div className='text-sm text-gray-600'>
                第 {page} 页，共 {totalPages} 页
              </div>
              <div className='flex items-center gap-2'>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className='px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1'
                >
                  <ChevronLeft className='w-4 h-4' />
                  上一页
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className='px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1'
                >
                  下一页
                  <ChevronRight className='w-4 h-4' />
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
