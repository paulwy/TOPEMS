/**
 * URL 状态同步 hook
 *
 * 将列表页的搜索关键词、筛选条件、排序、分页参数持久化到 URL search params，
 * 支持浏览器前进/后退、链接分享、刷新保持状态。
 *
 * 基于 react-router-dom 的 useSearchParams（BrowserRouter 模式）。
 *
 * @example
 * ```tsx
 * const {
 *   searchQuery, setSearchQuery,
 *   debouncedSearch,
 *   filters, setFilter, setFilters,
 *   sortBy, sortOrder, setSort,
 *   currentPage, setCurrentPage,
 *   pageSize, setPageSize,
 *   resetPage, clearAll,
 * } = useUrlListState({
 *   defaultPageSize: 10,
 *   defaultFilters: { status: 'all' },
 *   defaultSortBy: 'createdAt',
 *   defaultSortOrder: 'desc',
 * });
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

interface UseUrlListStateOptions<
  TFilters extends Record<string, unknown> = Record<string, unknown>,
> {
  /** URL 参数名前缀，避免多列表页面参数冲突，默认空 */
  prefix?: string;
  /** 初始搜索关键词，默认 '' */
  defaultSearch?: string;
  /**
   * 分页索引基数：
   * - `1`（默认，向后兼容）：页码从 1 开始
   * - `0`：页码从 0 开始
   */
  baseIndex?: 0 | 1;
  /** 初始页码（未设置时按 baseIndex 推导） */
  defaultPage?: number;
  /** 每页条数，默认 10 */
  defaultPageSize?: number;
  /** 搜索防抖延迟（毫秒），默认 300 */
  debounceMs?: number;
  /**
   * URL 同步模式：
   * - `replace`（默认）：替换当前历史记录，不产生新历史条目
   * - `push`：每次变化都产生新历史条目（前进/后退可感知）
   */
  historyMode?: 'replace' | 'push';
  /** 初始筛选条件，默认 {} */
  defaultFilters?: TFilters;
  /** 初始排序字段，默认 '' */
  defaultSortBy?: string;
  /** 初始排序方向，默认 'asc' */
  defaultSortOrder?: 'asc' | 'desc';
  /**
   * 筛选变化时是否重置到第一页，默认 true
   */
  resetPageOnFilterChange?: boolean;
  /**
   * 排序变化时是否重置到第一页，默认 true
   */
  resetPageOnSortChange?: boolean;
}

interface UseUrlListStateResult<
  TFilters extends Record<string, unknown> = Record<string, unknown>,
> {
  // 搜索
  searchQuery: string;
  setSearchQuery: (value: string) => void;
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
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  resetPage: () => void;
  // 组合操作
  clearSearch: () => void;
  /** 清空所有 URL 状态（搜索+筛选+排序）并重置到第一页 */
  clearAll: () => void;
  // 只读
  readonly baseIndex: 0 | 1;
}

function parseFilterValue(raw: string, defaultValue: unknown): unknown {
  if (defaultValue === undefined || defaultValue === null) return raw;
  if (typeof defaultValue === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : defaultValue;
  }
  if (typeof defaultValue === 'boolean') {
    return raw === 'true';
  }
  if (Array.isArray(defaultValue)) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : defaultValue;
    } catch {
      return defaultValue;
    }
  }
  if (typeof defaultValue === 'object' && defaultValue !== null) {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null ? parsed : defaultValue;
    } catch {
      return defaultValue;
    }
  }
  return raw;
}

function serializeFilterValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value) || (typeof value === 'object' && value !== null))
    return JSON.stringify(value);
  return String(value);
}

export function useUrlListState<TFilters extends Record<string, unknown> = Record<string, unknown>>(
  options: UseUrlListStateOptions<TFilters> = {}
): UseUrlListStateResult<TFilters> {
  const {
    prefix = '',
    defaultSearch = '',
    baseIndex = 1,
    defaultPage,
    defaultPageSize = 10,
    debounceMs = 300,
    historyMode = 'replace',
    defaultFilters = {} as TFilters,
    defaultSortBy = '',
    defaultSortOrder = 'asc' as const,
    resetPageOnFilterChange = true,
    resetPageOnSortChange = true,
  } = options;

  const [searchParams, setSearchParams] = useSearchParams();

  const q = prefix ? `${prefix}q` : 'q';
  const p = prefix ? `${prefix}page` : 'page';
  const ps = prefix ? `${prefix}pageSize` : 'pageSize';
  const sb = prefix ? `${prefix}sortBy` : 'sortBy';
  const so = prefix ? `${prefix}sortOrder` : 'sortOrder';
  const fPrefix = prefix ? `${prefix}f_` : 'f_';

  const firstPage = baseIndex === 0 ? 0 : 1;
  const initialPage = defaultPage ?? firstPage;

  // ---- 从 URL 读取初始值 ----
  const getSearchFromUrl = useCallback(
    (): string => searchParams.get(q) ?? defaultSearch,
    [searchParams, q, defaultSearch]
  );

  const getPageFromUrl = useCallback((): number => {
    const raw = searchParams.get(p);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : initialPage;
  }, [searchParams, p, initialPage]);

  const getPageSizeFromUrl = useCallback((): number => {
    const raw = searchParams.get(ps);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : defaultPageSize;
  }, [searchParams, ps, defaultPageSize]);

  const getSortFromUrl = useCallback((): { sortBy: string; sortOrder: 'asc' | 'desc' } => {
    const sortBy = searchParams.get(sb) ?? defaultSortBy;
    const rawOrder = searchParams.get(so);
    const sortOrder = rawOrder === 'desc' ? 'desc' : rawOrder === 'asc' ? 'asc' : defaultSortOrder;
    return { sortBy, sortOrder };
  }, [searchParams, sb, so, defaultSortBy, defaultSortOrder]);

  const getFiltersFromUrl = useCallback((): TFilters => {
    const result = { ...defaultFilters } as TFilters;
    searchParams.forEach((value, key) => {
      if (key.startsWith(fPrefix)) {
        const filterKey = key.slice(fPrefix.length) as keyof TFilters;
        const defaultValue = defaultFilters[filterKey];
        (result as Record<string, unknown>)[filterKey as string] = parseFilterValue(
          value,
          defaultValue
        );
      }
    });
    return result;
  }, [searchParams, defaultFilters, fPrefix]);

  // ---- 内部状态 ----
  const [searchQuery, setSearchQueryState] = useState<string>(getSearchFromUrl);
  const [debouncedSearch, setDebouncedSearch] = useState<string>(getSearchFromUrl);
  const [currentPage, setCurrentPageState] = useState<number>(getPageFromUrl);
  const [pageSize, setPageSizeState] = useState<number>(getPageSizeFromUrl);
  const [sortBy, setSortByState] = useState<string>(() => getSortFromUrl().sortBy);
  const [sortOrder, setSortOrderState] = useState<'asc' | 'desc'>(() => getSortFromUrl().sortOrder);
  const [filters, setFiltersState] = useState<TFilters>(getFiltersFromUrl);

  // 标记是否由内部 set 触发的 URL 变化（避免重复同步）
  const internalUpdateRef = useRef(false);

  // ---- 写入 URL ----
  // 值为 null / '' / 等于默认值 时从 URL 移除
  const shouldRemoveFromUrl = useCallback(
    (value: string | number | null, defaultValue: string | number): boolean => {
      if (value === null || value === '') return true;
      return value === defaultValue;
    },
    []
  );

  const updateUrl = useCallback(
    (updates: Record<string, string | number | null>) => {
      internalUpdateRef.current = true;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === '') {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          });
          return next;
        },
        { replace: historyMode === 'replace' }
      );
      // 下一帧清除标记
      requestAnimationFrame(() => {
        internalUpdateRef.current = false;
      });
    },
    [setSearchParams, historyMode]
  );

  // ---- 搜索 ----
  const setSearchQuery = useCallback((value: string) => {
    setSearchQueryState(value);
  }, []);

  // 防抖搜索：搜索变化时更新 debouncedSearch + URL + 重置页码
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPageState(firstPage);
      const searchUrlValue = shouldRemoveFromUrl(searchQuery, defaultSearch) ? null : searchQuery;
      const pageUrlValue = shouldRemoveFromUrl(firstPage, initialPage) ? null : firstPage;
      updateUrl({ [q]: searchUrlValue, [p]: pageUrlValue });
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [
    searchQuery,
    debounceMs,
    firstPage,
    initialPage,
    p,
    q,
    defaultSearch,
    updateUrl,
    shouldRemoveFromUrl,
  ]);

  // ---- 分页 ----
  const setCurrentPage = useCallback(
    (page: number) => {
      const next = Math.max(firstPage, page);
      setCurrentPageState(next);
      const pageUrlValue = shouldRemoveFromUrl(next, initialPage) ? null : next;
      updateUrl({ [p]: pageUrlValue });
    },
    [firstPage, initialPage, p, shouldRemoveFromUrl, updateUrl]
  );

  const setPageSize = useCallback(
    (size: number) => {
      setPageSizeState(size);
      setCurrentPageState(firstPage);
      const pageSizeUrlValue = shouldRemoveFromUrl(size, defaultPageSize) ? null : size;
      const pageUrlValue = shouldRemoveFromUrl(firstPage, initialPage) ? null : firstPage;
      updateUrl({ [ps]: pageSizeUrlValue, [p]: pageUrlValue });
    },
    [firstPage, initialPage, p, ps, defaultPageSize, shouldRemoveFromUrl, updateUrl]
  );

  const resetPage = useCallback(() => {
    setCurrentPageState(firstPage);
    const pageUrlValue = shouldRemoveFromUrl(firstPage, initialPage) ? null : firstPage;
    updateUrl({ [p]: pageUrlValue });
  }, [firstPage, initialPage, p, shouldRemoveFromUrl, updateUrl]);

  // ---- 筛选 ----
  // 判断筛选值是否等于默认值（深比较简单值，复杂值用 JSON.stringify）
  const isFilterDefault = useCallback(
    (key: keyof TFilters, value: unknown): boolean => {
      const defaultValue = defaultFilters[key];
      if (defaultValue === value) return true;
      // 复杂值用 JSON.stringify 比较（对象/数组）
      if (typeof defaultValue === 'object' && typeof value === 'object') {
        return JSON.stringify(defaultValue) === JSON.stringify(value);
      }
      return false;
    },
    [defaultFilters]
  );

  const setFilter = useCallback(
    <K extends keyof TFilters>(key: K, value: TFilters[K]) => {
      setFiltersState((prev) => ({ ...prev, [key]: value }));
      if (resetPageOnFilterChange) {
        setCurrentPageState(firstPage);
      }
      const urlKey = `${fPrefix}${String(key)}`;
      const isEmpty = value === undefined || value === null || value === '';
      const isDefault = !isEmpty && isFilterDefault(key, value);
      const urlValue = isEmpty || isDefault ? null : serializeFilterValue(value as unknown);
      const pageUrlValue = resetPageOnFilterChange
        ? shouldRemoveFromUrl(firstPage, initialPage)
          ? null
          : firstPage
        : undefined;
      const updates: Record<string, string | number | null> = { [urlKey]: urlValue };
      if (pageUrlValue !== undefined) {
        updates[p] = pageUrlValue;
      }
      updateUrl(updates);
    },
    [
      fPrefix,
      firstPage,
      initialPage,
      p,
      resetPageOnFilterChange,
      isFilterDefault,
      shouldRemoveFromUrl,
      updateUrl,
    ]
  );

  const setFilters = useCallback(
    (newFilters: Partial<TFilters>) => {
      setFiltersState((prev) => ({ ...prev, ...newFilters }));
      if (resetPageOnFilterChange) {
        setCurrentPageState(firstPage);
      }
      const urlUpdates: Record<string, string | number | null> = {};
      Object.entries(newFilters).forEach(([key, value]) => {
        const urlKey = `${fPrefix}${key}`;
        const isEmpty = value === undefined || value === null || value === '';
        const isDefault = !isEmpty && isFilterDefault(key as keyof TFilters, value);
        urlUpdates[urlKey] = isEmpty || isDefault ? null : serializeFilterValue(value);
      });
      if (resetPageOnFilterChange) {
        urlUpdates[p] = shouldRemoveFromUrl(firstPage, initialPage) ? null : firstPage;
      }
      updateUrl(urlUpdates);
    },
    [
      fPrefix,
      firstPage,
      initialPage,
      p,
      resetPageOnFilterChange,
      isFilterDefault,
      shouldRemoveFromUrl,
      updateUrl,
    ]
  );

  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
    if (resetPageOnFilterChange) {
      setCurrentPageState(firstPage);
    }
    const urlUpdates: Record<string, string | number | null> = {};
    // 清除所有 f_ 前缀的参数
    searchParams.forEach((_, key) => {
      if (key.startsWith(fPrefix)) {
        urlUpdates[key] = null;
      }
    });
    // 默认值不写回 URL（保持 URL 干净）
    if (resetPageOnFilterChange) {
      urlUpdates[p] = shouldRemoveFromUrl(firstPage, initialPage) ? null : firstPage;
    }
    updateUrl(urlUpdates);
  }, [
    defaultFilters,
    fPrefix,
    firstPage,
    initialPage,
    p,
    resetPageOnFilterChange,
    searchParams,
    shouldRemoveFromUrl,
    updateUrl,
  ]);

  // ---- 排序 ----
  const setSort = useCallback(
    (newSortBy: string, newSortOrder: 'asc' | 'desc' = 'asc') => {
      setSortByState(newSortBy);
      setSortOrderState(newSortOrder);
      if (resetPageOnSortChange) {
        setCurrentPageState(firstPage);
      }
      const sortByUrlValue = newSortBy === defaultSortBy ? null : newSortBy || null;
      const sortOrderUrlValue =
        !newSortBy || newSortOrder === defaultSortOrder ? null : newSortOrder;
      const pageUrlValue = resetPageOnSortChange
        ? shouldRemoveFromUrl(firstPage, initialPage)
          ? null
          : firstPage
        : undefined;
      const updates: Record<string, string | number | null> = {
        [sb]: sortByUrlValue,
        [so]: sortOrderUrlValue,
      };
      if (pageUrlValue !== undefined) {
        updates[p] = pageUrlValue;
      }
      updateUrl(updates);
    },
    [
      firstPage,
      initialPage,
      p,
      resetPageOnSortChange,
      sb,
      so,
      defaultSortBy,
      defaultSortOrder,
      shouldRemoveFromUrl,
      updateUrl,
    ]
  );

  const toggleSort = useCallback(
    (field: string) => {
      const nextOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
      setSort(field, nextOrder);
    },
    [sortBy, sortOrder, setSort]
  );

  // ---- 组合操作 ----
  const clearSearch = useCallback(() => {
    setSearchQueryState('');
    setDebouncedSearch('');
    setCurrentPageState(firstPage);
    const pageUrlValue = shouldRemoveFromUrl(firstPage, initialPage) ? null : firstPage;
    updateUrl({ [q]: null, [p]: pageUrlValue });
  }, [firstPage, initialPage, p, q, shouldRemoveFromUrl, updateUrl]);

  const clearAll = useCallback(() => {
    setSearchQueryState('');
    setDebouncedSearch('');
    setFiltersState(defaultFilters);
    setSortByState(defaultSortBy);
    setSortOrderState(defaultSortOrder);
    setCurrentPageState(firstPage);

    const urlUpdates: Record<string, string | number | null> = {
      [q]: null,
      [sb]: null,
      [so]: null,
      [ps]: null,
      [p]: shouldRemoveFromUrl(firstPage, initialPage) ? null : firstPage,
    };
    searchParams.forEach((_, key) => {
      if (key.startsWith(fPrefix)) {
        urlUpdates[key] = null;
      }
    });
    updateUrl(urlUpdates);
  }, [
    defaultFilters,
    defaultSortBy,
    defaultSortOrder,
    firstPage,
    initialPage,
    fPrefix,
    p,
    ps,
    q,
    sb,
    so,
    searchParams,
    shouldRemoveFromUrl,
    updateUrl,
  ]);

  // ---- 监听 URL 变化（前进/后退），同步回内部状态 ----
  const searchParamsStr = searchParams.toString();
  useEffect(() => {
    if (internalUpdateRef.current) return;

    const urlSearch = getSearchFromUrl();
    const urlPage = getPageFromUrl();
    const urlPageSize = getPageSizeFromUrl();
    const { sortBy: urlSortBy, sortOrder: urlSortOrder } = getSortFromUrl();
    const urlFilters = getFiltersFromUrl();

    if (urlSearch !== searchQuery) {
      setSearchQueryState(urlSearch);
      setDebouncedSearch(urlSearch);
    }
    if (urlPage !== currentPage) {
      setCurrentPageState(urlPage);
    }
    if (urlPageSize !== pageSize) {
      setPageSizeState(urlPageSize);
    }
    if (urlSortBy !== sortBy) {
      setSortByState(urlSortBy);
    }
    if (urlSortOrder !== sortOrder) {
      setSortOrderState(urlSortOrder);
    }
    // 筛选：浅比较
    const filterKeys = new Set([...Object.keys(filters), ...Object.keys(urlFilters)]);
    let filtersChanged = false;
    for (const key of filterKeys) {
      if (
        JSON.stringify((filters as Record<string, unknown>)[key]) !==
        JSON.stringify((urlFilters as Record<string, unknown>)[key])
      ) {
        filtersChanged = true;
        break;
      }
    }
    if (filtersChanged) {
      setFiltersState(urlFilters);
    }
  }, [
    searchParamsStr,
    searchQuery,
    currentPage,
    pageSize,
    sortBy,
    sortOrder,
    filters,
    getSearchFromUrl,
    getPageFromUrl,
    getPageSizeFromUrl,
    getSortFromUrl,
    getFiltersFromUrl,
  ]);

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

export default useUrlListState;
