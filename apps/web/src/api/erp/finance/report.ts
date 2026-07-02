import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type {
  BalanceSheet,
  IncomeStatement,
  CashFlowStatement,
  BusinessOverview,
  ProjectFinancialSummary,
  MonthlyTrend,
  DepartmentFinancialSummary,
  AgingAnalysis,
  CashFlowAnalysis,
  ExpenseAnalysis,
  ProfitAnalysis,
  FinancialOverview,
} from '../types';

export const financeReportApi = {
  async balanceSheet(params?: { period?: string }): Promise<ApiResponse<BalanceSheet>> {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set('period', params.period);
    const queryString = searchParams.toString();
    return apiClient.erp.get(`/reports/balance-sheet${queryString ? `?${queryString}` : ''}`);
  },

  async incomeStatement(params?: { period?: string }): Promise<ApiResponse<IncomeStatement>> {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set('period', params.period);
    const queryString = searchParams.toString();
    return apiClient.erp.get(`/reports/income-statement${queryString ? `?${queryString}` : ''}`);
  },

  async cashFlowStatement(params?: { period?: string }): Promise<ApiResponse<CashFlowStatement>> {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set('period', params.period);
    const queryString = searchParams.toString();
    return apiClient.erp.get(`/reports/cash-flow${queryString ? `?${queryString}` : ''}`);
  },

  async businessOverview(params?: { period?: string }): Promise<ApiResponse<BusinessOverview>> {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set('period', params.period);
    const queryString = searchParams.toString();
    return apiClient.erp.get(`/reports/business-overview${queryString ? `?${queryString}` : ''}`);
  },

  async projectSummary(params?: {
    project_id?: string;
  }): Promise<ApiResponse<ProjectFinancialSummary[]>> {
    const searchParams = new URLSearchParams();
    if (params?.project_id) searchParams.set('project_id', params.project_id);
    const queryString = searchParams.toString();
    return apiClient.erp.get(`/reports/project-summary${queryString ? `?${queryString}` : ''}`);
  },

  async monthlyTrend(): Promise<ApiResponse<MonthlyTrend[]>> {
    return apiClient.erp.get('/reports/monthly-trend');
  },

  async departmentSummary(params?: {
    department_id?: string;
  }): Promise<ApiResponse<DepartmentFinancialSummary[]>> {
    const searchParams = new URLSearchParams();
    if (params?.department_id) searchParams.set('department_id', params.department_id);
    const queryString = searchParams.toString();
    return apiClient.erp.get(`/reports/department-summary${queryString ? `?${queryString}` : ''}`);
  },

  async agingAnalysis(): Promise<ApiResponse<AgingAnalysis[]>> {
    return apiClient.erp.get('/reports/aging-analysis');
  },

  async voucherStatistics(params?: { period?: string }): Promise<ApiResponse<Record<string, any>>> {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set('period', params.period);
    const queryString = searchParams.toString();
    return apiClient.erp.get(`/reports/voucher-statistics${queryString ? `?${queryString}` : ''}`);
  },

  async cashFlowAnalysis(params?: { period?: string }): Promise<ApiResponse<CashFlowAnalysis>> {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set('period', params.period);
    const queryString = searchParams.toString();
    return apiClient.erp.get(`/reports/cash-flow-analysis${queryString ? `?${queryString}` : ''}`);
  },

  async expenseAnalysis(params?: { period?: string }): Promise<ApiResponse<ExpenseAnalysis>> {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set('period', params.period);
    const queryString = searchParams.toString();
    return apiClient.erp.get(`/reports/expense-analysis${queryString ? `?${queryString}` : ''}`);
  },

  async profitAnalysis(params?: { period?: string }): Promise<ApiResponse<ProfitAnalysis>> {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set('period', params.period);
    const queryString = searchParams.toString();
    return apiClient.erp.get(`/reports/profit-analysis${queryString ? `?${queryString}` : ''}`);
  },

  async financialOverview(params?: { period?: string }): Promise<ApiResponse<FinancialOverview>> {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set('period', params.period);
    const queryString = searchParams.toString();
    return apiClient.erp.get(`/reports/financial-overview${queryString ? `?${queryString}` : ''}`);
  },
};
