'use client';

import * as React from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  onClose: () => void;
}

const Toast = ({ id, title, message, type, onClose }: ToastProps) => {
  const [isVisible, setIsVisible] = React.useState(true);

  // 自动关闭
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // 等待动画完成后再移除
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className='h-5 w-5 text-green-500' />;
      case 'error':
        return <AlertCircle className='h-5 w-5 text-red-500' />;
      case 'warning':
        return <AlertTriangle className='h-5 w-5 text-yellow-500' />;
      case 'info':
      default:
        return <Info className='h-5 w-5 text-blue-500' />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg transform transition-all duration-300',
        getBgColor(),
        'animate-in slide-in-from-top-2 fade-in'
      )}
    >
      {getIcon()}
      <div className='flex-1 min-w-0'>
        <p className='font-medium text-gray-900'>{title}</p>
        {message && <p className='text-sm text-gray-600 mt-1'>{message}</p>}
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className='text-gray-400 hover:text-gray-600 transition-colors'
      >
        <X className='h-4 w-4' />
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
    <div className='fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full'>
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
