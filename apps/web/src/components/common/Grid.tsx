import React from 'react';
import type { BoxProps } from '@mui/material';
import { Box } from '@mui/material';

export interface GridSizeProps {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

export interface GridProps extends BoxProps {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  item?: boolean;
  container?: boolean;
  spacing?: number | GridSizeProps;
  size?: number | GridSizeProps;
}

export const Grid: React.FC<React.PropsWithChildren<GridProps>> = ({
  children,
  xs = 12,
  sm,
  md,
  lg,
  xl,
  item = true,
  container = false,
  spacing = 0,
  size,
  sx,
  ...props
}) => {
  let effectiveXs: number | undefined = xs;
  let effectiveSm: number | undefined = sm;
  let effectiveMd: number | undefined = md;
  let effectiveLg: number | undefined = lg;
  let effectiveXl: number | undefined = xl;

  if (size !== undefined) {
    if (typeof size === 'number') {
      effectiveXs = size;
    } else {
      effectiveXs = size.xs ?? xs;
      effectiveSm = size.sm ?? sm;
      effectiveMd = size.md ?? md;
      effectiveLg = size.lg ?? lg;
      effectiveXl = size.xl ?? xl;
    }
  }

  if (container) {
    const getSpacing = (s: number | GridSizeProps | undefined): number => {
      if (typeof s === 'number') return s * 8;
      if (s && typeof s === 'object') return (s.xs || s.sm || s.md || 2) * 8;
      return 16;
    };

    const gapValue = getSpacing(spacing);

    return (
      <Box
        {...props}
        sx={{
          display: 'grid',
          gridAutoColumns: '1fr',
          gap: gapValue,
          '@media (min-width:600px)': { gap: getSpacing(spacing) },
          '@media (min-width:900px)': { gap: getSpacing(spacing) },
          '@media (min-width:1200px)': { gap: getSpacing(spacing) },
          ...sx,
        }}
      >
        {children}
      </Box>
    );
  }

  const getResponsiveColumnSpan = () => {
    const styles: Record<string, unknown> = {};

    if (effectiveXs !== undefined) {
      styles.gridColumn = `span ${effectiveXs}`;
    }
    if (effectiveSm !== undefined) {
      styles['@media (min-width:600px)'] = {
        gridColumn: `span ${effectiveSm}`,
      };
    }
    if (effectiveMd !== undefined) {
      styles['@media (min-width:900px)'] = {
        gridColumn: `span ${effectiveMd}`,
      };
    }
    if (effectiveLg !== undefined) {
      styles['@media (min-width:1200px)'] = {
        gridColumn: `span ${effectiveLg}`,
      };
    }
    if (effectiveXl !== undefined) {
      styles['@media (min-width:1536px)'] = {
        gridColumn: `span ${effectiveXl}`,
      };
    }

    return Object.keys(styles).length > 0 ? styles : undefined;
  };

  return (
    <Box
      {...props}
      sx={{
        boxSizing: 'border-box',
        ...(getResponsiveColumnSpan() || { gridColumn: 'span 12' }),
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};
