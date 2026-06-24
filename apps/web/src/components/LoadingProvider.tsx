import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  message: string;
  startLoading: (_message?: string) => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const startLoading = useCallback((msg: string = '加载中...') => {
    setIsLoading(true);
    setMessage(msg);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    setMessage('');
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading, message, startLoading, stopLoading }}>
      {children}
      <GlobalLoadingOverlay
        isLoading={isLoading}
        message={message}
      />
    </LoadingContext.Provider>
  );
};

interface GlobalLoadingOverlayProps {
  isLoading: boolean;
  message: string;
}

const GlobalLoadingOverlay: React.FC<GlobalLoadingOverlayProps> = ({ isLoading, message }) => {
  if (!isLoading) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            border: '4px solid #2563eb',
            borderTop: '4px solid transparent',
            borderRadius: '9999px',
            animation: 'spin 1s linear infinite',
            marginBottom: '16px',
          }}
        ></div>
        <p style={{ color: '#374151', fontSize: '18px' }}>{message}</p>
      </div>
    </div>
  );
};

export default LoadingProvider;
