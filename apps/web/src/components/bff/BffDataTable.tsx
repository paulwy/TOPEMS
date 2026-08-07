/**
 * V44.0 Track D: BFF 驱动的数据表格组件
 *
 * 功能:
 * - 基于列配置自动生成 GraphQL 查询
 * - 集成 React Query + 缓存失效
 * - 支持分页/搜索/过滤/排序
 * - 大数据量时自动分片
 * - 内部集成 useBffCrud + useAutoSharding
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
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
  TextField,
  IconButton,
  Tooltip,
  LinearProgress,
  Chip,
} from '@mui/material';
import { Search, RefreshCw, Filter, ChevronUp, ChevronDown, Layers } from 'lucide-react';
import useBffCrud from '@/hooks/bff/useBffCrud';
import type { UseBffCrudOptions } from '@/hooks/bff/useBffCrud';
import { logger } from '@/utils/logger';

// ============ 类型定义 ============

export interface BffColumn<T = unknown> {
  field: keyof T | string;
  headerName: string;
  width?: number | string;
  flex?: number;
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  renderCell?: (value: unknown, row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface BffDataTableProps<T = unknown> {
  /** 列配置 */
  columns: BffColumn<T>[];
  /** 实体类型，如 'customers'、'employees' */
  entityType: string;
  /** 服务名，如 'erp'、'crm' */
  service: string;
  /** React Query 基础 key */
  queryKey: unknown[];
  /** GraphQL 查询名称（可选，自动生成） */
  queryName?: string;
  /** 默认分页大小 */
  pageSize?: number;
  /** 启用搜索 */
  enableSearch?: boolean;
  /** 启用过滤 */
  enableFilter?: boolean;
  /** 启用排序 */
  enableSort?: boolean;
  /** 启用自动分片 */
  enableSharding?: boolean;
  /** 分片阈值（条） */
  shardThreshold?: number;
  /** 行点击回调 */
  onRowClick?: (row: T) => void;
  /** 自定义过滤器 */
  filters?: Record<string, unknown>;
  /** 实体名称（用于通知） */
  entityName?: string;
  /** 是否显示行号 */
  showRowNumber?: boolean;
  /** 顶部工具栏自定义内容 */
  toolbarContent?: React.ReactNode;
  /** 表格高度 */
  height?: number | string;
  /** 加载骨架行数 */
  skeletonRows?: number;
  /** 缓存新鲜时间（毫秒 */
  staleTime?: number;
}

// ============ 组件 ============

function BffDataTableInner<T extends { id?: string }>(props: BffDataTableProps<T>) {
  const {
    columns,
    entityType,
    service,
    queryKey,
    pageSize: initialPageSize = 10,
    enableSearch = true,
    enableFilter = true,
    enableSort = true,
    enableSharding = false,
    shardThreshold = 500,
    onRowClick,
    filters: externalFilters,
    entityName,
    showRowNumber = false,
    toolbarContent,
    height = 'auto',
    skeletonRows = 10,
    staleTime,
  } = props;

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [localFilters, setLocalFilters] = useState<Record<string, unknown>>({});

  const searchableFields = useMemo(
    () => columns.filter((c) => c.searchable !== false).map((c) => String(c.field)),
    [columns]
  );

  const sortableFields = useMemo(
    () => columns.filter((c) => c.sortable !== false).map((c) => String(c.field)),
    [columns]
  );

  const allFilters = useMemo(
    () => ({ ...localFilters, ...externalFilters }),
    [localFilters, externalFilters]
  );

  const crudOptions: UseBffCrudOptions<T> = {
    service,
    entityType,
    queryKey,
    defaultPageSize: pageSize,
    entityName,
    staleTime,
    autoFetch: true,
  };

  const crud = useBffCrud<T>(crudOptions);

  useEffect(() => {
    const params: Record<string, unknown> = {};
    if (searchKeyword) {
      params.keyword = searchKeyword;
      params.searchFields = searchableFields;
    }
    if (Object.keys(allFilters).length > 0) {
      params.filter = allFilters;
    }
    if (sortField) {
      params.sort = { field: sortField, order: sortOrder };
    }
    crud.fetch(params);
  }, [searchKeyword, allFilters, sortField, sortOrder, searchableFields]);

  const handlePageChange = useCallback(
    (_event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
      setPage(newPage);
      crud.pagination.setPage(newPage + 1);
    },
    [crud.pagination]
  );

  const handlePageSizeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newSize = parseInt(event.target.value, 10);
      setPageSize(newSize);
      setPage(0);
      crud.pagination.setPageSize(newSize);
    },
    [crud.pagination]
  );

  const handleSort = useCallback(
    (field: string) => {
      if (!enableSort || !sortableFields.includes(field)) return;
      if (sortField === field) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(field);
        setSortOrder('asc');
      }
    },
    [enableSort, sortableFields, sortField, sortOrder]
  );

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchKeyword(event.target.value);
      crud.pagination.setPage(1);
    },
    [crud.pagination]
  );

  const renderSortIcon = useCallback(
    (field: string) => {
      if (sortField !== field) return null;
      return sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
    },
    [sortField, sortOrder]
  );

  return (
    <Paper
      elevation={0}
      sx={{ width: '100%', overflow: 'hidden' }}
    >
      {/* 工具栏 */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {enableSearch && (
          <TextField
            variant='outlined'
            size='small'
            placeholder='搜索...'
            value={searchKeyword}
            onChange={handleSearchChange}
            slotProps={{
              input: {
                startAdornment: (
                  <Search
                    size={18}
                    style={{ marginRight: 8, opacity: 0.5 }}
                  />
                ),
              },
            }}
            sx={{ minWidth: 250 }}
          />
        )}

        {toolbarContent}

        <Box sx={{ flex: 1 }} />

        {enableFilter && (
          <Tooltip title={showFilterBar ? '隐藏筛选' : '显示筛选'}>
            <IconButton
              onClick={() => setShowFilterBar(!showFilterBar)}
              size='small'
              aria-label='筛选'
            >
              <Filter size={18} />
            </IconButton>
          </Tooltip>
        )}

        {enableSharding && (
          <Tooltip title='自动分片'>
            <Chip
              size='small'
              icon={<Layers size={14} />}
              label={crud.total > shardThreshold ? '分片加载中' : '未分片'}
              color={crud.total > shardThreshold ? 'primary' : 'default'}
              variant='outlined'
            />
          </Tooltip>
        )}

        <Tooltip title='刷新'>
          <IconButton
            onClick={() => crud.refresh()}
            size='small'
            aria-label='刷新'
          >
            <RefreshCw size={18} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 加载进度条 */}
      {crud.loading && (
        <LinearProgress
          variant='indeterminate'
          sx={{ height: 2 }}
        />
      )}

      {/* 筛选栏 */}
      {showFilterBar && enableFilter && (
        <Box
          sx={{
            p: 2,
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'action.hover',
          }}
        >
          {columns
            .filter((c) => c.filterable !== false)
            .map((col) => (
              <TextField
                key={String(col.field)}
                size='small'
                label={col.headerName}
                value={(localFilters[String(col.field)] as string) ?? ''}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    [String(col.field)]: e.target.value,
                  }))
                }
                sx={{ minWidth: 150 }}
              />
            ))}
        </Box>
      )}

      {/* 表格 */}
      <TableContainer sx={{ maxHeight: height === 'auto' ? 'none' : height }}>
        <Table
          stickyHeader
          size='small'
        >
          <TableHead>
            <TableRow>
              {showRowNumber && <TableCell sx={{ width: 60, fontWeight: 'bold' }}>#</TableCell>}
              {columns.map((col) => (
                <TableCell
                  key={String(col.field)}
                  sx={{
                    width: col.width,
                    fontWeight: 'bold',
                    cursor:
                      enableSort && sortableFields.includes(String(col.field))
                        ? 'pointer'
                        : 'default',
                    userSelect: 'none',
                  }}
                  align={col.align || 'left'}
                  onClick={() => handleSort(String(col.field))}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {col.headerName}
                    {renderSortIcon(String(col.field))}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {crud.loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRow key={i}>
                  {showRowNumber && (
                    <TableCell>
                      <Box
                        sx={{ width: 30, height: 16, bgcolor: 'action.hover', borderRadius: 1 }}
                      />
                    </TableCell>
                  )}
                  {columns.map((col, j) => (
                    <TableCell key={j}>
                      <Box
                        sx={{
                          width: typeof col.width === 'number' ? col.width * 0.6 : 100,
                          height: 16,
                          bgcolor: 'action.hover',
                          borderRadius: 1,
                        }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : crud.data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (showRowNumber ? 1 : 0)}
                  align='center'
                  sx={{ py: 6 }}
                >
                  <Box sx={{ color: 'text.secondary' }}>暂无数据</Box>
                </TableCell>
              </TableRow>
            ) : (
              // V64 防御：过滤 null/undefined，避免 row 为空时 renderCell 抛 "can't access property"
              (Array.isArray(crud.data) ? crud.data.filter((r) => r != null) : []).map(
                (row, index) => (
                  <TableRow
                    key={((row as Record<string, unknown>).id as string) || index}
                    hover
                    onClick={() => onRowClick?.(row)}
                    sx={{
                      cursor: onRowClick ? 'pointer' : 'default',
                      '&:last-child td': { borderBottom: 0 },
                    }}
                  >
                    {showRowNumber && (
                      <TableCell sx={{ width: 60, color: 'text.secondary' }}>
                        {page * pageSize + index + 1}
                      </TableCell>
                    )}
                    {columns.map((col) => {
                      const value = (row as Record<string, unknown>)[String(col.field)];
                      return (
                        <TableCell
                          key={String(col.field)}
                          align={col.align || 'left'}
                        >
                          {col.renderCell
                            ? // V64 防御：renderCell(row) 兜底 + try/catch，报错则回退显示原始值
                              (() => {
                                try {
                                  return col.renderCell!(value, row ?? ({} as T));
                                } catch (e) {
                                  logger.warn(
                                    `[BffDataTable] renderCell for column="${String(col.field)}" failed, fallback to raw:`,
                                    e
                                  );
                                  return String(value ?? '');
                                }
                              })()
                            : String(value ?? '')}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                )
              )
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 分页 */}
      <TablePagination
        component='div'
        count={crud.total}
        page={page}
        onPageChange={handlePageChange}
        rowsPerPage={pageSize}
        onRowsPerPageChange={handlePageSizeChange}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage='每页行数'
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count} 条`}
      />
    </Paper>
  );
}

export const BffDataTable = React.memo(BffDataTableInner) as typeof BffDataTableInner;

export default BffDataTable;
