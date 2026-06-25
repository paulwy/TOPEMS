/**
 * 财务报表API
 * 提供资产负债表、利润表、现金流量表等财务报表的生成和查询功能
 */

import { apiClient, downloadBlob } from './client';
import config from '../config/runtime';

export interface ConsolidationEntity {
  id: string;
  name: string;
  code: string;
  parent_id?: string;
  entity_type: 'holding' | 'subsidiary' | 'associate' | 'joint_venture';
  ownership_percentage: number;
  currency_code?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportSubscription {
  id: string;
  name: string;
  report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
  company_ids: string[];
  periods: string[];
  frequency: 'monthly' | 'quarterly' | 'yearly';
  recipients: {
    user_id?: string;
    email?: string;
  }[];
  format: 'pdf' | 'xlsx';
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// 一、财务报表生成
// ============================================

export const financialReportApi = {
  // -------- 资产负债表 --------

  /**
   * 生成资产负债表
   */
  generateBalanceSheet: (params: {
    company_id: string;
    period: string; // 期间 YYYY-MM
    compare_period?: string; // 对比期间
    currency_code?: string; // 币种，默认人民币
    include_disabled_accounts?: boolean;
  }) => apiClient.erp.post('/api/reports/balance-sheet/generate', params),

  /**
   * 获取资产负债表
   */
  getBalanceSheet: (params: { company_id: string; period: string; currency_code?: string }) =>
    apiClient.erp.get('/api/reports/balance-sheet', { params }),

  /**
   * 获取资产负债表历史列表
   */
  getBalanceSheetHistory: (params: {
    company_id: string;
    start_period: string;
    end_period: string;
    currency_code?: string;
    page?: number;
    page_size?: number;
  }) => apiClient.erp.get('/api/reports/balance-sheet/history', { params }),

  // -------- 利润表 --------

  /**
   * 生成利润表
   */
  generateIncomeStatement: (params: {
    company_id: string;
    period: string;
    compare_period?: string;
    currency_code?: string;
    include_detail?: boolean;
  }) => apiClient.erp.post('/api/reports/income-statement/generate', params),

  /**
   * 获取利润表
   */
  getIncomeStatement: (params: { company_id: string; period: string; currency_code?: string }) =>
    apiClient.erp.get('/api/reports/income-statement', { params }),

  /**
   * 获取利润表历史列表
   */
  getIncomeStatementHistory: (params: {
    company_id: string;
    start_period: string;
    end_period: string;
    currency_code?: string;
    page?: number;
    page_size?: number;
  }) => apiClient.erp.get('/api/reports/income-statement/history', { params }),

  // -------- 现金流量表 --------

  /**
   * 生成现金流量表
   */
  generateCashFlowStatement: (params: {
    company_id: string;
    period: string;
    compare_period?: string;
    currency_code?: string;
    method?: 'direct' | 'indirect'; // 编制方法
  }) => apiClient.erp.post('/api/reports/cash-flow/generate', params),

  /**
   * 获取现金流量表
   */
  getCashFlowStatement: (params: { company_id: string; period: string; currency_code?: string }) =>
    apiClient.erp.get('/api/reports/cash-flow', { params }),

  /**
   * 获取现金流量表历史列表
   */
  getCashFlowStatementHistory: (params: {
    company_id: string;
    start_period: string;
    end_period: string;
    currency_code?: string;
    page?: number;
    page_size?: number;
  }) => apiClient.erp.get('/api/reports/cash-flow/history', { params }),

  // ============================================
  // 二、财务报表审批
  // ============================================

  /**
   * 提交报表审批
   */
  submitReportForApproval: (data: {
    report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
    report_id: string;
  }) => apiClient.erp.post('/api/reports/submit-approval', data),

  /**
   * 审批报表
   */
  approveReport: (data: {
    report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
    report_id: string;
    comment?: string;
  }) => apiClient.erp.post('/api/reports/approve', data),

  /**
   * 驳回报表
   */
  rejectReport: (data: {
    report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
    report_id: string;
    reason: string;
  }) => apiClient.erp.post('/api/reports/reject', data),

  /**
   * 锁定报表（禁止修改）
   */
  lockReport: (data: {
    report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
    report_id: string;
  }) => apiClient.erp.post('/api/reports/lock', data),

  /**
   * 解锁报表
   */
  unlockReport: (data: {
    report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
    report_id: string;
  }) => apiClient.erp.post('/api/reports/unlock', data),

  // ============================================
  // 三、报表项目明细
  // ============================================

  /**
   * 获取报表项目明细
   */
  getReportItemDetails: (params: {
    report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
    report_id: string;
    account_code: string;
    period?: string;
  }) => apiClient.erp.get('/api/reports/item-details', { params }),

  /**
   * 获取报表项目凭证列表
   */
  getReportItemVouchers: (params: {
    report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
    report_id: string;
    account_code: string;
    period?: string;
    page?: number;
    page_size?: number;
  }) => apiClient.erp.get('/api/reports/item-vouchers', { params }),

  // ============================================
  // 四、报表对比分析
  // ============================================

  /**
   * 获取报表对比分析
   */
  getReportComparison: (params: {
    report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
    company_id: string;
    period_from: string;
    period_to: string;
    currency_code?: string;
  }) => apiClient.erp.get('/api/reports/comparison', { params }),

  /**
   * 获取报表趋势分析
   */
  getReportTrend: (params: {
    report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
    company_id: string;
    period_from: string;
    period_to: string;
    account_codes?: string[]; // 指定科目，不指定则全部
    currency_code?: string;
  }) => apiClient.erp.get('/api/reports/trend', { params }),

  /**
   * 获取报表同比分析
   */
  getReportYearOverYear: (params: {
    report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
    company_id: string;
    current_period: string;
    previous_year_period: string;
    currency_code?: string;
  }) => apiClient.erp.get('/api/reports/year-over-year', { params }),

  /**
   * 获取报表环比分析
   */
  getReportPeriodOverPeriod: (params: {
    report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
    company_id: string;
    current_period: string;
    previous_period: string;
    currency_code?: string;
  }) => apiClient.erp.get('/api/reports/period-over-period', { params }),

  // ============================================
  // 五、多公司报表合并
  // ============================================

  /**
   * 生成合并报表
   */
  generateConsolidatedReport: (params: {
    consolidation_id: string; // 合并主体ID
    report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
    period: string;
    currency_code?: string;
    eliminate_intercompany?: boolean; // 抵消内部交易
  }) => apiClient.erp.post('/api/reports/consolidated/generate', params),

  /**
   * 获取合并报表
   */
  getConsolidatedReport: (
    consolidationId: string,
    params: {
      report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
      period: string;
      currency_code?: string;
    }
  ) =>
    apiClient.erp.get(`/api/reports/consolidated/${consolidationId}`, {
      params,
    }),

  /**
   * 获取合并主体列表
   */
  getConsolidationEntities: (params?: {
    parent_id?: string;
    include_disabled?: boolean;
    page?: number;
    page_size?: number;
  }) => apiClient.erp.get('/api/reports/consolidated/entities', { params }),

  /**
   * 创建合并主体
   */
  createConsolidationEntity: (data: {
    name: string;
    code: string;
    parent_id?: string;
    entity_type: 'holding' | 'subsidiary' | 'associate' | 'joint_venture';
    ownership_percentage: number;
    currency_code?: string;
  }) => apiClient.erp.post('/api/reports/consolidated/entities', data),

  /**
   * 更新合并主体
   */
  updateConsolidationEntity: (entityId: string, data: Partial<ConsolidationEntity>) =>
    apiClient.erp.put(`/api/reports/consolidated/entities/${entityId}`, data),

  /**
   * 删除合并主体
   */
  deleteConsolidationEntity: (entityId: string) =>
    apiClient.erp.delete(`/api/reports/consolidated/entities/${entityId}`),

  /**
   * 获取内部交易抵消明细
   */
  getIntercompanyEliminations: (params: {
    consolidation_id: string;
    period: string;
    page?: number;
    page_size?: number;
  }) => apiClient.erp.get('/api/reports/consolidated/elims', { params }),

  /**
   * 手动添加内部交易抵消
   */
  addIntercompanyElimination: (data: {
    consolidation_id: string;
    period: string;
    description: string;
    debit_account_code: string;
    credit_account_code: string;
    amount: number;
  }) => apiClient.erp.post('/api/reports/consolidated/elims', data),

  // ============================================
  // 六、报表导出
  // ============================================

  /**
   * 导出财务报表
   */
  exportReport: async (params: {
    report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
    report_id?: string;
    company_id: string;
    period: string;
    currency_code?: string;
    format: 'pdf' | 'xlsx' | 'csv';
    include_notes?: boolean; // 包含附注
    include_comparison?: boolean; // 包含对比数据
  }): Promise<Blob> => {
    const baseURL = (apiClient.erp as any).defaults?.baseURL || config.services.erp;
    return downloadBlob(baseURL, '/api/reports/export', { params });
  },

  /**
   * 批量导出报表
   */
  batchExportReports: (params: {
    report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
    company_ids: string[];
    periods: string[];
    currency_code?: string;
    format: 'pdf' | 'xlsx';
  }) => apiClient.erp.post('/api/reports/export/batch', params),

  /**
   * 导出合并报表
   */
  exportConsolidatedReport: async (params: {
    consolidation_id: string;
    report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
    period: string;
    currency_code?: string;
    format: 'pdf' | 'xlsx';
  }): Promise<Blob> => {
    const baseURL = (apiClient.erp as any).defaults?.baseURL || config.services.erp;
    return downloadBlob(baseURL, `/api/reports/consolidated/${params.consolidation_id}/export`, {
      params: {
        report_type: params.report_type,
        period: params.period,
        currency_code: params.currency_code,
        format: params.format,
      },
    });
  },

  // ============================================
  // 七、报表订阅
  // ============================================

  /**
   * 获取报表订阅列表
   */
  getReportSubscriptions: (params?: {
    report_type?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }) => apiClient.erp.get('/api/reports/subscriptions', { params }),

  /**
   * 创建报表订阅
   */
  createReportSubscription: (data: {
    name: string;
    report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
    company_ids: string[];
    periods: string[]; // 报表期间，如 ['2024-01', '2024-02']
    frequency: 'monthly' | 'quarterly' | 'yearly';
    recipients: {
      user_id?: string;
      email?: string;
    }[];
    format: 'pdf' | 'xlsx';
    is_active?: boolean;
  }) => apiClient.erp.post('/api/reports/subscriptions', data),

  /**
   * 更新报表订阅
   */
  updateReportSubscription: (subscriptionId: string, data: Partial<ReportSubscription>) =>
    apiClient.erp.put(`/api/reports/subscriptions/${subscriptionId}`, data),

  /**
   * 删除报表订阅
   */
  deleteReportSubscription: (subscriptionId: string) =>
    apiClient.erp.delete(`/api/reports/subscriptions/${subscriptionId}`),

  /**
   * 立即发送报表
   */
  sendReportNow: (subscriptionId: string) =>
    apiClient.erp.post(`/api/reports/subscriptions/${subscriptionId}/send-now`, {}),

  /**
   * 获取订阅发送历史
   */
  getSubscriptionHistory: (
    subscriptionId: string,
    params?: {
      page?: number;
      page_size?: number;
    }
  ) =>
    apiClient.erp.get(`/api/reports/subscriptions/${subscriptionId}/history`, {
      params,
    }),
};

export default financialReportApi;
