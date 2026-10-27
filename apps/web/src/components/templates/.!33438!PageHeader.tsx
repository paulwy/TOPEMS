import { iconMd, iconLg } from '../sharedStyles';
import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Paper,
  Skeleton,
  TextField,
  Tabs,
  Tab,
  Chip,
  useTheme,
  useMediaQuery,
  Button,
} from '@mui/material';
import i18n from '@/i18n';
import { ChevronRight, RefreshCw, MoreHorizontal } from 'lucide-react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { BackButton } from '@topems/shared-components';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

export interface PathTabItem {
  label: string;
  href?: string;
  active?: boolean;
}

export interface PageAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  disabled?: boolean;
  loading?: boolean;
  tooltip?: string;
  size?: 'small' | 'medium' | 'large';
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  /** @deprecated Use pathTabs instead for path-based tab navigation */
  breadcrumbs?: BreadcrumbItem[];
  /** Path-based navigation context - replaces breadcrumbs. If provided, auto-derivation is skipped. */
  pathTabs?: PathTabItem[];
  /** When true and breadcrumbs are provided, auto-derive pathTabs from breadcrumbs + title. Default: true */
  autoBreadcrumbs?: boolean;
  actions?: PageAction[];
  backButton?: {
    href?: string;
    onClick?: () => void;
    visible?: boolean;
  };
  onRefresh?: () => void;
  loading?: boolean;
  children?: React.ReactNode;
  /** @deprecated Hidden by default. Pass only when explicitly needed. */
  pageIcon?: React.ReactNode;
  pageColor?: string;
  pageGradient?: string;
  banner?: {
    gradient: string;
    chip?: string;
    summary?: string;
    height?: number;
  };
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    size?: 'small' | 'medium';
  };
  /** @deprecated Hidden by default. Pass only when explicitly needed. */
  stats?: {
    label: string;
    value: string | number;
    color?: string;
    icon?: React.ReactElement;
  }[];
  tabs?: {
    label: string;
    value: string;
    active?: boolean;
    disabled?: boolean;
  }[];
  onTabChange?: (value: string) => void;
  badge?: {
    label: string;
    color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
    variant?: 'standard' | 'dot';
  };
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  compact?: boolean;
  showDivider?: boolean;
  customToolbar?: React.ReactNode;
  /** Entity name for detail pages (e.g. employee name). Used as the last path tab label. */
  detailItemName?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  description,
