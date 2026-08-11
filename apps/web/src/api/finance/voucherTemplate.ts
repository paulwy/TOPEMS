import { apiClient, downloadBlob } from '../client';
import type { ApiResponse } from '../client';

export interface VoucherTemplate {
  id?: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  status?: 'active' | 'inactive' | 'draft';
  is_default?: boolean;
  entries?: VoucherTemplateEntry[];
  usage_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface VoucherTemplateEntry {
  id?: string;
  template_id?: string;
  account_id: string;
  account_code?: string;
  description?: string;
  debit_formula?: string;
  credit_formula?: string;
  debit_amount?: number;
  credit_amount?: number;
  partner_type?: string;
  partner_id?: string;
  sequence?: number;
}

export interface VoucherGenerationRule {
  id?: string;
  name: string;
  description?: string;
  template_id?: string;
  trigger_event: string;
  conditions?: Record<string, unknown>;
  priority?: number;
  status?: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface VoucherGenerateRequest {
  period: string;
  template_id?: string;
  rule_id?: string;
  source_type?: string;
  source_ids?: string[];
  description?: string;
}

export interface VoucherBatchGenerateRequest {
  period: string;
  template_ids?: string[];
  rule_ids?: string[];
  source_type?: string;
  start_date?: string;
  end_date?: string;
}

export const voucherTemplateApi = {
  listTemplates: (params?: {
    status?: string;
    category?: string;
    keyword?: string;
  }): Promise<ApiResponse<VoucherTemplate[]>> => {
    return apiClient.finance.get('/voucher-templates', { params });
  },

  getTemplate: (templateId: string): Promise<ApiResponse<VoucherTemplate>> => {
    return apiClient.finance.get(`/voucher-templates/${templateId}`);
  },

  createTemplate: (data: Partial<VoucherTemplate>): Promise<ApiResponse<VoucherTemplate>> => {
    return apiClient.finance.post('/voucher-templates', data);
  },

  updateTemplate: (templateId: string, data: Partial<VoucherTemplate>): Promise<ApiResponse<VoucherTemplate>> => {
    return apiClient.finance.put(`/voucher-templates/${templateId}`, data);
  },

  deleteTemplate: (templateId: string): Promise<ApiResponse<void>> => {
    return apiClient.finance.delete(`/voucher-templates/${templateId}`);
  },

  copyTemplate: (templateId: string): Promise<ApiResponse<VoucherTemplate>> => {
    return apiClient.finance.post(`/voucher-templates/${templateId}/copy`, {});
  },

  setDefault: (templateId: string): Promise<ApiResponse<void>> => {
    return apiClient.finance.post(`/voucher-templates/${templateId}/set-default`, {});
  },

  toggleTemplate: (templateId: string): Promise<ApiResponse<void>> => {
    return apiClient.finance.post(`/voucher-templates/${templateId}/toggle`, {});
  },

  matchTemplate: (params?: Record<string, unknown>): Promise<ApiResponse<VoucherTemplate[]>> => {
    return apiClient.finance.get('/voucher-templates/match', { params });
  },

  importTemplates: (data: FormData): Promise<ApiResponse<{ imported: number; failed: number }>> => {
    return apiClient.finance.post('/voucher-templates/import', data);
  },

  exportTemplates: async (params?: Record<string, unknown>): Promise<Blob> => {
    return downloadBlob('finance', '/voucher-templates/export', { params });
  },

  getTemplateEntries: (templateId: string): Promise<ApiResponse<VoucherTemplateEntry[]>> => {
    return apiClient.finance.get(`/voucher-templates/${templateId}/entries`);
  },

  createTemplateEntry: (
    templateId: string,
    data: Partial<VoucherTemplateEntry>
  ): Promise<ApiResponse<VoucherTemplateEntry>> => {
    return apiClient.finance.post(`/voucher-templates/${templateId}/entries`, data);
  },

  updateTemplateEntry: (
    templateId: string,
    entryId: string,
    data: Partial<VoucherTemplateEntry>
  ): Promise<ApiResponse<VoucherTemplateEntry>> => {
    return apiClient.finance.put(`/voucher-templates/${templateId}/entries/${entryId}`, data);
  },

  deleteTemplateEntry: (templateId: string, entryId: string): Promise<ApiResponse<void>> => {
    return apiClient.finance.delete(`/voucher-templates/${templateId}/entries/${entryId}`);
  },

  reorderTemplateEntries: (
    templateId: string,
    entryIds: string[]
  ): Promise<ApiResponse<void>> => {
    return apiClient.finance.post(`/voucher-templates/${templateId}/entries/reorder`, {
      entry_ids: entryIds,
    });
  },

  getTemplateUsageStats: (templateId: string): Promise<ApiResponse<{ usage_count: number; last_used?: string }>> => {
    return apiClient.finance.get(`/voucher-templates/${templateId}/usage-stats`);
  },

  listGenerationRules: (params?: {
    status?: string;
    trigger_event?: string;
  }): Promise<ApiResponse<VoucherGenerationRule[]>> => {
    return apiClient.finance.get('/voucher-generation-rules', { params });
  },

  getGenerationRule: (ruleId: string): Promise<ApiResponse<VoucherGenerationRule>> => {
    return apiClient.finance.get(`/voucher-generation-rules/${ruleId}`);
  },

  createGenerationRule: (data: Partial<VoucherGenerationRule>): Promise<ApiResponse<VoucherGenerationRule>> => {
    return apiClient.finance.post('/voucher-generation-rules', data);
  },

  updateGenerationRule: (ruleId: string, data: Partial<VoucherGenerationRule>): Promise<ApiResponse<VoucherGenerationRule>> => {
    return apiClient.finance.put(`/voucher-generation-rules/${ruleId}`, data);
  },

  deleteGenerationRule: (ruleId: string): Promise<ApiResponse<void>> => {
    return apiClient.finance.delete(`/voucher-generation-rules/${ruleId}`);
  },

  toggleGenerationRule: (ruleId: string): Promise<ApiResponse<void>> => {
    return apiClient.finance.post(`/voucher-generation-rules/${ruleId}/toggle`, {});
  },

  generateVoucher: (data: VoucherGenerateRequest): Promise<ApiResponse<{ voucher_id?: string; success: boolean }>> => {
    return apiClient.finance.post('/voucher/generate/from-source', data);
  },

  autoGenerate: (data: VoucherBatchGenerateRequest): Promise<ApiResponse<{ generated_count: number }>> => {
    return apiClient.finance.post('/voucher/generate/auto', data);
  },

  batchGenerate: (data: VoucherBatchGenerateRequest): Promise<ApiResponse<{ generated_count: number }>> => {
    return apiClient.finance.post('/voucher/generate/batch', data);
  },

  previewGenerate: (data: VoucherGenerateRequest): Promise<ApiResponse<{ entries: Array<{ account: string; debit: number; credit: number }> }>> => {
    return apiClient.finance.post('/voucher/generate/preview', data);
  },

  regenerate: (
    originalVoucherId: string,
    data?: Partial<VoucherGenerateRequest>
  ): Promise<ApiResponse<{ voucher_id?: string }>> => {
    return apiClient.finance.post(`/voucher/generate/regenerate/${originalVoucherId}`, data || {});
  },
};

export default voucherTemplateApi;