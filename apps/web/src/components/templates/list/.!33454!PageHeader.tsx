import React from 'react';
import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import { Download, RefreshCw } from 'lucide-react';
import { BackButton } from '@topems/shared-components';
import type { BatchAction } from './types';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

export interface PageAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: 'contained' | 'outlined' | 'text';
}

interface PrimaryActionButton {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  gradient?: string;
}

export interface PageHeaderProps<T = unknown> {
  title?: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  backButton?: {
    href?: string;
    onClick?: () => void;
  };
  primaryActionButton?: PrimaryActionButton;
  actions?: PageAction[];
  onRefresh?: () => void;
  // Export
  exportable?: boolean;
  exporting?: boolean;
  exportComplete?: boolean;
  onOpenExportMenu?: (event: React.MouseEvent<HTMLElement>) => void;
  disabledExport?: boolean;
