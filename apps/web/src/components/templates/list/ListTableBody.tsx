import React from 'react';
import {
  Box,
  Checkbox,
  Collapse,
  IconButton,
  Skeleton,
  TableCell,
  TableRow,
  Tooltip,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import i18n from '@/i18n';
import { EmptyState, ErrorEmptyState } from '@topems/shared-components';
import { iconMd, iconSm } from '../../sharedStyles';
import { InlineEditCell } from './InlineEditCell';
import type { ColumnDef, RowAction } from './types';
import type { FixedColumnPositions } from './columnLayout';
import type { ColumnWidthController } from './ListTableHead';

export interface InlineEditController<T> {
  editingData: Partial<T> | null;
  resolvedEditingRowId: string | number | null;
  startEditing: (row: T) => void;
  cancelEditing: (row: T) => void;
  saveEditing: (row: T) => void;
  updateEditingField: (field: keyof T, value: unknown) => void;
}

export interface ListTableBodyProps<T> {
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  data: T[];
  treeTableData: T[];
  emptyMessage: string;
  emptyIcon?: React.ReactNode;
  emptyActionButton?: { label: string; icon?: React.ReactNode; onClick?: () => void };
  visibleColumns: ColumnDef<T>[];
  selectable?: boolean;
  isBatchSelectionEnabled?: boolean;
  showRowNumber?: boolean;
  expandable?: boolean | ((row: T, index: number) => React.ReactNode);
  resolvedTreeView?: boolean;
  treeColumnId?: string | number;
  getRowId?: (row: T) => string | number;
  effectiveSelectedIds: Array<string | number>;
  selectedIds: Set<string | number>;
  expandedIds: Array<string | number>;
  getRowLevel: (rowId: string | number) => number;
  hasChildren: (row: T) => boolean;
  toggleExpand: (rowId: string | number) => void;
  handleSelectRow: (row: T) => void;
  handleBatchSelect: (row: T) => void;
  handleExpandRow: (row: T) => void;
  resolvedRowActions?: RowAction<T>[];
  renderRowActions?: (row: T, index: number) => React.ReactNode;
  columnConfigurable?: boolean;
  resolvedOnRowClick?: (row: T) => void;
  resolvedOnRowDoubleClick?: (row: T) => void;
  striped?: boolean;
  theme: Theme;
  resolvedColumnResizable: boolean;
  columnWidthResult: ColumnWidthController;
  fixedColumnPositions: FixedColumnPositions;
  resolvedInlineEditable?: boolean;
  resolvedInlineEditMode?: 'cell' | 'row';
  inlineEdit: InlineEditController<T>;
  resolvedPagination?: { page: number; pageSize: number } | null;
  effectiveListState?: { baseIndex?: number } | null;
  renderExpandedRow: (row: T, index: number) => React.ReactNode;
  treeIndentSize: number;
  isMobile: boolean;
  handleRowActionClick: (event: React.MouseEvent<HTMLElement>, row: T) => void;
}

/**
 * A-15：同一列的 renderCell 失败只告警一次。
 * 列表每次重渲染 / 翻页都会重跑列渲染，若失败原因常驻（数据脏、字段缺失），
 * 不收敛就会把控制台刷满，掩盖真正的首次错误。
 */
const warnedRenderColumns = new Set<string>();

/**
 * 表格主体：加载骨架、错误/空状态、数据行（树形缩进、固定列、行内编辑、行操作）与展开行。
 * 从 ListPageTemplate 的 renderTableBody 原样抽出，保持空态/骨架/行渲染分支顺序一致。
 */
export function ListTableBody<T>({
  loading,
  error,
  onRefresh,
  data,
  treeTableData,
  emptyMessage,
  emptyIcon,
  emptyActionButton,
  visibleColumns,
  selectable,
  isBatchSelectionEnabled,
  showRowNumber,
  expandable,
  resolvedTreeView,
  treeColumnId,
  getRowId,
  effectiveSelectedIds,
  selectedIds,
  expandedIds,
  getRowLevel,
  hasChildren,
  toggleExpand,
  handleSelectRow,
  handleBatchSelect,
  handleExpandRow,
  resolvedRowActions,
  renderRowActions,
  columnConfigurable,
  resolvedOnRowClick,
  resolvedOnRowDoubleClick,
  striped,
  theme,
  resolvedColumnResizable,
  columnWidthResult,
  fixedColumnPositions,
  resolvedInlineEditable,
  resolvedInlineEditMode,
  inlineEdit,
  resolvedPagination,
  effectiveListState,
  renderExpandedRow,
  treeIndentSize,
  isMobile,
  handleRowActionClick,
}: ListTableBodyProps<T>): React.ReactNode {
  if (loading) {
    return Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={index}>
        {selectable && (
          <TableCell padding='checkbox'>
            <Skeleton
              variant='rectangular'
              width={20}
              height={20}
            />
          </TableCell>
        )}
        {showRowNumber && (
          <TableCell>
            <Skeleton
              variant='text'
              width={30}
            />
          </TableCell>
        )}
        {expandable && (
          <TableCell padding='checkbox'>
            <Skeleton
              variant='rectangular'
              width={20}
              height={20}
            />
          </TableCell>
        )}
        {visibleColumns.map((column) => (
          <TableCell key={column.id}>
            <Skeleton
              variant='text'
              width='80%'
            />
          </TableCell>
        ))}
        {(renderRowActions || (resolvedRowActions && resolvedRowActions.length > 0)) && (
          <TableCell>
            <Skeleton
              variant='text'
              width={60}
            />
          </TableCell>
        )}
        {columnConfigurable && <TableCell />}
      </TableRow>
    ));
  }
  if (error) {
    return (
      <TableRow>
        <TableCell
          colSpan={
            visibleColumns.length +
            (selectable ? 1 : 0) +
            (showRowNumber ? 1 : 0) +
            (expandable ? 1 : 0) +
            (resolvedRowActions ? 1 : 0) +
            (columnConfigurable ? 1 : 0)
          }
          align='center'
          sx={{ py: 8 }}
        >
          <ErrorEmptyState
            error={error}
            onRetry={onRefresh}
          />
        </TableCell>
      </TableRow>
    );
  }
  if (data.length === 0) {
    return (
      <TableRow>
        <TableCell
          colSpan={
            visibleColumns.length +
            (selectable ? 1 : 0) +
            (showRowNumber ? 1 : 0) +
            (expandable ? 1 : 0) +
            (resolvedRowActions ? 1 : 0) +
            (columnConfigurable ? 1 : 0)
          }
          align='center'
          sx={{ py: 8 }}
        >
          {/* 只有真的给了可点的空态 CTA 时才提示「点击添加按钮」，否则那句引导
              指向空态里并不存在的按钮（工具栏上的新建离这一行太远）。 */}
          <EmptyState
            icon={emptyIcon}
            title={emptyMessage}
            description={emptyActionButton ? i18n.t('templates.list_page_template.k21') : undefined}
            action={
              emptyActionButton
                ? { label: emptyActionButton.label, onClick: emptyActionButton.onClick }
                : undefined
            }
          />
        </TableCell>
      </TableRow>
    );
  }
  return treeTableData.map((row, index) => {
    const rowId =
      getRowId?.(row) ??
      ((row as unknown as Record<string, unknown>).id as string | number) ??
      index;
    const isSelected = effectiveSelectedIds.includes(rowId);
    const isExpanded = expandedIds.includes(rowId);
    const rowLevel = resolvedTreeView ? getRowLevel(rowId) : 0;
    const rowHasChildren = hasChildren(row);
    const isEditing = inlineEdit.resolvedEditingRowId === rowId;
    return (
      <React.Fragment key={rowId}>
        <TableRow
          hover
          selected={isSelected}
          onClick={() => resolvedOnRowClick?.(row)}
          onDoubleClick={() => resolvedOnRowDoubleClick?.(row)}
          sx={{
            '&:nth-of-type(even)': striped ? { bgcolor: 'action.hover' } : {},
            '&:hover': {
              bgcolor: theme.palette.mode === 'dark' ? 'glass.line' : 'primary.50',
              transition: 'background-color 150ms ease',
            },
            '&.Mui-selected': {
              bgcolor: theme.palette.mode === 'dark' ? 'background.selectedDark' : 'primary.50',
            },
            cursor: resolvedOnRowClick ? 'pointer' : 'default',
            transition: 'background-color 150ms ease',
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
            >
              <Checkbox
                checked={isSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectRow(row);
                }}
              />
            </TableCell>
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
            >
              <Checkbox
                checked={selectedIds.has(rowId)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleBatchSelect(row);
                }}
              />
            </TableCell>
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
              {resolvedPagination
                ? (resolvedPagination.page - ((effectiveListState?.baseIndex ?? 1) === 1 ? 1 : 0)) *
                    resolvedPagination.pageSize +
                  index +
                  1
                : index + 1}
            </TableCell>
          )}
          {expandable && !resolvedTreeView && (
            <TableCell padding='checkbox'>
              <IconButton
                size='small'
                onClick={(e) => {
                  e.stopPropagation();
                  handleExpandRow(row);
                }}
                aria-label={i18n.t('templates.list_page_template.k22')}
              >
                <ChevronRight
                  style={{
                    width: 18,
                    height: 18,
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }}
                />
              </IconButton>
            </TableCell>
          )}
          {resolvedTreeView && (
            <TableCell
              padding='checkbox'
              sx={{
                width: 48,
                position: 'sticky',
                left: selectable || isBatchSelectionEnabled ? 48 : 0,
                zIndex: (theme) => theme.zIndex.raised,
                bgcolor: 'inherit',
              }}
            >
              {rowHasChildren ? (
                <IconButton
                  size='small'
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(rowId);
                  }}
                  aria-label={i18n.t('templates.list_page_template.k23')}
                >
                  <ChevronRight
                    style={{
                      width: 18,
                      height: 18,
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  />
                </IconButton>
              ) : (
                <Box sx={{ width: 24 }} />
              )}
            </TableCell>
          )}
          {visibleColumns.map((column) => {
            const isTreeColumn = resolvedTreeView && column.id === treeColumnId;
            const isFixed = column.fixed !== undefined;
            const leftPos = fixedColumnPositions.leftPositions[column.id];
            const rightPos = fixedColumnPositions.rightPositions[column.id];
            const colWidth = resolvedColumnResizable
              ? columnWidthResult.getColumnWidth(column.id)
              : column.width;
            const canEdit = resolvedInlineEditable && column.editable && !isTreeColumn;
            const cellValue = (row as unknown as Record<string, unknown>)[column.id];
            return (
              <TableCell
                key={column.id}
                align={column.align || 'left'}
                width={colWidth}
                sx={{
                  minWidth: column.minWidth,
                  maxWidth: column.maxWidth,
                  position: isFixed ? 'sticky' : 'static',
                  left: column.fixed === 'left' ? leftPos : undefined,
                  right: column.fixed === 'right' ? rightPos : undefined,
                  zIndex: isFixed ? 1 : 0,
                  bgcolor: 'inherit',
                }}
                onClick={(e) => {
                  if (canEdit && resolvedInlineEditMode === 'cell') {
                    e.stopPropagation();
                    inlineEdit.startEditing(row);
                  }
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    pl: isTreeColumn ? rowLevel * treeIndentSize : 0,
                  }}
                >
                  {isTreeColumn && <Box sx={{ width: 24, flexShrink: 0 }} />}
                  {isEditing && canEdit ? (
                    <InlineEditCell
                      column={column}
                      value={inlineEdit.editingData?.[column.id as keyof T] ?? cellValue ?? ''}
                      onChange={(value) =>
                        inlineEdit.updateEditingField(column.id as keyof T, value)
                      }
                      onSave={() => inlineEdit.saveEditing(row)}
                      onCancel={() => inlineEdit.cancelEditing(row)}
                    />
                  ) : column.render ? (
                    // V64 防御：调用外部 column.render 前 row 兜底，
                    //      避免 325 处 schema.renderCell 遇到 undefined 报错
                    (() => {
                      try {
                        return column.render(row ?? ({} as T), index);
                      } catch (e) {
                        // 任何自定义渲染报错都不打断整表渲染，返回占位 '-'
                        // A-15：同一列只告警一次，避免失败常驻时把控制台刷满
                        if (typeof console !== 'undefined' && console?.warn) {
                          const columnKey = String(column.id);
                          if (!warnedRenderColumns.has(columnKey)) {
                            warnedRenderColumns.add(columnKey);
                            console.warn(
                              `[ListPageTemplate] renderCell for column="${column.id}" failed, fallback to "-":`,
                              e
                            );
                          }
                        }
                        return '-';
                      }
                    })()
                  ) : cellValue !== undefined && cellValue !== null ? (
                    String(cellValue)
                  ) : (
                    '-'
                  )}
                </Box>
              </TableCell>
            );
          })}
          {(renderRowActions || (resolvedRowActions && resolvedRowActions.length > 0)) && (
            <TableCell align='right'>
              {renderRowActions ? (
                renderRowActions(row, index)
              ) : isMobile ? (
                <IconButton
                  size='small'
                  onClick={(e) => handleRowActionClick(e, row)}
                  aria-label={i18n.t('templates.list_page_template.k24')}
                >
                  <MoreHorizontal style={iconMd} />
                </IconButton>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 0.5,
                  }}
                >
                  {(resolvedRowActions ?? []).slice(0, 3).map((action, actionIndex) => {
                    if (action.show && !action.show(row)) return null;
                    return (
                      <Tooltip
                        key={actionIndex}
                        title={action.label}
                      >
                        <IconButton
                          size='small'
                          data-testid={`row-action-${action.key ?? actionIndex}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick?.(row);
                          }}
                          color={action.color}
                          aria-label={action.label}
                        >
                          {action.icon || <MoreHorizontal style={iconSm} />}
                        </IconButton>
                      </Tooltip>
                    );
                  })}
                  {(resolvedRowActions ?? []).length > 3 && (
                    <IconButton
                      size='small'
                      onClick={(e) => handleRowActionClick(e, row)}
                      aria-label={i18n.t('templates.list_page_template.k25')}
                    >
                      <MoreHorizontal style={iconSm} />
                    </IconButton>
                  )}
                </Box>
              )}
            </TableCell>
          )}
          {columnConfigurable && <TableCell />}
        </TableRow>
        {expandable && isExpanded && (
          <TableRow>
            <TableCell
              colSpan={
                visibleColumns.length +
                (selectable ? 1 : 0) +
                (showRowNumber ? 1 : 0) +
                (expandable ? 1 : 0) +
                (resolvedRowActions ? 1 : 0) +
                (columnConfigurable ? 1 : 0)
              }
              sx={{ py: 0 }}
            >
              <Collapse
                in={isExpanded}
                timeout='auto'
                unmountOnExit
              >
                <Box sx={{ py: 2, px: 1 }}>{renderExpandedRow(row, index)}</Box>
              </Collapse>
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    );
  });
}
