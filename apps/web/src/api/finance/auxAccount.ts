import { apiClient } from '../client';
import type { ApiResponse } from '../client';
import type { AuxAccount } from './types';

export interface AuxAccountQuery {
  aux_type?: string;
  page?: number;
  page_size?: number;
  pagesize?: number;
  search?: string;
  [key: string]: unknown;
}

export interface PaginatedAuxAccounts {
  items?: AuxAccount[];
  data?: AuxAccount[];
  total?: number;
  page?: number;
  page_size?: number;
}

/**
 * 辅助核算账户 API（后端 GET /api/finance/aux-accounts）
 * aux_type 可选：customer/supplier/project/department/employee
 */
export const auxAccountApi = {
  list: (params?: AuxAccountQuery): Promise<ApiResponse<PaginatedAuxAccounts | AuxAccount[]>> => {
    return apiClient.finance.get('/aux-accounts', { params });
  },
};
