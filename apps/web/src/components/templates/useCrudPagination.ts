import { useState, useCallback } from 'react';

export interface UseCrudPaginationOptions {
  defaultPageSize?: number;
}

/**
 * CrudPage 分页 + 搜索状态管理 hook
 */
export function useCrudPagination(options: UseCrudPaginationOptions = {}) {
  const { defaultPageSize = 10 } = options;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [search, setSearch] = useState('');

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // 重置到第一页
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1); // 搜索时重置到第一页
  }, []);

  const resetPagination = useCallback(() => {
    setPage(1);
    setSearch('');
  }, []);

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    handlePageChange,
    handlePageSizeChange,
    handleSearchChange,
    resetPagination,
  };
}
