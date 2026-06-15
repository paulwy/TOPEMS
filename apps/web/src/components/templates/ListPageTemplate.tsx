import React, { useState, useCallback, useMemo } from "react";
import type { BoxProps } from "@mui/material";
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
  Typography,
  IconButton,
  Tooltip,
  Checkbox,
  Skeleton,
  TextField,
  InputAdornment,
  Button,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Search,
  Filter,
  MoreHorizontal,
  ChevronDown,
  ArrowUpDown,
  Eye,
  Edit,
  Trash2,
  Download,
  RefreshCw,
} from "lucide-react";

// ============ 类型定义 ============

export interface ColumnDef<T = any> {
  id: string;
  label: string;
  width?: number | string;
  minWidth?: number;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  renderHeader?: (column: ColumnDef<T>) => React.ReactNode;
}

export interface FilterOption {
  label: string;
  value: string | number;
}

export interface FilterConfig {
  id: string;
  label: string;
  type: "select" | "date" | "text";
  options?: FilterOption[];
  value?: any;
  onChange?: (value: any) => void;
}

export interface RowAction<T = any> {
  label: string;
  icon?: React.ReactNode;
  onClick?: (row: T) => void;
  href?: string;
  color?: "primary" | "secondary" | "error" | "warning" | "success" | "info";
  show?: (row: T) => boolean;
  divider?: boolean;
}

export interface ListPageTemplateProps<T = any> extends BoxProps {
  // 页面信息
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;

  // 数据
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  error?: string;

  // 行标识
  getRowId?: (row: T) => string | number;
  onRowClick?: (row: T) => void;

  // 选择
  selectable?: boolean;
  selectedIds?: (string | number)[];
  onSelectionChange?: (ids: (string | number)[]) => void;

  // 排序
  sortable?: boolean;
  defaultSortBy?: string;
  defaultSortOrder?: "asc" | "desc";
  onSort?: (sortBy: string, sortOrder: "asc" | "desc") => void;

  // 分页
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };

  // 搜索
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearch?: (value: string) => void;

  // 筛选
  filters?: FilterConfig[];
  onFilterChange?: (filters: Record<string, any>) => void;

  // 操作
  actions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    variant?: "contained" | "outlined" | "text";
  }>;
  rowActions?: RowAction<T>[];
  onRefresh?: () => void;

  // 空状态
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;

  // 自定义
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
}

// ============ 列表页模板组件 ============

export const ListPageTemplate = <T extends Record<string, any>>({
  title,
  subtitle,
  columns,
  data,
  loading,
  error,
  getRowId,
  onRowClick,
  selectable,
  selectedIds = [],
  onSelectionChange,
  sortable,
  defaultSortBy,
  defaultSortOrder = "asc",
  onSort,
  pagination,
  searchable,
  searchPlaceholder = "搜索...",
  searchValue,
  onSearch,
  filters,
  onFilterChange,
  actions,
  rowActions,
  onRefresh,
  emptyMessage = "暂无数据",
  emptyIcon,
  headerContent,
  footerContent,
  ...props
}: ListPageTemplateProps<T>) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [sortBy, setSortBy] = useState(defaultSortBy || "");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(defaultSortOrder);
  const [searchInput, setSearchInput] = useState(searchValue || "");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] = useState<T | null>(null);

  // 处理排序
  const handleSort = useCallback(
    (columnId: string) => {
      const newOrder =
        sortBy === columnId && sortOrder === "asc" ? "desc" : "asc";
      setSortBy(columnId);
      setSortOrder(newOrder);
      onSort?.(columnId, newOrder);
    },
    [sortBy, sortOrder, onSort],
  );

  // 处理选择
  const handleSelectAll = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.checked) {
        const allIds = data.map((row) => getRowId?.(row) ?? row.id);
        onSelectionChange?.(allIds);
      } else {
        onSelectionChange?.([]);
      }
    },
    [data, getRowId, onSelectionChange],
  );

  const handleSelectRow = useCallback(
    (row: T) => {
      const rowId = getRowId?.(row) ?? row.id;
      const newSelected = selectedIds.includes(rowId)
        ? selectedIds.filter((id) => id !== rowId)
        : [...selectedIds, rowId];
      onSelectionChange?.(newSelected);
    },
    [selectedIds, getRowId, onSelectionChange],
  );

  // 处理搜索
  const handleSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSearchInput(value);
      onSearch?.(value);
    },
    [onSearch],
  );

  // 处理行操作菜单
  const handleRowActionClick = useCallback(
    (event: React.MouseEvent<HTMLElement>, row: T) => {
      event.stopPropagation();
      setAnchorEl(event.currentTarget);
      setSelectedRow(row);
    },
    [],
  );

  const handleRowActionClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedRow(null);
  }, []);

  const handleRowAction = useCallback(
    (action: RowAction<T>) => {
      if (selectedRow) {
        action.onClick?.(selectedRow);
      }
      handleRowActionClose();
    },
    [selectedRow, handleRowActionClose],
  );

  // 渲染表格头部
  const renderTableHead = () => (
    <TableHead>
      <TableRow>
        {selectable && (
          <TableCell padding="checkbox" sx={{ width: 48 }}>
            <Checkbox
              indeterminate={
                selectedIds.length > 0 && selectedIds.length < data.length
              }
              checked={data.length > 0 && selectedIds.length === data.length}
              onChange={handleSelectAll}
            />
          </TableCell>
        )}
        {columns.map((column) => (
          <TableCell
            key={column.id}
            align={column.align || "left"}
            width={column.width}
            sx={{
              minWidth: column.minWidth,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {column.renderHeader ? (
              column.renderHeader(column)
            ) : sortable && column.sortable !== false ? (
              <TableSortLabel
                active={sortBy === column.id}
                direction={sortBy === column.id ? sortOrder : "asc"}
                onClick={() => handleSort(column.id)}
              >
                {column.label}
              </TableSortLabel>
            ) : (
              column.label
            )}
          </TableCell>
        ))}
        {rowActions && rowActions.length > 0 && (
          <TableCell align="right" sx={{ width: 80 }}>
            操作
          </TableCell>
        )}
      </TableRow>
    </TableHead>
  );

  // 渲染表格内容
  const renderTableBody = () => {
    if (loading) {
      return Array.from({ length: 5 }).map((_, index) => (
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
          {rowActions && rowActions.length > 0 && (
            <TableCell>
              <Skeleton variant="text" width={60} />
            </TableCell>
          )}
        </TableRow>
      ));
    }

    if (error) {
      return (
        <TableRow>
          <TableCell
            colSpan={
              columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)
            }
            align="center"
            sx={{ py: 8 }}
          >
            <Typography color="error">{error}</Typography>
          </TableCell>
        </TableRow>
      );
    }

    if (data.length === 0) {
      return (
        <TableRow>
          <TableCell
            colSpan={
              columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)
            }
            align="center"
            sx={{ py: 8 }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              {emptyIcon || (
                <Typography variant="h6" color="text.secondary">
                  📋
                </Typography>
              )}
              <Typography color="text.secondary">{emptyMessage}</Typography>
            </Box>
          </TableCell>
        </TableRow>
      );
    }

    return data.map((row, index) => {
      const rowId = getRowId?.(row) ?? row.id;
      const isSelected = selectedIds.includes(rowId);

      return (
        <TableRow
          key={rowId}
          hover
          selected={isSelected}
          onClick={() => onRowClick?.(row)}
          sx={{
            cursor: onRowClick ? "pointer" : "default",
            "&:hover": {
              backgroundColor: "action.hover",
            },
          }}
        >
          {selectable && (
            <TableCell padding="checkbox">
              <Checkbox
                checked={isSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectRow(row);
                }}
              />
            </TableCell>
          )}
          {columns.map((column) => (
            <TableCell key={column.id} align={column.align || "left"}>
              {column.render ? column.render(row, index) : row[column.id]}
            </TableCell>
          ))}
          {rowActions && rowActions.length > 0 && (
            <TableCell align="right">
              {isMobile ? (
                <IconButton
                  size="small"
                  onClick={(e) => handleRowActionClick(e, row)}
                >
                  <MoreHorizontal style={{ width: 18, height: 18 }} />
                </IconButton>
              ) : (
                <Box
                  sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}
                >
                  {rowActions.slice(0, 3).map((action, actionIndex) => {
                    if (action.show && !action.show(row)) return null;
                    return (
                      <Tooltip key={actionIndex} title={action.label}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick?.(row);
                          }}
                          color={action.color}
                        >
                          {action.icon || (
                            <MoreHorizontal style={{ width: 16, height: 16 }} />
                          )}
                        </IconButton>
                      </Tooltip>
                    );
                  })}
                  {rowActions.length > 3 && (
                    <IconButton
                      size="small"
                      onClick={(e) => handleRowActionClick(e, row)}
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
  };

  // 渲染分页
  const renderPagination = () => {
    if (!pagination) return null;

    return (
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
        labelRowsPerPage="每页行数"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} 共 ${count} 条`
        }
      />
    );
  };

  // 渲染搜索和筛选
  const renderSearchAndFilters = () => {
    if (!searchable && !filters) return null;

    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 2,
          flexWrap: "wrap",
        }}
      >
        {searchable && (
          <TextField
            size="small"
            placeholder={searchPlaceholder}
            value={searchInput}
            onChange={handleSearch}
            sx={{ minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search style={{ width: 18, height: 18 }} />
                </InputAdornment>
              ),
            }}
          />
        )}

        {filters?.map((filter) => (
          <TextField
            key={filter.id}
            size="small"
            select
            label={filter.label}
            value={filter.value || ""}
            onChange={(e) => {
              filter.onChange?.(e.target.value);
              onFilterChange?.({ [filter.id]: e.target.value });
            }}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">全部</MenuItem>
            {filter.options?.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        ))}

        {onRefresh && (
          <Tooltip title="刷新">
            <IconButton size="small" onClick={onRefresh}>
              <RefreshCw style={{ width: 18, height: 18 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  };

  return (
    <Box {...props}>
      {/* 搜索和筛选 */}
      {renderSearchAndFilters()}

      {/* 自定义头部内容 */}
      {headerContent}

      {/* 表格 */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          {renderTableHead()}
          <TableBody>{renderTableBody()}</TableBody>
        </Table>
        {renderPagination()}
      </TableContainer>

      {/* 自定义底部内容 */}
      {footerContent}

      {/* 行操作菜单 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleRowActionClose}
      >
        {rowActions?.map((action, index) => {
          if (action.show && selectedRow && !action.show(selectedRow))
            return null;

          return (
            <React.Fragment key={index}>
              {action.divider && <Divider />}
              <MenuItem onClick={() => handleRowAction(action)}>
                {action.icon && (
                  <ListItemIcon sx={{ color: `${action.color}.main` }}>
                    {action.icon}
                  </ListItemIcon>
                )}
                <ListItemText>{action.label}</ListItemText>
              </MenuItem>
            </React.Fragment>
          );
        })}
      </Menu>
    </Box>
  );
};

export default ListPageTemplate;
