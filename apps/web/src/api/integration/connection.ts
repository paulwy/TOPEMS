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
  listConnections: async (
    params?: { type?: string; status?: string; page?: number; pageSize?: number }
  ): Promise<ApiResponse<ErpConnection[]>> => {
    return apiClient.integration.get('/api/integration/erp/connections', { params });
  },

  getConnection: async (id: string): Promise<ApiResponse<ErpConnection>> => {
    return apiClient.integration.get(`/api/integration/erp/connections/${id}`);
  },

  createConnection: async (
    data: CreateErpConnectionRequest
  ): Promise<ApiResponse<ErpConnection>> => {
    return apiClient.integration.post('/api/integration/erp/connections', data);
  },

  updateConnection: async (
    id: string,
    data: UpdateErpConnectionRequest
  ): Promise<ApiResponse<ErpConnection>> => {
    return apiClient.integration.put(`/api/integration/erp/connections/${id}`, data);
  },

  deleteConnection: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.integration.delete(`/api/integration/erp/connections/${id}`);
  },

  testConnection: async (
    data: TestConnectionRequest
  ): Promise<ApiResponse<TestConnectionResponse>> => {
    return apiClient.integration.post('/api/integration/erp/connections/test', data);
  },
};

export default connectionApi;
