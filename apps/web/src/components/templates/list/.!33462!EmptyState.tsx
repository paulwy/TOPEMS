import React from 'react';
import { TableCell, TableRow, Skeleton } from '@mui/material';
import { EmptyState, ErrorEmptyState } from '@topems/shared-components';
import i18n from '@/i18n';

// Module-level t for use outside React components (shadowed by useTranslation inside components)
const t = i18n.t;

interface ListEmptyStateProps {
  colSpan: number;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  emptyActionButton?: {
    label: string;
    icon?: React.ReactNode;
    onClick?: () => void;
  };
  onRefresh?: () => void;
