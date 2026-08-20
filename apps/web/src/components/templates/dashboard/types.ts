import type { BoxProps } from '@mui/material';
import type React from 'react';
import type { BreadcrumbItem } from '../PageHeader';

export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'radar' | 'gauge';

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  [key: string]: unknown;
}

interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
  type?: ChartType;
}

export interface ChartConfig {
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  animated?: boolean;
  colorTheme?: string[];
  xAxis?: { label?: string; show?: boolean; type?: 'category' | 'value' | 'time' };
  yAxis?: { label?: string; show?: boolean; min?: number; max?: number };
  customOptions?: Record<string, unknown>;
}

export interface StatCard {
  id: string;
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  onClick?: () => void;
  trend?: number[];
  progress?: number;
  progressLabel?: string;
  subtitle?: string;
  tags?: Array<{ label: string; color?: string }>;
  variant?: 'elevation' | 'outlined';
  size?: 'small' | 'medium' | 'large';
  customGradient?: string;
}

export interface ChartCard {
  id: string;
  title: string;
  subtitle?: string;
  chart: React.ReactNode;
  height?: number;
  actions?: React.ReactNode;
  type?: ChartType;
  data?: ChartDataPoint[] | ChartSeries[];
  config?: ChartConfig;
  onRefresh?: () => void;
  onDownload?: () => void;
  onFullscreen?: () => void;
  loading?: boolean;
  error?: string;
  variant?: 'elevation' | 'outlined';
  expandable?: boolean;
  defaultExpanded?: boolean;
}

export interface RecentItem {
  id: string;
  title: string;
  description?: string;
  time?: string;
  avatar?: React.ReactNode;
  onClick?: () => void;
  status?: 'success' | 'warning' | 'error' | 'info' | 'default';
  tags?: Array<{ label: string; color?: string }>;
  icon?: React.ReactNode;
}

export interface QuickAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  color?: string;
  description?: string;
  disabled?: boolean;
  badge?: number | string;
  variant?: 'card' | 'button' | 'icon';
}

export interface CardGroup {
  id: string;
  title: string;
  cards: StatCard[];
  layout?: 'grid' | 'carousel' | 'tabs';
  collapsible?: boolean;
  defaultExpanded?: boolean;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

interface LayoutBreakpoints {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

export interface LayoutConfig {
  statsLayout?: 'grid' | 'carousel' | 'tabs';
  statsBreakpoints?: LayoutBreakpoints;
  chartsLayout?: 'grid' | 'stack' | 'tabs';
  chartsBreakpoints?: LayoutBreakpoints;
  enableDragAndDrop?: boolean;
  responsive?: boolean;
  spacing?: number;
  padding?: number;
}

export interface DashboardTemplateProps extends BoxProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  stats?: StatCard[];
  cardGroups?: CardGroup[];
  charts?: ChartCard[];
  recentItems?: RecentItem[];
  recentTitle?: string;
  quickActions?: QuickAction[];
  quickActionsTitle?: string;
  loading?: boolean;
  headerContent?: React.ReactNode;
  children?: React.ReactNode;
  statsArea?: React.ReactNode;
  chartsArea?: React.ReactNode;
  recentItemsArea?: React.ReactNode;
  quickActionsArea?: React.ReactNode;
  layout?: LayoutConfig;
  onRefresh?: () => void;
  customRenderers?: {
    statCard?: (stat: StatCard) => React.ReactNode;
    chartCard?: (chart: ChartCard) => React.ReactNode;
    recentItem?: (item: RecentItem) => React.ReactNode;
    quickAction?: (action: QuickAction) => React.ReactNode;
  };
  persistConfig?: boolean;
  configKey?: string;
}
