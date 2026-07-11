import type {
  Account,
  AccountBalance,
  AccountOpeningBalance,
  PaginatedResult,
  ApiResponse,
} from '../../types/finance';
import { apiClient } from '../client';

export const accountApi = {
  list: (params?: {
    category?: string;
    parent_id?: string;
    level?: number;
    status?: string;
    keyword?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResult<Account>>> => {
    return apiClient.erp.get('/finance/accounts', { params });
  },

  getTree: (params?: {
    category?: string;
    status?: string;
    include_disabled?: boolean;
  }): Promise<ApiResponse<Account[]>> => {
    return apiClient.erp.get('/finance/accounts/tree', { params });
  },

  get: (id: string): Promise<ApiResponse<Account>> => {
    return apiClient.erp.get(`/finance/accounts/${id}`);
  },

  create: (data: Partial<Account>): Promise<ApiResponse<Account>> => {
    return apiClient.erp.post('/finance/accounts', data);
  },

  update: (id: string, data: Partial<Account>): Promise<ApiResponse<Account>> => {
    return apiClient.erp.put(`/finance/accounts/${id}`, data);
  },

  delete: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.erp.delete(`/finance/accounts/${id}`);
  },

  batchCreateChildren: (
    parentId: string,
    accounts: Partial<Account>[]
  ): Promise<ApiResponse<Account[]>> => {
    return apiClient.erp.post(`/finance/accounts/${parentId}/children-batch`, { accounts });
  },

  getBalances: (params: {
    account_ids?: string[];
    period: string;
    company_id?: string;
    department_id?: string;
    project_id?: string;
  }): Promise<ApiResponse<AccountBalance[]>> => {
    return apiClient.erp.get('/finance/accounts/balances', {
      params,
    });
  },

  getOpeningBalances: (params: {
    period: string;
    account_ids?: string[];
    company_id?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResult<AccountOpeningBalance>>> => {
    return apiClient.erp.get('/finance/accounts/opening-balances', {
      params,
    });
  },

  setOpeningBalance: (
    accountId: string,
    data: Partial<AccountOpeningBalance>
  ): Promise<ApiResponse<AccountOpeningBalance>> => {
    return apiClient.erp.post(`/finance/accounts/${accountId}/opening-balance`, data);
  },

  carryForwardOpeningBalance: (params: {
    from_period: string;
    to_period: string;
    company_id?: string;
  }): Promise<ApiResponse<void>> => {
    return apiClient.erp.post('/finance/accounts/opening-balances/carry-forward', params);
  },
};

export default accountApi;
