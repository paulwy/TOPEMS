'use client';

import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store';
import { Box, Typography, Button } from '@mui/material';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  id: string;
  title?: string;
  message: string;
  type: NotificationType;
  duration?: number;
  onClose: () => void;
}

const Toast = ({ id: _, title, message, type, duration, onClose }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const autoCloseDuration = duration ?? 5000;
    if (autoCloseDuration <= 0) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, autoCloseDuration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 style={{ height: 20, width: 20, color: '#16a34a', flexShrink: 0 }} />;
      case 'error':
        return <AlertCircle style={{ height: 20, width: 20, color: '#dc2626', flexShrink: 0 }} />;
      case 'warning':
        return <AlertTriangle style={{ height: 20, width: 20, color: '#ca8a04', flexShrink: 0 }} />;
      case 'info':
      default:
        return <Info style={{ height: 20, width: 20, color: '#2563eb', flexShrink: 0 }} />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: 'success.light',
          borderColor: 'success.light',
          titleColor: '#166534',
          messageColor: 'success.700',
        };
      case 'error':
        return {
          backgroundColor: 'error.light',
          borderColor: 'error.light',
          titleColor: '#991b1b',
          messageColor: '#b91c1c',
        };
      case 'warning':
        return {
          backgroundColor: '#fefce8',
          borderColor: 'warning.light',
          titleColor: '#854d0e',
          messageColor: 'warning.700',
        };
      case 'info':
      default:
        return {
          backgroundColor: 'primary.50',
          borderColor: '#bfdbfe',
          titleColor: 'primary.800',
          messageColor: 'primary.700',
        };
    }
  };

  if (!isVisible) {
    return null;
  }

  const styles = getStyles();

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease',
        animation: 'slideIn 0.3s ease',
        backgroundColor: styles.backgroundColor,
        borderColor: styles.borderColor,
      }}
    >
      {getIcon()}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {title && (
          <Typography
            sx={{ fontWeight: 600, margin: 0, color: styles.titleColor, fontSize: '14px' }}
          >
            {title}
          </Typography>
        )}
        <Typography
          sx={{
            fontSize: '14px',
            margin: title ? '4px 0 0' : 0,
            color: styles.messageColor,
            lineHeight: 1.5,
          }}
        >
          {message}
        </Typography>
      </Box>
      <Button
        onClick={handleClose}
        sx={{
          color: 'grey.500',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          transition: 'color 0.2s',
          padding: '4px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 'auto',
        }}
        aria-label='关闭通知'
      >
        <X style={{ height: 16, width: 16 }} />
      </Button>
    </Box>
  );
};

export function Toaster() {
  const notifications = useAppStore((state) => state.notifications);
  const removeNotification = useAppStore((state) => state.removeNotification);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: '384px',
        width: 'calc(100% - 32px)',
        pointerEvents: 'auto',
      }}
    >
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          id={notification.id}
          title={notification.title}
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </Box>
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
