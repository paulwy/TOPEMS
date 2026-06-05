import React, { useState, useEffect } from 'react';
import {
  Bell,
  ChevronLeft,
  Check,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Notification,
  NotificationTypeEnum,
  markAsRead,
  deleteNotification,
  getNotifications,
} from '../api/notification';
import { useNotification } from '../hooks/useNotification';
import { NotificationContainer } from '../components/NotificationContainer';

const NotificationDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { success, error, notifications, hideNotification } = useNotification();

  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadNotification();
  }, [id]);

  const loadNotification = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Try to find the notification in the list
      const response = await getNotifications(1, 100);
      if (response.success && response.data) {
        const found = response.data.notifications.find((n) => n.id === id);
        if (found) {
          setNotification(found);
        }
      }
    } catch (err) {
      console.error('Error loading notification:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async () => {
    if (!notification) return;

    setActionLoading(true);
    try {
      const res = await markAsRead(notification.id);
      if (res.success && res.data) {
        setNotification(res.data);
        success('已标记为已读');
      } else {
        error(res.message || '操作失败');
      }
    } catch (err: any) {
      error(err.message || '操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!notification) return;
    if (!confirm('确定要删除这条通知吗？')) return;

    setActionLoading(true);
    try {
      const res = await deleteNotification(notification.id);
      if (res.success) {
        success('通知已删除');
        navigate('/notifications');
      } else {
        error(res.message || '删除失败');
      }
    } catch (err: any) {
      error(err.message || '删除失败');
    } finally {
      setActionLoading(false);
    }
  };

  const getTypeLabel = (type: NotificationTypeEnum) => {
    const labels: Record<NotificationTypeEnum, string> = {
      system: '系统通知',
      workflow: '审批通知',
      reminder: '提醒通知',
      alert: '告警通知',
      message: '消息通知',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: NotificationTypeEnum) => {
    const colors: Record<NotificationTypeEnum, string> = {
      system: 'bg-blue-100 text-blue-700',
      workflow: 'bg-purple-100 text-purple-700',
      reminder: 'bg-yellow-100 text-yellow-700',
      alert: 'bg-red-100 text-red-700',
      message: 'bg-green-100 text-green-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 4) return { label: '紧急', color: 'text-red-600 bg-red-100' };
    if (priority >= 3) return { label: '高', color: 'text-orange-600 bg-orange-100' };
    if (priority >= 2) return { label: '中', color: 'text-yellow-600 bg-yellow-100' };
    return { label: '低', color: 'text-gray-600 bg-gray-100' };
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='w-12 h-12 text-blue-600 mx-auto animate-spin' />
          <p className='mt-2 text-gray-500'>加载中...</p>
        </div>
      </div>
    );
  }

  if (!notification) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <NotificationContainer notifications={notifications} onClose={hideNotification} />

        {/* Header */}
        <div className='bg-white shadow-sm border-b border-gray-200'>
          <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
            <div className='flex items-center space-x-4'>
              <button
                onClick={() => navigate('/notifications')}
                className='p-2 hover:bg-gray-100 rounded-lg transition-colors'
              >
                <ChevronLeft className='w-5 h-5 text-gray-600' />
              </button>
              <div>
                <h1 className='text-2xl font-bold text-gray-900'>通知详情</h1>
              </div>
            </div>
          </div>
        </div>

        <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='bg-white rounded-lg shadow-sm p-12 text-center'>
            <AlertCircle className='w-16 h-16 text-gray-400 mx-auto mb-4' />
            <h2 className='text-xl font-semibold text-gray-900 mb-2'>通知不存在</h2>
            <p className='text-gray-500 mb-6'>该通知可能被已删除或不存在</p>
            <button
              onClick={() => navigate('/notifications')}
              className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
            >
              返回通知列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  const priorityInfo = getPriorityLabel(notification.priority);

  return (
    <div className='min-h-screen bg-gray-50'>
      <NotificationContainer notifications={notifications} onClose={hideNotification} />

      {/* Header */}
      <div className='bg-white shadow-sm border-b border-gray-200'>
        <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <button
                onClick={() => navigate('/notifications')}
                className='p-2 hover:bg-gray-100 rounded-lg transition-colors'
              >
                <ChevronLeft className='w-5 h-5 text-gray-600' />
              </button>
              <div>
                <h1 className='text-2xl font-bold text-gray-900 flex items-center'>
                  <Bell className='w-6 h-6 mr-3 text-blue-600' />
                  通知详情
                </h1>
              </div>
            </div>
            <div className='flex items-center space-x-3'>
              {!notification.is_read && (
                <button
                  onClick={handleMarkAsRead}
                  disabled={actionLoading}
                  className='flex items-center px-4 py-2 text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50'
                >
                  <Check className='w-5 h-5 mr-2' />
                  标记已读
                </button>
              )}
              {notification.data?.link && (
                <a
                  href={notification.data.link}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center px-4 py-2 text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors'
                >
                  <ExternalLink className='w-5 h-5 mr-2' />
                  查看详情
                </a>
              )}
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className='flex items-center px-4 py-2 text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50'
              >
                <Trash2 className='w-5 h-5 mr-2' />
                删除
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        <div className='bg-white rounded-lg shadow-sm overflow-hidden'>
          {/* Header */}
          <div className='p-6 border-b border-gray-200'>
            <div className='flex items-start justify-between mb-4'>
              <div className='flex items-center space-x-3'>
                <span className={`px-3 py-1 text-sm rounded-full ${getTypeColor(notification.notification_type)}`}>
                  {getTypeLabel(notification.notification_type)}
                </span>
                <span className={`px-3 py-1 text-sm rounded-full ${priorityInfo.color}`}>
                  {priorityInfo.label}
                </span>
                {notification.is_read ? (
                  <span className='px-3 py-1 text-sm rounded-full bg-green-100 text-green-700'>已读</span>
                ) : (
                  <span className='px-3 py-1 text-sm rounded-full bg-red-100 text-red-700'>未读</span>
                )}
              </div>
              <span className='text-sm text-gray-500'>
                {new Date(notification.created_at).toLocaleString('zh-CN')}
              </span>
            </div>

            <h2 className='text-xl font-semibold text-gray-900 mb-2'>{notification.title}</h2>
          </div>

          {/* Content */}
          <div className='p-6'>
            <div className='prose max-w-none'>
              <p className='text-gray-700 whitespace-pre-wrap'>{notification.content}</p>
            </div>
          </div>

          {/* Meta Info */}
          {(notification.read_at || notification.data) && (
            <div className='p-6 bg-gray-50 border-t border-gray-200'>
              {notification.read_at && (
                <div className='text-sm text-gray-500 mb-2'>
                  阅读时间：{new Date(notification.read_at).toLocaleString('zh-CN')}
                </div>
              )}

              {notification.data && Object.keys(notification.data).length > 0 && (
                <div className='mt-4'>
                  <h4 className='text-sm font-medium text-gray-700 mb-2'>附加数据</h4>
                  <pre className='text-xs text-gray-600 bg-white p-3 rounded border border-gray-200 overflow-auto'>
                    {JSON.stringify(notification.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className='mt-6 flex justify-between'>
          <button
            onClick={() => navigate('/notifications')}
            className='px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50'
          >
            返回通知列表
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationDetailPage;
