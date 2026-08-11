import { apiClient } from '../client';
import type { ApiResponse } from '../client';
import type {
  BalanceSheet,
  IncomeStatement,
  CashFlowStatement,
} from '../../types/finance';

export interface LedgerQueryParams {
  account_id?: string;
  account_code?: string;
  start_date?: string;
  end_date?: string;
  period?: string;
}

export interface LedgerEntry {
  id?: string;
  date?: string;
  account_id?: string;
  account_code?: string;
  account_name?: string;
  voucher_no?: string;
  summary?: string;
  debit?: number;
  credit?: number;
  balance?: number;
  counterparty?: string;
}

export interface TrialBalanceItem {
  account_id?: string;
  account_code?: string;
  account_name?: string;
  opening_debit?: number;
  opening_credit?: number;
  period_debit?: number;
  period_credit?: number;
  closing_debit?: number;
  closing_credit?: number;
}

export const cashFlowApi = {
  getCashFlowStatement: (period: string): Promise<ApiResponse<CashFlowStatement>> => {
    return apiClient.finance.get(`/cash-flow/${period}`);
  },

  getBalanceSheet: (period: string): Promise<ApiResponse<BalanceSheet>> => {
    return apiClient.finance.get(`/balance-sheet/${period}`);
  },

  getIncomeStatement: (period: string): Promise<ApiResponse<IncomeStatement>> => {
    return apiClient.finance.get(`/income-statement/${period}`);
  },

  getLedger: (params?: LedgerQueryParams): Promise<ApiResponse<LedgerEntry[]>> => {
    return apiClient.finance.get('/ledger', { params });
  },

  getTrialBalance: (period: string): Promise<ApiResponse<TrialBalanceItem[]>> => {
    return apiClient.finance.get(`/trial-balance/${period}`);
  },
};

export default cashFlowApi;