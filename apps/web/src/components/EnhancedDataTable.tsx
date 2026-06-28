import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  TextField,
  Box,
  Checkbox,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Menu,
  MenuItem,
  MenuList,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
  Button,
} from '@mui/material';
import React, { useMemo, useCallback } from 'react';
import type {
  ColumnDef,
  RowData,
  SortingState,
  ColumnFiltersState,
  PaginationState,
  VisibilityState,
} from '@tanstack/react-table';
import {
  flexRender,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';
import {
  Download,
  Settings2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';

import { useAppStore } from '@/store';
import { useExportData } from '@/hooks/useDataTable';

export interface EnhancedDataTableProps<TData extends RowData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  loading?: boolean;
  onRowClick?: (_row: TData) => void;
  exportFileName?: string;
  enablePagination?: boolean;
  pageCount?: number;
  totalPages?: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange?: (_page: number) => void;
  onPageSizeChange?: (size: number) => void;
  currentPage?: number;
  responsive?: boolean;
  onRefresh?: () => void;
  enableSelection?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (_ids: string[]) => void;
  selectionKey?: keyof TData;
  enableAdvancedFilter?: boolean;
  advancedFilters?: {
    label: string;
    key: string;
    type: 'text' | 'select' | 'date' | 'number';
    options?: { value: string; label: string }[];
    value?: string;
    onChange?: (_value: string) => void;
  }[];
  emptyState?: React.ReactNode;
  striped?: boolean;
  compact?: boolean;
}

export function EnhancedDataTable<TData extends RowData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = '搜索...',
  loading,
  onRowClick,
  exportFileName = 'export',
  enablePagination = false,
  pageCount = 1,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  currentPage = 0,
  responsive = true,
  onRefresh,
  enableSelection = false,
  selectedIds = [],
  onSelectionChange,
  selectionKey,
  enableAdvancedFilter = false,
  advancedFilters = [],
  emptyState,
  striped = true,
  compact = false,
}: EnhancedDataTableProps<TData, TValue>) {
  const [localSearch, setLocalSearch] = React.useState('');
  const [showAdvancedFilter, setShowAdvancedFilter] = React.useState(false);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: currentPage,
    pageSize,
  });
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [exportAnchorEl, setExportAnchorEl] = React.useState<null | HTMLElement>(null);
  const [settingsAnchorEl, setSettingsAnchorEl] = React.useState<null | HTMLElement>(null);
  const addNotification = useAppStore((state) => state.addNotification);

  const { exportToCSV, exportToExcel } = useExportData(columns);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      pagination,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
  });

  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      if (searchKey) {
        const column = table.getColumn(searchKey);
        if (column) {
          column.setFilterValue(value);
        }
      }
    },
    [searchKey, table]
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (onSelectionChange && selectionKey) {
        if (checked) {
          const allIds = table
            .getFilteredRowModel()
            .rows.map((row) => String(row.original[selectionKey]));
          onSelectionChange(allIds);
        } else {
          onSelectionChange([]);
        }
      }
    },
    [onSelectionChange, table, selectionKey]
  );

  const handleSelectRow = useCallback(
    (id: string) => {
      if (onSelectionChange) {
        const newSelected = selectedIds.includes(id)
          ? selectedIds.filter((selectedId) => selectedId !== id)
          : [...selectedIds, id];
        onSelectionChange(newSelected);
      }
    },
    [onSelectionChange, selectedIds]
  );

  const handleExportCSV = useCallback(() => {
    setExportAnchorEl(null);
    const result = exportToCSV(
      table.getFilteredRowModel().rows.map((r) => r.original),
      exportFileName
    );
    if (result.success) {
      addNotification({
        title: '导出成功',
        message: '数据已成功导出为 CSV 文件',
        type: 'success',
      });
    } else {
      addNotification({
        title: '导出失败',
        message: '导出过程中发生错误',
        type: 'error',
      });
    }
  }, [exportToCSV, table, exportFileName, addNotification]);

  const handleExportExcel = useCallback(() => {
    setExportAnchorEl(null);
    const result = exportToExcel(
      table.getFilteredRowModel().rows.map((r) => r.original),
      exportFileName
    );
    if (result.success) {
      addNotification({
        title: '导出成功',
        message: '数据已成功导出为 Excel 文件',
        type: 'success',
      });
    } else {
      addNotification({
        title: '导出失败',
        message: '导出过程中发生错误',
        type: 'error',
      });
    }
  }, [exportToExcel, table, exportFileName, addNotification]);

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      if (enablePagination && onPageSizeChange) {
        onPageSizeChange(newSize);
      } else {
        setPagination({ ...pagination, pageSize: newSize, pageIndex: 0 });
      }
    },
    [enablePagination, onPageSizeChange, setPagination, pagination]
  );

  const hasSelected = selectedIds.length > 0;
  const isAllSelected =
    hasSelected && selectedIds.length === table.getFilteredRowModel().rows.length;

  const displayPageCount = useMemo(() => {
    return totalPages || pageCount || table.getPageCount();
  }, [totalPages, pageCount, table]);

  const displayPageIndex = useMemo(() => {
    return enablePagination ? currentPage : (table.getState().pagination?.pageIndex ?? 0);
  }, [enablePagination, currentPage, table]);

  const pageButtons = useMemo(() => {
    const count = Math.min(displayPageCount, 5);
    return Array.from({ length: count }, (_, i) => {
      const pageNum = enablePagination ? i : displayPageIndex + i - 2;
      return Math.max(0, pageNum);
    });
  }, [displayPageCount, enablePagination, displayPageIndex]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
            {searchKey && (
              <Box sx={{ position: 'relative', width: '100%', maxWidth: 320 }}>
                <Search
                  sx={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 16,
                    height: 16,
                    color: 'action.disabled',
                  }}
                />
                <TextField
                  size='small'
                  placeholder={searchPlaceholder}
                  value={localSearch}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  sx={{ width: '100%', pl: 4 }}
                />
              </Box>
            )}

            {enableAdvancedFilter && advancedFilters.length > 0 && (
              <Button
                variant='outlined'
                size='small'
                onClick={() => setShowAdvancedFilter(true)}
                startIcon={<Filter style={{ width: 16, height: 16 }} />}
              >
                高级筛选
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
            {onRefresh && (
              <Button
                variant='outlined'
                size='small'
                onClick={onRefresh}
                startIcon={<RefreshCw style={{ width: 16, height: 16 }} />}
              >
                刷新
              </Button>
            )}

            <Button
              variant='outlined'
              size='small'
              onClick={(e) => setExportAnchorEl(e.currentTarget)}
              endIcon={<ChevronDown style={{ width: 16, height: 16 }} />}
              startIcon={<Download style={{ width: 16, height: 16 }} />}
            >
              导出
            </Button>
            <Menu
              anchorEl={exportAnchorEl}
              open={Boolean(exportAnchorEl)}
              onClose={() => setExportAnchorEl(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={handleExportCSV}>导出 CSV</MenuItem>
              <MenuItem onClick={handleExportExcel}>导出 Excel</MenuItem>
            </Menu>

            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Button
                variant='outlined'
                size='small'
                onClick={(e) => setSettingsAnchorEl(e.currentTarget)}
                startIcon={<Settings2 style={{ width: 16, height: 16 }} />}
              >
                列设置
              </Button>
              <Menu
                anchorEl={settingsAnchorEl}
                open={Boolean(settingsAnchorEl)}
                onClose={() => setSettingsAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <MenuList>
                  <Box sx={{ px: 2, py: 1, fontWeight: 500, fontSize: '0.875rem' }}>
                    显示/隐藏列
                  </Box>
                  <Divider />
                  {table.getAllLeafColumns().map((column) => (
                    <MenuItem
                      key={column.id}
                      onClick={() => column.toggleVisibility()}
                      sx={{ display: 'flex', justifyContent: 'space-between' }}
                    >
                      <span>{(column.columnDef.header as string) || column.id}</span>
                      {column.getIsVisible() ? (
                        <Eye style={{ width: 16, height: 16, color: 'green' }} />
                      ) : (
                        <EyeOff style={{ width: 16, height: 16, color: 'gray' }} />
                      )}
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu>
            </Box>
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
              <span style={{ fontSize: '0.875rem', color: 'primary.dark' }}>
                已选择{' '}
                <Chip
                  label={selectedIds.length}
                  size='small'
                  color='primary'
                  sx={{ mx: 0.5 }}
                />{' '}
                条记录
              </span>
            </Box>
            <Button
              variant='outlined'
              size='small'
              onClick={() => onSelectionChange?.([])}
            >
              取消选择
            </Button>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          borderRadius: 1,
          overflow: 'hidden',
          border: 1,
          borderColor: 'divider',
        }}
      >
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size={compact ? 'small' : 'medium'}>
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {enableSelection && (
                    <TableCell sx={{ width: 40 }}>
                      <Checkbox
                        checked={isAllSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        indeterminate={hasSelected && !isAllSelected}
                      />
                    </TableCell>
                  )}
                  {headerGroup.headers.map((header) => (
                    <TableCell
                      key={header.id}
                      sx={{
                        whiteSpace: 'nowrap',
                        ...(compact && { py: 1, fontSize: '0.75rem' }),
                      }}
                    >
                      {header.isPlaceholder ? null : (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            cursor: 'pointer',
                          }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <ChevronDown
                              sx={{
                                width: 12,
                                height: 12,
                                color: 'action.disabled',
                              }}
                            />
                          )}
                        </Box>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (enableSelection ? 1 : 0)}
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
                      <CircularProgress size={16} />
                      <span>加载中...</span>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    onClick={() => onRowClick?.(row.original)}
                    sx={{
                      cursor: onRowClick ? 'pointer' : 'default',
                      '&:hover': {
                        bgcolor: onRowClick ? 'action.hover' : 'inherit',
                      },
                      bgcolor: striped && row.index % 2 === 0 ? 'action.hover' : 'inherit',
                      ...(compact && { fontSize: '0.875rem' }),
                    }}
                  >
                    {enableSelection && (
                      <TableCell sx={{ width: 40 }}>
                        <Checkbox
                          checked={
                            selectionKey
                              ? selectedIds.includes(String(row.original[selectionKey]))
                              : false
                          }
                          onChange={() =>
                            selectionKey && handleSelectRow(String(row.original[selectionKey]))
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                    )}
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        sx={{ whiteSpace: 'nowrap', ...(compact && { py: 1 }) }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (enableSelection ? 1 : 0)}
                    sx={{ height: 96, textAlign: 'center' }}
                  >
                    {emptyState || (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <Box sx={{ color: 'text.disabled' }}>暂无数据</Box>
                        <Button
                          variant='outlined'
                          size='small'
                          onClick={onRefresh}
                        >
                          刷新数据
                        </Button>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {(enablePagination || table.getPageCount() > 1) && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span style={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                {totalItems !== undefined
                  ? `共 ${totalItems} 条记录`
                  : `共 ${table.getFilteredRowModel().rows.length} 条记录`}
              </span>
              {(onPageSizeChange || !enablePagination) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span style={{ fontSize: '0.875rem', color: 'text.secondary' }}>每页</span>
                  <Box
                    component='select'
                    value={enablePagination ? pageSize : pagination.pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      px: 1,
                      py: 0.5,
                      fontSize: '0.875rem',
                      outline: 'none',
                      '&:focus': { borderColor: 'primary.main', boxShadow: 1 },
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </Box>
                </Box>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Button
                variant='outlined'
                size='small'
                onClick={() => {
                  if (enablePagination && onPageChange) {
                    onPageChange(currentPage - 1);
                  } else {
                    table.previousPage();
                  }
                }}
                disabled={(enablePagination && currentPage <= 0) || !table.getCanPreviousPage()}
                sx={{
                  display: { xs: 'flex', sm: 'none' },
                  minWidth: 32,
                  p: 0.5,
                }}
              >
                <ChevronLeft style={{ width: 16, height: 16 }} />
              </Button>
              <Button
                variant='outlined'
                size='small'
                onClick={() => {
                  if (enablePagination && onPageChange) {
                    onPageChange(currentPage - 1);
                  } else {
                    table.previousPage();
                  }
                }}
                disabled={(enablePagination && currentPage <= 0) || !table.getCanPreviousPage()}
                sx={{ display: { xs: 'none', sm: 'flex' } }}
              >
                上一页
              </Button>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {pageButtons.map((pageNum) => (
                  <Button
                    key={pageNum}
                    variant={displayPageIndex === pageNum ? 'contained' : 'outlined'}
                    size='small'
                    onClick={() => {
                      if (enablePagination && onPageChange) {
                        onPageChange(pageNum);
                      } else {
                        table.setPageIndex(pageNum);
                      }
                    }}
                    disabled={pageNum < 0 || pageNum >= displayPageCount}
                  >
                    {pageNum + 1}
                  </Button>
                ))}
              </Box>

              <Button
                variant='outlined'
                size='small'
                onClick={() => {
                  if (enablePagination && onPageChange) {
                    onPageChange(currentPage + 1);
                  } else {
                    table.nextPage();
                  }
                }}
                disabled={
                  (enablePagination && currentPage >= (totalPages || 1) - 1) ||
                  !table.getCanNextPage()
                }
                sx={{ display: { xs: 'none', sm: 'flex' } }}
              >
                下一页
              </Button>
              <Button
                variant='outlined'
                size='small'
                onClick={() => {
                  if (enablePagination && onPageChange) {
                    onPageChange(currentPage + 1);
                  } else {
                    table.nextPage();
                  }
                }}
                disabled={
                  (enablePagination && currentPage >= (totalPages || 1) - 1) ||
                  !table.getCanNextPage()
                }
                sx={{
                  display: { xs: 'flex', sm: 'none' },
                  minWidth: 32,
                  p: 0.5,
                }}
              >
                <ChevronRight style={{ width: 16, height: 16 }} />
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {/* 高级筛选对话框 */}
      <Dialog
        open={showAdvancedFilter}
        onClose={() => setShowAdvancedFilter(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>高级筛选</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {advancedFilters.map((filter) => (
              <Box
                key={String(filter.key)}
                sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
              >
                <Box
                  sx={{
                    fontSize: '0.875rem',
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
                    onChange={(e) => filter.onChange?.(e.target.value)}
                    sx={{
                      width: '100%',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      px: 1.5,
                      py: 1,
                      fontSize: '0.875rem',
                      outline: 'none',
                      '&:focus': { borderColor: 'primary.main' },
                    }}
                  >
                    <option value=''>全部</option>
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
                    onChange={(e) => filter.onChange?.(e.target.value)}
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
                  setShowAdvancedFilter(false);
                }}
              >
                重置
              </Button>
              <Button
                variant='contained'
                onClick={() => setShowAdvancedFilter(false)}
              >
                应用筛选
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
