import React from 'react';
import { TableCell, TableRow } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import i18n from '@/i18n';
import type { ColumnDef, RowAction } from './types';
import type { FixedColumnPositions } from './columnLayout';
import type { ColumnWidthController } from './ListTableHead';

export interface ListSummaryRowProps<T> {
  theme: Theme;
  showSummary?: boolean;
  treeView?: boolean;
  treeTableData: T[];
  data: T[];
  visibleColumns: ColumnDef<T>[];
  fixedColumnPositions: FixedColumnPositions;
  resolvedColumnResizable: boolean;
  columnWidthResult: ColumnWidthController;
  selectable?: boolean;
  isBatchSelectionEnabled?: boolean;
  showRowNumber?: boolean;
  renderRowActions?: (row: T, index: number) => React.ReactNode;
  resolvedRowActions?: RowAction<T>[];
  columnConfigurable?: boolean;
}

/**
 * 表格汇总行（合计/平均/最大/最小/计数 + 自定义汇总）。
 * 从 ListPageTemplate 的 renderSummaryRow 原样抽出，保持汇总算法与空值兜底一致。
 */
export function ListSummaryRow<T>({
  theme,
  showSummary,
  treeView,
  treeTableData,
  data,
  visibleColumns,
  fixedColumnPositions,
  resolvedColumnResizable,
  columnWidthResult,
  selectable,
  isBatchSelectionEnabled,
  showRowNumber,
  renderRowActions,
  resolvedRowActions,
  columnConfigurable,
}: ListSummaryRowProps<T>): React.ReactElement | null {
  if (!showSummary) return null;
  const summaryData = treeView ? treeTableData : data;
  return (
    <TableRow
      sx={{
        bgcolor: theme.palette.mode === 'dark' ? 'glass.bgLight' : 'grey.50',
        fontWeight: 600,
      }}
    >
      {selectable && (
        <TableCell
          padding='checkbox'
          sx={{
            position: 'sticky',
            left: 0,
            zIndex: (theme) => theme.zIndex.raised,
            bgcolor: 'inherit',
          }}
        />
      )}
      {isBatchSelectionEnabled && !selectable && (
        <TableCell
          padding='checkbox'
          sx={{
            position: 'sticky',
            left: 0,
            zIndex: (theme) => theme.zIndex.raised,
            bgcolor: 'inherit',
          }}
        />
      )}
      {showRowNumber && (
        <TableCell
          sx={{
            position: selectable ? 'sticky' : 'relative',
            left: selectable ? 48 : 0,
            zIndex: (theme) => theme.zIndex.raised,
            bgcolor: 'inherit',
          }}
        >
          {i18n.t('components.list_page_template.k2')}
        </TableCell>
      )}
      {treeView && (
        <TableCell
          padding='checkbox'
          sx={{ width: 48 }}
        />
      )}
      {visibleColumns.map((column) => {
        const isFixed = column.fixed !== undefined;
        const leftPos = fixedColumnPositions.leftPositions[column.id];
        const rightPos = fixedColumnPositions.rightPositions[column.id];
        const colWidth = resolvedColumnResizable
          ? columnWidthResult.getColumnWidth(column.id)
          : column.width;
        let summaryContent: React.ReactNode = '-';
        if (column.summaryType === 'custom' && column.summaryRender) {
          summaryContent = column.summaryRender(summaryData);
        } else if (column.summaryType === 'count') {
          summaryContent = summaryData.length;
        } else if (
          column.summaryType === 'sum' ||
          column.summaryType === 'avg' ||
          column.summaryType === 'max' ||
          column.summaryType === 'min'
        ) {
          const values = summaryData
            .map((row) => Number((row as unknown as Record<string, unknown>)[column.id]))
            .filter((v) => !isNaN(v));
          if (values.length === 0) {
            summaryContent = '-';
          } else if (column.summaryType === 'sum') {
            summaryContent = values.reduce((a, b) => a + b, 0).toLocaleString();
          } else if (column.summaryType === 'avg') {
            summaryContent = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
          } else if (column.summaryType === 'max') {
            summaryContent = Math.max(...values).toLocaleString();
          } else if (column.summaryType === 'min') {
            summaryContent = Math.min(...values).toLocaleString();
          }
        }
        return (
          <TableCell
            key={column.id}
            align={column.align || 'left'}
            width={colWidth}
            sx={{
              minWidth: column.minWidth,
              maxWidth: column.maxWidth,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              position: isFixed ? 'sticky' : 'static',
              left: column.fixed === 'left' ? leftPos : undefined,
              right: column.fixed === 'right' ? rightPos : undefined,
              zIndex: isFixed ? 1 : 0,
              bgcolor: 'inherit',
            }}
          >
            {summaryContent}
          </TableCell>
        );
      })}
      {(renderRowActions || (resolvedRowActions && resolvedRowActions.length > 0)) && (
        <TableCell
          align='right'
          sx={{ width: 80 }}
        />
      )}
      {columnConfigurable && <TableCell sx={{ width: 48 }} />}
    </TableRow>
  );
}
