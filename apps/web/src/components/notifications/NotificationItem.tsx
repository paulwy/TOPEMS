import React, { useState } from 'react';
import { Check, Trash2, ExternalLink } from 'lucide-react';
import type { Notification } from '../../api/notification';
import { markAsRead, deleteNotification } from '../../api/notification';

interface NotificationItemProps {
  notification: Notification;
  onUpdate: (notification: Notification) => void;
  onDelete: (id: string) => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'system':
      return (
        <div className='w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center'>
          <svg className='w-5 h-5 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.572c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
            />
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0a3 3 0 016 0z' />
          </svg>
        </div>
      );
    case 'workflow':
      return (
        <div className='w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center'>
          <svg className='w-5 h-5 text-purple-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'
            />
          </svg>
        </div>
      );
    case 'alert':
      return (
        <div className='w-10 h-10 rounded-full bg-red-100 flex items-center justify-center'>
          <svg className='w-5 h-5 text-red-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
            />
          </svg>
        </div>
      );
    case 'reminder':
      return (
        <div className='w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center'>
          <svg className='w-5 h-5 text-yellow-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
        </div>
      );
    case 'message':
      return (
        <div className='w-10 h-10 rounded-full bg-green-100 flex items-center justify-center'>
          <svg className='w-5 h-5 text-green-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
            />
          </svg>
        </div>
      );
    default:
      return (
        <div className='w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center'>
          <svg className='w-5 h-5 text-gray-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0a9 9 0 0118 0z'
            />
          </svg>
        </div>
      );
  }
};

const getPriorityColor = (priority: number) => {
  if (priority >= 4) return 'text-red-600';
  if (priority >= 3) return 'text-orange-600';
  if (priority >= 2) return 'text-yellow-600';
  return 'text-gray-600';
};

const getPriorityLabel = (priority: number) => {
  if (priority >= 4) return '紧急';
  if (priority >= 3) return '高';
  if (priority >= 2) return '中';
  return '低';
};

const getLink = (notification: Notification) => notification.data?.link;

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onUpdate, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await markAsRead(notification.id);
      if (response.success && response.data) {
        onUpdate(response.data);
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      const response = await deleteNotification(notification.id);
      if (response.success) {
        onDelete(notification.id);
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
      setIsDeleting(false);
    }
  };

  const handleClick = async () => {
    if (!notification.is_read) {
      await handleMarkAsRead({ stopPropagation: () => {} } as React.MouseEvent);
    }

    const link = getLink(notification);
    if (link) {
      window.location.href = link;
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

  return (
    <div
      className={`relative p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
        !notification.is_read ? 'bg-blue-50/50' : ''
      } ${isDeleting ? 'opacity-50' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div className='flex gap-3'>
        {getNotificationIcon(notification.notification_type)}

        <div className='flex-1 min-w-0'>
          <div className='flex items-start justify-between gap-2 mb-1'>
            <h4 className={`text-sm font-medium truncate ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
              {notification.title}
            </h4>
            {!notification.is_read && <span className='w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5' />}
          </div>

          <p className='text-sm text-gray-600 line-clamp-2 mb-2'>{notification.content}</p>

          <div className='flex items-center gap-3 text-xs'>
            <span className='text-gray-500'>{formatTime(notification.created_at)}</span>
            <span className={`font-medium ${getPriorityColor(notification.priority)}`}>
              {getPriorityLabel(notification.priority)}
            </span>
          </div>
        </div>
      </div>

      {isHovered && (
        <div className='absolute top-2 right-2 flex gap-1'>
          {!notification.is_read && (
            <button
              onClick={handleMarkAsRead}
              className='p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors'
              title='标记已读'
            >
              <Check className='w-4 h-4' />
            </button>
          )}
          <button
            onClick={handleDelete}
            className='p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors'
            title='删除'
          >
            <Trash2 className='w-4 h-4' />
          </button>
          {getLink(notification) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = getLink(notification)!;
              }}
              className='p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors'
              title='查看详情'
            >
              <ExternalLink className='w-4 h-4' />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationItem;
