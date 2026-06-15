import React, { useMemo, useCallback, useState } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Checkbox,
  Typography,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Skeleton,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Eye,
  Edit,
  Trash2,
  Copy,
  Download,
} from "lucide-react";

// ============ 类型定义 ============

export interface DataGridColumn<T = any> {
  id: string;
  label: string;
  width?: number | string;
  minWidth?: number;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  renderHeader?: (
    column: DataGridColumn<T>,
    props: {
      sortDirection?: "asc" | "desc";
      sorted: boolean;
      onSort: () => void;
    },
  ) => React.ReactNode;
}

export interface DataGridAction<T = any> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  color?:
    | "primary"
    | "secondary"
    | "error"
    | "warning"
    | "success"
    | "info"
    | "default";
  disabled?: (row: T) => boolean;
  divider?: boolean;
  show?: (row: T) => boolean;
}

export interface DataGridBulkAction<T = any> {
  label: string;
  icon?: React.ReactNode;
  onClick: (rows: T[]) => void;
  color?: "primary" | "secondary" | "error" | "warning" | "success" | "info";
}

export interface DataGridProps<T = any> {
  // 数据
  columns: DataGridColumn<T>[];
  data: T[];
  rowKey?: keyof T | ((row: T) => string | number);
  loading?: boolean;
  skeletonRows?: number;

  // 行操作
  selectable?: boolean;
  actions?: DataGridAction<T>[];
  onRowClick?: (row: T) => void;

  // 分页
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };

  // 排序
  sortable?: boolean;
  defaultSortBy?: string;
  defaultSortDirection?: "asc" | "desc";
  onSort?: (sortBy: string, sortDirection: "asc" | "desc") => void;

  // 空状态
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;

  // 批量操作
  bulkActions?: DataGridBulkAction<T>[];

  // 样式
  density?: "compact" | "standard" | "comfortable";
  stickyHeader?: boolean;
  maxHeight?: number | string;

  // 选中
  selected?: (string | number)[];
  onSelectionChange?: (selected: (string | number)[]) => void;
}

// ============ DataGrid 组件 ============

export function DataGrid<T extends Record<string, any>>({
  columns,
  data,
  rowKey = "id",
  loading,
  skeletonRows = 5,
  selectable,
  actions,
  onRowClick,
  pagination,
  sortable,
  defaultSortBy,
  defaultSortDirection = "asc",
  onSort,
  emptyMessage = "暂无数据",
  emptyIcon,
  bulkActions,
  density = "standard",
  stickyHeader,
  maxHeight,
  selected = [],
  onSelectionChange,
}: DataGridProps<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [sortBy, setSortBy] = useState(defaultSortBy || "");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    defaultSortDirection,
  );
  const [actionMenu, setActionMenu] = useState<{
    anchor: HTMLElement;
    row: T;
  } | null>(null);

  // 获取行ID
  const getRowId = useCallback(
    (row: T): string | number => {
      if (typeof rowKey === "function") {
        return rowKey(row);
      }
      return row[rowKey] as string | number;
    },
    [rowKey],
  );

  // 排序处理
  const handleSort = useCallback(
    (columnId: string) => {
      const newDirection =
        sortBy === columnId && sortDirection === "asc" ? "desc" : "asc";
      setSortBy(columnId);
      setSortDirection(newDirection);
      onSort?.(columnId, newDirection);
    },
    [sortBy, sortDirection, onSort],
  );

  // 全选处理
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        const allIds = data.map((row) => getRowId(row));
        onSelectionChange?.(allIds);
      } else {
        onSelectionChange?.([]);
      }
    },
    [data, getRowId, onSelectionChange],
  );

  // 行选择处理
  const handleSelectRow = useCallback(
    (row: T, checked: boolean) => {
      const rowId = getRowId(row);
      const newSelected = checked
        ? [...selected, rowId]
        : selected.filter((id) => id !== rowId);
      onSelectionChange?.(newSelected);
    },
    [selected, getRowId, onSelectionChange],
  );

  // 动作菜单
  const handleActionClick = useCallback(
    (event: React.MouseEvent<HTMLElement>, row: T) => {
      event.stopPropagation();
      setActionMenu({ anchor: event.currentTarget, row });
    },
    [],
  );

  const handleActionMenuClose = useCallback(() => {
    setActionMenu(null);
  }, []);

  const handleActionExecute = useCallback(
    (action: DataGridAction<T>, row: T) => {
      action.onClick(row);
      handleActionMenuClose();
    },
    [handleActionMenuClose],
  );

  // 计算密度
  const densityConfig = useMemo(() => {
    switch (density) {
      case "compact":
        return { rowHeight: 40, cellPadding: "8px" };
      case "comfortable":
        return { rowHeight: 64, cellPadding: "16px" };
      default:
        return { rowHeight: 52, cellPadding: "12px" };
    }
  }, [density]);

  // 渲染表头
  const renderHeader = () => (
    <TableHead>
      <TableRow>
        {selectable && (
          <TableCell padding="checkbox" sx={{ width: 48, ...densityConfig }}>
            <Checkbox
              size="small"
              indeterminate={
                selected.length > 0 && selected.length < data.length
              }
              checked={data.length > 0 && selected.length === data.length}
              onChange={(e) => handleSelectAll(e.target.checked)}
            />
          </TableCell>
        )}
        {columns.map((column) => (
          <TableCell
            key={column.id}
            align={column.align || "left"}
            sx={{
              width: column.width,
              minWidth: column.minWidth || 100,
              whiteSpace: "nowrap",
              fontWeight: 600,
              ...densityConfig,
            }}
          >
            {column.renderHeader ? (
              column.renderHeader(column, {
                sortDirection: sortBy === column.id ? sortDirection : undefined,
                sorted: sortBy === column.id,
                onSort: () => handleSort(column.id),
              })
            ) : sortable && column.sortable !== false ? (
              <TableSortLabel
                active={sortBy === column.id}
                direction={sortBy === column.id ? sortDirection : "asc"}
                onClick={() => handleSort(column.id)}
              >
                {column.label}
              </TableSortLabel>
            ) : (
              column.label
            )}
          </TableCell>
        ))}
        {actions && actions.length > 0 && (
          <TableCell align="right" sx={{ width: 80, ...densityConfig }}>
            操作
          </TableCell>
        )}
      </TableRow>
    </TableHead>
  );

  // 渲染加载状态
  const renderSkeleton = () =>
    Array.from({ length: skeletonRows }).map((_, index) => (
      <TableRow key={index}>
        {selectable && (
          <TableCell padding="checkbox">
            <Skeleton variant="rectangular" width={20} height={20} />
          </TableCell>
        )}
        {columns.map((column) => (
          <TableCell key={column.id}>
            <Skeleton variant="text" width="80%" />
          </TableCell>
        ))}
        {actions && actions.length > 0 && (
          <TableCell>
            <Skeleton variant="text" width={40} />
          </TableCell>
        )}
      </TableRow>
    ));

  // 渲染空状态
  const renderEmpty = () => (
    <TableRow>
      <TableCell
        colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}
        align="center"
        sx={{ py: 8 }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
          }}
        >
          {emptyIcon || (
            <Typography variant="h5" sx={{ opacity: 0.3 }}>
              📋
            </Typography>
          )}
          <Typography color="text.secondary">{emptyMessage}</Typography>
        </Box>
      </TableCell>
    </TableRow>
  );

  // 渲染数据行
  const renderRows = () =>
    data.map((row, index) => {
      const rowId = getRowId(row);
      const isSelected = selected.includes(rowId);
      const visibleActions =
        actions?.filter((a) => !a.show || a.show(row)) || [];

      return (
        <TableRow
          key={rowId}
          hover
          selected={isSelected}
          onClick={() => onRowClick?.(row)}
          sx={{
            cursor: onRowClick ? "pointer" : "default",
            height: densityConfig.rowHeight,
          }}
        >
          {selectable && (
            <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                size="small"
                checked={isSelected}
                onChange={(e) => handleSelectRow(row, e.target.checked)}
              />
            </TableCell>
          )}
          {columns.map((column) => (
            <TableCell
              key={column.id}
              align={column.align || "left"}
              sx={{ padding: densityConfig.cellPadding }}
            >
              {column.render
                ? column.render(row, index)
                : (row[column.id] as React.ReactNode)}
            </TableCell>
          ))}
          {actions && actions.length > 0 && (
            <TableCell align="right" onClick={(e) => e.stopPropagation()}>
              {isMobile ? (
                <IconButton
                  size="small"
                  onClick={(e) => handleActionClick(e, row)}
                >
                  <MoreHorizontal style={{ width: 18, height: 18 }} />
                </IconButton>
              ) : (
                <Box
                  sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}
                >
                  {visibleActions.slice(0, 3).map((action, idx) => (
                    <Tooltip key={idx} title={action.label}>
                      <IconButton
                        size="small"
                        onClick={() => action.onClick(row)}
                        disabled={action.disabled?.(row)}
                        sx={{
                          color:
                            action.color && action.color !== "default"
                              ? `${action.color}.main`
                              : "text.secondary",
                        }}
                      >
                        {action.icon || (
                          <MoreHorizontal style={{ width: 16, height: 16 }} />
                        )}
                      </IconButton>
                    </Tooltip>
                  ))}
                  {visibleActions.length > 3 && (
                    <IconButton
                      size="small"
                      onClick={(e) => handleActionClick(e, row)}
                    >
                      <MoreHorizontal style={{ width: 16, height: 16 }} />
                    </IconButton>
                  )}
                </Box>
              )}
            </TableCell>
          )}
        </TableRow>
      );
    });

  // 渲染批量操作栏
  const renderBulkActions = () => {
    if (!bulkActions || selected.length === 0) return null;

    return (
      <Box
        sx={{
          p: 1.5,
          bgcolor: "primary.light",
          color: "primary.contrastText",
          display: "flex",
          alignItems: "center",
          gap: 2,
          borderRadius: "8px 8px 0 0",
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          已选择 {selected.length} 项
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {bulkActions.map((action, idx) => (
            <IconButton
              key={idx}
              size="small"
              onClick={() => {
                const selectedRows = data.filter((row) =>
                  selected.includes(getRowId(row)),
                );
                action.onClick(selectedRows);
              }}
              sx={{ color: "inherit" }}
            >
              {action.icon || (
                <MoreHorizontal style={{ width: 18, height: 18 }} />
              )}
            </IconButton>
          ))}
        </Box>
        <Box sx={{ flex: 1 }} />
        <IconButton
          size="small"
          onClick={() => onSelectionChange?.([])}
          sx={{ color: "inherit" }}
        >
          ✕
        </IconButton>
      </Box>
    );
  };

  return (
    <>
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 2,
          maxHeight: maxHeight,
        }}
      >
        {renderBulkActions()}
        <Table
          stickyHeader={stickyHeader}
          size={density === "compact" ? "small" : "medium"}
        >
          {renderHeader()}
          <TableBody>
            {loading
              ? renderSkeleton()
              : data.length === 0
                ? renderEmpty()
                : renderRows()}
          </TableBody>
        </Table>
      </TableContainer>

      {pagination && (
        <TablePagination
          component="div"
          count={pagination.total}
          page={pagination.page}
          onPageChange={(_, page) => pagination.onPageChange(page)}
          rowsPerPage={pagination.pageSize}
          onRowsPerPageChange={(e) =>
            pagination.onPageSizeChange(Number(e.target.value))
          }
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage="每页"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} 共 ${count}`
          }
        />
      )}

      {/* 行操作菜单 */}
      <Menu
        anchorEl={actionMenu?.anchor}
        open={Boolean(actionMenu)}
        onClose={handleActionMenuClose}
      >
        {actions
          ?.filter((a) => !a.show || a.show(actionMenu?.row as T))
          .map((action, idx) => (
            <React.Fragment key={idx}>
              {action.divider && <MenuItem divider />}
              <MenuItem
                onClick={() =>
                  actionMenu && handleActionExecute(action, actionMenu.row)
                }
                disabled={action.disabled?.(actionMenu?.row as T)}
                sx={{
                  color:
                    action.color && action.color !== "default"
                      ? `${action.color}.main`
                      : "text.primary",
                }}
              >
                {action.icon && (
                  <ListItemIcon sx={{ color: "inherit", minWidth: 32 }}>
                    {action.icon}
                  </ListItemIcon>
                )}
                <ListItemText>{action.label}</ListItemText>
              </MenuItem>
            </React.Fragment>
          ))}
      </Menu>
    </>
  );
}

export default DataGrid;
