import React, { useState, useEffect, useCallback } from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setToasts((prev) => prev.filter((toast) => {
        const elapsed = Date.now() - parseInt(toast.id, 10);
        return elapsed < (toast.duration || 5000);
      }));
    }, 100);

    return () => clearInterval(timer);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const getToastStyle = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getToastIcon = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '!';
      case 'info':
        return 'i';
      default:
        return 'i';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center space-x-3 px-4 py-3 rounded-lg border shadow-lg min-w-[280px] max-w-[400px] ${getToastStyle(toast.type)} animate-slide-in`}
          style={{
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-current/10 text-lg font-bold">
            {getToastIcon(toast.type)}
          </span>
          <span className="flex-1 text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-current/60 hover:text-current transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

let toastId = Date.now();

export const showToast = (type: ToastMessage['type'], message: string, duration?: number) => {
  const id = (++toastId).toString();
  
  const event = new CustomEvent('toast', {
    detail: {
      id,
      type,
      message,
      duration: duration || 5000,
    } as ToastMessage,
  });
  
  window.dispatchEvent(event);
};

export const toast = {
  success: (message: string, duration?: number) => showToast('success', message, duration),
  error: (message: string, duration?: number) => showToast('error', message, duration),
  warning: (message: string, duration?: number) => showToast('warning', message, duration),
  info: (message: string, duration?: number) => showToast('info', message, duration),
};

export default ToastContainer;
