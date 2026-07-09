import axios from 'axios';
import type {
  Account,
  AccountBalance,
  AccountOpeningBalance,
  PaginatedResult,
  ApiResponse,
} from '../../types/finance';

const createApiClient = () => {
  const client = axios.create({
    baseURL: '/api',
    timeout: 60000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  });

  return client;
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
    return createApiClient().get('/erp/finance/accounts', { params });
  },

  getTree: (params?: {
    category?: string;
    status?: string;
    include_disabled?: boolean;
  }): Promise<ApiResponse<Account[]>> => {
    return createApiClient().get('/erp/finance/accounts/tree', { params });
  },

  get: (id: string): Promise<ApiResponse<Account>> => {
    return createApiClient().get(`/erp/finance/accounts/${id}`);
  },

  create: (data: Partial<Account>): Promise<ApiResponse<Account>> => {
    return createApiClient().post('/erp/finance/accounts', data);
  },

  update: (id: string, data: Partial<Account>): Promise<ApiResponse<Account>> => {
    return createApiClient().put(`/erp/finance/accounts/${id}`, data);
  },

  delete: (id: string): Promise<ApiResponse<void>> => {
    return createApiClient().delete(`/erp/finance/accounts/${id}`);
  },

  batchCreateChildren: (
    parentId: string,
    accounts: Partial<Account>[]
  ): Promise<ApiResponse<Account[]>> => {
    return createApiClient().post(`/erp/finance/accounts/${parentId}/children-batch`, { accounts });
  },

  getBalances: (params: {
    account_ids?: string[];
    period: string;
    company_id?: string;
    department_id?: string;
    project_id?: string;
  }): Promise<ApiResponse<AccountBalance[]>> => {
    return createApiClient().get('/erp/finance/accounts/balances', {
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
    return createApiClient().get('/erp/finance/accounts/opening-balances', {
      params,
    });
  },

  setOpeningBalance: (
    accountId: string,
    data: Partial<AccountOpeningBalance>
  ): Promise<ApiResponse<AccountOpeningBalance>> => {
    return createApiClient().post(`/erp/finance/accounts/${accountId}/opening-balance`, data);
  },

  carryForwardOpeningBalance: (params: {
    from_period: string;
    to_period: string;
    company_id?: string;
  }): Promise<ApiResponse<void>> => {
    return createApiClient().post('/erp/finance/accounts/opening-balances/carry-forward', params);
  },
};

export default accountApi;
