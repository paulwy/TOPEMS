import React, { useMemo, useCallback } from "react";
import type {
  ColumnDef,
  RowData,
  SortingState,
  ColumnFiltersState,
  PaginationState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  flexRender,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
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
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store";
import { useExportData } from "@/hooks/useDataTable";

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
  onPageSizeChange?: (_size: number) => void;
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
    type: "text" | "select" | "date" | "number";
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
  searchPlaceholder = "搜索...",
  loading,
  onRowClick,
  exportFileName = "export",
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
  const [localSearch, setLocalSearch] = React.useState("");
  const [showAdvancedFilter, setShowAdvancedFilter] = React.useState(false);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: currentPage,
    pageSize: pageSize,
  });
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const addNotification = useAppStore((state) => state.addNotification);

  const { exportToCSV, exportToExcel } = useExportData(columns);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      pagination: enablePagination ? pagination : undefined,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enablePagination
      ? getPaginationRowModel()
      : undefined,
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
    [searchKey, table],
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
    [onSelectionChange, table, selectionKey],
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
    [onSelectionChange, selectedIds],
  );

  const handleExportCSV = useCallback(() => {
    const result = exportToCSV(
      table.getFilteredRowModel().rows.map((r) => r.original),
      exportFileName,
    );
    if (result.success) {
      addNotification({
        title: "导出成功",
        message: "数据已成功导出为 CSV 文件",
        type: "success",
      });
    } else {
      addNotification({
        title: "导出失败",
        message: "导出过程中发生错误",
        type: "error",
      });
    }
  }, [exportToCSV, table, exportFileName, addNotification]);

  const handleExportExcel = useCallback(() => {
    const result = exportToExcel(
      table.getFilteredRowModel().rows.map((r) => r.original),
      exportFileName,
    );
    if (result.success) {
      addNotification({
        title: "导出成功",
        message: "数据已成功导出为 Excel 文件",
        type: "success",
      });
    } else {
      addNotification({
        title: "导出失败",
        message: "导出过程中发生错误",
        type: "error",
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
    [enablePagination, onPageSizeChange, setPagination, pagination],
  );

  const hasSelected = selectedIds.length > 0;
  const isAllSelected =
    hasSelected &&
    selectedIds.length === table.getFilteredRowModel().rows.length;

  const displayPageCount = useMemo(() => {
    return totalPages || pageCount || table.getPageCount();
  }, [totalPages, pageCount, table]);

  const displayPageIndex = useMemo(() => {
    return enablePagination
      ? currentPage
      : (table.getState().pagination?.pageIndex ?? 0);
  }, [enablePagination, currentPage, table]);

  const pageButtons = useMemo(() => {
    const count = Math.min(displayPageCount, 5);
    return Array.from({ length: count }, (_, i) => {
      const pageNum = enablePagination ? i : displayPageIndex + i - 2;
      return Math.max(0, pageNum);
    });
  }, [displayPageCount, enablePagination, displayPageIndex]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
          {searchKey && (
            <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={searchPlaceholder}
                value={localSearch}
                onChange={(event) => handleSearchChange(event.target.value)}
                className="w-full sm:w-auto pl-10"
              />
            </div>
          )}

          {enableAdvancedFilter && advancedFilters.length > 0 && (
            <Dialog
              open={showAdvancedFilter}
              onOpenChange={setShowAdvancedFilter}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  高级筛选
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>高级筛选</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  {advancedFilters.map((filter) => (
                    <div key={String(filter.key)} className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        {filter.label}
                      </label>
                      {filter.type === "select" && filter.options ? (
                        <select
                          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                          value={filter.value || ""}
                          onChange={(e) => filter.onChange?.(e.target.value)}
                        >
                          <option value="">全部</option>
                          {filter.options.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          type={filter.type}
                          value={filter.value || ""}
                          onChange={(e) => filter.onChange?.(e.target.value)}
                          className="w-full"
                        />
                      )}
                    </div>
                  ))}
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        advancedFilters.forEach((f) => f.onChange?.(""));
                        setShowAdvancedFilter(false);
                      }}
                    >
                      重置
                    </Button>
                    <Button onClick={() => setShowAdvancedFilter(false)}>
                      应用筛选
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              刷新
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                导出
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>选择导出格式</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportCSV}>
                导出 CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel}>
                导出 Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hidden sm:flex">
                <Settings2 className="mr-2 h-4 w-4" />
                列设置
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>显示/隐藏列</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table.getAllLeafColumns().map((column) => (
                <DropdownMenuItem
                  key={column.id}
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => column.toggleVisibility()}
                >
                  <span>
                    {(column.columnDef.header as string) || column.id}
                  </span>
                  {column.getIsVisible() ? (
                    <Eye className="h-4 w-4 text-green-500" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {hasSelected && (
        <div className="flex items-center justify-between bg-blue-50 px-4 py-3 rounded-lg">
          <div className="flex items-center gap-4">
            <span className="text-sm text-blue-700">
              已选择{" "}
              <Badge variant="default" className="ml-2">
                {selectedIds.length}
              </Badge>{" "}
              条记录
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectionChange?.([])}
          >
            取消选择
          </Button>
        </div>
      )}

      <div
        className={`rounded-md border overflow-hidden ${
          responsive ? "overflow-x-auto" : ""
        }`}
      >
        <div className="min-w-[640px]">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {enableSelection && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        data-state={
                          hasSelected && !isAllSelected
                            ? "indeterminate"
                            : undefined
                        }
                      />
                    </TableHead>
                  )}
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={`whitespace-nowrap ${compact ? "py-2 text-xs" : ""}`}
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex items-center gap-1 cursor-pointer">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {header.column.getCanSort() && (
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                          )}
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (enableSelection ? 1 : 0)}
                    className="h-24 text-center"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                      <span>加载中...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    onClick={() => onRowClick?.(row.original)}
                    className={`${
                      onRowClick ? "cursor-pointer hover:bg-gray-50" : ""
                    } ${striped && row.index % 2 === 0 ? "bg-slate-50/50" : ""} ${compact ? "text-sm" : ""}`}
                  >
                    {enableSelection && (
                      <TableCell className="w-10">
                        <Checkbox
                          checked={
                            selectionKey
                              ? selectedIds.includes(
                                  String(row.original[selectionKey]),
                                )
                              : false
                          }
                          onCheckedChange={() =>
                            selectionKey &&
                            handleSelectRow(String(row.original[selectionKey]))
                          }
                        />
                      </TableCell>
                    )}
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={`whitespace-nowrap ${compact ? "py-2" : ""}`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (enableSelection ? 1 : 0)}
                    className="h-24 text-center"
                  >
                    {emptyState || (
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-slate-400">暂无数据</div>
                        <Button variant="outline" size="sm" onClick={onRefresh}>
                          刷新数据
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {(enablePagination || table.getPageCount() > 1) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-sm text-gray-500">
              {totalItems !== undefined
                ? `共 ${totalItems} 条记录`
                : `共 ${table.getFilteredRowModel().rows.length} 条记录`}
            </div>
            {(onPageSizeChange || !enablePagination) && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">每页</span>
                <select
                  value={enablePagination ? pageSize : pagination.pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (enablePagination && onPageChange) {
                  onPageChange(currentPage - 1);
                } else {
                  table.previousPage();
                }
              }}
              disabled={
                (enablePagination && currentPage <= 0) ||
                !table.getCanPreviousPage()
              }
              className="sm:hidden"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (enablePagination && onPageChange) {
                  onPageChange(currentPage - 1);
                } else {
                  table.previousPage();
                }
              }}
              disabled={
                (enablePagination && currentPage <= 0) ||
                !table.getCanPreviousPage()
              }
              className="hidden sm:flex"
            >
              上一页
            </Button>

            <div className="flex items-center gap-1">
              {pageButtons.map((pageNum) => (
                <Button
                  key={pageNum}
                  variant={displayPageIndex === pageNum ? "default" : "outline"}
                  size="sm"
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
            </div>

            <Button
              variant="outline"
              size="sm"
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
              className="hidden sm:flex"
            >
              下一页
            </Button>
            <Button
              variant="outline"
              size="icon"
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
              className="sm:hidden"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
