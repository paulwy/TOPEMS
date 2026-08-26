import { apiClient, downloadBlob } from '../client';
import type {
  BalanceSheet,
  IncomeStatement,
  CashFlowStatement,
  ReportQueryParams,
  AccountBalance,
  PaginatedResult,
  ApiResponse,
  BusinessOverview,
  ProjectFinancialSummary,
  MonthlyTrend,
  DepartmentFinancialSummary,
  AgingAnalysis,
  CashFlowAnalysis,
  ExpenseAnalysis,
  ProfitAnalysis,
  FinancialOverview,
} from '../../types/finance';

export const reportApi = {
  getBalanceSheet: (params: ReportQueryParams): Promise<ApiResponse<BalanceSheet>> => {
    return apiClient.finance.get('/reports/balance-sheet', {
      params,
    });
  },

  getIncomeStatement: (params: ReportQueryParams): Promise<ApiResponse<IncomeStatement>> => {
    return apiClient.finance.get('/reports/income-statement', {
      params,
    });
  },

  getCashFlowStatement: (params: ReportQueryParams): Promise<ApiResponse<CashFlowStatement>> => {
    return apiClient.finance.get('/reports/cash-flow', {
      params,
    });
  },

  getAccountBalanceReport: (params: {
    org_id: string;
    period: string;
    account_ids?: string[];
    level?: number;
    show_zero_balance?: boolean;
  }): Promise<
    ApiResponse<{
      items: AccountBalance[];
      total_records: number;
    }>
  > => {
    return apiClient.finance.get('/reports/account-balance', {
      params,
    });
  },

  getAccountLedger: (params: {
    account_id: string;
    start_period: string;
    end_period: string;
    org_id?: string;
    department_id?: string;
    project_id?: string;
    page?: number;
    pagesize?: number;
  }): Promise<
    ApiResponse<
      PaginatedResult<{
        date: string;
        voucher_no: string;
        summary: string;
        debit: number;
        credit: number;
        balance: number;
        counterparty?: string;
      }>
    >
  > => {
    return apiClient.finance.get('/reports/account-ledger', {
      params,
    });
  },

  getDimensionDetail: (params: {
    dimension: string;
    dimension_id: string;
    start_period: string;
    end_period: string;
    org_id?: string;
  }): Promise<ApiResponse<any>> => {
    return apiClient.finance.get('/reports/dimension-detail', {
      params,
    });
  },

  exportBalanceSheet: async (params: ReportQueryParams): Promise<Blob> => {
    return downloadBlob('finance', '/reports/balance-sheet/export', {
      params: params as unknown as Record<string, unknown>,
    });
  },

  exportIncomeStatement: async (params: ReportQueryParams): Promise<Blob> => {
    return downloadBlob('finance', '/reports/income-statement/export', {
      params: params as unknown as Record<string, unknown>,
    });
  },

  exportCashFlowStatement: async (params: ReportQueryParams): Promise<Blob> => {
    return downloadBlob('finance', '/reports/cash-flow/export', {
      params: params as unknown as Record<string, unknown>,
    });
  },

  // === B1 API迁移: 从@/api/erp/finance/report.ts迁移的10个独有方法 ===

  getBusinessOverview: (params?: { period?: string }): Promise<ApiResponse<BusinessOverview>> => {
    return apiClient.finance.get('/reports/business-overview', {
      params,
    });
  },

  getProjectSummary: (params?: {
    project_id?: string;
  }): Promise<ApiResponse<ProjectFinancialSummary[]>> => {
    return apiClient.finance.get('/reports/project-summary', {
      params,
    });
  },

  getMonthlyTrend: (): Promise<ApiResponse<MonthlyTrend[]>> => {
    return apiClient.finance.get('/reports/monthly-trend');
  },

  getDepartmentSummary: (params?: {
    department_id?: string;
  }): Promise<ApiResponse<DepartmentFinancialSummary[]>> => {
    return apiClient.finance.get('/reports/department-summary', {
      params,
    });
  },

  getAgingAnalysis: (): Promise<ApiResponse<AgingAnalysis[]>> => {
    return apiClient.finance.get('/reports/aging-analysis');
  },

  getVoucherStatistics: (params?: { period?: string }): Promise<ApiResponse<Record<string, any>>> => {
    return apiClient.finance.get('/reports/voucher-statistics', {
      params,
    });
  },

  getCashFlowAnalysis: (params?: { period?: string }): Promise<ApiResponse<CashFlowAnalysis>> => {
    return apiClient.finance.get('/reports/cash-flow-analysis', {
      params,
    });
  },

  getExpenseAnalysis: (params?: { period?: string }): Promise<ApiResponse<ExpenseAnalysis>> => {
    return apiClient.finance.get('/reports/expense-analysis', {
      params,
    });
  },

  getProfitAnalysis: (params?: { period?: string }): Promise<ApiResponse<ProfitAnalysis>> => {
    return apiClient.finance.get('/reports/profit-analysis', {
      params,
    });
  },

  getFinancialOverview: (params?: { period?: string }): Promise<ApiResponse<FinancialOverview>> => {
    return apiClient.finance.get('/reports/financial-overview', {
      params,
    });
  },
};

export default reportApi;
