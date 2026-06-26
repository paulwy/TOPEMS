import type { PaginatedResponse, RawPaginatedResponse } from './types';

export function adaptResponse<T>(
  response: RawPaginatedResponse,
  dataKey: string
): PaginatedResponse<T> {
  const data = (response[dataKey] as T[]) || [];
  const total = (response.total as number) || data.length;
  return {
    data,
    total,
    page: (response.page as number) || 1,
    pageSize: (response.pageSize as number) || (response.page_size as number) || data.length,
    totalPages: (response.totalPages as number) || (response.total_pages as number) || 1,
  };
}
