/**
 * MDM · 供应商权威主数据（master_data.mdm_suppliers）
 *
 * 路由：
 *   GET    /api/master-data/suppliers          分页列表（keyword/status/category 过滤）
 *   GET    /api/master-data/suppliers/:id      详情
 *   POST   /api/master-data/suppliers          创建（source_system 强制 'mdm'）
 *   PATCH  /api/master-data/suppliers/:id      部分更新（注意：PATCH 不是 PUT）
 *   DELETE /api/master-data/suppliers/:id      软删（deleted_at=NOW()，list 不再出现，GET :id 返回 404）
 *
 * 字段：mdm 原生 snake_case。与 scm/srm/erp 老 schema 的字段名差异在各页面 schema 里对齐。
 * 信封：list 返回 { items, total, page, page_size }（标准 itemsField，无需覆盖）。
 */
import apiClient from '../client';
import type { ApiResponse } from '../client';
import { masterDataSupplierCategoriesApi } from './supplierCategories';

/**
 * 模块级字典缓存：code → name_zh。
 * create/update 时如果只传了 category_code 没传 category，自动从字典查 name_zh 填到 category，
 * 避免下游 srm.suppliers.category NOT NULL 约束导致同步失败。
 * 字典极小（目前 1 行），首次 create/update 时懒加载，后续直接读缓存。
 */
const categoryNameZhCache = new Map<string, string>();
let categoryDictLoading: Promise<void> | null = null;

async function ensureCategoryDict(): Promise<void> {
  if (categoryNameZhCache.size > 0) return;
  if (categoryDictLoading) return categoryDictLoading;
  categoryDictLoading = (async () => {
    try {
      const res = await masterDataSupplierCategoriesApi.list();
      if (res.success && Array.isArray(res.data)) {
        res.data.forEach((c) => categoryNameZhCache.set(c.code, c.name_zh));
      }
    } catch {
      // 字典加载失败不阻塞 create，category 留空由后端兜底
    }
  })();
  return categoryDictLoading;
}

/** 如果传了 category_code 但没传 category，自动从字典补 name_zh 作为自由文本 category */
async function fillCategoryFromCode<T extends { category_code?: string; category?: string }>(
  data: T
): Promise<T> {
  if (data.category_code && !data.category) {
    await ensureCategoryDict();
    const nameZh = categoryNameZhCache.get(data.category_code);
    if (nameZh) return { ...data, category: nameZh };
  }
  return data;
}

/** MDM 供应商行（list/get/create/patch 共用同一形状） */
export interface MasterDataSupplier {
  id: string;
  supplier_no: string;
  name: string;
  legal_name?: string | null;
  /** 历史自由文本分类（旧 scm/srm 写入时的原值，可能为中文或英文） */
  category?: string | null;
  /** 标准分类 code（来自 mdm_supplier_categories.code），提交时校验字典存在 */
  category_code?: string | null;
  status: string;
  tax_id?: string | null;
  address?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  credit_rating?: string | null;
  risk_level: string;
  bank_name?: string | null;
  bank_account?: string | null;
  remarks?: string | null;
  name_en?: string | null;
  lead_time_days?: number | null;
  source_system?: string | null;
  source_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MasterDataSupplierListParams {
  page?: number;
  page_size?: number;
  /** 关键词：模糊匹配 supplier_no / name / contact_person / phone / email */
  keyword?: string;
  status?: string;
  category?: string;
}

export interface MasterDataSupplierListResponse {
  items: MasterDataSupplier[];
  total: number;
  page: number;
  page_size: number;
}

/** 创建请求（source_system / source_id 由服务端强制，客户端不传） */
export interface CreateMasterDataSupplierRequest {
  supplier_no: string;
  name: string;
  status?: string;
  risk_level?: string;
  legal_name?: string;
  /** 自由文本分类（可空，不校验） */
  category?: string;
  /** 标准分类 code（给了就校验字典存在；留空合法） */
  category_code?: string;
  tax_id?: string;
  address?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  website?: string;
  credit_rating?: string;
  bank_name?: string;
  bank_account?: string;
  remarks?: string;
  name_en?: string;
  lead_time_days?: number;
}

/** PATCH 部分更新（所有字段可选；supplier_no / source_system / source_id 不允许改） */
export interface UpdateMasterDataSupplierRequest {
  name?: string;
  status?: string;
  risk_level?: string;
  legal_name?: string;
  category?: string;
  category_code?: string;
  tax_id?: string;
  address?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  website?: string;
  credit_rating?: string;
  bank_name?: string;
  bank_account?: string;
  remarks?: string;
  name_en?: string;
  lead_time_days?: number;
}

export const masterDataSuppliersApi = {
  /** GET /api/master-data/suppliers —— 分页列表 */
  list: async (
    params?: MasterDataSupplierListParams
  ): Promise<ApiResponse<MasterDataSupplierListResponse>> => {
    return apiClient.master.get<MasterDataSupplierListResponse>('/suppliers', { params });
  },

  /** GET /api/master-data/suppliers/:id —— 详情 */
  get: async (id: string): Promise<ApiResponse<MasterDataSupplier>> => {
    return apiClient.master.get<MasterDataSupplier>(`/suppliers/${id}`);
  },

  /** POST /api/master-data/suppliers —— 创建 */
  create: async (
    data: CreateMasterDataSupplierRequest
  ): Promise<ApiResponse<MasterDataSupplier>> => {
    const payload = await fillCategoryFromCode(data);
    return apiClient.master.post<MasterDataSupplier>('/suppliers', payload);
  },

  /** PATCH /api/master-data/suppliers/:id —— 部分更新（注意是 PATCH 不是 PUT） */
  update: async (
    id: string,
    data: UpdateMasterDataSupplierRequest
  ): Promise<ApiResponse<MasterDataSupplier>> => {
    const payload = await fillCategoryFromCode(data);
    return apiClient.master.patch<MasterDataSupplier>(`/suppliers/${id}`, payload);
  },

  /** DELETE /api/master-data/suppliers/:id —— 软删（list 不再出现，GET :id 返回 404） */
  delete: async (id: string): Promise<ApiResponse<unknown>> => {
    return apiClient.master.delete<unknown>(`/suppliers/${id}`);
  },
};

export default masterDataSuppliersApi;
