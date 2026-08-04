import React from 'react';
import { Box, useTheme } from '@mui/material';
import type { Breakpoint } from '@mui/material';

type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>;

export interface FlexGridProps {
  container?: boolean;
  item?: boolean;
  xs?: number | boolean;
  sm?: number | boolean;
  md?: number | boolean;
  lg?: number | boolean;
  xl?: number | boolean;
  xxl?: number | boolean;
  spacing?: number | Partial<Record<Breakpoint, number>>;
  direction?: ResponsiveValue<'row' | 'row-reverse' | 'column' | 'column-reverse'>;
  justify?:
    'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  children?: React.ReactNode;
  sx?: object;
  className?: string;
  style?: React.CSSProperties;
}

const GRID_COLUMNS = 12;

const getSpanStyles = (span: number | boolean | undefined): number => {
  if (span === undefined) return GRID_COLUMNS;
  if (span === true) return GRID_COLUMNS;
  if (typeof span === 'number') return span;
  return GRID_COLUMNS;
};

const getSpacingValue = (spacing: number): number => spacing * 8;

export const FlexGrid: React.FC<FlexGridProps> = ({
  container = false,
  item = false,
  xs,
  sm,
  md,
  lg,
  xl,
  spacing = 0,
  direction = 'row',
  justify = 'flex-start',
  alignItems = 'stretch',
  wrap = 'wrap',
  children,
  sx = {},
  className,
  style,
}) => {
  const theme = useTheme();

  if (container) {
    const spacingValue = typeof spacing === 'number' ? spacing : 0;
    const margin = -getSpacingValue(spacingValue) / 2;

    return (
      <Box
        className={className}
        sx={{
          display: 'flex',
          flexDirection: direction as 'row' | 'column',
          justifyContent: justify,
          alignItems,
          flexWrap: wrap,
          margin: `${margin}px`,
          ...sx,
        }}
        style={style}
      >
        {children}
      </Box>
    );
  }

  if (item) {
    const spans = { xs, sm, md, lg, xl };
    const widthMap: Record<string, { width: string; maxWidth: string; flexBasis: string }> = {};

    (Object.keys(spans) as Breakpoint[]).forEach((bp) => {
      const span = spans[bp];
      if (span !== undefined) {
        const spanValue = getSpanStyles(span);
        widthMap[theme.breakpoints.up(bp)] = {
          width: `${(spanValue / GRID_COLUMNS) * 100}%`,
          maxWidth: `${(spanValue / GRID_COLUMNS) * 100}%`,
          flexBasis: `${(spanValue / GRID_COLUMNS) * 100}%`,
        };
      }
    });

    const defaultSpan = getSpanStyles(xs);
    const spacingValue = typeof spacing === 'number' ? spacing : 0;
    const padding = getSpacingValue(spacingValue) / 2;

    return (
      <Box
        className={className}
        sx={{
          padding: `${padding}px`,
          width: `${(defaultSpan / GRID_COLUMNS) * 100}%`,
          maxWidth: `${(defaultSpan / GRID_COLUMNS) * 100}%`,
          flexBasis: `${(defaultSpan / GRID_COLUMNS) * 100}%`,
          flexGrow: 0,
          flexShrink: 0,
          ...widthMap,
          ...sx,
        }}
        style={style}
      >
        {children}
      </Box>
    );
  }

  return <>{children}</>;
};

export interface FlexItemProps {
  xs?: number | boolean;
  sm?: number | boolean;
  md?: number | boolean;
  lg?: number | boolean;
  xl?: number | boolean;
  children?: React.ReactNode;
  sx?: object;
  className?: string;
}

export const FlexItem: React.FC<FlexItemProps> = ({ children, ...props }) => (
  <FlexGrid
    item
    {...props}
  >
    {children}
  </FlexGrid>
);

export default FlexGrid;
