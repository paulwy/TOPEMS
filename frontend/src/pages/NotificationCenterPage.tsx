import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Check,
  Trash2,
  RefreshCw,
  Loader2,
  BellOff,
} from 'lucide-react';
import { flowApi, Notification } from '../api/flow';
import { useAppStore } from '../store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

const NotificationCenterPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [markingAsRead, setMarkingAsRead] = useState(false);

  // TODO: Get from auth context
  const currentUserId = 'system-user-id';

  useEffect(() => {
    loadNotifications();
  }, [activeTab]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await flowApi.listNotifications(currentUserId);
      if (response.success && response.data) {
        const data = response.data as any;
        const notificationList = Array.isArray(data) ? data : data.items || [];
        setNotifications(notificationList);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error('加载通知失败:', err);
      addNotification({ title: '加载失败', message: '加载通知失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAsRead(true);
      const response = await flowApi.markNotificationsAsRead(currentUserId);
      if (response.success) {
        addNotification({ title: '成功', message: '已将所有通知标记为已读', type: 'success' });
        loadNotifications();
      } else {
        addNotification({ title: '失败', message: response.message || '操作失败', type: 'error' });
      }
    } catch (err) {
      addNotification({ title: '失败', message: '标记已读失败', type: 'error' });
      console.error('标记已读失败:', err);
    } finally {
      setMarkingAsRead(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'approval_created':
        return <Bell className='w-5 h-5 text-blue-600' />;
      case 'approval_completed':
        return <CheckCircle className='w-5 h-5 text-green-600' />;
      case 'workflow_started':
        return <Clock className='w-5 h-5 text-yellow-600' />;
      case 'workflow_completed':
        return <CheckCircle className='w-5 h-5 text-green-600' />;
      case 'workflow_rejected':
        return <XCircle className='w-5 h-5 text-red-600' />;
      default:
        return <AlertCircle className='w-5 h-5 text-gray-600' />;
    }
  };

  const getNotificationTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      approval_created: '审批创建',
      approval_completed: '审批完成',
      workflow_started: '工作流启动',
      workflow_completed: '工作流完成',
      workflow_rejected: '工作流拒绝',
    };
    return typeMap[type] || type;
  };

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'approval_created':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'approval_completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'workflow_started':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case 'workflow_completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'workflow_rejected':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const filteredNotifications = activeTab === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-6'>
      {/* Header */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <div className='w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center'>
              <Bell className='w-6 h-6 text-indigo-600 dark:text-indigo-400' />
            </div>
            <div>
              <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>通知中心</h1>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                {unreadCount > 0 ? (
                  <span className='text-indigo-600 dark:text-indigo-400 font-medium'>{unreadCount} 条未读通知</span>
                ) : (
                  '暂无未读通知'
                )}
              </p>
            </div>
          </div>
          <div className='flex items-center space-x-2'>
            <Button variant='outline' onClick={loadNotifications} disabled={loading}>
              {loading ? <Loader2 className='w-4 h-4 mr-2 animate-spin' /> : <RefreshCw className='w-4 h-4 mr-2' />}
              刷新
            </Button>
            <Button onClick={handleMarkAllAsRead} disabled={markingAsRead || unreadCount === 0}>
              {markingAsRead ? <Loader2 className='w-4 h-4 mr-2 animate-spin' /> : <Check className='w-4 h-4 mr-2' />}
              全部标记已读
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'unread')}>
        <TabsList className='mb-4'>
          <TabsTrigger value='all'>全部通知 ({notifications.length})</TabsTrigger>
          <TabsTrigger value='unread'>未读通知 ({unreadCount})</TabsTrigger>
        </TabsList>

        <TabsContent value='all'>
          <Card>
            <CardContent className='p-0'>
              {loading ? (
                <div className='p-6 space-y-4'>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className='flex items-start space-x-4'>
                      <Skeleton className='h-10 w-10 rounded-full' />
                      <div className='flex-1 space-y-2'>
                        <Skeleton className='h-4 w-3/4' />
                        <Skeleton className='h-4 w-1/2' />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className='p-12 text-center'>
                  <BellOff className='w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4' />
                  <p className='text-gray-500 dark:text-gray-400'>暂无通知</p>
                </div>
              ) : (
                <ScrollArea className='h-[600px]'>
                  <div className='divide-y divide-gray-200 dark:divide-gray-700'>
                    {filteredNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                          !notification.is_read ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <div className='flex items-start space-x-4'>
                          <div className='flex-shrink-0'>{getNotificationIcon(notification.notification_type)}</div>
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center space-x-2 mb-1'>
                              <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100 truncate'>
                                {notification.title}
                              </h3>
                              <Badge className={getNotificationTypeColor(notification.notification_type)}>
                                {getNotificationTypeText(notification.notification_type)}
                              </Badge>
                              {!notification.is_read && (
                                <Badge variant='destructive' className='text-xs'>
                                  未读
                                </Badge>
                              )}
                            </div>
                            <p className='text-sm text-gray-600 dark:text-gray-300 mb-2'>{notification.content}</p>
                            <div className='flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400'>
                              <span>{new Date(notification.created_at).toLocaleString('zh-CN')}</span>
                              {notification.workflow_instance_id && (
                                <span>实例: {notification.workflow_instance_id.substring(0, 8)}...</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='unread'>
          <Card>
            <CardContent className='p-0'>
              {loading ? (
                <div className='p-6 space-y-4'>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className='flex items-start space-x-4'>
                      <Skeleton className='h-10 w-10 rounded-full' />
                      <div className='flex-1 space-y-2'>
                        <Skeleton className='h-4 w-3/4' />
                        <Skeleton className='h-4 w-1/2' />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className='p-12 text-center'>
                  <CheckCircle className='w-16 h-16 mx-auto text-green-300 dark:text-green-600 mb-4' />
                  <p className='text-gray-500 dark:text-gray-400'>所有通知已读</p>
                </div>
              ) : (
                <ScrollArea className='h-[600px]'>
                  <div className='divide-y divide-gray-200 dark:divide-gray-700'>
                    {filteredNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className='p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors bg-blue-50/50 dark:bg-blue-900/20'
                      >
                        <div className='flex items-start space-x-4'>
                          <div className='flex-shrink-0'>{getNotificationIcon(notification.notification_type)}</div>
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center space-x-2 mb-1'>
                              <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100 truncate'>
                                {notification.title}
                              </h3>
                              <Badge className={getNotificationTypeColor(notification.notification_type)}>
                                {getNotificationTypeText(notification.notification_type)}
                              </Badge>
                            </div>
                            <p className='text-sm text-gray-600 dark:text-gray-300 mb-2'>{notification.content}</p>
                            <div className='flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400'>
                              <span>{new Date(notification.created_at).toLocaleString('zh-CN')}</span>
                              {notification.workflow_instance_id && (
                                <span>实例: {notification.workflow_instance_id.substring(0, 8)}...</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationCenterPage;
