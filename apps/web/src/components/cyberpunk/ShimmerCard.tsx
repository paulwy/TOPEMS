import React from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';

export interface ShimmerCardProps {
  children: React.ReactNode;
  className?: string;
  sx?: SxProps<Theme>;
  animated?: boolean;
}

export const ShimmerCard: React.FC<ShimmerCardProps> = ({
  children,
  className = '',
  sx,
  animated = true,
}) => {
  return (
    <Box
      className={`cyber-glass-card ${animated ? 'cyber-scanline' : ''} ${className}`}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        p: 3,
        borderRadius: 2,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

export default ShimmerCard;
