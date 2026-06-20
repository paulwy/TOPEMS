/**
 * PM-Finance API
 * 项目管理与财务模块集成接口
 */

import { apiClient, downloadBlob } from "./client";
import config from "../config/runtime";

/**
 * 项目财务信息
 */
export interface ProjectFinanceInfo {
  project_id: string;
  project_code: string;
  project_name: string;
  project_type: "internal" | "external" | "investment";
  cost_center_id: string;
  budget_amount: number;
  actual_cost: number;
  committed_cost: number;
  remaining_budget: number;
  cost_variance: number;
  cost_variance_rate: number;
  revenue_recognized: number;
  accounts_receivable: number;
  gross_profit: number;
  gross_margin: number;
  status: "active" | "completed" | "suspended" | "cancelled";
}

/**
 * 项目成本记录
 */
export interface ProjectCostRecord {
  cost_id: string;
  project_id: string;
  cost_type: "material" | "labor" | "expense" | "subcontract" | "other";
  cost_category_id: string;
  cost_date: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  expense_account_id: string;
  vendor_id?: string;
  employee_id?: string;
  description?: string;
  voucher_id?: string;
  status: "pending" | "approved" | "invoiced" | "paid";
}

/**
 * 成本归集规则
 */
export interface CostAllocationRule {
  rule_id: string;
  rule_name: string;
  project_id?: string;
  project_type?: "internal" | "external" | "investment";
  cost_type: "material" | "labor" | "expense" | "subcontract" | "other";
  allocation_method: "by_amount" | "by_quantity" | "by_hours" | "by_percentage";
  allocation_ratio: number;
  target_cost_center_id: string;
  target_expense_account_id: string;
  is_active: boolean;
  effective_from: string;
  effective_to?: string;
}

/**
 * 项目发票信息
 */
export interface ProjectInvoice {
  invoice_id: string;
  project_id: string;
  invoice_type: "progress" | "milestone" | "final";
  invoice_number: string;
  invoice_date: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  customer_id: string;
  receivable_account_id: string;
  billing_period?: string;
  milestone_name?: string;
  completion_percentage?: number;
  voucher_id?: string;
  status: "draft" | "issued" | "confirmed" | "paid" | "overdue";
}

/**
 * 项目收支汇总
 */
export interface ProjectFinancialSummary {
  project_id: string;
  project_code: string;
  project_name: string;
  start_date: string;
  end_date: string;
  total_budget: number;
  total_cost: number;
  total_revenue: number;
  total_receivable: number;
  total_received: number;
  gross_profit: number;
  gross_margin: number;
  budget_utilization_rate: number;
  receivable_collection_rate: number;
  cost_breakdown: {
    material_cost: number;
    labor_cost: number;
    expense_cost: number;
    subcontract_cost: number;
    other_cost: number;
  };
  revenue_breakdown: {
    recognized_revenue: number;
    pending_invoice: number;
    overdue_receivable: number;
  };
}

/**
 * 项目利润表
 */
export interface ProjectIncomeStatement {
  project_id: string;
  project_code: string;
  project_name: string;
  period: string;
  revenue: number;
  cost_of_goods_sold: number;
  gross_profit: number;
  gross_margin: number;
  operating_expenses: number;
  operating_profit: number;
  other_income: number;
  other_expenses: number;
  net_profit: number;
  net_margin: number;
}

/**
 * 项目预算执行分析
 */
export interface ProjectBudgetAnalysis {
  project_id: string;
  project_code: string;
  project_name: string;
  budget_amount: number;
  actual_cost: number;
  committed_cost: number;
  total_cost: number;
  budget_variance: number;
  budget_variance_rate: number;
  forecast_final_cost: number;
  forecast_variance: number;
  forecast_variance_rate: number;
  earned_value: number;
  planned_value: number;
  schedule_performance_index: number;
  cost_performance_index: number;
  budget_status: "on_track" | "over_budget" | "under_budget" | "critical";
}

/**
 * 项目资金计划
 */
export interface ProjectCashPlan {
  plan_id: string;
  project_id: string;
  plan_type: "collection" | "payment";
  plan_date: string;
  amount: number;
  currency: string;
  counterparty_id?: string;
  description?: string;
  actual_date?: string;
  actual_amount?: number;
  variance: number;
  status: "planned" | "confirmed" | "completed" | "delayed";
}

export interface GetProjectFinanceInfoParams {
  projectId: string;
}

export interface GetProjectCostRecordsParams {
  project_id?: string;
  cost_type?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

export interface GetCostAllocationRulesParams {
  project_id?: string;
  project_type?: string;
  cost_type?: string;
  is_active?: boolean;
}

export interface GetProjectInvoicesParams {
  project_id?: string;
  invoice_type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

export interface GetProjectFinancialSummaryParams {
  project_id?: string;
  start_date?: string;
  end_date?: string;
  include_cost_breakdown?: boolean;
  include_revenue_breakdown?: boolean;
}

export interface GetProjectBudgetAnalysisParams {
  project_id: string;
  as_of_date?: string;
}

export interface CreateCostAllocationRuleData {
  rule_name: string;
  project_id?: string;
  project_type?: "internal" | "external" | "investment";
  cost_type: "material" | "labor" | "expense" | "subcontract" | "other";
  allocation_method: "by_amount" | "by_quantity" | "by_hours" | "by_percentage";
  allocation_ratio: number;
  target_cost_center_id: string;
  target_expense_account_id: string;
  effective_from: string;
  effective_to?: string;
}

export interface UpdateCostAllocationRuleData {
  rule_name?: string;
  allocation_method?:
    | "by_amount"
    | "by_quantity"
    | "by_hours"
    | "by_percentage";
  allocation_ratio?: number;
  target_cost_center_id?: string;
  target_expense_account_id?: string;
  is_active?: boolean;
  effective_from?: string;
  effective_to?: string;
}

export interface CreateProjectInvoiceData {
  project_id: string;
  invoice_type: "progress" | "milestone" | "final";
  invoice_date: string;
  amount: number;
  tax_amount: number;
  customer_id: string;
  receivable_account_id: string;
  billing_period?: string;
  milestone_name?: string;
  completion_percentage?: number;
}

export interface UpdateProjectInvoiceData {
  invoice_date?: string;
  amount?: number;
  tax_amount?: number;
  receivable_account_id?: string;
  billing_period?: string;
  milestone_name?: string;
  completion_percentage?: number;
  status?: "draft" | "issued" | "confirmed" | "paid" | "overdue";
}

export interface CreateProjectCashPlanData {
  project_id: string;
  plan_type: "collection" | "payment";
  plan_date: string;
  amount: number;
  currency?: string;
  counterparty_id?: string;
  description?: string;
}

export interface UpdateProjectCashPlanData {
  plan_date?: string;
  amount?: number;
  counterparty_id?: string;
  description?: string;
  actual_date?: string;
  actual_amount?: number;
  status?: "planned" | "confirmed" | "completed" | "delayed";
}

export interface GenerateProjectVoucherParams {
  project_id: string;
  cost_record_ids?: string[];
  invoice_ids?: string[];
  voucher_date: string;
  voucher_type: "cost" | "revenue" | "receivable" | "payment";
}

export const pmFinanceApi = {
  // 项目财务信息
  getProjectFinanceInfo: (projectId: string) =>
    apiClient.pm.get(`/api/pm/projects/${projectId}/finance`),

  // 项目成本记录
  getProjectCostRecords: (params?: GetProjectCostRecordsParams) =>
    apiClient.pm.get("/api/pm/cost-records", { params }),

  createProjectCostRecord: (data: Partial<ProjectCostRecord>) =>
    apiClient.pm.post("/api/pm/cost-records", data),

  updateProjectCostRecord: (costId: string, data: Partial<ProjectCostRecord>) =>
    apiClient.pm.put(`/api/pm/cost-records/${costId}`, data),

  deleteProjectCostRecord: (costId: string) =>
    apiClient.pm.delete(`/api/pm/cost-records/${costId}`),

  batchDeleteProjectCostRecords: (costIds: string[]) =>
    apiClient.pm.post("/api/pm/cost-records/batch-delete", {
      cost_ids: costIds,
    }),

  approveProjectCostRecord: (costId: string) =>
    apiClient.pm.post(`/api/pm/cost-records/${costId}/approve`),

  batchApproveProjectCostRecords: (costIds: string[]) =>
    apiClient.pm.post("/api/pm/cost-records/batch-approve", {
      cost_ids: costIds,
    }),

  // 成本归集规则
  getCostAllocationRules: (params?: GetCostAllocationRulesParams) =>
    apiClient.pm.get("/api/pm/cost-allocation-rules", { params }),

  createCostAllocationRule: (data: CreateCostAllocationRuleData) =>
    apiClient.pm.post("/api/pm/cost-allocation-rules", data),

  updateCostAllocationRule: (
    ruleId: string,
    data: UpdateCostAllocationRuleData,
  ) => apiClient.pm.put(`/api/pm/cost-allocation-rules/${ruleId}`, data),

  deleteCostAllocationRule: (ruleId: string) =>
    apiClient.pm.delete(`/api/pm/cost-allocation-rules/${ruleId}`),

  applyCostAllocationRules: (projectId: string, costRecordIds?: string[]) =>
    apiClient.pm.post(`/api/pm/projects/${projectId}/apply-allocation-rules`, {
      cost_record_ids: costRecordIds,
    }),

  previewCostAllocation: (projectId: string, costRecordIds?: string[]) =>
    apiClient.pm.post(`/api/pm/projects/${projectId}/preview-allocation`, {
      cost_record_ids: costRecordIds,
    }),

  // 项目发票
  getProjectInvoices: (params?: GetProjectInvoicesParams) =>
    apiClient.pm.get("/api/pm/invoices", { params }),

  getProjectInvoice: (invoiceId: string) =>
    apiClient.pm.get(`/api/pm/invoices/${invoiceId}`),

  createProjectInvoice: (data: CreateProjectInvoiceData) =>
    apiClient.pm.post("/api/pm/invoices", data),

  updateProjectInvoice: (invoiceId: string, data: UpdateProjectInvoiceData) =>
    apiClient.pm.put(`/api/pm/invoices/${invoiceId}`, data),

  deleteProjectInvoice: (invoiceId: string) =>
    apiClient.pm.delete(`/api/pm/invoices/${invoiceId}`),

  issueProjectInvoice: (invoiceId: string) =>
    apiClient.pm.post(`/api/pm/invoices/${invoiceId}/issue`),

  confirmProjectInvoice: (invoiceId: string) =>
    apiClient.pm.post(`/api/pm/invoices/${invoiceId}/confirm`),

  // 项目财务汇总
  getProjectFinancialSummary: (params: GetProjectFinancialSummaryParams) =>
    apiClient.pm.get("/api/pm/reports/financial-summary", { params }),

  getProjectIncomeStatement: (params: { project_id: string; period: string }) =>
    apiClient.pm.get("/api/pm/reports/income-statement", { params }),

  getProjectBudgetAnalysis: (params: GetProjectBudgetAnalysisParams) =>
    apiClient.pm.get("/api/pm/reports/budget-analysis", { params }),

  getProjectCashPlan: (projectId: string) =>
    apiClient.pm.get(`/api/pm/projects/${projectId}/cash-plan`),

  createProjectCashPlan: (data: CreateProjectCashPlanData) =>
    apiClient.pm.post("/api/pm/cash-plan", data),

  updateProjectCashPlan: (planId: string, data: UpdateProjectCashPlanData) =>
    apiClient.pm.put(`/api/pm/cash-plan/${planId}`, data),

  deleteProjectCashPlan: (planId: string) =>
    apiClient.pm.delete(`/api/pm/cash-plan/${planId}`),

  // 生成项目凭证
  generateProjectVoucher: (params: GenerateProjectVoucherParams) =>
    apiClient.pm.post("/api/pm/vouchers/generate", params),

  // 批量生成凭证
  batchGenerateProjectVouchers: (
    projectIds: string[],
    voucherType: "cost" | "revenue",
  ) =>
    apiClient.pm.post("/api/pm/vouchers/batch-generate", {
      project_ids: projectIds,
      voucher_type: voucherType,
    }),

  // 导出
  exportProjectCostRecords: async (params: {
    project_id?: string;
    cost_type?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    format: "csv" | "xlsx";
  }): Promise<Blob> => {
    const baseURL =
      (apiClient.pm as any).defaults?.baseURL || config.services.pm;
    return downloadBlob(baseURL, "/api/pm/cost-records/export", {
      params,
    });
  },

  exportProjectInvoices: async (params: {
    project_id?: string;
    invoice_type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    format: "csv" | "xlsx";
  }): Promise<Blob> => {
    const baseURL =
      (apiClient.pm as any).defaults?.baseURL || config.services.pm;
    return downloadBlob(baseURL, "/api/pm/invoices/export", { params });
  },
};

export default pmFinanceApi;
