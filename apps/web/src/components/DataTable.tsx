import React from "react";
import type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  PaginationState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import {
  Download,
  Settings2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
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
import { useAppStore } from "@/store";

interface DataTableProps<TData, TValue> {
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
}

export function DataTable<TData, TValue>({
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
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: currentPage,
    pageSize: 10,
  });
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const addNotification = useAppStore((state) => state.addNotification);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      pagination,
      columnVisibility,
    },
  });

  const exportToCSV = () => {
    try {
      const visibleColumns = table
        .getAllLeafColumns()
        .filter((column) => column.getIsVisible());
      const headerNames = visibleColumns.map(
        (col) => (col.columnDef.header as string) || col.id,
      );

      const csvData = [
        headerNames.join(","),
        ...table.getFilteredRowModel().rows.map((row) => {
          return visibleColumns
            .map((col) => {
              const value = row.getValue(col.id);
              if (typeof value === "string") {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            })
            .join(",");
        }),
      ].join("\n");

      const blob = new Blob(["\ufeff" + csvData], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${exportFileName}-${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addNotification({
        title: "导出成功",
        message: "数据已成功导出为 CSV 文件",
        type: "success",
      });
    } catch {
      addNotification({
        title: "导出失败",
        message: "导出过程中发生错误",
        type: "error",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {searchKey && (
          <div className="w-full sm:w-auto sm:flex-1 sm:max-w-sm">
            <Input
              placeholder={searchPlaceholder}
              value={
                (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
              }
              onChange={(event) =>
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
              }
              className="w-full sm:w-auto"
            />
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
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

          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="hidden sm:flex"
          >
            <Download className="mr-2 h-4 w-4" />
            导出 CSV
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={exportToCSV}
            className="sm:hidden"
            title="导出 CSV"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

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
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} className="whitespace-nowrap">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
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
                    className={
                      onRowClick ? "cursor-pointer hover:bg-gray-50" : ""
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="whitespace-nowrap">
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
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    暂无数据
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
            {onPageSizeChange && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">每页</span>
                <select
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
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
              disabled={currentPage <= 0 && !table.getCanPreviousPage()}
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
              disabled={currentPage <= 0 && !table.getCanPreviousPage()}
              className="hidden sm:flex"
            >
              上一页
            </Button>
            <span className="text-sm text-gray-500 min-w-[100px] text-center">
              第 {currentPage + 1} /{" "}
              {totalPages || pageCount || table.getPageCount()} 页
            </span>
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
                currentPage >= (totalPages || 1) - 1 && !table.getCanNextPage()
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
                currentPage >= (totalPages || 1) - 1 && !table.getCanNextPage()
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
