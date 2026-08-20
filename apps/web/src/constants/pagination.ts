/**
 * Web application pagination constants
 *
 * Retry / timeout / global numeric constants are already provided by
 * `@topems/shared-constants`. This file re-exports them and supplements
 * web-specific semantic aliases for direct consumption by page-level
 * components, avoiding scattered hardcoding.
 */

// Re-export from shared constants to avoid components depending directly on
// shared-constants internal paths

/** Default page number (starting from 1) */
const DEFAULT_PAGE = 1 as const;

/** Default page size (consistent with shared PAGINATION.DEFAULT_PAGE_SIZE) */
const DEFAULT_PAGE_SIZE = 20 as const;

/** Available page size options (consistent with shared PAGINATION.PAGE_SIZE_OPTIONS) */
const PAGE_SIZES: readonly number[] = [10, 20, 50, 100] as const;

/** Compact page size for detail dialogs and other tight scenarios */
const COMPACT_PAGE_SIZE = 10 as const;

/** Large page size for audit / log and other large-list scenarios */
const LARGE_PAGE_SIZE = 50 as const;

/**
 * 分页参数命名归一化（pageSize ↔ page_size ↔ pagesize 三种历史命名兼容）。
 *
 * 前端三种写法：
 *   - pageSize  (camelCase, 绝大多数业务 API 层)
 *   - page_size (snake_case, help.ts / admin/*.ts / 后端 Rust struct)
 *   - pagesize  (全小写, notification/email 等历史遗留发送 URLSearchParams)
 * 后端所有服务统一使用 page_size。
 *
 * ⚠️ 最终方向：新增代码统一使用 pageSize（TS API 类型），在 axios Request
 * interceptor 层调用 normalizePaginationParams 自动转成 page_size 发给后端。
 */

export type PageSizeField = 'pageSize' | 'page_size' | 'pagesize';

export interface PaginationParamsInput {
  page?: number;
  pageSize?: number;
  page_size?: number;
  pagesize?: number;
  search?: string;
  [key: string]: unknown;
}

export interface PaginationParamsNormalized {
  page: number;
  pageSize: number;
  page_size: number;
  pagesize: number;
  search?: string;
  [key: string]: unknown;
}

/**
 * 取三个分页字段中的任意一个有效值，优先顺序 pageSize > page_size > pagesize。
 * 返回 undefined 代表三个字段都未提供合法数字。
 */
function pickPageSize(input: PaginationParamsInput): number | undefined {
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
 *   → { page: 2, pageSize: 50, page_size: 50, pagesize: 50 }
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
  return out as PaginationParamsNormalized;
}

/**
 * 仅转换为后端 Rust 侧接受的 snake_case 格式（丢弃 pageSize / pagesize），
 * 用于发送最终请求之前的清理。
 */
function toBackendPagination(input: PaginationParamsInput): {
  page: number;
  page_size: number;
  search?: string;
} {
  const n = normalizePaginationParams(input);
  const res: { page: number; page_size: number; search?: string } = {
    page: n.page,
    page_size: n.page_size,
  };
  if (n.search !== undefined) res.search = n.search;
  return res;
}
