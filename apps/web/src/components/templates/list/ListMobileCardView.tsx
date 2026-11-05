import React from 'react';
import { Box, Checkbox, IconButton, Skeleton, Typography } from '@mui/material';
import { MoreHorizontal } from 'lucide-react';
import i18n from '@/i18n';
import { iconMd } from '../../sharedStyles';
import type { ColumnDef, RowAction } from './types';

export interface ListMobileCardViewProps<T> {
  loading?: boolean;
  data: T[];
  emptyMessage: string;
  visibleColumns: ColumnDef<T>[];
  mobileCardRender?: (row: T, index: number) => React.ReactNode;
  mobileCardTitleKey?: string;
  mobileCardSubtitleKey?: string;
  mobileCardFieldLabels?: Record<string, string>;
  mobileCardDisplayFields?: string[];
  selectedIds: Set<string | number>;
  getRowId?: (row: T) => string | number;
  resolvedOnRowClick?: (row: T) => void;
  selectable?: boolean;
  handleSelectRow: (row: T) => void;
  renderRowActions?: (row: T, index: number) => React.ReactNode;
  resolvedRowActions?: RowAction<T>[];
  handleRowActionClick: (event: React.MouseEvent<HTMLElement>, row: T) => void;
}

/**
 * 移动端卡片视图：加载骨架、空态、自定义卡片渲染与默认卡片（标题/副标题/字段宫格）。
 * 从 ListPageTemplate 的 renderMobileCardView 原样抽出，字段标签与截断策略保持一致。
 */
export function ListMobileCardView<T>({
  loading,
  data,
  emptyMessage,
  visibleColumns,
  mobileCardRender,
  mobileCardTitleKey,
  mobileCardSubtitleKey,
  mobileCardFieldLabels,
  mobileCardDisplayFields,
  selectedIds,
  getRowId,
  resolvedOnRowClick,
  selectable,
  handleSelectRow,
  renderRowActions,
  resolvedRowActions,
  handleRowActionClick,
}: ListMobileCardViewProps<T>): React.ReactNode {
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
  // 构建字段标签映射（从 columns 配置自动生成）
  const autoFieldLabels: Record<string, string> = {};
  visibleColumns.forEach((col) => {
    autoFieldLabels[col.id] = col.label || col.id;
  });
  const fieldLabels = { ...autoFieldLabels, ...(mobileCardFieldLabels || {}) };
  // 确定展示字段
  const displayFields =
    mobileCardDisplayFields ||
    visibleColumns
      .filter((c) => c.id !== mobileCardTitleKey && c.id !== mobileCardSubtitleKey)
      .slice(0, 4)
      .map((c) => c.id);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 1.5 }}>
      {data.map((row, index) => {
        const rowId = getRowId
          ? getRowId(row)
          : (((row as unknown as Record<string, unknown>).id as string | number) ?? index);
        const isSelected = selectedIds.has(rowId);
        // 优先使用自定义渲染函数
        if (mobileCardRender) {
          return (
            <Box
              key={rowId}
              onClick={() => resolvedOnRowClick?.(row)}
              sx={{
                cursor: resolvedOnRowClick ? 'pointer' : 'default',
                '&:active': resolvedOnRowClick ? { opacity: 0.8 } : {},
              }}
            >
              {mobileCardRender(row, index)}
            </Box>
          );
        }
        // 默认卡片渲染
        const rowObj = row as unknown as Record<string, unknown>;
        const title = mobileCardTitleKey
          ? rowObj[mobileCardTitleKey]
          : rowObj.name ||
            rowObj.title ||
            rowObj.code ||
            `${i18n.t('components.list_page_template.k17')}${index + 1}`;
        const subtitle = mobileCardSubtitleKey ? rowObj[mobileCardSubtitleKey] : '';
        return (
          <Box
            key={rowId}
            onClick={() => resolvedOnRowClick?.(row)}
            sx={{
              cursor: resolvedOnRowClick ? 'pointer' : 'default',
              bgcolor: 'background.paper',
              border: 1,
              borderColor: isSelected ? 'primary.main' : 'divider',
              borderRadius: 1,
              p: 1.5,
              minHeight: 44,
              '&:active': resolvedOnRowClick ? { bgcolor: 'action.hover' } : {},
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
                {selectable && (
                  <Checkbox
                    size='small'
                    checked={isSelected || false}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => handleSelectRow(row)}
                    sx={{ p: 0.5 }}
                  />
                )}
                {(renderRowActions || (resolvedRowActions && resolvedRowActions.length > 0)) && (
                  <IconButton
                    size='small'
                    onClick={(e) => handleRowActionClick(e, row)}
                    aria-label={i18n.t('templates.list_page_template.k27')}
                  >
                    <MoreHorizontal style={iconMd} />
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
                          ? i18n.t('templates.list_page_template.k28')
                          : i18n.t('templates.list_page_template.k29')
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
