import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (type: Toast['type'], message: string) => void;
  removeToast: (_id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer
        toasts={toasts}
        onRemove={removeToast}
      />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  const getToastStyles = (type: Toast['type']) => {
    const styles: Record<Toast['type'], { backgroundColor: string; color: string }> = {
      success: { backgroundColor: 'success.dark', color: 'white' },
      error: { backgroundColor: 'error.main', color: 'white' },
      warning: { backgroundColor: 'warning.main', color: 'white' },
      info: { backgroundColor: 'primary.main', color: 'white' },
    };
    return styles[type];
  };

  const getIcon = (type: Toast['type']) => {
    const icons = {
      success: <CheckCircle sx={{ width: 20, height: 20 }} />,
      error: <XCircle sx={{ width: 20, height: 20 }} />,
      warning: <AlertCircle sx={{ width: 20, height: 20 }} />,
      info: <Info sx={{ width: 20, height: 20 }} />,
    };
    return icons[type];
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {toasts.map((toast) => (
        <Box
          key={toast.id}
          sx={{
            paddingX: 3,
            paddingY: 2,
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            backgroundColor: getToastStyles(toast.type).backgroundColor,
            color: getToastStyles(toast.type).color,
            animation: 'slideIn 0.3s ease-out',
          }}
          onClick={() => onRemove(toast.id)}
        >
          {getIcon(toast.type)}
          <Typography sx={{ flex: 1 }}>{toast.message}</Typography>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onRemove(toast.id);
            }}
            sx={{ color: 'inherit', padding: 0 }}
          >
            ×
          </IconButton>
        </Box>
      ))}
    </Box>
  );
};

export default ToastProvider;
