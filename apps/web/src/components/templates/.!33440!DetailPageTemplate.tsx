import { designTokens } from '@topems/tokens';
import { iconMd } from '../sharedStyles';
import React, { useState } from 'react';
import type { BoxProps } from '@mui/material';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Skeleton,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import i18n from '@/i18n';
import { EmptyState } from '@topems/shared-components';
import { Edit, Delete, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBackNavigation } from '@/hooks';
import type { BreadcrumbItem, PageAction } from './PageHeader';
import { PageHeader } from './PageHeader';

// ============ 类型定义 ============

export interface TabConfig {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  badge?: number | string;
  disabled?: boolean;
}

export interface SectionConfig {
  id: string;
  title?: string;
  description?: string;
  content: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface DetailField {
  label: string;
  value: React.ReactNode;
  span?: number;
  copyable?: boolean;
}

export interface DetailPageTemplateProps extends BoxProps {
