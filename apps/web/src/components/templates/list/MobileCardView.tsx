import React from 'react';
import { Box, Checkbox, IconButton, Skeleton, Typography } from '@mui/material';
import { MoreHorizontal } from 'lucide-react';
import type { ColumnDef } from './types';
import { useTranslation } from 'react-i18next';
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
  // // 自定义渲染
  mobileCardRender?: (row: T, index: number) => React.ReactNode;
  mobileCardTitleKey?: string;
  mobileCardSubtitleKey?: string;
  mobileCardDisplayFields?: string[];
  mobileCardFieldLabels?: Record<string, string>;
  visibleColumns: ColumnDef<T>[];
}

/**
 * 移动端卡片视图
 * 从 ListPageTemplate 中抽离的移动端卡片渲染逻辑
 */
export function MobileCardView<T>({
  data,
  loading,
  emptyMessage = t('components.components.mobilecardview.key_21efd8'),
  getRowId,
  selectedIds,
  onRowClick,
  onSelectRow,
  onRowActionClick,
  hasRowActions,
  mobileCardRender,
  mobileCardTitleKey,
  mobileCardSubtitleKey,
  mobileCardDisplayFields,
  mobileCardFieldLabels,
  visibleColumns,
}: MobileCardViewProps<T>) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 1.5 }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton
            key={i}
            variant='rectangular'
            height={120}
            sx={{ borderRadius: 1 }}
          />
        ))}
      </Box>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  // // 构建字段标签映射（从 columns Configuration自动生成）
  const autoFieldLabels: Record<string, string> = {};
  visibleColumns.forEach((col) => {
    autoFieldLabels[col.id] = col.label || col.id;
  });
  const fieldLabels = { ...autoFieldLabels, ...(mobileCardFieldLabels || {}) };

  // // OK展示字段
  const displayFields =
    mobileCardDisplayFields ||
    visibleColumns
      .filter((c) => c.id !== mobileCardTitleKey && c.id !== mobileCardSubtitleKey)
      .slice(0, 4)
      .map((c) => c.id);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 1.5 }}>
      {data.map((row, index) => {
        const rowId = getRowId(row) ?? index;
        const isSelected = selectedIds.has(rowId);

        // // 优先使用自定义渲染函数
        if (mobileCardRender) {
          return (
            <Box
              key={rowId}
              onClick={() => onRowClick?.(row)}
              sx={{
                cursor: onRowClick ? 'pointer' : 'default',
                '&:active': onRowClick ? { opacity: 0.8 } : {},
              }}
            >
              {mobileCardRender(row, index)}
            </Box>
          );
        }

        // // 默认Card渲染
        const rowObj = row as unknown as Record<string, unknown>;
        const title = mobileCardTitleKey
          ? rowObj[mobileCardTitleKey]
          : rowObj.name || rowObj.title || rowObj.code || `项目 ${index + 1}`;
        const subtitle = mobileCardSubtitleKey ? rowObj[mobileCardSubtitleKey] : '';

        return (
          <Box
            key={rowId}
            onClick={() => onRowClick?.(row)}
            sx={{
              cursor: onRowClick ? 'pointer' : 'default',
              bgcolor: 'background.paper',
              border: 1,
              borderColor: isSelected ? 'primary.main' : 'divider',
              borderRadius: 1,
              p: 1.5,
              minHeight: 44,
              '&:active': onRowClick ? { bgcolor: 'action.hover' } : {},
              transition: 'background-color 150ms',
            }}
          >
            {/* 卡片头部：标题 + 选择框 + 行操作 */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 1,
                mb: displayFields.length > 0 ? 1 : 0,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant='subtitle2'
                  sx={{
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {String(title ?? '')}
                </Typography>
                {subtitle ? (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{
                      fontSize: 12,
                      mt: 0.25,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {String(subtitle)}
                  </Typography>
                ) : null}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {onSelectRow && (
                  <Checkbox
                    size='small'
                    checked={isSelected || false}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => onSelectRow(row)}
                    sx={{ p: 0.5 }}
                  />
                )}
                {hasRowActions && onRowActionClick && (
                  <IconButton
                    size='small'
                    onClick={(e) => onRowActionClick(e, row)}
                  >
                    <MoreHorizontal style={{ width: 18, height: 18 }} />
                  </IconButton>
                )}
              </Box>
            </Box>

            {/* 卡片内容：字段列表 */}
            {displayFields.length > 0 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
                {displayFields.map((field) => {
                  const value = rowObj[field];
                  const label = fieldLabels[field] || field;
                  const displayValue =
                    value == null || value === ''
                      ? '-'
                      : typeof value === 'boolean'
                        ? value
                          ? ` + ${t('components.mobileCardView.0a60ac')}`
                          : t('components.mobileCardView.c9744f')
                        : String(value);

                  return (
                    <Box
                      key={field}
                      sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}
                    >
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ fontSize: 11, fontWeight: 500 }}
                      >
                        {label}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{
                          fontSize: 13,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {displayValue}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
