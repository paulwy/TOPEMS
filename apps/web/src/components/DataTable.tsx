import {
  Button,
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
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
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
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

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        {searchKey && (
          <Box
            sx={{
              width: { xs: "100%", sm: "auto" },
              flex: { sm: 1 },
              maxWidth: { sm: 280 },
            }}
          >
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={
                (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
              }
              onChange={(event) =>
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
              }
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #e0e0e0",
                borderRadius: 4,
                fontSize: 14,
              }}
            />
          </Box>
        )}

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
            justifyContent: { xs: "center", sm: "flex-end" },
          }}
        >
          <Button
            variant="outlined"
            size="small"
            onClick={handleMenuOpen}
            startIcon={<Settings2 style={{ width: 16, height: 16 }} />}
            sx={{ display: { xs: "none", sm: "flex" } }}
          >
            列设置
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem sx={{ fontWeight: 600, fontSize: 14 }}>
              显示/隐藏列
            </MenuItem>
            <Divider />
            {table.getAllLeafColumns().map((column) => (
              <MenuItem
                key={column.id}
                onClick={() => column.toggleVisibility()}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  minWidth: 180,
                }}
              >
                <span>{(column.columnDef.header as string) || column.id}</span>
                {column.getIsVisible() ? (
                  <Eye style={{ width: 16, height: 16, color: "green" }} />
                ) : (
                  <EyeOff style={{ width: 16, height: 16, color: "#999" }} />
                )}
              </MenuItem>
            ))}
          </Menu>

          <Button
            variant="outlined"
            size="small"
            onClick={exportToCSV}
            startIcon={<Download style={{ width: 16, height: 16 }} />}
            sx={{ display: { xs: "none", sm: "flex" } }}
          >
            导出 CSV
          </Button>

          <IconButton
            onClick={exportToCSV}
            sx={{ display: { xs: "flex", sm: "none" } }}
            title="导出 CSV"
          >
            <Download style={{ width: 20, height: 20 }} />
          </IconButton>
        </Box>
      </Box>

      <Box
        sx={{
          borderRadius: 1,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ overflowX: responsive ? "auto" : "hidden" }}>
          <Table sx={{ minWidth: 640 }}>
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableCell
                      key={header.id}
                      sx={{ whiteSpace: "nowrap", fontWeight: "bold" }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
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
                    colSpan={columns.length}
                    sx={{ height: 96, textAlign: "center" }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          border: 2,
                          borderColor: "grey.300",
                          borderTopColor: "grey.600",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                      <span>加载中...</span>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    onClick={() => onRowClick?.(row.original)}
                    sx={{
                      cursor: onRowClick ? "pointer" : "default",
                      "&:hover": {
                        backgroundColor: onRowClick ? "grey.50" : "inherit",
                      },
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} sx={{ whiteSpace: "nowrap" }}>
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
                    sx={{ height: 96, textAlign: "center" }}
                  >
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Box>

      {(enablePagination || table.getPageCount() > 1) && (
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            py: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 1, sm: 2 },
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {totalItems !== undefined
                ? `共 ${totalItems} 条记录`
                : `共 ${table.getFilteredRowModel().rows.length} 条记录`}
            </Typography>
            {onPageSizeChange && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  每页
                </Typography>
                <select
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  style={{
                    border: "1px solid #e0e0e0",
                    borderRadius: 4,
                    padding: "4px 8px",
                    fontSize: 14,
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </Box>
            )}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                if (enablePagination && onPageChange) {
                  onPageChange(currentPage - 1);
                } else {
                  table.previousPage();
                }
              }}
              disabled={currentPage <= 0 && !table.getCanPreviousPage()}
              sx={{ display: { xs: "none", sm: "flex" } }}
            >
              上一页
            </Button>
            <IconButton
              onClick={() => {
                if (enablePagination && onPageChange) {
                  onPageChange(currentPage - 1);
                } else {
                  table.previousPage();
                }
              }}
              disabled={currentPage <= 0 && !table.getCanPreviousPage()}
              sx={{ display: { xs: "flex", sm: "none" } }}
            >
              <ChevronLeft style={{ width: 20, height: 20 }} />
            </IconButton>
            <Typography
              variant="body2"
              sx={{ minWidth: 100, textAlign: "center" }}
            >
              第 {currentPage + 1} /{" "}
              {totalPages || pageCount || table.getPageCount()} 页
            </Typography>
            <Button
              variant="outlined"
              size="small"
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
              sx={{ display: { xs: "none", sm: "flex" } }}
            >
              下一页
            </Button>
            <IconButton
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
              sx={{ display: { xs: "flex", sm: "none" } }}
            >
              <ChevronRight style={{ width: 20, height: 20 }} />
            </IconButton>
          </Box>
        </Box>
      )}
    </Box>
  );
}
