/**
 * 凭证模板API
 * 提供凭证模板的CRUD操作和自动生成凭证功能
 */

import { apiClient, downloadBlob } from './client';
import type { VoucherTemplate, VoucherTemplateType, VoucherTemplateEntry } from '../types/finance';
import config from '../config/runtime';

// ============================================
// 一、凭证模板管理
// ============================================

export const voucherTemplateApi = {
  /**
   * 获取凭证模板列表
   */
  getTemplates: (params?: {
    type?: VoucherTemplateType | VoucherTemplateType[];
    module?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }) => apiClient.erp.get('/api/voucher/templates', { params }),

  /**
   * 获取模板详情
   */
  getTemplate: (templateId: string) => apiClient.erp.get(`/api/voucher/templates/${templateId}`),

  /**
   * 创建凭证模板
   */
  createTemplate: (data: {
    code: string;
    name: string;
    type: VoucherTemplateType;
    description?: string;
    applicable_modules?: string[];
    applicable_companies?: string[];
    condition?: string;
    entries: Partial<VoucherTemplateEntry>[];
  }) => apiClient.erp.post('/api/voucher/templates', data),

  /**
   * 更新凭证模板
   */
  updateTemplate: (templateId: string, data: Partial<VoucherTemplate>) =>
    apiClient.erp.put(`/api/voucher/templates/${templateId}`, data),

  /**
   * 删除凭证模板
   */
  deleteTemplate: (templateId: string) =>
    apiClient.erp.delete(`/api/voucher/templates/${templateId}`),

  /**
   * 复制凭证模板
   */
  copyTemplate: (templateId: string, newCode: string, newName: string) =>
    apiClient.erp.post(`/api/voucher/templates/${templateId}/copy`, {
      new_code: newCode,
      new_name: newName,
    }),

  /**
   * 设置默认模板
   */
  setDefaultTemplate: (templateId: string, isDefault: boolean) =>
    apiClient.erp.put(`/api/voucher/templates/${templateId}/set-default`, {
      is_default: isDefault,
    }),

  /**
   * 启用/禁用模板
   */
  toggleTemplate: (templateId: string, isActive: boolean) =>
    apiClient.erp.put(`/api/voucher/templates/${templateId}/toggle`, {
      is_active: isActive,
    }),

  // ============================================
  // 二、模板分录规则管理
  // ============================================

  /**
   * 添加模板分录
   */
  addTemplateEntry: (templateId: string, entry: Partial<VoucherTemplateEntry>) =>
    apiClient.erp.post(`/api/voucher/templates/${templateId}/entries`, entry),

  /**
   * 更新模板分录
   */
  updateTemplateEntry: (
    templateId: string,
    entryId: string,
    entry: Partial<VoucherTemplateEntry>
  ) => apiClient.erp.put(`/api/voucher/templates/${templateId}/entries/${entryId}`, entry),

  /**
   * 删除模板分录
   */
  deleteTemplateEntry: (templateId: string, entryId: string) =>
    apiClient.erp.delete(`/api/voucher/templates/${templateId}/entries/${entryId}`),

  /**
   * 重新排序模板分录
   */
  reorderTemplateEntries: (templateId: string, entryIds: string[]) =>
    apiClient.erp.put(`/api/voucher/templates/${templateId}/entries/reorder`, {
      entry_ids: entryIds,
    }),

  // ============================================
  // 三、凭证自动生成
  // ============================================

  /**
   * 预览生成的凭证
   */
  previewGeneratedVouchers: (data: {
    template_id: string;
    source_module: string;
    source_id: string;
    company_id?: string;
    voucher_date?: string;
  }) => apiClient.erp.post('/api/voucher/generate/preview', data),

  /**
   * 从源单据生成凭证
   * 支持从PM、CRM、SRM、HRM等模块的源单据生成凭证
   */
  generateVoucherFromSource: (data: {
    template_id?: string; // 指定模板，不指定则使用默认模板
    source_module: 'pm' | 'crm' | 'srm' | 'hrm' | 'finance';
    source_id: string;
    company_id?: string;
    voucher_date?: string;
    force_regenerate?: boolean; // 是否强制重新生成
  }) => apiClient.erp.post('/api/voucher/generate/from-source', data),

  /**
   * 批量从源单据生成凭证
   */
  batchGenerateVouchers: (data: {
    template_id?: string;
    source_module: 'pm' | 'crm' | 'srm' | 'hrm' | 'finance';
    source_ids: string[];
    company_id?: string;
    voucher_date?: string;
  }) => apiClient.erp.post('/api/voucher/generate/batch', data),

  /**
   * 根据规则自动生成凭证
   * 支持按期间、公司等维度自动生成凭证
   */
  autoGenerateVouchers: (data: {
    template_id?: string;
    company_id?: string;
    period: string; // 会计期间 YYYY-MM
    modules?: ('pm' | 'crm' | 'srm' | 'hrm' | 'finance')[];
    dry_run?: boolean; // 试算不实际生成
  }) => apiClient.erp.post('/api/voucher/generate/auto', data),

  /**
   * 重新生成已冲销的凭证
   */
  regenerateReversedVoucher: (originalVoucherId: string, voucherDate?: string) =>
    apiClient.erp.post(`/api/voucher/generate/regenerate/${originalVoucherId}`, {
      voucher_date: voucherDate,
    }),

  // ============================================
  // 四、凭证模板匹配
  // ============================================

  /**
   * 根据源单据信息匹配模板
   */
  matchTemplate: (data: {
    source_module: string;
    source_type: string;
    company_id?: string;
    amount?: number;
    extra_data?: Record<string, any>;
  }) => apiClient.erp.post('/api/voucher/templates/match', data),

  /**
   * 获取模板使用统计
   */
  getTemplateUsageStats: (
    templateId: string,
    params?: {
      start_date?: string;
      end_date?: string;
    }
  ) =>
    apiClient.erp.get(`/api/voucher/templates/${templateId}/usage-stats`, {
      params,
    }),

  // ============================================
  // 五、凭证生成规则
  // ============================================

  /**
   * 获取凭证生成规则列表
   */
  getGenerationRules: (params?: {
    source_module?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }) => apiClient.erp.get('/api/voucher/rules', { params }),

  /**
   * 创建凭证生成规则
   */
  createGenerationRule: (data: {
    name: string;
    source_module: string;
    source_type: string;
    template_id: string;
    condition?: string;
    priority?: number;
    is_active?: boolean;
  }) => apiClient.erp.post('/api/voucher/rules', data),

  /**
   * 更新凭证生成规则
   */
  updateGenerationRule: (ruleId: string, data: any) =>
    apiClient.erp.put(`/api/voucher/rules/${ruleId}`, data),

  /**
   * 删除凭证生成规则
   */
  deleteGenerationRule: (ruleId: string) => apiClient.erp.delete(`/api/voucher/rules/${ruleId}`),

  /**
   * 启用/禁用生成规则
   */
  toggleGenerationRule: (ruleId: string, isActive: boolean) =>
    apiClient.erp.put(`/api/voucher/rules/${ruleId}/toggle`, {
      is_active: isActive,
    }),

  // ============================================
  // 六、导出
  // ============================================

  /**
   * 导出模板
   */
  exportTemplate: async (templateId: string, format: 'json' | 'yaml'): Promise<Blob> => {
    const baseURL = (apiClient.erp as any).defaults?.baseURL || config.services.erp;
    return downloadBlob(baseURL, `/api/voucher/templates/${templateId}/export`, {
      params: { format },
    });
  },

  /**
   * 导入模板
   */
  importTemplate: (data: FormData) =>
    apiClient.erp.post('/api/voucher/templates/import', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export default voucherTemplateApi;
