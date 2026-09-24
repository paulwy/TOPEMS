import type { PaginatedResponse, RawPaginatedResponse } from './types';

export function adaptResponse<T>(
  response: RawPaginatedResponse,
  dataKey: string
): PaginatedResponse<T> {
  const items = (response[dataKey] as T[]) || [];
  const total = (response.total as number) || items.length;
  const pageSize = (response.pageSize as number) || (response.page_size as number) || items.length;
  const totalPages = (response.totalPages as number) || (response.total_pages as number) || 1;
  return {
    items,
    total,
    page: (response.page as number) || 1,
    pageSize,
    page_size: pageSize,
    totalPages,
    total_pages: totalPages,
  };
}
