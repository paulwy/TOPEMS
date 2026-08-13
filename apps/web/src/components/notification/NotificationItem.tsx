import React, { useState } from 'react';
import { useTheme } from '@mui/material';
import { Check, Trash2, ExternalLink } from 'lucide-react';
import type { Notification } from '@/api/notification';
import { markAsRead, deleteNotification } from '@/api/notification';
import { logger } from '@/utils/logger';

interface NotificationItemProps {
  notification: Notification;
  onUpdate: (notification: Notification) => void;
  onDelete: (id: string) => void;
}

const getNotificationIcon = (type: string, theme: { palette: unknown }) => {
  switch (type) {
    case 'system':
      return (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '9999px',
            backgroundColor: 'primary.100',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            style={{
              width: 20,
              height: 20,
              color: (theme.palette as Record<string, { dark: string }>).primary.dark,
            }}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.572c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
            />
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M15 12a3 3 0 11-6 0a3 3 0 016 0z'
            />
          </svg>
        </div>
      );
    case 'workflow':
      return (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '9999px',
            backgroundColor: 'secondary.100',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            style={{ width: 20, height: 20, color: 'purple.600' }}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
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
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '9999px',
            backgroundColor: 'error.lighter',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            style={{
              width: 20,
              height: 20,
              color: (theme.palette as Record<string, { dark: string }>).error.dark,
            }}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
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
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '9999px',
            backgroundColor: 'warning.100',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            style={{ width: 20, height: 20, color: 'yellow.600' }}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
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
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '9999px',
            backgroundColor: 'success.lighter',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            style={{
              width: 20,
              height: 20,
              color: (theme.palette as Record<string, { dark: string }>).success.dark,
            }}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
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
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '9999px',
            backgroundColor: 'surface.100',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            style={{ width: 20, height: 20, color: 'grey.500' }}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
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
  if (priority >= 4) return { color: 'error.dark' };
  if (priority >= 3) return { color: 'warning.600' };
  if (priority >= 2) return { color: 'yellow.600' };
  return { color: 'text.secondary' };
};

const getPriorityLabel = (priority: number) => {
  if (priority >= 4) return '紧急';
  if (priority >= 3) return '高';
  if (priority >= 2) return '中';
  return '低';
};

const getLink = (notification: Notification) => notification.data?.link;

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onUpdate,
  onDelete,
}) => {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await markAsRead(notification.id);
      if (response.success && response.data) {
        onUpdate(response.data);
      }
    } catch (error: unknown) {
      logger.error('Failed to mark as read:', error);
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
    } catch (error: unknown) {
      logger.error('Failed to delete notification:', error);
      setIsDeleting(false);
    }
  };

  const handleClick = async () => {
    if (!notification.is_read) {
      await handleMarkAsRead({ stopPropagation: () => {} } as React.MouseEvent);
    }

    const link = getLink(notification) as string | undefined;
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
      style={{
        position: 'relative',
        padding: 16,
        backgroundColor: !notification.is_read ? 'rgba(59, 130, 246, 0.05)' : undefined,
        opacity: isDeleting ? 0.5 : 1,
        cursor: 'pointer',
        transition: 'background-color 0.15s',
      }}
      role='button'
      tabIndex={0}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div style={{ display: 'flex', gap: 12 }}>
        {getNotificationIcon(notification.notification_type, theme)}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 8,
              marginBottom: 4,
            }}
          >
            <h4
              style={{
                fontSize: 14,
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: !notification.is_read ? theme.palette.text.primary : theme.palette.grey[700],
              }}
            >
              {notification.title}
            </h4>
            {!notification.is_read && (
              <span
                style={{
                  width: 8,
                  height: 8,
                  backgroundColor: theme.palette.primary.main,
                  borderRadius: '9999px',
                  flexShrink: 0,
                  marginTop: 6,
                }}
              />
            )}
          </div>

          <p
            style={{
              fontSize: 14,
              color: theme.palette.text.secondary,
              marginBottom: 8,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {notification.content}
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 12,
              color: theme.palette.text.secondary,
            }}
          >
            <span>{formatTime(notification.created_at)}</span>
            <span
              style={{
                fontWeight: 500,
                ...getPriorityColor(notification.priority),
              }}
            >
              {getPriorityLabel(notification.priority)}
            </span>
          </div>
        </div>
      </div>

      {isHovered && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 4,
          }}
        >
          {!notification.is_read && (
            <button
              onClick={handleMarkAsRead}
              style={{
                padding: 6,
                color: theme.palette.text.secondary,
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              title='标记已读'
            >
              <Check style={{ width: 16, height: 16 }} />
            </button>
          )}
          <button
            onClick={handleDelete}
            style={{
              padding: 6,
              color: theme.palette.text.secondary,
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            title='删除'
          >
            <Trash2 style={{ width: 16, height: 16 }} />
          </button>
          {!!getLink(notification) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = getLink(notification) as string;
              }}
              style={{
                padding: 6,
                color: theme.palette.text.secondary,
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              title='查看详情'
            >
              <ExternalLink style={{ width: 16, height: 16 }} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationItem;
