import React, { createContext, useContext, useCallback, useMemo } from 'react';
import type { TypeOptions } from 'react-toastify';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export interface ToastOptions {
  position?:
    | 'top-right'
    | 'top-center'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-center'
    | 'bottom-left';
  autoClose?: number;
  hideProgressBar?: boolean;
  closeOnClick?: boolean;
  pauseOnHover?: boolean;
  draggable?: boolean;
}

interface ToastContextType {
  showSuccess: (message: string, options?: ToastOptions) => void;
  showError: (message: string, options?: ToastOptions) => void;
  showWarning: (message: string, options?: ToastOptions) => void;
  showInfo: (message: string, options?: ToastOptions) => void;
  showMessage: (message: string, type: TypeOptions, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const showMessage = useCallback(
    (message: string, type: TypeOptions = 'info', options?: ToastOptions) => {
      toast(message, {
        type,
        position: options?.position || 'top-right',
        autoClose: options?.autoClose || 3000,
        hideProgressBar: options?.hideProgressBar || false,
        closeOnClick: options?.closeOnClick || true,
        pauseOnHover: options?.pauseOnHover || true,
        draggable: options?.draggable || true,
      });
    },
    []
  );

  const value = useMemo(
    () => ({
      showSuccess: (message: string, options?: ToastOptions) =>
        showMessage(message, 'success', options),
      showError: (message: string, options?: ToastOptions) =>
        showMessage(message, 'error', options),
      showWarning: (message: string, options?: ToastOptions) =>
        showMessage(message, 'warning', options),
      showInfo: (message: string, options?: ToastOptions) => showMessage(message, 'info', options),
      showMessage,
    }),
    [showMessage]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastProvider;
