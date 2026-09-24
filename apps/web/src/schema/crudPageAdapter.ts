/**
 * CrudPage 适配器帮助函数
 *
 * 解决的问题：每个使用 CrudPage 的页面都要手写 20-30 行
 * `xxxAdapter = { list, create, update, delete }`，这些代码结构高度重复。
 *
 * 本模块根据 API 客户端直接产出 CrudPage 所需的 `CrudApiAdapter`，
 * 让页面从 30 行变成 1 行。
 *
 * @example
 * ```ts
 * import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
 *
 * const voucherAdapter = createCrudPageAdapter(voucherApi);
 * ```
 */

import { normalizeListResponse, type CrudApiAdapterConfig } from './adapterFactory';
import type { CrudApiAdapter as PageCrudApiAdapter } from '@/components/templates/CrudPage';
import type { ApiResponse } from '@/api/client';
import i18n from '@/i18n';

/**
 * CrudApi 的最小接口 —— 覆盖所有标准 API 客户端的形态
 *
 * 使用泛型参数 T 表示实体类型，TCreate/ TUpdate 表示创建/更新的入参类型。
 * list 方法的参数使用 any 以兼容各种 API 客户端的不同参数类型
 * （由于 TypeScript 函数参数逆变检查，Record<string, unknown> 无法接收更具体的参数类型）。
 *
 * @template T 实体类型（如 Location, Voucher）
 * @template TCreate 创建入参类型，默认 Partial<T>
 * @template TUpdate 更新入参类型，默认 Partial<T>
 */
export interface CrudApi<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  list: (params?: any) => Promise<ApiResponse<unknown>>;
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
 * 根据原始 API 客户端直接创建 CrudPage 可用的适配器
 *
 * 处理了：
 * - `page_size → pageSize` 归一化
 * - 列表响应 `items / materials / data` 多种字段名
 * - 失败响应抛出 Error（而不是静默吞掉）
 *
 * @example
 * ```ts
 * // 直接传入 API 对象，TypeScript 自动推断 T 类型
 * const adapter = createCrudPageAdapter(voucherApi);
 *
 * // 或手动指定类型
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
      const key = config.pageSizeParam || 'page_size';
      normalizedParams[key] = params.pageSize;
      delete normalizedParams.pageSize;
    }

    const responseLike = asResponse(await api.list(normalizedParams));
    if (responseLike.success === false) {
      throw new Error(responseLike.message || i18n.t('schema.crud_page_adapter.k0'));
    }

    const { items, total } = normalizeListResponse<T>(
      responseLike as unknown as Parameters<typeof normalizeListResponse>[0],
      config
    );
    return { data: items as unknown as Record<string, unknown>[], total };
  };

  const create = async (data: Partial<Record<string, unknown>>) => {
    const raw = asResponse<T>(await api.create(data as unknown as TCreate));
    if (raw.success === false)
      throw new Error(raw.message || i18n.t('schema.crud_page_adapter.k1'));
    return (raw.data ?? {}) as unknown as Record<string, unknown>;
  };

  const update = async (id: string, data: Partial<Record<string, unknown>>) => {
    const raw = asResponse<T>(await api.update(id, data as unknown as TUpdate));
    if (raw.success === false)
      throw new Error(raw.message || i18n.t('schema.crud_page_adapter.k2'));
    return (raw.data ?? {}) as unknown as Record<string, unknown>;
  };

  const del = async (id: string) => {
    const raw = asResponse(await api.delete(id));
    if (raw.success === false)
      throw new Error(raw.message || i18n.t('schema.crud_page_adapter.k3'));
  };

  return { list, create, update, delete: del };
}
