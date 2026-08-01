/**
 * CrudPage adapter helper functions
 *
 * Problem: Every page using CrudPage needs to hand-write 20-30 lines of
 * `xxxAdapter = { list, create, update, delete }`, which is highly repetitive.
 *
 * This module generates the `CrudApiAdapter` needed by CrudPage directly from
 * an API client, reducing page code from 30 lines to 1 line.
 *
 * @example
 * ```ts
 * import { createCrudPageAdapter } from '@/schemas/_shared/crudPageAdapter';
 *
 * const voucherAdapter = createCrudPageAdapter(voucherApi);
 * ```
 */

import { normalizeListResponse, type CrudApiAdapterConfig } from './adapterFactory';
import type { CrudApiAdapter as PageCrudApiAdapter } from '@/components/templates/CrudPage';
import type { ApiResponse } from '@/api/client';

/**
 * Minimal CrudApi interface - covers all standard API client shapes
 *
 * Uses generic parameter T for entity type, TCreate/Update for create/update input types.
 * List method params use any to accommodate different API client parameter types
 * (TypeScript function parameter contravariance means Record<string, unknown> cannot
 * receive more specific parameter types).
 *
 * @template T Entity type (e.g. Location, Voucher)
 * @template TCreate Create input type, defaults to Partial<T>
 * @template TUpdate Update input type, defaults to Partial<T>
 */
export interface CrudApi<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  list: (params?: unknown) => Promise<ApiResponse<unknown>>;
  create: (data: TCreate) => Promise<ApiResponse<T>>;
  update: (id: string, data: TUpdate) => Promise<ApiResponse<T>>;
  delete: (id: string) => Promise<ApiResponse<unknown>>;
}

interface ApiResponseLike<T = unknown> {
  success?: boolean;
  data?: T;
  message?: string;
  code?: number;
}

function asResponse<T>(raw: unknown): ApiResponseLike<T> {
  return (raw ?? {}) as ApiResponseLike<T>;
}

/**
 * Create an adapter usable by CrudPage directly from a raw API client
 *
 * Handles:
 * - `pagesize -> pageSize` normalization
 * - Multiple field names for list responses (items / materials / data)
 * - Failed responses throw Error (rather than silently swallowing)
 *
 * @example
 * ```ts
 * // Pass API object directly, TypeScript auto-infers T type
 * const adapter = createCrudPageAdapter(voucherApi);
 *
 * // Or manually specify types
 * const adapter = createCrudPageAdapter<Voucher, CreateVoucherRequest>(voucherApi);
 * ```
 */
export function createCrudPageAdapter<T, TCreate = Partial<T>, TUpdate = Partial<T>>(
  api: CrudApi<T, TCreate, TUpdate>,
  config: CrudApiAdapterConfig = {}
): PageCrudApiAdapter<Record<string, unknown>> {
  const list = async (params: Record<string, unknown> | undefined) => {
    const normalizedParams: Record<string, unknown> = { ...(params || {}) };

    if (params?.pageSize !== undefined) {
      const key = config.pageSizeParam || 'pagesize';
      normalizedParams[key] = params.pageSize;
      delete normalizedParams.pageSize;
    }

    const responseLike = asResponse(await api.list(normalizedParams));
    if (responseLike.success === false) {
      throw new Error(responseLike.message || 'Failed to load list');
    }

    const { items, total } = normalizeListResponse<T>(
      responseLike as unknown as Parameters<typeof normalizeListResponse>[0],
      config
    );
    return { data: items as unknown as Record<string, unknown>[], total };
  };

  const create = async (data: Partial<Record<string, unknown>>) => {
    const raw = asResponse<T>(await api.create(data as unknown as TCreate));
    if (raw.success === false) throw new Error(raw.message || 'Create failed');
    return (raw.data ?? {}) as unknown as Record<string, unknown>;
  };

  const update = async (id: string, data: Partial<Record<string, unknown>>) => {
    const raw = asResponse<T>(await api.update(id, data as unknown as TUpdate));
    if (raw.success === false) throw new Error(raw.message || 'Update failed');
    return (raw.data ?? {}) as unknown as Record<string, unknown>;
  };

  const del = async (id: string) => {
    const raw = asResponse(await api.delete(id));
    if (raw.success === false) throw new Error(raw.message || 'Delete failed');
  };

  return { list, create, update, delete: del };
}
