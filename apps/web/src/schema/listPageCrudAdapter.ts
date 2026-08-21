/**
 * ListPageTemplate CRUD 适配器
 *
 * 将 CrudPage 使用的 `CrudApiAdapter` 转换为 ListPageTemplate 使用的
 * `CrudOperations`，使已有 CrudPage 页面能够以最小改动迁移到
 * ListPageTemplate。
 */

import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import type { CrudOperations } from '@/hooks';
import i18n from '@/i18n';

export interface CrudApiAdapterWithGet<T = Record<string, unknown>> extends CrudApiAdapter<T> {
  get?: (id: string) => Promise<T>;
}

export function createListPageCrudApi<T extends { id?: string | number }>(
  apiAdapter: CrudApiAdapter<T>
): CrudOperations<T> {
  return {
    list: async (params) => {
      const result = await apiAdapter.list(params);
      return {
        success: true,
        code: 200,
        message: 'ok',
        data: { items: result.data, total: result.total },
      };
    },

    get: async (id) => {
      const adapter = apiAdapter as CrudApiAdapterWithGet<T>;
      if (typeof adapter.get === 'function') {
        const data = await adapter.get(id);
        return { success: true, code: 200, message: 'ok', data };
      }

      const result = await apiAdapter.list({ page: 1, pageSize: 1000 });
      const item = result.data.find((x) => String(x.id) === String(id));
      if (!item) {
        throw new Error(i18n.t('schema.crud_page_adapter.k4') || 'Record not found');
      }
      return { success: true, code: 200, message: 'ok', data: item };
    },

    create: async (data) => {
      const result = await apiAdapter.create(data as Partial<T>);
      return { success: true, code: 200, message: 'ok', data: result };
    },

    update: async (id, data) => {
      const result = await apiAdapter.update(id, data as Partial<T>);
      return { success: true, code: 200, message: 'ok', data: result };
    },

    delete: async (id) => {
      await apiAdapter.delete(id);
      return { success: true, code: 200, message: 'ok', data: id };
    },
  };
}
