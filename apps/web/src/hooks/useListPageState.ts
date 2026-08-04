/**
 * 列表页状态管理 hook
 *
 * 封装列表页通用的搜索 + 防抖 + 筛选 + 排序 + 分页状态，消除 100+ 文件的重复样板代码。
 *
 * 支持两种分页索引基数：
 * - `baseIndex: 1`（默认，向后兼容）：页码从 1 开始，第一页为 1
 * - `baseIndex: 0`：页码从 0 开始，第一页为 0
 *
 * API 与 useUrlListState 对齐，可无缝替换为 URL 同步版本。
 *
 * @example
 * ```tsx
 * const {
 *   searchQuery, setSearchQuery,
 *   debouncedSearch,
 *   filters, setFilter, setFilters,
 *   sortBy, sortOrder, setSort, toggleSort,
 *   currentPage, setCurrentPage,
 *   pageSize, setPageSize,
 *   resetPage, clearSearch, clearAll,
 * } = useListPageState({
 *   defaultPageSize: 10,
 *   defaultFilters: { status: 'all' },
 *   defaultSortBy: 'createdAt',
 *   defaultSortOrder: 'desc',
 * });
 * ```
 */

import { useState, useEffect, useCallback } from 'react';

export interface UseListPageStateOptions<
  TFilters extends Record<string, unknown> = Record<string, unknown>,
> {
  /** 初始搜索关键词，默认 '' */
  defaultSearch?: string;
  /**
   * 分页索引基数：
   * - `1`（默认，向后兼容）：页码从 1 开始
   * - `0`：页码从 0 开始
   *
   * 影响默认 `defaultPage`、搜索变化/`resetPage`/`clearSearch` 时的重置目标页码。
   */
  baseIndex?: 0 | 1;
  /**
   * 初始页码。
   * - 未传且 `baseIndex: 1`（或未传 `baseIndex`）时默认为 `1`
   * - 未传且 `baseIndex: 0` 时默认为 `0`
   * 显式传值时以传入值为准。
   */
  defaultPage?: number;
  /** 每页条数，默认 10 */
  defaultPageSize?: number;
  /** 搜索防抖延迟（毫秒），默认 300 */
  debounceMs?: number;
  /** 初始筛选条件，默认 {} */
  defaultFilters?: TFilters;
  /** 初始排序字段，默认 '' */
  defaultSortBy?: string;
  /** 初始排序方向，默认 'asc' */
  defaultSortOrder?: 'asc' | 'desc';
  /** 筛选变化时是否重置到第一页，默认 true */
  resetPageOnFilterChange?: boolean;
  /** 排序变化时是否重置到第一页，默认 true */
  resetPageOnSortChange?: boolean;
}

export interface UseListPageStateResult<
  TFilters extends Record<string, unknown> = Record<string, unknown>,
> {
  // 搜索
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  /** 防抖后的搜索值（用于触发请求） */
  debouncedSearch: string;
  // 筛选
  filters: TFilters;
  setFilter: <K extends keyof TFilters>(key: K, value: TFilters[K]) => void;
  setFilters: (filters: Partial<TFilters>) => void;
  resetFilters: () => void;
  // 排序
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  setSort: (sortBy: string, sortOrder?: 'asc' | 'desc') => void;
  toggleSort: (sortBy: string) => void;
  // 分页
  /**
   * 当前页码。
   * - `baseIndex: 1`（默认）时从 1 开始
   * - `baseIndex: 0` 时从 0 开始
   */
  currentPage: number;
  setCurrentPage: (page: number) => void;
  /** 每页条数 */
  pageSize: number;
  setPageSize: (size: number) => void;
  /** 重置到第一页（搜索/过滤变化时调用）。1-based 时为 1，0-based 时为 0 */
  resetPage: () => void;
  // 组合操作
  /** 清空搜索并重置到第一页。1-based 时为 1，0-based 时为 0 */
  clearSearch: () => void;
  /** 清空所有状态（搜索+筛选+排序）并重置到第一页 */
  clearAll: () => void;
  /** 只读：分页索引基数（0 或 1），便于消费方判断当前分页模式 */
  readonly baseIndex: 0 | 1;
}

/**
 * 列表页状态管理 hook
 *
 * 自动处理：
 * - 搜索输入防抖（默认 300ms）
 * - 搜索变化时自动重置到第一页
 * - 筛选/排序变化时可选重置到第一页
 * - 分页状态维护
 *
 * 通过 `baseIndex` 选项可切换 0-based / 1-based 分页。
 */
export function useListPageState<
  TFilters extends Record<string, unknown> = Record<string, unknown>,
>(options: UseListPageStateOptions<TFilters> = {}): UseListPageStateResult<TFilters> {
  const {
    defaultSearch = '',
    baseIndex = 1,
    defaultPage,
    defaultPageSize = 10,
    debounceMs = 300,
    defaultFilters = {} as TFilters,
    defaultSortBy = '',
    defaultSortOrder = 'asc' as const,
    resetPageOnFilterChange = true,
    resetPageOnSortChange = true,
  } = options;

  const firstPage = baseIndex === 0 ? 0 : 1;
  const initialPage = defaultPage ?? firstPage;

  const [searchQuery, setSearchQuery] = useState(defaultSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(defaultSearch);
  const [currentPage, setCurrentPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);
  const [filters, setFiltersState] = useState<TFilters>(defaultFilters);
  const [sortBy, setSortBy] = useState(defaultSortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);

  // 防抖搜索：搜索变化时更新 debouncedSearch 并重置页码
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPageState(firstPage);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchQuery, debounceMs, firstPage]);

  const setCurrentPage = useCallback(
    (page: number) => {
      setCurrentPageState(Math.max(firstPage, page));
    },
    [firstPage]
  );

  const setPageSize = useCallback(
    (size: number) => {
      setPageSizeState(size);
      setCurrentPageState(firstPage);
    },
    [firstPage]
  );

  const resetPage = useCallback(() => {
    setCurrentPageState(firstPage);
  }, [firstPage]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearch('');
    setCurrentPageState(firstPage);
  }, [firstPage]);

  // 筛选
  const setFilter = useCallback(
    <K extends keyof TFilters>(key: K, value: TFilters[K]) => {
      setFiltersState((prev) => ({ ...prev, [key]: value }));
      if (resetPageOnFilterChange) {
        setCurrentPageState(firstPage);
      }
    },
    [firstPage, resetPageOnFilterChange]
  );

  const setFilters = useCallback(
    (newFilters: Partial<TFilters>) => {
      setFiltersState((prev) => ({ ...prev, ...newFilters }));
      if (resetPageOnFilterChange) {
        setCurrentPageState(firstPage);
      }
    },
    [firstPage, resetPageOnFilterChange]
  );

  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
    if (resetPageOnFilterChange) {
      setCurrentPageState(firstPage);
    }
  }, [defaultFilters, firstPage, resetPageOnFilterChange]);

  // 排序
  const setSort = useCallback(
    (newSortBy: string, newSortOrder: 'asc' | 'desc' = 'asc') => {
      setSortBy(newSortBy);
      setSortOrder(newSortOrder);
      if (resetPageOnSortChange) {
        setCurrentPageState(firstPage);
      }
    },
    [firstPage, resetPageOnSortChange]
  );

  const toggleSort = useCallback(
    (field: string) => {
      const nextOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
      setSort(field, nextOrder);
    },
    [sortBy, sortOrder, setSort]
  );

  const clearAll = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearch('');
    setFiltersState(defaultFilters);
    setSortBy(defaultSortBy);
    setSortOrder(defaultSortOrder);
    setCurrentPageState(firstPage);
  }, [defaultFilters, defaultSortBy, defaultSortOrder, firstPage]);

  return {
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    filters,
    setFilter,
    setFilters,
    resetFilters,
    sortBy,
    sortOrder,
    setSort,
    toggleSort,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    resetPage,
    clearSearch,
    clearAll,
    baseIndex,
  };
}
