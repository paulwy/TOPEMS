import React from 'react';
import {
  Box,
  Checkbox,
  IconButton,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import i18n from '@/i18n';
import { Columns3 } from 'lucide-react';
import { iconMd } from '../../sharedStyles';
import type { ColumnDef, RowAction } from './types';
import type { FixedColumnPositions } from './columnLayout';

export interface ColumnWidthController {
  getColumnWidth: (columnId: string) => number;
  resetColumnWidth: (columnId: string) => void;
  startResize: (columnId: string, startX: number) => void;
  resizingColumnId: string | null;
}

export interface ListTableHeadProps<T> {
  theme: Theme;
  data: T[];
  visibleColumns: ColumnDef<T>[];
  selectable?: boolean;
  isBatchSelectionEnabled?: boolean;
  showRowNumber?: boolean;
  expandable?: boolean | ((row: T, index: number) => React.ReactNode);
  effectiveSelectedIds: Array<string | number>;
  selectedIds: Set<string | number>;
  handleSelectAll: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleBatchSelectAll: (event: React.ChangeEvent<HTMLInputElement>) => void;
  sortable?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  handleSort: (columnId: string) => void;
  resolvedColumnResizable: boolean;
  columnWidthResult: ColumnWidthController;
  fixedColumnPositions: FixedColumnPositions;
  renderRowActions?: (row: T, index: number) => React.ReactNode;
  resolvedRowActions?: RowAction<T>[];
  columnConfigurable?: boolean;
  setColumnConfigAnchor: (anchor: HTMLElement | null) => void;
}

/**
 * 表格头部（选择列、行号、树形展开列、可排序/可拖拽列宽、操作列、列配置列）。
 * 从 ListPageTemplate 的 renderTableHead 原样抽出，sticky 偏移与 zIndex 保持一致。
 */
export function ListTableHead<T>({
  theme,
  data,
  visibleColumns,
  selectable,
  isBatchSelectionEnabled,
  showRowNumber,
  expandable,
  effectiveSelectedIds,
  selectedIds,
  handleSelectAll,
  handleBatchSelectAll,
  sortable,
  sortBy,
  sortOrder,
  handleSort,
  resolvedColumnResizable,
  columnWidthResult,
  fixedColumnPositions,
  renderRowActions,
  resolvedRowActions,
  columnConfigurable,
  setColumnConfigAnchor,
}: ListTableHeadProps<T>): React.ReactElement {
  return (
    <TableHead>
      <TableRow>
        {selectable && (
          <TableCell
            padding='checkbox'
            sx={{
              width: 48,
              position: 'sticky',
              left: 0,
              zIndex: (theme) => theme.zIndex.stickyHeader,
              bgcolor: theme.palette.mode === 'dark' ? 'glass.bgLight' : 'grey.50',
            }}
          >
            <Checkbox
              indeterminate={
                effectiveSelectedIds.length > 0 && effectiveSelectedIds.length < data.length
              }
              checked={data.length > 0 && effectiveSelectedIds.length === data.length}
              onChange={handleSelectAll}
            />
          </TableCell>
        )}
        {isBatchSelectionEnabled && !selectable && (
          <TableCell
            padding='checkbox'
            sx={{
              width: 48,
              position: 'sticky',
              left: 0,
              zIndex: (theme) => theme.zIndex.stickyHeader,
              bgcolor: theme.palette.mode === 'dark' ? 'glass.bgLight' : 'grey.50',
            }}
          >
            <Checkbox
              indeterminate={selectedIds.size > 0 && selectedIds.size < data.length}
              checked={data.length > 0 && selectedIds.size === data.length}
              onChange={handleBatchSelectAll}
            />
          </TableCell>
        )}
        {showRowNumber && (
          <TableCell
            sx={{
              width: 60,
              position: selectable ? 'sticky' : 'relative',
              left: selectable ? 48 : 0,
              zIndex: (theme) => theme.zIndex.stickyHeader,
              bgcolor: theme.palette.mode === 'dark' ? 'glass.bgLight' : 'grey.50',
            }}
          >
            #
          </TableCell>
        )}
        {expandable && (
          <TableCell
            padding='checkbox'
            sx={{ width: 48 }}
          />
        )}
        {visibleColumns.map((column) => {
          const colWidth = resolvedColumnResizable
            ? columnWidthResult.getColumnWidth(column.id)
            : column.width;
          const isResizing = columnWidthResult.resizingColumnId === column.id;
          const canResize = resolvedColumnResizable && column.resizable !== false;
          const isFixed = column.fixed !== undefined;
          const leftPos = fixedColumnPositions.leftPositions[column.id];
          const rightPos = fixedColumnPositions.rightPositions[column.id];
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
                position: isFixed ? 'sticky' : 'relative',
                left: column.fixed === 'left' ? leftPos : undefined,
                right: column.fixed === 'right' ? rightPos : undefined,
                zIndex: isFixed ? 2 : 1,
                bgcolor: theme.palette.mode === 'dark' ? 'glass.bgLight' : 'grey.50',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent:
                    column.align === 'center'
                      ? 'center'
                      : column.align === 'right'
                        ? 'flex-end'
                        : 'flex-start',
                }}
              >
                {column.renderHeader ? (
                  column.renderHeader(column)
                ) : sortable && column.sortable !== false ? (
                  <TableSortLabel
                    active={sortBy === column.id}
                    direction={sortBy === column.id ? sortOrder : 'asc'}
                    onClick={() => handleSort(column.id)}
                  >
                    {column.label || column.id}
                  </TableSortLabel>
                ) : (
                  column.label || column.id
                )}
              </Box>
              {canResize && (
                <Box
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    columnWidthResult.startResize(column.id, e.clientX);
                  }}
                  onDoubleClick={() => columnWidthResult.resetColumnWidth(column.id)}
                  sx={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    cursor: 'col-resize',
                    bgcolor: isResizing ? 'primary.main' : 'transparent',
                    transition: 'background-color 0.2s',
                    '&:hover': {
                      bgcolor: 'primary.main',
                    },
                    zIndex: (theme) => theme.zIndex.dragHandle,
                  }}
                  title={i18n.t('templates.list_page_template.k18')}
                />
              )}
            </TableCell>
          );
        })}
        {(renderRowActions || (resolvedRowActions && resolvedRowActions.length > 0)) && (
          <TableCell
            align='right'
            sx={{ width: 80 }}
          >
            {i18n.t('components.list_page_template.k1')}
          </TableCell>
        )}
        {columnConfigurable && (
          <TableCell
            align='right'
            sx={{ width: 48 }}
          >
            <Tooltip title={i18n.t('templates.list_page_template.k19')}>
              <IconButton
                size='small'
                onClick={(e) => setColumnConfigAnchor(e.currentTarget)}
                aria-label={i18n.t('templates.list_page_template.k20')}
              >
                <Columns3 style={iconMd} />
              </IconButton>
            </Tooltip>
          </TableCell>
        )}
      </TableRow>
    </TableHead>
  );
}
