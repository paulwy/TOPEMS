import React from 'react';
import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  sx?: import('@mui/material/styles').SxProps<import('@mui/material/styles').Theme>;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', sx }) => {
  return (
    <Box
      role='status'
      aria-label='Loading'
      sx={sx}
    >
      <Loader2
        sx={{
          width: size === 'sm' ? 16 : size === 'md' ? 24 : 32,
          height: size === 'sm' ? 16 : size === 'md' ? 24 : 32,
          animation: 'spin 1s linear infinite',
        }}
      />
    </Box>
  );
};

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading, children, message }) => {
  if (!isLoading) return <>{children}</>;

  return (
    <Box sx={{ position: 'relative' }}>
      {children}
      <Box
        sx={(theme) => ({
          position: 'absolute',
          inset: 0,
          backgroundColor: alpha(theme.palette.background.default, 0.8),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        })}
      >
        <Box sx={{ textAlign: 'center' }}>
          <LoadingSpinner size='lg' />
          {message && (
            <Typography
              sx={{
                mt: 2,
                color: 'text.secondary',
              }}
            >
              {message}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export const SkeletonLoader: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <Box
      className={className}
      sx={{
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        bgcolor: 'grey.200',
        borderRadius: 2,
      }}
    />
  );
};

export default LoadingSpinner;
