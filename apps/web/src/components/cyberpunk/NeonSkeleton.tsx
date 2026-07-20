import React from 'react';
import { Skeleton, Box, type SxProps, type Theme } from '@mui/material';

export interface NeonSkeletonProps {
  variant?: 'text' | 'rectangular' | 'rounded' | 'circular';
  width?: number | string;
  height?: number | string;
  count?: number;
  gap?: number;
  sx?: SxProps<Theme>;
  glow?: boolean;
}

export const NeonSkeleton: React.FC<NeonSkeletonProps> = ({
  variant = 'text',
  width,
  height,
  count = 1,
  gap = 1,
  sx,
  glow = true,
}) => {
  if (count > 1) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap, ...sx }}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton
            key={i}
            variant={variant}
            width={width}
            height={height}
            className={glow ? 'cyber-neon-skeleton' : ''}
          />
        ))}
      </Box>
    );
  }

  return (
    <Skeleton
      variant={variant}
      width={width}
      height={height}
      className={glow ? 'cyber-neon-skeleton' : ''}
      sx={sx}
    />
  );
};

export const NeonSkeletonText: React.FC<{
  lines?: number;
  width?: string | number;
  lastLineWidth?: string | number;
}> = ({ lines = 3, width = '100%', lastLineWidth = '60%' }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant='text'
          width={i === lines - 1 ? lastLineWidth : width}
          className='cyber-neon-skeleton'
        />
      ))}
    </Box>
  );
};

export const NeonSkeletonCard: React.FC = () => {
  return (
    <Box
      className='cyber-glass-card'
      sx={{ p: 3, borderRadius: 2 }}
    >
      <Skeleton
        variant='rectangular'
        width={60}
        height={60}
        sx={{ borderRadius: 2, mb: 2 }}
        className='cyber-neon-skeleton'
      />
      <Skeleton
        variant='text'
        width='60%'
        className='cyber-neon-skeleton'
      />
      <Skeleton
        variant='text'
        width='40%'
        className='cyber-neon-skeleton'
      />
      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        <Skeleton
          variant='text'
          width={80}
          className='cyber-neon-skeleton'
        />
        <Skeleton
          variant='text'
          width={60}
          className='cyber-neon-skeleton'
        />
      </Box>
    </Box>
  );
};

export default NeonSkeleton;
