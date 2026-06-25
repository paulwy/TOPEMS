import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

export interface LoadingFallbackProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  fullHeight?: boolean;
  variant?: 'spinner' | 'skeleton' | 'dots';
  className?: string;
}

const sizeMap = {
  sm: 24,
  md: 40,
  lg: 56,
};

const DotsLoader: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => {
  const dotSize = size === 'sm' ? 6 : size === 'md' ? 8 : 12;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: dotSize / 2 }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            backgroundColor: 'primary.main',
            animation: 'bounce 1s ease-in-out infinite',
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </Box>
  );
};

const SkeletonLoader: React.FC = () => (
  <Box
    sx={{
      width: '100%',
      maxWidth: 400,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    }}
  >
    <Box
      sx={{
        height: 20,
        borderRadius: 1,
        backgroundColor: 'grey.200',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }}
    />
    <Box
      sx={{
        height: 20,
        borderRadius: 1,
        backgroundColor: 'grey.200',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        animationDelay: '0.1s',
        width: '80%',
      }}
    />
    <Box
      sx={{
        height: 20,
        borderRadius: 1,
        backgroundColor: 'grey.200',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        animationDelay: '0.2s',
        width: '60%',
      }}
    />
  </Box>
);

export const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  text = '加载中...',
  size = 'md',
  fullHeight = true,
  variant = 'spinner',
  className = '',
}) => {
  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return <DotsLoader size={size} />;
      case 'skeleton':
        return <SkeletonLoader />;
      case 'spinner':
      default:
        return (
          <CircularProgress
            size={sizeMap[size]}
            color='primary'
          />
        );
    }
  };

  return (
    <Box
      className={className}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        padding: 4,
        minHeight: fullHeight ? '100%' : 'auto',
        backgroundColor: 'background.paper',
      }}
    >
      {renderLoader()}
      {text && (
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {text}
        </Typography>
      )}
    </Box>
  );
};

export const PageLoadingFallback: React.FC<{ text?: string }> = ({ text = '页面加载中...' }) => (
  <Box
    sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: 'background.default',
    }}
  >
    <LoadingFallback
      text={text}
      size='lg'
      fullHeight={false}
    />
  </Box>
);

export default LoadingFallback;
