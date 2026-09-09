// @deprecated 无页面消费（预埋），后端 integration 服务未提供对应路由；保留以兼容存量引用
import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  ErpConnection,
  CreateErpConnectionRequest,
  UpdateErpConnectionRequest,
  TestConnectionRequest,
  TestConnectionResponse,
} from './types';

export const connectionApi = {
  listConnections: async (params?: {
    type?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<ErpConnection[]>> => {
    return apiClient.integration.get('/erp/connections', { params });
  },

  getConnection: async (id: string): Promise<ApiResponse<ErpConnection>> => {
    return apiClient.integration.get(`/erp/connections/${id}`);
  },

  createConnection: async (
    data: CreateErpConnectionRequest
  ): Promise<ApiResponse<ErpConnection>> => {
    return apiClient.integration.post('/erp/connections', data);
  },

  updateConnection: async (
    id: string,
    data: UpdateErpConnectionRequest
  ): Promise<ApiResponse<ErpConnection>> => {
    return apiClient.integration.put(`/erp/connections/${id}`, data);
  },

  deleteConnection: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.integration.delete(`/erp/connections/${id}`);
  },

  testConnection: async (
    data: TestConnectionRequest
  ): Promise<ApiResponse<TestConnectionResponse>> => {
    return apiClient.integration.post('/erp/connections/test', data);
  },
};

export default connectionApi;
