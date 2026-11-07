/**
 * MDM · 供应商类别字典（master_data.mdm_supplier_categories）
 *
 * 路由：GET /api/master-data/supplier-categories（只读列表）
 *
 * 用途：前端下拉/级联选用，与 mdm_suppliers.category_code 形成弱引用。
 * 字典项示例：
 *   { code: 'raw_material', name_zh: '原材料', name_en: 'Raw Material',
 *     source_values: { scm: 'raw_material', srm: '原材料' } }
 */
import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface MasterDataSupplierCategory {
  id: string;
  code: string;
  name_zh: string;
  name_en?: string | null;
  /**
   * 上游系统原值映射，形如 `{"scm":"raw_material","srm":"原材料"}`。
   * 用于把历史自由文本（如 srm 的"原材料"、scm 的"raw_material"）反查为标准 code。
   */
  source_values?: Record<string, string> | null;
  description?: string | null;
  sort_order?: number | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export const masterDataSupplierCategoriesApi = {
  /** GET /api/master-data/supplier-categories —— 只读列表 */
  list: async (): Promise<ApiResponse<MasterDataSupplierCategory[]>> => {
    return apiClient.master.get<MasterDataSupplierCategory[]>('/supplier-categories');
  },
};

export default masterDataSupplierCategoriesApi;
