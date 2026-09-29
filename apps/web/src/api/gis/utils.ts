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

/**
 * 从后端 Pipeline.path（GeoJSON LineString）派生 [start, end] 点对。
 * 旧前端类型用 start_point/end_point 消费，后端返回 path；未提供 path 时返回 null。
 * 坐标序：GeoJSON 为 [lng, lat]，返回时转回 [lat, lng] 以兼容页面旧语义。
 */
export function pathToStartEnd(
  path: unknown
): { start: [number, number]; end: [number, number] } | null {
  const coords = (path as { type?: string; coordinates?: unknown })?.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) {
    const s = coords[0];
    const e = coords[coords.length - 1];
    if (Array.isArray(s) && Array.isArray(e) && s.length >= 2 && e.length >= 2) {
      const start: [number, number] = [Number(s[1]) || 0, Number(s[0]) || 0];
      const end: [number, number] = [Number(e[1]) || 0, Number(e[0]) || 0];
      return { start, end };
    }
  }
  return null;
}
