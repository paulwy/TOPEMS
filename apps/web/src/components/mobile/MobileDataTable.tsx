import React from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Skeleton,
  Stack,
  Divider,
  type SxProps,
  type Theme,
} from '@mui/material';
import i18n from '@/i18n';
import { ChevronRight, MoreVertical } from 'lucide-react';

export interface MobileColumn<T = Record<string, unknown>> {
  key: string;
  title: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  width?: string;
}

export interface MobileDataTableProps<T = Record<string, unknown>> {
  data: T[];
  columns: MobileColumn<T>[];
  titleKey?: string;
  subtitleKey?: string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  badgeKey?: string;
  actionsKey?: string;
  onActionClick?: (row: T) => void;
  getRowKey?: (row: T, index: number) => string;
  renderHeader?: React.ReactNode;
  sx?: SxProps<Theme>;
}

export function MobileDataTable<T extends Record<string, unknown>>({
  data,
  columns,
  titleKey,
  subtitleKey,
  onRowClick,
  loading = false,
  emptyMessage = i18n.t('shared.mobile_data_table.k0'),
  badgeKey,
  actionsKey,
  onActionClick,
  getRowKey = (_row, index) => String(index),
  renderHeader,
  sx,
}: MobileDataTableProps<T>) {
  if (loading) {
    return (
      <Box sx={sx}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Box
            key={i}
            sx={{
              p: 2,
              mb: 1,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Skeleton
              variant='text'
              width='60%'
              sx={{ mb: 1 }}
            />
            <Skeleton
              variant='text'
              width='40%'
            />
          </Box>
        ))}
      </Box>
    );
  }

  if (data.length === 0) {
    return (
      <Box sx={{ ...sx, p: 4, textAlign: 'center' }}>
        <Typography color='text.secondary'>{emptyMessage}</Typography>
      </Box>
    );
  }

  // Pre-compute the filtered extra columns shown as detail text in each row
  const extraColumns = columns.filter(
    (col) =>
      col.key !== titleKey &&
      col.key !== subtitleKey &&
      col.key !== badgeKey &&
      col.key !== actionsKey
  );
  const displayColumns = extraColumns.slice(0, 3);

  return (
    <Box sx={sx}>
      {renderHeader}
      <Stack divider={<Divider />}>
        {data.map((row, index) => {
          const keyValue = getRowKey(row, index);
          const title = titleKey ? String(row[titleKey] ?? '') : '';
          const subtitle = subtitleKey ? String(row[subtitleKey] ?? '') : '';

          return (
            <Box
              key={keyValue}
              onClick={() => onRowClick?.(row)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 2,
                cursor: onRowClick ? 'pointer' : 'default',
                '&:active': onRowClick ? { backgroundColor: 'action.hover' } : undefined,
                transition: 'background-color 0.15s',
              }}
            >
              {/* Content */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {/* Title row */}
                {title && (
                  <Typography
                    component='p'
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                    noWrap
                  >
                    {title}
                  </Typography>
                )}
                {/* Subtitle */}
                {subtitle && (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    noWrap
                    sx={{ mt: 0.25 }}
                  >
                    {subtitle}
                  </Typography>
                )}
                {/* Additional columns as inline detail text */}
                <Box
                  sx={{
                    display: 'flex',
                    gap: 0.5,
                    flexWrap: 'wrap',
                    mt: 0.5,
                  }}
                >
                  {displayColumns.map((col, colIndex) => (
                    <Typography
                      key={col.key}
                      variant='caption'
                      color='text.secondary'
                    >
                      {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '-')}
                      {colIndex < displayColumns.length - 1 && ' · '}
                    </Typography>
                  ))}
                </Box>
              </Box>

              {/* Badge */}
              {badgeKey && row[badgeKey] != null && (
                <Chip
                  label={String(row[badgeKey])}
                  size='small'
                  sx={{ ml: 1, flexShrink: 0 }}
                />
              )}

              {/* Actions */}
              {(actionsKey || onActionClick) && (
                <IconButton
                  size='small'
                  onClick={(e) => {
                    e.stopPropagation();
                    onActionClick?.(row);
                  }}
                  sx={{ ml: 0.5, flexShrink: 0 }}
                  aria-label={i18n.t('shared.mobile_data_table.k1')}
                >
                  <MoreVertical size={18} />
                </IconButton>
              )}

              {/* Chevron */}
              {onRowClick && (
                <ChevronRight
                  size={18}
                  sx={{
                    color: 'text.disabled',
                    ml: 0.5,
                    flexShrink: 0,
                  }}
                />
              )}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

export default MobileDataTable;
