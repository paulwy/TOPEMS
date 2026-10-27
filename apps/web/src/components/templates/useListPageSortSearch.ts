import { useState, useCallback } from 'react';

export interface UseListPageSortSearchOptions {
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
  searchValue?: string;
  persistSearch?: boolean;
  filterStorageKey?: string;
  internalSearchQuery?: string;
}

/**
 * ListPage 排序 + 搜索状态管理 hook
 * 从 ListPageTemplate 抽出，保持 API 兼容
 */
export function useListPageSortSearch(options: UseListPageSortSearchOptions = {}) {
  const {
    defaultSortBy = '',
    defaultSortOrder = 'asc',
    searchValue,
    persistSearch = false,
    filterStorageKey,
    internalSearchQuery,
  } = options;

  // ============ 排序状态 ============
  const [sortBy, setSortBy] = useState(defaultSortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);

  // ============ 搜索状态 ============
  const [localSearchInput, setLocalSearchInput] = useState(() => {
    if (persistSearch) {
      const key = filterStorageKey || window.location.pathname;
      try {
        const stored = localStorage.getItem(`listpage:search:${key}`);
        if (stored) {
          return stored;
        }
      } catch {
        // ignore
      }
    }
    return searchValue || '';
  });

  // 搜索输入：受控模式优先，其次 internalListState，最后本地状态
  const searchInput =
    searchValue !== undefined
      ? searchValue
      : internalSearchQuery !== undefined
        ? internalSearchQuery
        : localSearchInput;

  // ============ 动作 ============
  const handleSort = useCallback(
    (field: string) => {
      if (sortBy === field) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setSortBy(field);
        setSortOrder('asc');
      }
    },
    [sortBy, sortOrder]
  );

  const handleSearch = useCallback(
    (value: string) => {
      setLocalSearchInput(value);
      if (persistSearch) {
        const key = filterStorageKey || window.location.pathname;
        try {
          localStorage.setItem(`listpage:search:${key}`, value);
        } catch {
          // ignore
        }
      }
    },
    [persistSearch, filterStorageKey]
  );

  const resetSort = useCallback(() => {
    setSortBy('');
    setSortOrder('asc');
  }, []);

  const resetSearch = useCallback(() => {
    setLocalSearchInput('');
    if (persistSearch) {
      const key = filterStorageKey || window.location.pathname;
      try {
        localStorage.removeItem(`listpage:search:${key}`);
      } catch {
        // ignore
      }
    }
  }, [persistSearch, filterStorageKey]);

  return {
    // 排序状态
    sortBy,
    sortOrder,
    setSortBy,
    setSortOrder,
    // 搜索状态
    searchInput,
    localSearchInput,
    setLocalSearchInput,
    // 动作
    handleSort,
    handleSearch,
    resetSort,
    resetSearch,
  };
}
