import { designTokens } from '@topems/tokens';
import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Eye, Clock, User as UserIcon } from 'lucide-react';
import { Box, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { operationAuditApi, type OperationLog } from '@/api/admin/operationAudit';
import { extractErrorMessage } from '@/utils/errors';
import type { ColumnDef, RowAction } from '@/components/templates/ListPageTemplate';
import i18n from '@/i18n';

const formatDateTimeForApi = (dateTimeString: string): string => {
  if (!dateTimeString) return '';
  try {
    const date = new Date(dateTimeString);
    return date.toISOString();
  } catch {
    return dateTimeString;
  }
};
