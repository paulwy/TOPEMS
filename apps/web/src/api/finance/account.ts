import type {
  Account,
  AccountBalance,
  AccountOpeningBalance,
  PaginatedResult,
  ApiResponse,
} from '../../types/finance';
import { apiClient } from '../client';
import {
  toOpenApiParams,
  toOpenApiRequestBody,
  type AdaptedQuery,
  type AdaptedRequestBody,
  type TypedApiResponse,
  type TypedPaginatedResponse,
} from '@topems/shared-types';

export const accountApi = {
  /**
   * V72.5 第二批 绑定样板：list_accounts operation（openapi: GET /finance/accounts）
   * Query Params 经 AdaptedQuery<'list_accounts'> 适配为 camelCase，运行时 adaptReverse → snake_case
   */
  list: async (
    params?:
      | AdaptedQuery<'list_accounts'>
      | {
          category?: string;
          parentId?: string;
          level?: number;
          status?: string;
          keyword?: string;
          page?: number;
          pagesize?: number;
        }
  ): Promise<TypedPaginatedResponse<Account>> => {
    return apiClient.finance.get('/accounts', {
      params: params ? toOpenApiParams(params as Record<string, unknown>) : undefined,
    });
  },

  getTree: (params?: {
    category?: string;
    status?: string;
    include_disabled?: boolean;
  }): Promise<ApiResponse<Account[]>> => {
    return apiClient.finance.get('/accounts/tree', { params });
  },

  /**
   * V72.5 第二批 绑定样板：get_account operation（openapi: GET /finance/accounts/{account_id}）
   */
  get: async (id: string): Promise<TypedApiResponse<Account>> => {
    return apiClient.finance.get(`/accounts/${id}`);
  },

  /**
   * V72.5 第二批 绑定样板：create_account operation（openapi: POST /finance/accounts）
   * Request Body 经 AdaptedRequestBody<'create_account'> 适配，运行时 adaptReverse → snake_case
   */
  create: async (
    data: AdaptedRequestBody<'create_account'> | Partial<Account>
  ): Promise<TypedApiResponse<Account>> => {
    return apiClient.finance.post(
      '/accounts',
      toOpenApiRequestBody(data as Record<string, unknown>)
    );
  },

  update: (id: string, data: Partial<Account>): Promise<ApiResponse<Account>> => {
    return apiClient.finance.put(`/accounts/${id}`, data);
  },

  delete: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.finance.delete(`/accounts/${id}`);
  },

  batchCreateChildren: (
    parentId: string,
    accounts: Partial<Account>[]
  ): Promise<ApiResponse<Account[]>> => {
    return apiClient.finance.post(`/accounts/${parentId}/children-batch`, { accounts });
  },

  getBalances: (params: {
    account_ids?: string[];
    period: string;
    company_id?: string;
    department_id?: string;
    project_id?: string;
  }): Promise<ApiResponse<AccountBalance[]>> => {
    return apiClient.finance.get('/accounts/balances', {
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
    return apiClient.finance.get('/accounts/opening-balances', {
      params,
    });
  },

  setOpeningBalance: (
    accountId: string,
    data: Partial<AccountOpeningBalance>
  ): Promise<ApiResponse<AccountOpeningBalance>> => {
    return apiClient.finance.post(`/accounts/${accountId}/opening-balance`, data);
  },

  carryForwardOpeningBalance: (params: {
    from_period: string;
    to_period: string;
    company_id?: string;
  }): Promise<ApiResponse<void>> => {
    return apiClient.finance.post('/accounts/opening-balances/carry-forward', params);
  },
};

export default accountApi;
