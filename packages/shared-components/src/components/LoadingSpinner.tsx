import React from 'react';
import { Loader2 } from 'lucide-react';
import { useTheme } from '@mui/material/styles';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md' }) => {
  return (
    <div
      role='status'
      aria-label='Loading'
    >
      <Loader2
        style={{
          width: size === 'sm' ? 16 : size === 'md' ? 24 : 32,
          height: size === 'sm' ? 16 : size === 'md' ? 24 : 32,
          animation: 'spin 1s linear infinite',
        }}
      />
    </div>
  );
};

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading, children, message }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (!isLoading) return <>{children}</>;

  return (
    <div style={{ position: 'relative' }}>
      {children}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: isDark ? 'rgba(55, 65, 81, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <LoadingSpinner size='lg' />
          {message && (
            <p
              style={{
                marginTop: '16px',
                color: isDark ? 'grey.300' : 'text.secondary',
              }}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export const SkeletonLoader: React.FC = () => {
  return (
    <div
      style={{
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        backgroundColor: 'grey.200',
        borderRadius: '8px',
      }}
    />
  );
};

export default LoadingSpinner;
