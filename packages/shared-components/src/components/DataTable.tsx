import { designTokens } from '@topems/tokens';
/**
 * 统一的 DataTable 组件
 * 迁移自 apps/web，在 shared-components 中自包含，不再依赖 apps/web 专属模块。
 * 使用 TanStack React Table，支持搜索、排序、筛选、分页、选择、导出等功能。
 * 增强特性：列配置持久化、行展开、虚拟滚动、高级筛选、Excel 导出、行内编辑、移动端卡片视图。
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Select,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
  Skeleton,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Chip,
  Button,
  useTheme,
  Stack,
  FormControl,
  useMediaQuery,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import {
  Search,
  Filter,
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Save,
  XCircle,
} from 'lucide-react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
  type Cell,
  type ColumnDef,
  type Row,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
  type VisibilityState,
} from '@tanstack/react-table';
import { FixedSizeList as List, type ListChildComponentProps } from 'react-window';

// ============ 类型定义 ============

/**
 * 行展开内容渲染函数类型
 */
export type ExpandedRowRender<TData> = (row: TData) => React.ReactNode;

/**
 * 高级筛选配置
 */
export interface AdvancedFilter {
  label: string;
  key: string;
  type: 'text' | 'select' | 'date' | 'number';
  options?: { value: string; label: string }[];
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * 导出结果
 */
export interface ExportResult {
  success: boolean;
  error?: unknown;
}

/**
 * 自定义导出函数
 */
export type ExportDataFn = (
  format: string,
  columns: ColumnDef<any, any>[],
  rows: any[]
) => Promise<ExportResult> | ExportResult;

/**
 * 行内编辑类型
 */
type InlineEditType = 'text' | 'select' | 'number' | 'date' | 'datetime' | 'checkbox';

/**
 * 行内编辑配置
 */
interface InlineEditConfig {
  type?: InlineEditType;
  options?: { value: string | number; label: string }[];
}

/**
 * 行内编辑保存回调类型
 */
type InlineEditSaveCallback<TData> = (row: TData, changes: Partial<TData>) => void;

/**
 * 可配置的文案对象
 */
export interface DataTableLabels {
  searchPlaceholder?: string;
  createLabel?: string;
  emptyMessage?: string;
  refreshLabel?: string;
  exportLabel?: string;
  exportCsvLabel?: string;
  exportExcelLabel?: string;
  columnSettingsLabel?: string;
  showHideColumnsLabel?: string;
  resetColumnsLabel?: string;
  selectedLabel?: string;
  recordsLabel?: string;
  cancelSelectionLabel?: string;
  expandLabel?: string;
  collapseLabel?: string;
  loadingLabel?: string;
  previousPageLabel?: string;
  nextPageLabel?: string;
  previousPageAriaLabel?: string;
  nextPageAriaLabel?: string;
  pageInfo?: (current: number, total: number) => string;
  perPageLabel?: string;
  advancedFilterTitle?: string;
  allOptionLabel?: string;
  resetFilterLabel?: string;
  applyFilterLabel?: string;
  saveAriaLabel?: string;
  cancelAriaLabel?: string;
  yesLabel?: string;
  noLabel?: string;
  defaultCardTitle?: string;
}

/**
 * DataTable 属性
 */
export interface DataTableProps<TData, TValue> {
  /** 列定义 */
  columns: (ColumnDef<TData, TValue> & { inlineEdit?: InlineEditConfig })[];
  /** 数据 */
  data: TData[];
  /** 搜索字段名 */
  searchKey?: string;
  /** 搜索占位符 */
  searchPlaceholder?: string;
  /** 是否显示搜索框 */
  showSearch?: boolean;
  /** 是否显示导出按钮 */
  showExport?: boolean;
  /** 是否显示选择框 */
  showSelection?: boolean;
  /** 是否显示新建按钮 */
  showCreate?: boolean;
  /** 新建按钮标签 */
  createLabel?: string;
  /** 新建按钮点击回调 */
  onCreate?: () => void;
  /** 导出文件名 */
  exportFileName?: string;
  /** 是否启用分页 */
  enablePagination?: boolean;
  /** 总页数 */
  totalPages?: number;
  /** 总记录数 */
  totalItems?: number;
  /** 每页条数 */
  pageSize?: number;
  /** 当前页码（受控） */
  currentPage?: number;
  /** 页码变化回调 */
  onPageChange?: (page: number) => void;
  /** 每页条数变化回调 */
  onPageSizeChange?: (size: number) => void;
  /** 行点击回调 */
  onRowClick?: (row: TData) => void;
  /** 选择变化回调，始终传入 string[] */
  onSelectionChange?: (selectedRows: string[]) => void;
  /** 是否显示刷新按钮 */
  showRefresh?: boolean;
  /** 刷新回调 */
  onRefresh?: () => void;
  /** 是否加载中 */
  loading?: boolean;
  /** 是否响应式 */
  responsive?: boolean;
  /** 空数据提示 */
  emptyMessage?: string;
  /** 获取行 key 的函数 */
  getRowKey?: (row: TData) => string;
  /** 额外操作按钮 */
  extraActions?: React.ReactNode;
  /** 自定义样式 */
  sx?: SxProps<Theme>;
  /** 是否启用列配置持久化（存储到 localStorage） */
  persistColumnConfig?: boolean;
  /** 列配置存储的 key 前缀 */
  columnConfigKey?: string;
  /** 是否启用行展开功能 */
  enableRowExpansion?: boolean;
  /** 行展开内容渲染函数 */
  expandedRowRender?: ExpandedRowRender<TData>;
  /** 是否启用虚拟滚动 */
  enableVirtualization?: boolean;
  /** 虚拟滚动的行高 */
  rowHeight?: number;
  /** 虚拟滚动区域高度 */
  virtualHeight?: number;
  /** 是否启用列固定 */
  enableStickyHeader?: boolean;
  /** 是否显示行号 */
  showRowNumber?: boolean;
  /** 是否启用高级筛选 */
  enableAdvancedFilter?: boolean;
  /** 高级筛选配置 */
  advancedFilters?: AdvancedFilter[];
  /** 是否显示行条纹 */
  striped?: boolean;
  /** 是否紧凑模式 */
  compact?: boolean;
  /** 空状态自定义内容 */
  emptyState?: React.ReactNode;
  /** @deprecated 使用 selectedRows 代替。保留用于向后兼容。 */
  selectedIds?: string[];
  /** 已选中的行 ID 列表（受控） */
  selectedRows?: string[];
  /** 移动端卡片视图渲染函数 */
  mobileCardRender?: (row: TData, index: number) => React.ReactNode;
  /** 移动端卡片视图的标题字段名 */
  mobileCardTitleKey?: string;
  /** 移动端卡片视图的副标题字段名 */
  mobileCardSubtitleKey?: string;
  /** 移动端卡片字段标签映射 */
  mobileFieldLabels?: Record<string, string>;
  /** 移动端卡片展示的字段列表 */
  mobileDisplayFields?: string[];
  /** 是否强制使用移动端卡片视图（受控） */
  useMobileCardView?: boolean;
  /** 是否启用行内编辑 */
  enableInlineEdit?: boolean;
  /** 行内编辑模式：cell（单元格编辑）或 row（整行编辑） */
  inlineEditMode?: 'cell' | 'row';
  /** 可编辑的列 key 列表 */
  editableColumns?: string[];
  /** 行内编辑保存回调 */
  onInlineEditSave?: InlineEditSaveCallback<TData>;
  /** 可覆盖的文案对象 */
  labels?: Partial<DataTableLabels>;
  /** 自定义导出函数 */
  exportData?: ExportDataFn;
  /** 导出成功回调 */
  onExportSuccess?: () => void;
  /** 导出失败回调 */
  onExportError?: (error: Error) => void;
}

/**
 * 行数据类型
 */
export interface DataTableRow<TData> {
  original: TData;
  id: string;
}

// ============ 默认文案 ============

const defaultLabels: DataTableLabels = {
  searchPlaceholder: 'Search...',
  createLabel: 'Create',
  emptyMessage: 'No data available',
  refreshLabel: 'Refresh',
  exportLabel: 'Export',
  exportCsvLabel: 'Export CSV',
  exportExcelLabel: 'Export Excel',
  columnSettingsLabel: 'Column Settings',
  showHideColumnsLabel: 'Show/Hide Columns',
  resetColumnsLabel: 'Reset Columns',
  selectedLabel: 'Selected',
  recordsLabel: 'records',
  cancelSelectionLabel: 'Cancel Selection',
  expandLabel: 'Expand',
  collapseLabel: 'Collapse',
  loadingLabel: 'Loading...',
  previousPageLabel: 'Previous',
  nextPageLabel: 'Next',
  previousPageAriaLabel: 'Previous Page',
  nextPageAriaLabel: 'Next Page',
  pageInfo: (current, total) => `Page ${current} / ${total}`,
  perPageLabel: 'Per page',
  advancedFilterTitle: 'Advanced Filter',
  allOptionLabel: 'All',
  resetFilterLabel: 'Reset',
  applyFilterLabel: 'Apply',
  saveAriaLabel: 'Save',
  cancelAriaLabel: 'Cancel',
  yesLabel: 'Yes',
  noLabel: 'No',
  defaultCardTitle: 'Item',
};

// ============ 工具函数 ============

const loadColumnVisibility = (key: string): VisibilityState => {
  try {
    const stored = localStorage.getItem(`datatable:${key}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return {};
};

const saveColumnVisibility = (key: string, visibility: VisibilityState): void => {
  try {
    localStorage.setItem(`datatable:${key}`, JSON.stringify(visibility));
  } catch {
    // ignore
  }
};

function exportToCSV<TData>(
  columns: ColumnDef<TData, any>[],
  data: TData[],
  fileName: string = 'export'
): ExportResult {
  try {
    const headers = columns.map((col) => (col.header as string) || col.id);

    const csvData = [
      headers.join(','),
      ...data.map((row) =>
        columns
          .map((col) => {
            const value = (row as Record<string, unknown>)[col.id as string];
            if (typeof value === 'string') {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return String(value ?? '');
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvData}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error };
  }
}

function exportToExcel<TData>(
  columns: ColumnDef<TData, any>[],
  data: TData[],
  fileName: string = 'export'
): ExportResult {
  try {
    const headers = columns.map((col) => (col.header as string) || col.id);

    const rows = data.map((row) =>
      columns.map((col) => {
        const value = (row as Record<string, unknown>)[col.id as string];
        return typeof value === 'string' ? value : JSON.stringify(value);
      })
    );

    const worksheetData = [headers, ...rows];
    const csvContent = worksheetData.map((row) => row.join('\t')).join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName}-${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error };
  }
}

// ============ 移动端卡片视图 ============

/**
 * 移动端卡片视图属性
 */
export interface MobileCardViewProps<TData> {
  /** 数据 */
  data: TData[];
  /** 卡片渲染函数（完全自定义） */
  cardRender?: (row: TData, index: number) => React.ReactNode;
  /** 标题字段名（用于默认卡片渲染） */
  titleKey?: string;
  /** 副标题字段名 */
  subtitleKey?: string;
  /** 自定义字段映射（字段名 → 标签） */
  fieldLabels?: Record<string, string>;
  /** 需要在卡片中展示的字段列表（默认展示所有字段） */
  displayFields?: string[];
  /** 行点击回调 */
  onRowClick?: (row: TData) => void;
  /** 是否加载中 */
  loading?: boolean;
  /** 空数据提示 */
  emptyMessage?: string;
  /** 获取行 key */
  getRowKey?: (row: TData) => string;
  /** 是否显示选择框 */
  showSelection?: boolean;
  /** 已选中的行 ID 列表 */
  selectedIds?: string[];
  /** 选择变化回调 */
  onSelectionChange?: (row: TData, selected: boolean) => void;
  /** 文案对象 */
  labels?: Partial<DataTableLabels>;
}

/**
 * 移动端卡片视图组件
 */
export function MobileCardView<TData>({
  data,
  cardRender,
  titleKey,
  subtitleKey,
  fieldLabels = {},
  displayFields,
  onRowClick,
  loading = false,
  emptyMessage,
  getRowKey = (row: TData) =>
    (row as unknown as Record<string, unknown>).id?.toString() || Math.random().toString(),
  showSelection = false,
  selectedIds = [],
  onSelectionChange,
  labels,
}: MobileCardViewProps<TData>) {
  const mergedLabels = { ...defaultLabels, ...labels };
  const isEmpty = !loading && (!data || data.length === 0);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 1 }}>
        {[1, 2, 3].map((i) => (
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

  if (isEmpty) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {emptyMessage ?? mergedLabels.emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 1 }}>
      {data.map((row, index) => {
        const rowKey = getRowKey(row);
        const isSelected = selectedIds.includes(rowKey);

        if (cardRender) {
          return (
            <Box
              key={rowKey}
              onClick={() => onRowClick?.(row)}
              sx={{
                cursor: onRowClick ? 'pointer' : 'default',
                '&:active': onRowClick ? { opacity: 0.8 } : {},
              }}
            >
              {cardRender(row, index)}
            </Box>
          );
        }

        const rowObj = row as unknown as Record<string, unknown>;
        const title = titleKey
          ? rowObj[titleKey]
          : rowObj.name || rowObj.title || `${mergedLabels.defaultCardTitle} ${index + 1}`;
        const subtitle = subtitleKey ? rowObj[subtitleKey] : rowObj.code || rowObj.no || '';

        const allKeys = Object.keys(rowObj).filter(
          (k) => !['id', 'key', 'created_at', 'updated_at', 'tenant_id'].includes(k)
        );
        const fields = displayFields || allKeys.slice(0, 4);

        return (
          <Box
            key={rowKey}
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
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 1,
                mb: subtitle || fields.length > 0 ? 1 : 0,
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
              {showSelection && (
                <Checkbox
                  size='small'
                  checked={isSelected}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  onChange={(e) => onSelectionChange?.(row, e.target.checked)}
                  sx={{ p: 0.5 }}
                />
              )}
            </Box>

            {fields.length > 0 && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 0.75,
                }}
              >
                {fields.map((field) => {
                  const value = rowObj[field];
                  const label = fieldLabels[field] || field;
                  const displayValue =
                    value == null || value === ''
                      ? '-'
                      : typeof value === 'boolean'
                        ? value
                          ? mergedLabels.yesLabel
                          : mergedLabels.noLabel
                        : String(value);

                  return (
                    <Box
                      key={field}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: 0,
                      }}
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

// ============ 虚拟滚动行数据 ============

interface VirtualRowData {
  rows: Row<any>[];
  getRowKey: (data: unknown) => string;
  onRowClick?: (data: unknown) => void;
  isSelected: string[];
  handleSelectRow: (data: unknown) => void;
  renderRowNumber: (index: number) => React.ReactNode;
  handleRowExpand: (data: unknown) => void;
  expandedRows: Set<string>;
  showSelection: boolean;
  showRowNumber: boolean;
  enableRowExpansion: boolean;
  compact: boolean;
  striped: boolean;
  labels: DataTableLabels;
}

function DataTableVirtualRow({ index, style, data }: ListChildComponentProps<VirtualRowData>) {
  const {
    rows,
    getRowKey,
    onRowClick,
    isSelected,
    handleSelectRow,
    renderRowNumber,
    handleRowExpand,
    expandedRows,
    showSelection,
    showRowNumber,
    enableRowExpansion,
    compact,
    striped,
    labels,
  } = data;
  const row = rows[index];
  if (!row) return null;
  const rowKey = getRowKey(row.original);
  const isExpanded = expandedRows.has(rowKey);
  return (
    <div style={style}>
      <TableRow
        key={row.id}
        onClick={() => onRowClick?.(row.original)}
        sx={{
          cursor: onRowClick ? 'pointer' : 'default',
          '&:hover': {
            backgroundColor: onRowClick ? 'action.hover' : 'inherit',
          },
          '&:last-child td': { borderBottom: 0 },
          bgcolor: striped && row.index % 2 === 0 ? 'action.hover' : 'inherit',
          ...(compact && { fontSize: designTokens.typography.fontSize.scale['0.875rem'] }),
        }}
      >
        {showSelection && (
          <TableCell
            padding='checkbox'
            sx={{
              position: 'sticky',
              left: 0,
              zIndex: 1,
              bgcolor: 'inherit',
              width: 40,
            }}
          >
            <Checkbox
              checked={isSelected.includes(rowKey)}
              onChange={() => handleSelectRow(row.original)}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
          </TableCell>
        )}
        {showRowNumber && (
          <TableCell
            sx={{
              whiteSpace: 'nowrap',
              fontSize: 14,
              fontWeight: 500,
              position: showSelection ? 'sticky' : 'relative',
              left: showSelection ? 56 : 0,
              zIndex: 1,
              bgcolor: 'inherit',
            }}
          >
            {renderRowNumber(index)}
          </TableCell>
        )}
        {enableRowExpansion && (
          <TableCell
            sx={{
              whiteSpace: 'nowrap',
              fontSize: 14,
              position: showSelection || showRowNumber ? 'sticky' : 'relative',
              left: (showSelection ? 56 : 0) + (showRowNumber ? 64 : 0),
              zIndex: 1,
              bgcolor: 'inherit',
            }}
          >
            <IconButton
              size='small'
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleRowExpand(row.original);
              }}
              aria-label={isExpanded ? labels.collapseLabel : labels.expandLabel}
            >
              {isExpanded ? (
                <ChevronUp style={{ width: 18, height: 18 }} />
              ) : (
                <ChevronDown style={{ width: 18, height: 18 }} />
              )}
            </IconButton>
          </TableCell>
        )}
        {row.getVisibleCells().map((cell: Cell<any, any>) => (
          <TableCell
            key={cell.id}
            sx={{
              whiteSpace: 'nowrap',
              fontSize: 14,
              ...(compact && { py: 1 }),
            }}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    </div>
  );
}

// ============ 行内编辑单元格组件 ============

function EditCellComponent({
  cell,
  editValue,
  currentValue,
  rowKey,
  onEditChange,
  onSaveEdit,
  inlineEditMode,
}: {
  cell: Cell<any, any>;
  editValue: unknown;
  currentValue: unknown;
  rowKey: string;
  onEditChange: (rowKey: string, cellId: string, value: unknown) => void;
  onSaveEdit: () => void;
  inlineEditMode: 'cell' | 'row';
}) {
  const effectiveValue = editValue !== undefined ? editValue : currentValue;
  const inlineEditConfig = (cell.column.columnDef as unknown as { inlineEdit?: InlineEditConfig })
    ?.inlineEdit;
  const editType = inlineEditConfig?.type ?? 'text';
  const options = inlineEditConfig?.options ?? [];

  const handleBlur = () => {
    if (inlineEditMode === 'cell') {
      onSaveEdit();
    }
  };

  switch (editType) {
    case 'select':
      return (
        <FormControl
          size='small'
          sx={{ width: '100%', minWidth: 100 }}
        >
          <Select
            value={String(effectiveValue)}
            onChange={(e) => onEditChange(rowKey, cell.id, e.target.value)}
            autoFocus
            onBlur={handleBlur}
            displayEmpty
          >
            {options.map((opt) => (
              <MenuItem
                key={opt.value}
                value={opt.value}
              >
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    case 'number':
      return (
        <TextField
          size='small'
          type='number'
          value={effectiveValue !== undefined ? String(effectiveValue) : ''}
          onChange={(e) =>
            onEditChange(rowKey, cell.id, e.target.value ? Number(e.target.value) : '')
          }
          autoFocus
          onBlur={handleBlur}
          sx={{ width: '100%', minWidth: 100 }}
        />
      );
    case 'date':
      return (
        <TextField
          size='small'
          type='date'
          value={effectiveValue !== undefined ? String(effectiveValue).split('T')[0] : ''}
          onChange={(e) => onEditChange(rowKey, cell.id, e.target.value)}
          autoFocus
          onBlur={handleBlur}
          sx={{ width: '100%', minWidth: 120 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      );
    case 'datetime':
      return (
        <TextField
          size='small'
          type='datetime-local'
          value={effectiveValue !== undefined ? String(effectiveValue).replace('Z', '') : ''}
          onChange={(e) => onEditChange(rowKey, cell.id, e.target.value)}
          autoFocus
          onBlur={handleBlur}
          sx={{ width: '100%', minWidth: 150 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      );
    case 'checkbox':
      return (
        <Checkbox
          checked={Boolean(effectiveValue)}
          onChange={(e) => onEditChange(rowKey, cell.id, e.target.checked)}
          onBlur={handleBlur}
        />
      );
    case 'text':
    default:
      return (
        <TextField
          size='small'
          value={effectiveValue !== undefined ? String(effectiveValue) : ''}
          onChange={(e) => onEditChange(rowKey, cell.id, e.target.value)}
          autoFocus
          onBlur={handleBlur}
          sx={{ width: '100%', minWidth: 100 }}
        />
      );
  }
}

// ============ DataTable 组件 ============

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder,
  showSearch = true,
  showExport = true,
  showSelection = false,
  showCreate = false,
  createLabel,
  onCreate,
  exportFileName = 'export',
  enablePagination = true,
  totalPages,
  totalItems,
  pageSize = 10,
  currentPage = 0,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  onSelectionChange,
  showRefresh = false,
  onRefresh,
  loading = false,
  responsive = true,
  emptyMessage,
  getRowKey = (row: TData): string =>
    (row as unknown as Record<string, unknown>).id?.toString() ||
    (row as unknown as Record<string, unknown>).key?.toString() ||
    Math.random().toString(),
  extraActions,
  sx,
  persistColumnConfig = false,
  columnConfigKey = 'default',
  enableRowExpansion = false,
  expandedRowRender,
  enableVirtualization = false,
  rowHeight = 52,
  virtualHeight = 400,
  enableStickyHeader = false,
  showRowNumber = false,
  enableAdvancedFilter = false,
  advancedFilters = [],
  striped = true,
  compact = false,
  emptyState: _emptyState,
  selectedIds = [],
  selectedRows,
  mobileCardRender,
  mobileCardTitleKey,
  mobileCardSubtitleKey,
  mobileFieldLabels,
  mobileDisplayFields,
  useMobileCardView: controlledMobileCardView,
  enableInlineEdit = false,
  inlineEditMode = 'cell',
  editableColumns = [],
  onInlineEditSave,
  labels: labelsProp,
  exportData: customExportData,
  onExportSuccess,
  onExportError,
}: DataTableProps<TData, TValue>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const mergedLabels = useMemo(
    () => ({
      ...defaultLabels,
      ...labelsProp,
      // 以下直接 props 优先级高于 labels 对象，保持向后兼容
      searchPlaceholder: searchPlaceholder ?? labelsProp?.searchPlaceholder ?? defaultLabels.searchPlaceholder,
      createLabel: createLabel ?? labelsProp?.createLabel ?? defaultLabels.createLabel,
      emptyMessage: emptyMessage ?? labelsProp?.emptyMessage ?? defaultLabels.emptyMessage,
    }),
    [labelsProp, searchPlaceholder, createLabel, emptyMessage]
  );

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: currentPage,
    pageSize,
  });
  const [localSearch, setLocalSearch] = useState('');
  const [showAdvancedFilterDialog, setShowAdvancedFilterDialog] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    persistColumnConfig ? loadColumnVisibility(columnConfigKey) : {}
  );
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // 行内编辑状态
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingCellId, setEditingCellId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});

  // 选择状态：优先受控 props，其次内部状态
  const effectiveSelectedIds = selectedRows ?? selectedIds ?? [];
  const [internalSelected, setInternalSelected] = React.useState<string[]>([]);
  const isSelected = showSelection
    ? effectiveSelectedIds.length > 0
      ? effectiveSelectedIds
      : internalSelected
    : [];

  useEffect(() => {
    if (persistColumnConfig) {
      saveColumnVisibility(columnConfigKey, columnVisibility);
    }
  }, [columnVisibility, persistColumnConfig, columnConfigKey]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: (newPagination) => {
      const paginationState =
        typeof newPagination === 'function' ? newPagination(pagination) : newPagination;
      setPagination(newPagination);
      if (onPageChange) {
        onPageChange(paginationState.pageIndex);
      }
    },
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      pagination,
      columnVisibility,
    },
    initialState: {
      pagination: { pageIndex: currentPage, pageSize },
    },
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSearch = useCallback(
    (value: string) => {
      setLocalSearch(value);
      if (searchKey) {
        table.getColumn(searchKey)?.setFilterValue(value);
      }
    },
    [searchKey, table]
  );

  const handleSelectAll = React.useCallback(() => {
    const allIds = data.map((row) => getRowKey(row));
    const newSelected = isSelected.length === allIds.length ? [] : allIds;
    if (effectiveSelectedIds.length > 0 && onSelectionChange) {
      onSelectionChange(newSelected);
    } else {
      setInternalSelected(newSelected);
      onSelectionChange?.(newSelected);
    }
  }, [data, isSelected, effectiveSelectedIds, onSelectionChange, getRowKey]);

  const handleSelectRow = React.useCallback(
    (row: TData) => {
      const key = getRowKey(row);
      const newSelected = isSelected.includes(key)
        ? isSelected.filter((s) => s !== key)
        : [...isSelected, key];
      if (effectiveSelectedIds.length > 0 && onSelectionChange) {
        onSelectionChange(newSelected);
      } else {
        setInternalSelected(newSelected);
        onSelectionChange?.(newSelected);
      }
    },
    [isSelected, effectiveSelectedIds, onSelectionChange, getRowKey]
  );

  const handleRowExpand = useCallback(
    (row: TData) => {
      const key = getRowKey(row);
      const newExpanded = new Set(expandedRows);
      if (newExpanded.has(key)) {
        newExpanded.delete(key);
      } else {
        newExpanded.add(key);
      }
      setExpandedRows(newExpanded);
    },
    [expandedRows, getRowKey]
  );

  // 行内编辑处理函数
  const handleStartEdit = useCallback(
    (rowId: string, cellId: string, value: unknown) => {
      if (inlineEditMode === 'row') {
        setEditingRowId(rowId);
        setEditingCellId(null);
      } else {
        setEditingRowId(rowId);
        setEditingCellId(cellId);
      }
      setEditValues((prev) => ({ ...prev, [`${rowId}-${cellId}`]: value }));
    },
    [inlineEditMode]
  );

  const handleEditChange = useCallback((rowId: string, cellId: string, value: unknown) => {
    setEditValues((prev) => ({ ...prev, [`${rowId}-${cellId}`]: value }));
  }, []);

  const handleSaveEdit = useCallback(
    async (row: TData, rowId: string) => {
      if (!onInlineEditSave) return;
      const rowChanges: Partial<TData> = {};
      Object.entries(editValues).forEach(([key, value]) => {
        if (key.startsWith(`${rowId}-`)) {
          const fieldKey = key.replace(`${rowId}-`, '') as keyof TData;
          rowChanges[fieldKey] = value as TData[keyof TData];
        }
      });
      if (Object.keys(rowChanges).length > 0) {
        await onInlineEditSave(row, rowChanges);
      }
      setEditingRowId(null);
      setEditingCellId(null);
      setEditValues({});
    },
    [editValues, onInlineEditSave]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingRowId(null);
    setEditingCellId(null);
    setEditValues({});
  }, []);

  const executeExport = useCallback(
    (format: string, exportFn: () => ExportResult) => {
      const handleResult = (result: ExportResult) => {
        if (result.success) {
          onExportSuccess?.();
        } else {
          onExportError?.(
            result.error instanceof Error ? result.error : new Error(String(result.error))
          );
        }
      };

      if (customExportData) {
        const rows = table.getFilteredRowModel().rows.map((r) => r.original);
        const result = customExportData(format, columns, rows);
        if ('then' in result && typeof (result as Promise<ExportResult>).then === 'function') {
          (result as Promise<ExportResult>).then(handleResult);
        } else {
          handleResult(result as ExportResult);
        }
      } else {
        handleResult(exportFn());
      }
    },
    [customExportData, table, columns, onExportSuccess, onExportError]
  );

  const handleExportCSV = useCallback(() => {
    setExportAnchorEl(null);
    executeExport('csv', () =>
      exportToCSV(columns, table.getFilteredRowModel().rows.map((r) => r.original), exportFileName)
    );
  }, [executeExport, columns, table, exportFileName]);

  const handleExportExcel = useCallback(() => {
    setExportAnchorEl(null);
    executeExport('excel', () =>
      exportToExcel(
        columns,
        table.getFilteredRowModel().rows.map((r) => r.original),
        exportFileName
      )
    );
  }, [executeExport, columns, table, exportFileName]);

  const hasSelected = isSelected.length > 0;
  const isAllSelected =
    hasSelected && isSelected.length === table.getFilteredRowModel().rows.length;
  const currentPageIndex = currentPage;
  const totalRecords =
    totalItems !== undefined ? totalItems : table.getFilteredRowModel().rows.length;
  const totalPageCount = totalPages !== undefined ? totalPages : table.getPageCount();

  const renderRowNumber = useCallback(
    (index: number) => {
      return currentPageIndex * pageSize + index + 1;
    },
    [currentPageIndex, pageSize]
  );

  const shouldUseMobileCard =
    controlledMobileCardView !== undefined
      ? controlledMobileCardView
      : isMobile && (Boolean(mobileCardRender) || Boolean(mobileCardTitleKey));

  const virtualRowData: VirtualRowData = useMemo(
    () => ({
      rows: table.getRowModel().rows,
      getRowKey: getRowKey as (data: unknown) => string,
      onRowClick: onRowClick as ((data: unknown) => void) | undefined,
      isSelected,
      handleSelectRow: handleSelectRow as (data: unknown) => void,
      renderRowNumber,
      handleRowExpand: handleRowExpand as (data: unknown) => void,
      expandedRows,
      showSelection,
      showRowNumber,
      enableRowExpansion,
      compact,
      striped,
      labels: mergedLabels,
    }),
    [
      table.getRowModel().rows,
      getRowKey,
      onRowClick,
      isSelected,
      handleSelectRow,
      renderRowNumber,
      handleRowExpand,
      expandedRows,
      showSelection,
      showRowNumber,
      enableRowExpansion,
      compact,
      striped,
      mergedLabels,
    ]
  );

  const renderRow = (row: Row<any>, rowIndex: number) => {
    const rowKey = getRowKey(row.original);
    const isExpanded = expandedRows.has(rowKey);

    return (
      <React.Fragment key={row.id}>
        <TableRow
          onClick={() => onRowClick?.(row.original)}
          sx={{
            cursor: onRowClick ? 'pointer' : 'default',
            '&:hover': {
              backgroundColor: onRowClick ? 'action.hover' : 'inherit',
            },
            '&:last-child td': { borderBottom: 0 },
            bgcolor: striped && row.index % 2 === 0 ? 'action.hover' : 'inherit',
            ...(compact && { fontSize: designTokens.typography.fontSize.scale['0.875rem'] }),
          }}
        >
          {showSelection && (
            <TableCell
              padding='checkbox'
              sx={{
                position: 'sticky',
                left: 0,
                zIndex: 1,
                bgcolor: 'inherit',
                width: 40,
              }}
            >
              <Checkbox
                checked={isSelected.includes(rowKey)}
                onChange={() => handleSelectRow(row.original)}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              />
            </TableCell>
          )}
          {showRowNumber && (
            <TableCell
              sx={{
                whiteSpace: 'nowrap',
                fontSize: 14,
                fontWeight: 500,
                position: showSelection ? 'sticky' : 'relative',
                left: showSelection ? 56 : 0,
                zIndex: 1,
                bgcolor: 'inherit',
              }}
            >
              {renderRowNumber(rowIndex)}
            </TableCell>
          )}
          {enableRowExpansion && (
            <TableCell
              sx={{
                whiteSpace: 'nowrap',
                fontSize: 14,
                position: showSelection || showRowNumber ? 'sticky' : 'relative',
                left: (showSelection ? 56 : 0) + (showRowNumber ? 64 : 0),
                zIndex: 1,
                bgcolor: 'inherit',
              }}
            >
              <IconButton
                size='small'
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleRowExpand(row.original);
                }}
                aria-label={isExpanded ? mergedLabels.collapseLabel : mergedLabels.expandLabel}
              >
                {isExpanded ? (
                  <ChevronUp style={{ width: 18, height: 18 }} />
                ) : (
                  <ChevronDown style={{ width: 18, height: 18 }} />
                )}
              </IconButton>
            </TableCell>
          )}
          {row.getVisibleCells().map((cell: Cell<any, any>) => {
            const isEditable = enableInlineEdit && editableColumns.includes(cell.id);
            const isEditing =
              editingRowId === rowKey && (inlineEditMode === 'row' || editingCellId === cell.id);
            const editValue = editValues[`${rowKey}-${cell.id}`];
            const currentValue = cell.getValue() ?? '';
            return (
              <TableCell
                key={cell.id}
                sx={{
                  whiteSpace: 'nowrap',
                  fontSize: 14,
                  ...(compact && { py: 1 }),
                  ...(isEditing && { backgroundColor: 'rgba(255, 235, 59, 0.12)' }),
                }}
              >
                {isEditable && isEditing ? (
                  <EditCellComponent
                    cell={cell}
                    editValue={editValue}
                    currentValue={currentValue}
                    rowKey={rowKey}
                    onEditChange={handleEditChange}
                    onSaveEdit={() => {
                      if (inlineEditMode === 'cell') {
                        handleSaveEdit(row.original, rowKey);
                      }
                    }}
                    inlineEditMode={inlineEditMode}
                  />
                ) : isEditable && !isEditing ? (
                  <div
                    role='button'
                    tabIndex={0}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleStartEdit(rowKey, cell.id, currentValue);
                    }}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleStartEdit(rowKey, cell.id, currentValue);
                      }
                    }}
                    style={{
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      color: theme.palette.primary.main,
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ) : (
                  flexRender(cell.column.columnDef.cell, cell.getContext())
                )}
              </TableCell>
            );
          })}
          {enableInlineEdit && editingRowId === rowKey && inlineEditMode === 'row' && (
            <TableCell sx={{ whiteSpace: 'nowrap' }}>
              <Stack
                direction='row'
                spacing={1}
              >
                <IconButton
                  size='small'
                  color='success'
                  onClick={() => handleSaveEdit(row.original, rowKey)}
                  aria-label={mergedLabels.saveAriaLabel}
                >
                  <Save style={{ width: 16, height: 16 }} />
                </IconButton>
                <IconButton
                  size='small'
                  color='error'
                  onClick={handleCancelEdit}
                  aria-label={mergedLabels.cancelAriaLabel}
                >
                  <XCircle style={{ width: 16, height: 16 }} />
                </IconButton>
              </Stack>
            </TableCell>
          )}
        </TableRow>
        {enableRowExpansion && isExpanded && expandedRowRender && (
          <TableRow key={`${row.id}-expanded`}>
            <TableCell
              colSpan={
                columns.length +
                (showSelection ? 1 : 0) +
                (showRowNumber ? 1 : 0) +
                (enableRowExpansion ? 1 : 0) +
                (enableInlineEdit && editingRowId === rowKey && inlineEditMode === 'row' ? 1 : 0)
              }
              sx={{
                padding: 2,
                bgcolor: 'grey.50',
                borderTop: '1px solid',
                borderTopColor: 'divider',
              }}
            >
              {expandedRowRender(row.original)}
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, ...sx }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 2,
              width: '100%',
            }}
          >
            {showSearch && searchKey && (
              <TextField
                size='small'
                placeholder={mergedLabels.searchPlaceholder}
                value={localSearch}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  handleSearch(event.target.value)
                }
                sx={{ width: '100%', maxWidth: 320 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <Search style={{ width: 16, height: 16, marginRight: 4, color: 'text.secondary' }} />
                    ),
                  },
                }}
              />
            )}

            {enableAdvancedFilter && advancedFilters.length > 0 && (
              <Button
                variant='outlined'
                size='small'
                onClick={() => setShowAdvancedFilterDialog(true)}
                startIcon={<Filter style={{ width: 16, height: 16 }} />}
              >
                {mergedLabels.advancedFilterTitle}
              </Button>
            )}
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {showRefresh && onRefresh && (
              <Button
                variant='outlined'
                size='small'
                onClick={onRefresh}
                startIcon={<RefreshCw style={{ width: 16, height: 16 }} />}
              >
                {mergedLabels.refreshLabel}
              </Button>
            )}

            {showExport && (
              <>
                <Button
                  variant='outlined'
                  size='small'
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                    setExportAnchorEl(e.currentTarget)
                  }
                  endIcon={<ChevronDown style={{ width: 16, height: 16 }} />}
                  startIcon={<Download style={{ width: 16, height: 16 }} />}
                >
                  {mergedLabels.exportLabel}
                </Button>
                <Menu
                  anchorEl={exportAnchorEl}
                  open={Boolean(exportAnchorEl)}
                  onClose={() => setExportAnchorEl(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <MenuItem onClick={handleExportCSV}>{mergedLabels.exportCsvLabel}</MenuItem>
                  <MenuItem onClick={handleExportExcel}>{mergedLabels.exportExcelLabel}</MenuItem>
                </Menu>
              </>
            )}

            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Button
                variant='outlined'
                size='small'
                onClick={handleMenuOpen}
                startIcon={<Settings2 style={{ width: 16, height: 16 }} />}
              >
                {mergedLabels.columnSettingsLabel}
              </Button>
            </Box>

            {showCreate && onCreate && (
              <Button
                variant='contained'
                size='small'
                onClick={onCreate}
                startIcon={<Plus style={{ width: 16, height: 16 }} />}
              >
                {mergedLabels.createLabel}
              </Button>
            )}

            {extraActions}
          </Box>
        </Box>

        {hasSelected && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: 'primary.light',
              px: 2,
              py: 1.5,
              borderRadius: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                component='span'
                sx={{ fontSize: designTokens.typography.fontSize.scale['0.875rem'], color: 'primary.dark' }}
              >
                {mergedLabels.selectedLabel}{' '}
                <Chip
                  label={isSelected.length}
                  size='small'
                  color='primary'
                  sx={{ mx: 0.5 }}
                />{' '}
                {mergedLabels.recordsLabel}
              </Box>
            </Box>
            {onSelectionChange && (
              <Button
                variant='outlined'
                size='small'
                onClick={() => onSelectionChange([])}
              >
                {mergedLabels.cancelSelectionLabel}
              </Button>
            )}
          </Box>
        )}
      </Box>

      {/* 列设置菜单 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem sx={{ fontWeight: 600, fontSize: 14 }}>
          {mergedLabels.showHideColumnsLabel}
        </MenuItem>
        <Divider />
        {table.getAllLeafColumns().map((column) => (
          <MenuItem
            key={column.id}
            onClick={() => column.toggleVisibility()}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              minWidth: 180,
            }}
          >
            <span>{(column.columnDef.header as string) || column.id}</span>
            {column.getIsVisible() ? (
              <Eye style={{ width: 16, height: 16, color: 'success.main' }} />
            ) : (
              <EyeOff style={{ width: 16, height: 16, color: 'text.disabled' }} />
            )}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            const defaultVisibility: VisibilityState = {};
            table.getAllLeafColumns().forEach((col) => {
              defaultVisibility[col.id] = true;
            });
            setColumnVisibility(defaultVisibility);
            handleMenuClose();
          }}
        >
          {mergedLabels.resetColumnsLabel}
        </MenuItem>
      </Menu>

      {/* 数据区域：移动端使用卡片视图，桌面端使用表格视图 */}
      {shouldUseMobileCard ? (
        <Box
          sx={{
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            overflow: 'hidden',
          }}
        >
          <MobileCardView
            data={data}
            cardRender={mobileCardRender}
            titleKey={mobileCardTitleKey}
            subtitleKey={mobileCardSubtitleKey}
            fieldLabels={mobileFieldLabels}
            displayFields={mobileDisplayFields}
            onRowClick={onRowClick}
            loading={loading}
            emptyMessage={mergedLabels.emptyMessage}
            getRowKey={getRowKey}
            showSelection={showSelection}
            selectedIds={isSelected}
            onSelectionChange={(row, selected) => {
              const rowKey = getRowKey(row);
              const newSelected = selected
                ? [...isSelected, rowKey]
                : isSelected.filter((id) => id !== rowKey);
              setInternalSelected(newSelected);
              onSelectionChange?.(newSelected);
            }}
            labels={mergedLabels}
          />
        </Box>
      ) : (
        /* 表格区域 */
        <Box
          sx={{
            borderRadius: 1,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ overflowX: responsive ? 'auto' : 'hidden' }}>
            <Table
              sx={{
                minWidth: 640,
                ...(enableStickyHeader && {
                  thead: {
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    bgcolor: 'grey.50',
                  },
                }),
              }}
            >
              <TableHead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    sx={{ bgcolor: 'grey.50' }}
                  >
                    {showSelection && (
                      <TableCell
                        padding='checkbox'
                        sx={{
                          position: 'sticky',
                          left: 0,
                          zIndex: 2,
                          bgcolor: 'grey.50',
                          width: 40,
                        }}
                      >
                        <Checkbox
                          checked={isAllSelected}
                          onChange={(_e) => handleSelectAll()}
                          indeterminate={hasSelected && !isAllSelected}
                        />
                      </TableCell>
                    )}
                    {showRowNumber && (
                      <TableCell
                        sx={{
                          whiteSpace: 'nowrap',
                          fontWeight: 600,
                          fontSize: 12,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          color: 'text.secondary',
                          position: showSelection ? 'sticky' : 'relative',
                          left: showSelection ? 56 : 0,
                          zIndex: 2,
                          bgcolor: 'grey.50',
                        }}
                      >
                        #
                      </TableCell>
                    )}
                    {enableRowExpansion && (
                      <TableCell
                        sx={{
                          whiteSpace: 'nowrap',
                          fontWeight: 600,
                          fontSize: 12,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          color: 'text.secondary',
                          position: showSelection || showRowNumber ? 'sticky' : 'relative',
                          left: (showSelection ? 56 : 0) + (showRowNumber ? 64 : 0),
                          zIndex: 2,
                          bgcolor: 'grey.50',
                        }}
                      >
                        {mergedLabels.expandLabel}
                      </TableCell>
                    )}
                    {headerGroup.headers.map((header) => (
                      <TableCell
                        key={header.id}
                        sx={{
                          whiteSpace: 'nowrap',
                          fontWeight: 600,
                          fontSize: 12,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          color: 'text.secondary',
                        }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={
                        columns.length +
                        (showSelection ? 1 : 0) +
                        (showRowNumber ? 1 : 0) +
                        (enableRowExpansion ? 1 : 0)
                      }
                      sx={{ height: 96, textAlign: 'center' }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1,
                        }}
                      >
                        <Skeleton
                          variant='circular'
                          width={24}
                          height={24}
                          animation='wave'
                        />
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          {mergedLabels.loadingLabel}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length ? (
                  enableVirtualization ? (
                    <TableRow>
                      <TableCell
                        colSpan={
                          columns.length +
                          (showSelection ? 1 : 0) +
                          (showRowNumber ? 1 : 0) +
                          (enableRowExpansion ? 1 : 0)
                        }
                        sx={{ p: 0 }}
                      >
                        <List
                          height={virtualHeight}
                          itemCount={table.getRowModel().rows.length}
                          itemSize={rowHeight}
                          itemData={virtualRowData}
                          width='100%'
                        >
                          {DataTableVirtualRow}
                        </List>
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map((row, rowIndex) => renderRow(row, rowIndex))
                  )
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={
                        columns.length +
                        (showSelection ? 1 : 0) +
                        (showRowNumber ? 1 : 0) +
                        (enableRowExpansion ? 1 : 0)
                      }
                      sx={{ height: 120, textAlign: 'center' }}
                    >
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {mergedLabels.emptyMessage}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Box>
      )}

      {/* 分页栏 */}
      {enablePagination && totalPageCount > 1 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            py: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1, sm: 2 },
              flexWrap: 'wrap',
            }}
          >
            {showSelection && isSelected.length > 0 && (
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {mergedLabels.selectedLabel} {isSelected.length} {mergedLabels.recordsLabel}
              </Typography>
            )}
            <Typography
              variant='body2'
              color='text.secondary'
            >
              Total {totalRecords} {mergedLabels.recordsLabel}
            </Typography>
            {onPageSizeChange && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {mergedLabels.perPageLabel}
                </Typography>
                <Select
                  size='small'
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  sx={{ minWidth: 70, height: 32 }}
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={20}>20</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </Select>
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant='outlined'
              size='small'
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            >
              {mergedLabels.previousPageLabel}
            </Button>
            <IconButton
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              sx={{ display: { xs: 'flex', sm: 'none' } }}
              aria-label={mergedLabels.previousPageAriaLabel}
            >
              <ChevronLeft style={{ width: 20, height: 20 }} />
            </IconButton>

            <Typography
              variant='body2'
              sx={{ minWidth: 100, textAlign: 'center' }}
            >
              {mergedLabels.pageInfo?.(currentPageIndex + 1, totalPageCount)}
            </Typography>

            <Button
              variant='outlined'
              size='small'
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            >
              {mergedLabels.nextPageLabel}
            </Button>
            <IconButton
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              sx={{ display: { xs: 'flex', sm: 'none' } }}
              aria-label={mergedLabels.nextPageAriaLabel}
            >
              <ChevronRight style={{ width: 20, height: 20 }} />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* 高级筛选对话框 */}
      {enableAdvancedFilter && advancedFilters.length > 0 && (
        <Dialog
          open={showAdvancedFilterDialog}
          onClose={() => setShowAdvancedFilterDialog(false)}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle>{mergedLabels.advancedFilterTitle}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              {advancedFilters.map((filter) => (
                <Box
                  key={String(filter.key)}
                  sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
                >
                  <Box
                    sx={{
                      fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                      fontWeight: 500,
                      color: 'text.primary',
                    }}
                  >
                    {filter.label}
                  </Box>
                  {filter.type === 'select' && filter.options ? (
                    <Box
                      component='select'
                      value={filter.value || ''}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        filter.onChange?.(e.target.value)
                      }
                      sx={{
                        width: '100%',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        px: 1.5,
                        py: 1,
                        fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                        outline: 'none',
                        '&:focus': { borderColor: 'primary.main' },
                      }}
                    >
                      <option value=''>{mergedLabels.allOptionLabel}</option>
                      {filter.options.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ))}
                    </Box>
                  ) : (
                    <TextField
                      type={filter.type}
                      size='small'
                      value={filter.value || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        filter.onChange?.(e.target.value)
                      }
                      sx={{ width: '100%' }}
                    />
                  )}
                </Box>
              ))}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 1,
                  mt: 2,
                }}
              >
                <Button
                  variant='outlined'
                  onClick={() => {
                    advancedFilters.forEach((f) => f.onChange?.(''));
                    setShowAdvancedFilterDialog(false);
                  }}
                >
                  {mergedLabels.resetFilterLabel}
                </Button>
                <Button
                  variant='contained'
                  onClick={() => setShowAdvancedFilterDialog(false)}
                >
                  {mergedLabels.applyFilterLabel}
                </Button>
              </Box>
            </Box>
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
}

// ============ 默认导出 ============
const MemoizedDataTable = React.memo(DataTable) as typeof DataTable;
export default MemoizedDataTable;
