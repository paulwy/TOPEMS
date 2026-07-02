import { apiClient } from '../client';
import type {
  Account,
  AccountBalance,
  AccountOpeningBalance,
  PaginatedResult,
  ApiResponse,
} from '../../types/finance';

const createApiClient = () => {
  return apiClient.erp;
};

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
    return createApiClient().get('/finance/accounts', { params });
  },

  getTree: (params?: {
    category?: string;
    status?: string;
    include_disabled?: boolean;
  }): Promise<ApiResponse<Account[]>> => {
    return createApiClient().get('/finance/accounts/tree', { params });
  },

  get: (id: string): Promise<ApiResponse<Account>> => {
    return createApiClient().get(`/finance/accounts/${id}`);
  },

  create: (data: Partial<Account>): Promise<ApiResponse<Account>> => {
    return createApiClient().post('/finance/accounts', data);
  },

  update: (id: string, data: Partial<Account>): Promise<ApiResponse<Account>> => {
    return createApiClient().put(`/finance/accounts/${id}`, data);
  },

  delete: (id: string): Promise<ApiResponse<void>> => {
    return createApiClient().delete(`/finance/accounts/${id}`);
  },

  batchCreateChildren: (
    parentId: string,
    accounts: Partial<Account>[]
  ): Promise<ApiResponse<Account[]>> => {
    return createApiClient().post(`/finance/accounts/${parentId}/children-batch`, { accounts });
  },

  getBalances: (params: {
    account_ids?: string[];
    period: string;
    company_id?: string;
    department_id?: string;
    project_id?: string;
  }): Promise<ApiResponse<AccountBalance[]>> => {
    return createApiClient().get('/finance/accounts/balances', {
      params,
    });
  },

  getOpeningBalances: (params: {
    period: string;
    account_ids?: string[];
    company_id?: string;
  }): Promise<ApiResponse<AccountOpeningBalance[]>> => {
    return createApiClient().get('/finance/accounts/opening-balances', {
      params,
    });
  },

  setOpeningBalance: (
    accountId: string,
    data: Partial<AccountOpeningBalance>
  ): Promise<ApiResponse<AccountOpeningBalance>> => {
    return createApiClient().post(`/finance/accounts/${accountId}/opening-balance`, data);
  },

  carryForwardOpeningBalance: (params: {
    from_period: string;
    to_period: string;
    company_id?: string;
  }): Promise<ApiResponse<void>> => {
    return createApiClient().post('/finance/accounts/opening-balance/carry-forward', params);
  },
};

export default accountApi;
