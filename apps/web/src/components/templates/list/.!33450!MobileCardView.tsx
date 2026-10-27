import React from 'react';
import { iconMd } from '../../sharedStyles';
import { Box, Checkbox, IconButton, Skeleton, Typography } from '@mui/material';
import { MoreHorizontal } from 'lucide-react';
import type { ColumnDef } from './types';
import i18n from '@/i18n';

// Module-level t for use outside React components (shadowed by useTranslation inside components)
const t = i18n.t;

export interface MobileCardViewProps<T> {
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  getRowId: (row: T) => string | number;
  selectedIds: Set<string | number>;
  onRowClick?: (row: T) => void;
  onSelectRow?: (row: T) => void;
  onRowActionClick?: (event: React.MouseEvent<HTMLElement>, row: T) => void;
  hasRowActions?: boolean;
