import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  ErpMapping,
  MappingType,
  CreateErpMappingRequest,
  UpdateErpMappingRequest,
} from './types';

export const mappingApi = {
  listMappings: async (
    connectionId: string,
    params?: { mapping_type?: MappingType; page?: number; pageSize?: number }
  ): Promise<ApiResponse<ErpMapping[]>> => {
    return apiClient.integration.get(`/api/integration/erp/mappings`, {
      params: { connection_id: connectionId, ...params },
    });
  },

  getMapping: async (id: string): Promise<ApiResponse<ErpMapping>> => {
    return apiClient.integration.get(`/api/integration/erp/mappings/${id}`);
  },

  createMapping: async (data: CreateErpMappingRequest): Promise<ApiResponse<ErpMapping>> => {
    return apiClient.integration.post('/api/integration/erp/mappings', data);
  },

  updateMapping: async (
    id: string,
    data: UpdateErpMappingRequest
  ): Promise<ApiResponse<ErpMapping>> => {
    return apiClient.integration.put(`/api/integration/erp/mappings/${id}`, data);
  },

  deleteMapping: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.integration.delete(`/api/integration/erp/mappings/${id}`);
  },
};

export default mappingApi;
