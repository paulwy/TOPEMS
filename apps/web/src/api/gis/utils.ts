import type { PaginatedResponse, RawPaginatedResponse } from './types';

export function adaptResponse<T>(
  response: RawPaginatedResponse,
  dataKey: string
): PaginatedResponse<T> {
  const items = (response[dataKey] as T[]) || [];
  const total = (response.total as number) || items.length;
  return {
    items,
    total,
    page: (response.page as number) || 1,
    pageSize: (response.pageSize as number) || (response.pagesize as number) || items.length,
    totalPages: (response.totalPages as number) || (response.total_pages as number) || 1,
  };
}
