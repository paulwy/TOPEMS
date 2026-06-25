'use client';

import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  onClose: () => void;
}

const Toast = ({ id: _, title, message, type, onClose }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 sx={{ height: 20, width: 20, color: '#16a34a' }} />;
      case 'error':
        return <AlertCircle sx={{ height: 20, width: 20, color: '#dc2626' }} />;
      case 'warning':
        return <AlertTriangle sx={{ height: 20, width: 20, color: '#ca8a04' }} />;
      case 'info':
      default:
        return <Info sx={{ height: 20, width: 20, color: '#2563eb' }} />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#f0fdf4',
          borderColor: '#bbf7d0',
          titleColor: '#166534',
          messageColor: '#15803d',
        };
      case 'error':
        return {
          backgroundColor: '#fef2f2',
          borderColor: '#fecaca',
          titleColor: '#991b1b',
          messageColor: '#b91c1c',
        };
      case 'warning':
        return {
          backgroundColor: '#fefce8',
          borderColor: '#fde68a',
          titleColor: '#854d0e',
          messageColor: '#a16207',
        };
      case 'info':
      default:
        return {
          backgroundColor: '#eff6ff',
          borderColor: '#bfdbfe',
          titleColor: '#1e40af',
          messageColor: '#1d4ed8',
        };
    }
  };

  if (!isVisible) {
    return null;
  }

  const styles = getStyles();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease',
        animation: 'slideIn 0.3s ease',
        ...styles,
      }}
    >
      {getIcon()}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 500, margin: 0, color: styles.titleColor }}>{title}</p>
        <p style={{ fontSize: '14px', margin: '4px 0 0', color: styles.messageColor }}>
          {message}
        </p>
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        style={{
          color: '#6b7280',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          transition: 'color 0.2s',
          padding: '4px',
        }}
        aria-label='关闭通知'
      >
        <X sx={{ height: 16, width: 16 }} />
      </button>
    </div>
  );
};

export function Toaster() {
  const notifications = useAppStore((state) => state.notifications);
  const removeNotification = useAppStore((state) => state.removeNotification);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: '384px',
        width: '100%',
      }}
    >
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          id={notification.id}
          title={notification.title}
          message={notification.message}
          type={notification.type}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
};

export default NotificationProvider;