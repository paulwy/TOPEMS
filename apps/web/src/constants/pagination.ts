/**
 * Web application pagination constants
 *
 * Retry / timeout / global numeric constants are already provided by
 * `@topems/tokens`. This file re-exports them and supplements
 * web-specific semantic aliases for direct consumption by page-level
 * components, avoiding scattered hardcoding.
 */

// Re-export from shared constants to avoid components depending directly on
// shared-constants internal paths

/** Default page number (starting from 1) */
export const DEFAULT_PAGE = 1 as const;

/** Default page size (consistent with shared PAGINATION.DEFAULT_PAGE_SIZE) */
export const DEFAULT_PAGE_SIZE = 20 as const;

export interface PaginationParamsInput {
  page?: number;
  pageSize?: number;
  page_size?: number;

  search?: string;
  [key: string]: unknown;
}

export interface PaginationParamsNormalized {
  page: number;
  pageSize: number;
  page_size: number;

  search?: string;
  [key: string]: unknown;
}

/**
 * 取三个分页字段中的任意一个有效值，优先顺序 pageSize > page_size > page_size。
 * 返回 undefined 代表三个字段都未提供合法数字。
 */
export function pickPageSize(input: PaginationParamsInput): number | undefined {
  for (const k of ['pageSize', 'page_size', 'pagesize'] as const) {
    const v = input[k];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  }
  return undefined;
}

/**
 * 把任意写法的分页输入映射为三种命名同时存在的规范化对象。
 *
 * 用例：
 *   normalizePaginationParams({ page: 2, pageSize: 50 })
 *   → { page: 2, pageSize: 50, page_size: 50, page_size: 50 }
 */
export function normalizePaginationParams(
  input: PaginationParamsInput
): PaginationParamsNormalized {
  const page =
    typeof input.page === 'number' && Number.isFinite(input.page) && input.page > 0
      ? input.page
      : DEFAULT_PAGE;
  const pageSize = pickPageSize(input) ?? DEFAULT_PAGE_SIZE;

  const out: Record<string, unknown> = { ...input };
  out.page = page;
  out.pageSize = pageSize;
  out.page_size = pageSize;
  out.pagesize = pageSize;
  out.page_size = pageSize;
  out.pagesize = pageSize;
  return out as PaginationParamsNormalized;
}
