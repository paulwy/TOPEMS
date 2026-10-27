import { designTokens } from '@topems/tokens';
import { iconSm, iconMd } from '../sharedStyles';
import React, { useState, useCallback, useMemo } from 'react';
import type { BoxProps } from '@mui/material';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Avatar,
  Badge,
  Skeleton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import i18n from '@/i18n';
import {
  Plus,
  MoreHorizontal,
  GripVertical,
  Edit,
  Archive,
  Filter,
  Search,
  RefreshCw,
  Columns3,
} from 'lucide-react';
import { ErrorEmptyState } from '@topems/shared-components';
import type { BreadcrumbItem } from './PageHeader';
import { PageHeader } from './PageHeader';

// ============ 类型定义 ============

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: string;
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  dueDate?: string;
  tags?: Array<{ label: string; color?: string }>;
  comments?: number;
  attachments?: number;
  subtasks?: {
    total: number;
    completed: number;
  };
  onClick?: () => void;
  actions?: React.ReactNode;
}

export interface KanbanColumn {
  id: string;
  title: string;
  status: string;
  cards: KanbanCard[];
  color?: string;
  limit?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  onAddCard?: () => void;
}

export interface KanbanAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success';
}

export interface KanbanStats {
  totalCards: number;
  totalColumns: number;
  overdueCards: number;
  completedCards: number;
}

export interface KanbanPageTemplateProps extends BoxProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];

  columns: KanbanColumn[];
  loading?: boolean;
  error?: string;

  onCardMove?: (
    cardId: string,
    sourceColumn: string,
    targetColumn: string,
    targetIndex: number
  ) => void;
  onCardDelete?: (cardId: string) => void;
  onCardEdit?: (cardId: string) => void;
  onCardArchive?: (cardId: string) => void;

  showStats?: boolean;
  showSearch?: boolean;
  showFilter?: boolean;
  showAddColumn?: boolean;

  searchValue?: string;
  onSearch?: (value: string) => void;

  filterConfig?: {
    priorities?: string[];
    assignees?: Array<{ id: string; name: string }>;
    tags?: string[];
  };
  filters?: Record<string, unknown>;
  onFilterChange?: (filters: Record<string, unknown>) => void;

  stats?: KanbanStats;

  actions?: KanbanAction[];
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;

  defaultColumnWidth?: number;
}

// ============ 看板页模板组件 ============

export const KanbanPageTemplate: React.FC<KanbanPageTemplateProps> = ({
  title,
  subtitle,
  breadcrumbs,
  columns,
  loading,
  error,
  onCardMove,
  showStats = true,
  showSearch = true,
  showFilter = true,
  showAddColumn = true,
  searchValue,
  onSearch,
  stats,
  actions = [],
  headerContent,
  footerContent,
  defaultColumnWidth = 300,
