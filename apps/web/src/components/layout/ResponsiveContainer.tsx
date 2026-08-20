import React from 'react';
import { Box } from '@mui/material';
import { useResponsive } from '../../hooks/useResponsive';

type ContainerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'fluid';

interface ResponsiveContainerProps {
  size?: ContainerSize;
  children?: React.ReactNode;
  sx?: object;
  className?: string;
  maxWidth?: number | string;
  disableGutters?: boolean;
  fixed?: boolean;
}

const SIZE_MAP: Record<ContainerSize, number | string> = {
  xs: 444,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
  xxl: 2560,
  fluid: '100%',
};

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  size = 'lg',
  children,
  sx = {},
  maxWidth: customMaxWidth,
  disableGutters = false,
  fixed = false,
  className,
}) => {
  const { isMobile, isTablet } = useResponsive();

  const computedMaxWidth = customMaxWidth ?? SIZE_MAP[size];
  const padding = disableGutters ? 0 : isMobile ? 16 : isTablet ? 24 : 32;

  return (
    <Box
      className={className}
      sx={{
        width: fixed ? computedMaxWidth : '100%',
        maxWidth: computedMaxWidth,
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingLeft: `${padding}px`,
        paddingRight: `${padding}px`,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

export default ResponsiveContainer;
