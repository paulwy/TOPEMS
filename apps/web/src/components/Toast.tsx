/**
 * @deprecated 此组件已弃用，请使用 @/components/ui/toast 中的 Toast 组件
 * 该组件将保留作为向后兼容，预计在未来的版本中移除
 */
import React, { useEffect, useState } from 'react';
import { XCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import type { Notification, NotificationType } from '../hooks/useNotification';

interface ToastProps {
  notification: Notification;
  onClose: (_id: string) => void;
}

const iconMap: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
};

const iconColorMap = {
  success: '#22c55e',
  error: '#ef4444',
  info: '#3b82f6',
  warning: '#eab308',
};

export const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const Icon = iconMap[notification.type];

  useEffect(() => {
    setIsVisible(true);

    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, notification.duration);

      return () => clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification.duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(notification.id);
    }, 300);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        minWidth: '300px',
        maxWidth: '448px',
        transition: 'all 0.3s ease-in-out',
        opacity: isVisible && !isLeaving ? 1 : 0,
        transform: isVisible && !isLeaving ? 'translateX(0)' : 'translateX(16px)',
        ...(notification.type === 'success'
          ? {
              backgroundColor: '#f0fdf4',
              borderColor: '#bbf7d0',
              color: '#166534',
            }
          : {}),
        ...(notification.type === 'error'
          ? {
              backgroundColor: '#fef2f2',
              borderColor: '#fecaca',
              color: '#991b1b',
            }
          : {}),
        ...(notification.type === 'info'
          ? {
              backgroundColor: '#eff6ff',
              borderColor: '#bfdbfe',
              color: '#1e40af',
            }
          : {}),
        ...(notification.type === 'warning'
          ? {
              backgroundColor: '#fefce8',
              borderColor: '#fef08a',
              color: '#854d0e',
            }
          : {}),
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          flexShrink: 0,
          color: iconColorMap[notification.type],
        }}
      >
        <Icon />
      </div>
      <p style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>{notification.message}</p>
      <button
        onClick={handleClose}
        style={{
          padding: '4px',
          borderRadius: '9999px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        }}
        aria-label='关闭通知'
      >
        <X sx={{ width: 16, height: 16 }} />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  notifications: Notification[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ notifications, onClose }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          notification={notification}
          onClose={onClose}
        />
      ))}
    </div>
  );
};

export default ToastContainer;
