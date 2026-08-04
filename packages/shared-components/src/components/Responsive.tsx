import React from 'react';
import { useTheme, useMediaQuery } from '@mui/material';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export interface ResponsiveProps<T> {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  xxl?: T;
  defaultValue?: T;
}

const breakpointValues: Record<Breakpoint, number> = {
  xs: 0,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536,
  xxl: 1920,
};

// eslint-disable-next-line react-refresh/only-export-components
export const useBreakpoint = (): Breakpoint => {
  const theme = useTheme();
  const isXxl = useMediaQuery(theme.breakpoints.up(1920));
  const isXl = useMediaQuery(theme.breakpoints.up('xl'));
  const isLg = useMediaQuery(theme.breakpoints.up('lg'));
  const isMd = useMediaQuery(theme.breakpoints.up('md'));
  const isSm = useMediaQuery(theme.breakpoints.up('sm'));
  if (isXxl) return 'xxl';
  if (isXl) return 'xl';
  if (isLg) return 'lg';
  if (isMd) return 'md';
  if (isSm) return 'sm';
  return 'xs';
};

// eslint-disable-next-line react-refresh/only-export-components
export function useResponsiveValue<T>(props: ResponsiveProps<T>): T {
  const breakpoint = useBreakpoint();
  const value = props[breakpoint];
  if (value !== undefined) return value;
  const breakpoints: Breakpoint[] = ['xxl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = breakpoints.indexOf(breakpoint);
  for (let i = currentIndex; i < breakpoints.length; i++) {
    const bp = breakpoints[i];
    if (props[bp] !== undefined) {
      return props[bp]!;
    }
  }
  if (props.defaultValue !== undefined) {
    return props.defaultValue;
  }
  throw new Error('No value provided for responsive props');
}

export const Responsive: React.FC<{
  children: (breakpoint: Breakpoint) => React.ReactNode;
}> = ({ children }) => {
  const breakpoint = useBreakpoint();
  return <>{children(breakpoint)}</>;
};

export const ResponsiveValue: React.FC<{
  children: (value: string) => React.ReactNode;
  xs?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
  xxl?: string;
  defaultValue?: string;
}> = ({ children, ...props }) => {
  const value = useResponsiveValue(props);
  return <>{children(value)}</>;
};

export const Hidden: React.FC<{
  xs?: boolean;
  sm?: boolean;
  md?: boolean;
  lg?: boolean;
  xl?: boolean;
  xxl?: boolean;
  children: React.ReactNode;
}> = ({ children, ...props }) => {
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const bpValue = breakpoint === 'xxl' ? 1920 : breakpoint;
  const isVisible = useMediaQuery(theme.breakpoints.up(bpValue));
  const shouldHide = props[breakpoint];
  if (shouldHide) return null;
  if (!props.xs && !props.sm && !props.md && !props.lg && !props.xl && !props.xxl) {
    return <>{children}</>;
  }
  if (!isVisible) return null;
  return <>{children}</>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function visibleByBreakpoint(
  breakpoint: Breakpoint,
  props: Partial<Record<Breakpoint, boolean>>
): boolean {
  if (props[breakpoint] !== undefined) {
    return !props[breakpoint];
  }
  const breakpoints: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
  const currentIndex = breakpoints.indexOf(breakpoint);
  for (let i = currentIndex; i >= 0; i--) {
    const bp = breakpoints[i];
    if (props[bp] !== undefined) {
      return !props[bp];
    }
  }
  return true;
}

// eslint-disable-next-line react-refresh/only-export-components
export function getBreakpointWidth(breakpoint: Breakpoint): number {
  return breakpointValues[breakpoint];
}

// eslint-disable-next-line react-refresh/only-export-components
export function useIsMobile(): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('sm'));
}

// eslint-disable-next-line react-refresh/only-export-components
export function useIsTablet(): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.between('sm', 'md'));
}

// eslint-disable-next-line react-refresh/only-export-components
export function useIsDesktop(): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.up('lg'));
}

// eslint-disable-next-line react-refresh/only-export-components
export function useIsLargeScreen(): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.up('xl'));
}

// eslint-disable-next-line react-refresh/only-export-components
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 600;
}

// eslint-disable-next-line react-refresh/only-export-components
export function isTablet(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= 600 && window.innerWidth < 900;
}

// eslint-disable-next-line react-refresh/only-export-components
export function isDesktop(): boolean {
  if (typeof window === 'undefined') return true;
  return window.innerWidth >= 900;
}

// eslint-disable-next-line react-refresh/only-export-components
export function isLargeScreen(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= 1536;
}

export interface ResponsiveGridProps {
  children: React.ReactNode;
  container?: boolean;
  spacing?: ResponsiveProps<number>;
  columns?: ResponsiveProps<number>;
  className?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  container = true,
  spacing,
  columns,
  className,
}) => {
  const theme = useTheme();
  const spacingValue = useResponsiveValue(spacing ?? { defaultValue: 2 });
  const cols = useResponsiveValue(columns ?? { defaultValue: 12 });
  const getGridStyle = () => {
    const styles: React.CSSProperties = {
      display: 'grid',
      gap: theme.spacing(spacingValue),
      gridTemplateColumns: cols === 12
        ? 'repeat(12, 1fr)'
        : `repeat(${cols}, 1fr)`,
    };
    if (!container) {
      styles.width = '100%';
    }
    return styles;
  };
  return (
    <div style={getGridStyle()} className={className}>
      {children}
    </div>
  );
};

export interface ResponsiveGridItemProps {
  children: React.ReactNode;
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  xxl?: number;
  className?: string;
}

export const ResponsiveGridItem: React.FC<ResponsiveGridItemProps> = ({
  children,
  xs = 12,
  sm,
  md,
  lg,
  xl,
  xxl,
  className,
}) => {
  const breakpoint = useBreakpoint();
  const span = (() => {
    switch (breakpoint) {
      case 'xxl': return xxl ?? xl ?? lg ?? md ?? sm ?? xs;
      case 'xl': return xl ?? lg ?? md ?? sm ?? xs;
      case 'lg': return lg ?? md ?? sm ?? xs;
      case 'md': return md ?? sm ?? xs;
      case 'sm': return sm ?? xs;
      case 'xs': return xs;
      default: return xs;
    }
  })();
  return (
    <div
      style={{
        gridColumn: span === 12 ? '1 / -1' : `span ${span}`,
      }}
      className={className}
    >
      {children}
    </div>
  );
};

export interface ResponsiveStackProps {
  children: React.ReactNode;
  direction?: ResponsiveProps<'row' | 'column' | 'row-reverse' | 'column-reverse'>;
  spacing?: ResponsiveProps<number>;
  alignItems?: ResponsiveProps<'stretch' | 'flex-start' | 'flex-end' | 'center' | 'baseline'>;
  justifyContent?: ResponsiveProps<'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'>;
  wrap?: boolean;
  className?: string;
}

export const ResponsiveStack: React.FC<ResponsiveStackProps> = ({
  children,
  direction,
  spacing,
  alignItems,
  justifyContent,
  wrap = false,
  className,
}) => {
  const theme = useTheme();
  const directionValue = useResponsiveValue(direction ?? { defaultValue: 'row' as 'row' | 'column' | 'row-reverse' | 'column-reverse' });
  const spacingValue = useResponsiveValue(spacing ?? { defaultValue: 0 });
  const alignItemsValue = useResponsiveValue(alignItems ?? { defaultValue: 'stretch' as 'stretch' | 'flex-start' | 'flex-end' | 'center' | 'baseline' });
  const justifyContentValue = useResponsiveValue(justifyContent ?? { defaultValue: 'flex-start' as 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly' });
  const getStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      display: 'flex',
      flexWrap: wrap ? 'wrap' : 'nowrap',
    };
    if (direction) {
      baseStyle.flexDirection = directionValue;
    }
    if (spacing) {
      baseStyle.gap = theme.spacing(spacingValue);
    }
    if (alignItems) {
      baseStyle.alignItems = alignItemsValue;
    }
    if (justifyContent) {
      baseStyle.justifyContent = justifyContentValue;
    }
    return baseStyle;
  };
  return (
    <div style={getStyle()} className={className}>
      {children}
    </div>
  );
};

export interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: ResponsiveProps<string>;
  fluid?: boolean;
  className?: string;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth,
  fluid = false,
  className,
}) => {
  const maxWidthValue = useResponsiveValue(maxWidth ?? { defaultValue: '1200px' });
  return (
    <div
      style={{
        width: '100%',
        maxWidth: fluid ? '100%' : maxWidthValue,
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingLeft: '1rem',
        paddingRight: '1rem',
      }}
      className={className}
    >
      {children}
    </div>
  );
};

export interface ResponsiveTextProps {
  children: React.ReactNode;
  xs?: { fontSize?: string; fontWeight?: string };
  sm?: { fontSize?: string; fontWeight?: string };
  md?: { fontSize?: string; fontWeight?: string };
  lg?: { fontSize?: string; fontWeight?: string };
  xl?: { fontSize?: string; fontWeight?: string };
  xxl?: { fontSize?: string; fontWeight?: string };
  className?: string;
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  xs,
  sm,
  md,
  lg,
  xl,
  xxl,
  className,
}) => {
  const breakpoint = useBreakpoint();
  const style = (() => {
    switch (breakpoint) {
      case 'xxl': return xxl ?? xl ?? lg ?? md ?? sm ?? xs ?? {};
      case 'xl': return xl ?? lg ?? md ?? sm ?? xs ?? {};
      case 'lg': return lg ?? md ?? sm ?? xs ?? {};
      case 'md': return md ?? sm ?? xs ?? {};
      case 'sm': return sm ?? xs ?? {};
      case 'xs': return xs ?? {};
      default: return {};
    }
  })();
  return (
    <span style={style} className={className}>
      {children}
    </span>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useMediaQueryValue<T>(
  query: string,
  trueValue: T,
  falseValue: T
): T {
  const matches = useMediaQuery(query);
  return matches ? trueValue : falseValue;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useResponsiveColumns(
  options: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    xxl?: number;
  } = {}
): number {
  const { xs = 1, sm = 2, md = 3, lg = 4, xl = 5, xxl = 6 } = options;
  return useResponsiveValue({ xs, sm, md, lg, xl, xxl });
}

// eslint-disable-next-line react-refresh/only-export-components
export function useResponsivePadding(
  options: {
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
    xxl?: string;
  } = {}
): string {
  const {
    xs = '0.5rem',
    sm = '0.75rem',
    md = '1rem',
    lg = '1.25rem',
    xl = '1.5rem',
    xxl = '2rem',
  } = options;
  return useResponsiveValue({ xs, sm, md, lg, xl, xxl });
}

// eslint-disable-next-line react-refresh/only-export-components
export function useResponsiveGap(
  options: {
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
    xxl?: string;
  } = {}
): string {
  const {
    xs = '0.5rem',
    sm = '0.75rem',
    md = '1rem',
    lg = '1.25rem',
    xl = '1.5rem',
    xxl = '2rem',
  } = options;
  return useResponsiveValue({ xs, sm, md, lg, xl, xxl });
}

export interface ResponsiveImageProps {
  src: string;
  alt: string;
  className?: string;
  xsSrc?: string;
  smSrc?: string;
  mdSrc?: string;
  lgSrc?: string;
  xlSrc?: string;
  xxlSrc?: string;
  loading?: 'lazy' | 'eager';
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  className,
  xsSrc,
  smSrc,
  mdSrc,
  lgSrc,
  xlSrc,
  xxlSrc,
  loading = 'lazy',
}) => {
  const breakpoint = useBreakpoint();
  const getSrc = () => {
    switch (breakpoint) {
      case 'xxl': return xxlSrc ?? xlSrc ?? lgSrc ?? mdSrc ?? smSrc ?? xsSrc ?? src;
      case 'xl': return xlSrc ?? lgSrc ?? mdSrc ?? smSrc ?? xsSrc ?? src;
      case 'lg': return lgSrc ?? mdSrc ?? smSrc ?? xsSrc ?? src;
      case 'md': return mdSrc ?? smSrc ?? xsSrc ?? src;
      case 'sm': return smSrc ?? xsSrc ?? src;
      case 'xs': return xsSrc ?? src;
      default: return src;
    }
  };
  return (
    <img
      src={getSrc()}
      alt={alt}
      loading={loading}
      className={className}
    />
  );
};