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
  type AdaptedRequestBody,
  type TypedApiResponse,
  type TypedPaginatedResponse,
} from '@topems/shared-types';

export const accountApi = {
  /**
   * V72.5 第二批 绑定样板：GET /finance/accounts 列表。
   * 注意：后端 `list_accounts`（svc/finance/src/modules/mod.rs:346）未打 `#[utoipa::path]`，
   * 生成物 operations 里没有该 operation，故此处用显式参数类型收口；待注解补齐后切回
   * AdaptedQuery<'list_accounts'>。见 TODO.md W6-E2。
   */
  list: async (params?: {
    category?: string;
    parentId?: string;
    level?: number;
    status?: string;
    keyword?: string;
    page?: number;
    page_size?: number;
  }): Promise<TypedPaginatedResponse<Account>> => {
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
    page_size?: number;
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
