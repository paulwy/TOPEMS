import React from 'react';
import {
  Box,
  Checkbox,
  Collapse,
  IconButton,
  Skeleton,
  TableCell,
  TableBody,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  useTheme,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { ChevronRight, Columns3, MoreHorizontal } from 'lucide-react';
import type { ColumnDef, RowAction } from './types';
import { EditCell } from './EditCell';
import { ListEmptyState } from './EmptyState';
import { useTranslation } from 'react-i18next';

export interface ColumnWidthResult {
  columnWidths: Record<string, number>;
  resizingColumnId: string | null;
  getColumnWidth: (columnId: string) => number | string;
  startResize: (columnId: string, clientX: number) => void;
  resetColumnWidth: (columnId: string) => void;
}

export interface TableSectionProps<T> {
  // Data
  data: T[];
  treeTableData: T[];
  loading?: boolean;
  error?: string | null;
  // // 列
  visibleColumns: ColumnDef<T>[];
  // Select
  selectable?: boolean;
  isBatchSelectionEnabled?: boolean;
  effectiveSelectedIds: (string | number)[];
  selectedIds: Set<string | number>;
  onSelectAll?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBatchSelectAll?: () => void;
  onSelectRow?: (row: T) => void;
  onBatchSelect?: (row: T, event?: React.MouseEvent) => void;
  // // 排序
  sortable?: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort?: (columnId: string) => void;
  // // 行号
  showRowNumber?: boolean;
  striped?: boolean;
  // // 行点击
  onRowClick?: (row: T) => void;
  onRowDoubleClick?: (row: T) => void;
  // // 行展开
  expandable?: boolean | ((row: T, index: number) => React.ReactNode);
  expandedIds: (string | number)[];
  onExpandRow?: (row: T) => void;
  // // 行Action
  resolvedRowActions?: RowAction<T>[];
  onRowActionClick?: (event: React.MouseEvent<HTMLElement>, row: T) => void;
  isMobile?: boolean;
  // // 列Configuration
  columnConfigurable?: boolean;
  onOpenColumnConfig?: (event: React.MouseEvent<HTMLElement>) => void;
  // // 树形Table
  resolvedTreeView?: boolean;
  treeColumnId?: string;
  treeIndentSize?: number;
  getRowLevel?: (rowId: string | number) => number;
  hasChildren?: (row: T) => boolean;
  onToggleExpand?: (key: string | number) => void;
  // // 行内Edit
  resolvedInlineEditable?: boolean;
  resolvedInlineEditMode?: 'cell' | 'row';
  resolvedEditingRowId?: string | number | null;
  editingData?: Partial<T> | null;
  onStartEditing?: (row: T) => void;
  onCancelEditing?: (row: T) => void;
  onSaveEditing?: (row: T) => void;
  onUpdateEditingField?: (field: keyof T, value: unknown) => void;
  // getRowId
  getRowId: (row: T) => string | number;
  // // 列宽
  resolvedColumnResizable?: boolean;
  columnWidthResult: ColumnWidthResult;
  // // 固定列位置
  fixedColumnPositions: {
    leftPositions: Record<string, number>;
    rightPositions: Record<string, number>;
  };
  // // 分页（用于行号计算）
  paginationPage?: number;
  paginationPageSize?: number;
  // // 空Status
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  emptyActionButton?: {
    label: string;
    icon?: React.ReactNode;
    onClick?: () => void;
  };
  onRefresh?: () => void;
  // // 汇总行
  showSummary?: boolean;
  summaryPosition?: 'top' | 'bottom';
  // // 主题
  theme?: Theme;
}

/**
 * 表格区域组件
 * 从 ListPageTemplate 中抽离的表格头/体/汇总行渲染逻辑
 */
export function TableSection<T>({
  data,
  treeTableData,
  loading,
  error,
  visibleColumns,
  selectable,
  isBatchSelectionEnabled,
  effectiveSelectedIds,
  selectedIds,
  onSelectAll,
  onBatchSelectAll,
  onSelectRow,
  onBatchSelect,
  sortable,
  sortBy,
  sortOrder,
  onSort,
  showRowNumber,
  striped,
  onRowClick,
  onRowDoubleClick,
  expandable,
  expandedIds,
  onExpandRow,
  resolvedRowActions,
  onRowActionClick,
  isMobile,
  columnConfigurable,
  onOpenColumnConfig,
  resolvedTreeView,
  treeColumnId,
  treeIndentSize = 24,
  getRowLevel,
  hasChildren,
  onToggleExpand,
  resolvedInlineEditable,
  resolvedInlineEditMode,
  resolvedEditingRowId,
  editingData,
  onStartEditing,
  onCancelEditing,
  onSaveEditing,
  onUpdateEditingField,
  getRowId,
  resolvedColumnResizable,
  columnWidthResult,
  fixedColumnPositions,
  paginationPage,
  paginationPageSize,
  emptyMessage,
  emptyIcon,
  emptyActionButton,
  onRefresh,
  showSummary,
  summaryPosition,
  theme: themeProp,
}: TableSectionProps<T>) {
  const { t } = useTranslation();
  const muiTheme = useTheme();
  const theme = (themeProp ?? muiTheme) as Theme;
  const stickyBg = theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'grey.50';

  const hasRowActions = !!(resolvedRowActions && resolvedRowActions.length > 0);
  const colSpanExtra =
    (selectable || isBatchSelectionEnabled ? 1 : 0) +
    (showRowNumber ? 1 : 0) +
    (expandable ? 1 : 0) +
    (hasRowActions ? 1 : 0) +
    (columnConfigurable ? 1 : 0);
  const totalColSpan = visibleColumns.length + colSpanExtra;

  const renderExpandedRow = (row: T, index: number) => {
    if (typeof expandable === 'function') {
      return expandable(row, index);
    }
    return null;
  };

  // // ============ 表头 ============
  const renderTableHead = () => (
    <TableHead>
      <TableRow>
        {selectable && (
          <TableCell
            padding='checkbox'
            sx={{ width: 48, position: 'sticky', left: 0, zIndex: 2, bgcolor: stickyBg }}
          >
            <Checkbox
              indeterminate={
                effectiveSelectedIds.length > 0 && effectiveSelectedIds.length < data.length
              }
              checked={data.length > 0 && effectiveSelectedIds.length === data.length}
              onChange={onSelectAll}
            />
          </TableCell>
        )}
        {isBatchSelectionEnabled && !selectable && (
          <TableCell
            padding='checkbox'
            sx={{ width: 48, position: 'sticky', left: 0, zIndex: 2, bgcolor: stickyBg }}
          >
            <Checkbox
              indeterminate={selectedIds.size > 0 && selectedIds.size < data.length}
              checked={data.length > 0 && selectedIds.size === data.length}
              onChange={onBatchSelectAll}
            />
          </TableCell>
        )}
        {showRowNumber && (
          <TableCell
            sx={{
              width: 60,
              position: selectable ? 'sticky' : 'relative',
              left: selectable ? 48 : 0,
              zIndex: 2,
              bgcolor: stickyBg,
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
                bgcolor: stickyBg,
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
                    onClick={() => onSort?.(column.id)}
                  >
                    {column.label || column.header}
                  </TableSortLabel>
                ) : (
                  column.label || column.header
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
                    transition: (theme) =>
                      theme.transitions.create(['background-color'], { duration: 200 }),
                    '&:hover': { bgcolor: 'primary.main' },
                    zIndex: 3,
                  }}
                  title={t('components.components.tablesection.key_3eb3c2')}
                />
              )}
            </TableCell>
          );
        })}
        {hasRowActions && (
          <TableCell
            align='right'
            sx={{ width: 80 }}
          >
            {t('components.components.tablesection.key_2b6bc0')}
          </TableCell>
        )}
        {columnConfigurable && (
          <TableCell
            align='right'
            sx={{ width: 48 }}
          >
            <Tooltip title={t('components.components.tablesection.key_e9d44c')}>
              <IconButton
                size='small'
                onClick={onOpenColumnConfig}
              >
                <Columns3 style={{ width: 18, height: 18 }} />
              </IconButton>
            </Tooltip>
          </TableCell>
        )}
      </TableRow>
    </TableHead>
  );

  // // ============ 表体 ============
  const renderTableBody = () => {
    if (loading || error || data.length === 0) {
      return (
        <>
          <ListEmptyState
            colSpan={totalColSpan}
            loading={loading}
            error={error}
            emptyMessage={emptyMessage}
            emptyIcon={emptyIcon}
            emptyActionButton={emptyActionButton}
            onRefresh={onRefresh}
            selectable={selectable}
            showRowNumber={showRowNumber}
            expandable={
              expandable as unknown as
                | boolean
                | ((row: Record<string, unknown>, index: number) => React.ReactNode)
                | undefined
            }
            hasRowActions={hasRowActions}
            columnConfigurable={columnConfigurable}
            visibleColumnCount={visibleColumns.length}
          />
        </>
      );
    }

    return treeTableData.map((row, index) => {
      const rowId = getRowId(row);
      const isSelected = effectiveSelectedIds.includes(rowId);
      const isExpanded = expandedIds.includes(rowId);
      const rowLevel = resolvedTreeView && getRowLevel ? getRowLevel(rowId) : 0;
      const rowHasChildren = hasChildren ? hasChildren(row) : false;
      const isEditing = resolvedEditingRowId === rowId;

      return (
        <React.Fragment key={rowId}>
          <TableRow
            hover
            selected={isSelected}
            onClick={() => onRowClick?.(row)}
            onDoubleClick={() => onRowDoubleClick?.(row)}
            sx={{
              '&:nth-of-type(even)': striped ? { bgcolor: 'action.hover' } : {},
              '&:hover': {
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(59,130,246,0.08)' : 'primary.50',
                transition: (theme) =>
                  theme.transitions.create(['background-color'], { duration: 150 }),
              },
              '&.Mui-selected': {
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(59,130,246,0.12)' : 'primary.50',
              },
              cursor: onRowClick ? 'pointer' : 'default',
              transition: (theme) =>
                theme.transitions.create(['background-color'], { duration: 150 }),
            }}
          >
            {selectable && (
              <TableCell
                padding='checkbox'
                sx={{ position: 'sticky', left: 0, zIndex: 1, bgcolor: 'inherit' }}
              >
                <Checkbox
                  checked={isSelected}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRow?.(row);
                  }}
                />
              </TableCell>
            )}
            {isBatchSelectionEnabled && !selectable && (
              <TableCell
                padding='checkbox'
                sx={{ position: 'sticky', left: 0, zIndex: 1, bgcolor: 'inherit' }}
              >
                <Checkbox
                  checked={selectedIds.has(rowId)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onBatchSelect?.(row);
                  }}
                />
              </TableCell>
            )}
            {showRowNumber && (
              <TableCell
                sx={{
                  position: selectable ? 'sticky' : 'relative',
                  left: selectable ? 48 : 0,
                  zIndex: 1,
                  bgcolor: 'inherit',
                }}
              >
                {paginationPage !== undefined && paginationPageSize !== undefined
                  ? paginationPage * paginationPageSize + index + 1
                  : index + 1}
              </TableCell>
            )}
            {expandable && !resolvedTreeView && (
              <TableCell padding='checkbox'>
                <IconButton
                  size='small'
                  onClick={(e) => {
                    e.stopPropagation();
                    onExpandRow?.(row);
                  }}
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
                  zIndex: 1,
                  bgcolor: 'inherit',
                }}
              >
                {rowHasChildren ? (
                  <IconButton
                    size='small'
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleExpand?.(rowId);
                    }}
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
                      onStartEditing?.(row);
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
                      <EditCell<T>
                        column={column}
                        value={editingData?.[column.id as keyof T] ?? cellValue ?? ''}
                        onChange={(value) => onUpdateEditingField?.(column.id as keyof T, value)}
                        onSave={() => onSaveEditing?.(row)}
                        onCancel={() => onCancelEditing?.(row)}
                      />
                    ) : column.render ? (
                      column.render(row, index)
                    ) : cellValue !== undefined && cellValue !== null ? (
                      String(cellValue)
                    ) : (
                      '-'
                    )}
                  </Box>
                </TableCell>
              );
            })}
            {hasRowActions && (
              <TableCell align='right'>
                {isMobile ? (
                  <IconButton
                    size='small'
                    onClick={(e) => onRowActionClick?.(e, row)}
                  >
                    <MoreHorizontal style={{ width: 18, height: 18 }} />
                  </IconButton>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                    {resolvedRowActions!.slice(0, 3).map((action, actionIndex) => {
                      if (action.show && !action.show(row)) return null;
                      return (
                        <Tooltip
                          key={actionIndex}
                          title={action.label}
                        >
                          <IconButton
                            size='small'
                            onClick={(e) => {
                              e.stopPropagation();
                              action.onClick?.(row);
                            }}
                            color={action.color}
                          >
                            {action.icon || <MoreHorizontal style={{ width: 16, height: 16 }} />}
                          </IconButton>
                        </Tooltip>
                      );
                    })}
                    {resolvedRowActions!.length > 3 && (
                      <IconButton
                        size='small'
                        onClick={(e) => onRowActionClick?.(e, row)}
                      >
                        <MoreHorizontal style={{ width: 16, height: 16 }} />
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
                colSpan={totalColSpan}
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
  };

  // // ============ 汇总行 ============
  const renderSummaryRow = () => {
    if (!showSummary) return null;

    const summaryData = resolvedTreeView ? treeTableData : data;

    return (
      <TableRow
        sx={{
          bgcolor: theme.palette.mode === 'dark' ? 'alpha(common.white, 0.04)' : 'grey.50',
          fontWeight: 600,
        }}
      >
        {selectable && (
          <TableCell
            padding='checkbox'
            sx={{ position: 'sticky', left: 0, zIndex: 1, bgcolor: 'inherit' }}
          />
        )}
        {isBatchSelectionEnabled && !selectable && (
          <TableCell
            padding='checkbox'
            sx={{ position: 'sticky', left: 0, zIndex: 1, bgcolor: 'inherit' }}
          />
        )}
        {showRowNumber && (
          <TableCell
            sx={{
              position: selectable ? 'sticky' : 'relative',
              left: selectable ? 48 : 0,
              zIndex: 1,
              bgcolor: 'inherit',
            }}
          >
            {t('components.components.tablesection.key_450efd')}
          </TableCell>
        )}
        {resolvedTreeView && (
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
        {hasRowActions && (
          <TableCell
            align='right'
            sx={{ width: 80 }}
          />
        )}
        {columnConfigurable && <TableCell sx={{ width: 48 }} />}
      </TableRow>
    );
  };

  return (
    <>
      {renderTableHead()}
      {showSummary && summaryPosition === 'top' && <TableBody>{renderSummaryRow()}</TableBody>}
      <TableBody>{renderTableBody()}</TableBody>
      {showSummary && summaryPosition === 'bottom' && <TableBody>{renderSummaryRow()}</TableBody>}
    </>
  );
}
