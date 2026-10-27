import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { alpha } from '@mui/material/styles';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  TextField,
  InputAdornment,
  useTheme,
} from '@mui/material';
import i18n from '@/i18n';
import { EmptyState } from '@topems/shared-components';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Search as SearchIcon,
  FileText,
  DollarSign,
  BarChart3,
  Target,
  CreditCard,
  Calculator,
  Building,
  Users,
  Package,
  Warehouse,
  ClipboardList,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageContainer } from '@/components/common';
import type { PageAction } from './PageHeader';
import type {
  DashboardSchema,
  StatCardSchema,
  ChartSchema,
  DashboardColor,
  IconName,
} from '@/schema';
import { getColumns } from '@/schema';

import { CACHE_DURATIONS } from '@/lib/reactQuery';

// ============ 图标解析 ============

const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  TrendingUp: TrendingUpIcon,
  TrendingDown: TrendingDownIcon,
  DollarSign,
  BarChart3,
  Target,
  CreditCard,
  Calculator,
  Building,
  Users,
  Package,
  Warehouse,
  ClipboardList,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
};

function resolveIcon(icon: IconName | React.ReactNode | undefined): React.ReactNode | undefined {
  if (!icon) return undefined;
  if (typeof icon === 'string') {
    const IconComponent = ICON_MAP[icon];
    if (IconComponent) return <IconComponent size={24} />;
    return undefined;
  }
  return icon;
}

// ============ 类型定义（新 API）============

export type { DashboardColor };

export interface StatCardConfig {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: DashboardColor;
  trend?: { value: number; label?: string };
  loading?: boolean;
}

export interface ChartConfig {
  title: string;
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter';
  data: Array<Record<string, unknown>>;
  xField: string;
  yField?: string | string[];
  seriesField?: string;
  height?: number;
  loading?: boolean;
  emptyText?: string;
}

export interface DataTableColumn {
  id: string;
  label: string;
  render?: (value: unknown, row: Record<string, unknown>, index: number) => React.ReactNode;
}

export interface DataTableConfig {
  title: string;
  columns: DataTableColumn[];
  data: Array<Record<string, unknown>>;
  loading?: boolean;
  searchable?: boolean;
}

// ============ 子组件 ============

const TrendIndicator: React.FC<{ value: number; label?: string }> = ({ value, label }) => {
  const theme = useTheme();
  const isUp = value > 0;
  const isDown = value < 0;
  const color = isUp
    ? theme.palette.success.main
    : isDown
      ? theme.palette.error.main
      : theme.palette.text.secondary;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {isUp ? (
        <TrendingUpIcon
          size={14}
          style={{ color }}
        />
      ) : isDown ? (
        <TrendingDownIcon
          size={14}
          style={{ color }}
        />
      ) : null}
      <Typography
        variant='caption'
        sx={{ color, fontWeight: 500 }}
      >
        {isUp ? '+' : ''}
        {value}
        {label ? ` ${label}` : ''}
      </Typography>
    </Box>
  );
};

export const StatCard: React.FC<StatCardConfig> = ({
  title,
  value,
  icon,
  color = 'primary',
  trend,
  loading,
}) => {
  const theme = useTheme();
  const paletteMap: Record<DashboardColor, string> = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    success: theme.palette.success.main,
    error: theme.palette.error.main,
    warning: theme.palette.warning.main,
    info: theme.palette.info.main,
  };
