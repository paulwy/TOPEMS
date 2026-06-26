import { apiClient, downloadBlob } from '../client';
import type {
  BalanceSheet,
  IncomeStatement,
  CashFlowStatement,
  ReportQueryParams,
  AccountBalance,
  PaginatedResult,
  ApiResponse,
} from '../../types/finance';
import config from '../../config/runtime';

const createApiClient = () => {
  return apiClient.erp;
};

export const reportApi = {
  getBalanceSheet: (params: ReportQueryParams): Promise<ApiResponse<BalanceSheet>> => {
    return createApiClient().get('/api/finance/reports/balance-sheet', {
      params,
    });
  },

  getIncomeStatement: (params: ReportQueryParams): Promise<ApiResponse<IncomeStatement>> => {
    return createApiClient().get('/api/finance/reports/income-statement', {
      params,
    });
  },

  getCashFlowStatement: (params: ReportQueryParams): Promise<ApiResponse<CashFlowStatement>> => {
    return createApiClient().get('/api/finance/reports/cash-flow', {
      params,
    });
  },

  getAccountBalanceReport: (params: {
    company_id: string;
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
    return createApiClient().get('/api/finance/reports/account-balance', {
      params,
    });
  },

  getAccountLedger: (params: {
    account_id: string;
    start_period: string;
    end_period: string;
    company_id?: string;
    department_id?: string;
    project_id?: string;
    page?: number;
    page_size?: number;
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
    return createApiClient().get('/api/finance/reports/account-ledger', {
      params,
    });
  },

  getDimensionDetail: (params: {
    dimension: string;
    dimension_id: string;
    start_period: string;
    end_period: string;
    company_id?: string;
  }): Promise<ApiResponse<any>> => {
    return createApiClient().get('/api/finance/reports/dimension-detail', {
      params,
    });
  },

  exportBalanceSheet: async (params: ReportQueryParams): Promise<Blob> => {
    const baseURL = (apiClient.erp as any).defaults?.baseURL || config.services.erp;
    return downloadBlob(baseURL, '/api/finance/reports/balance-sheet/export', {
      params: params as unknown as Record<string, unknown>,
    });
  },

  exportIncomeStatement: async (params: ReportQueryParams): Promise<Blob> => {
    const baseURL = (apiClient.erp as any).defaults?.baseURL || config.services.erp;
    return downloadBlob(baseURL, '/api/finance/reports/income-statement/export', { params: params as unknown as Record<string, unknown> });
  },

  exportCashFlowStatement: async (params: ReportQueryParams): Promise<Blob> => {
    const baseURL = (apiClient.erp as any).defaults?.baseURL || config.services.erp;
    return downloadBlob(baseURL, '/api/finance/reports/cash-flow/export', {
      params: params as unknown as Record<string, unknown>,
    });
  },
};

export default reportApi;
