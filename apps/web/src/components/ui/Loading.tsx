import React from 'react';
import { Box, Typography } from '@mui/material';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  variant?: 'spinner' | 'dots' | 'pulse';
  className?: string;
  inline?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  text,
  variant = 'spinner',
  className = '',
  inline = false,
}) => {
  const sizeMap = {
    sm: 16,
    md: 32,
    lg: 48,
  };

  const textSizeMap = {
    sm: '0.75rem',
    md: '0.875rem',
    lg: '1rem',
  };

  const Spinner = () => (
    <Box
      sx={{
        width: sizeMap[size],
        height: sizeMap[size],
        border: '2px solid #d1d5db',
        borderTopColor: '#3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    />
  );

  const Dots = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: size === 'sm' ? 6 : size === 'md' ? 8 : 12,
            height: size === 'sm' ? 6 : size === 'md' ? 8 : 12,
            borderRadius: '50%',
            backgroundColor: '#3b82f6',
            animation: 'bounce 1s ease-in-out infinite',
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </Box>
  );

  const Pulse = () => (
    <Box
      sx={{
        width: sizeMap[size],
        height: sizeMap[size],
        backgroundColor: '#3b82f6',
        borderRadius: '50%',
        animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
      }}
    />
  );

  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return <Dots />;
      case 'pulse':
        return <Pulse />;
      default:
        return <Spinner />;
    }
  };

  if (inline) {
    return (
      <Box
        component='span'
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}
        className={className}
      >
        {renderLoader()}
        {text && (
          <Typography
            component='span'
            sx={{ fontSize: textSizeMap[size] }}
          >
            {text}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}
      className={className}
    >
      {renderLoader()}
      {text && (
        <Typography
          component='span'
          sx={{ fontSize: textSizeMap[size] }}
        >
          {text}
        </Typography>
      )}
    </Box>
  );
};

export default Loading;

export const LoadingOverlay: React.FC<{
  isLoading: boolean;
  children?: React.ReactNode;
  text?: string;
}> = ({ isLoading, children, text = '加载中...' }) => {
  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}
      >
        <Loading text={text} />
      </Box>
      {children}
    </Box>
  );
};
