// @deprecated 无页面消费（预埋），后端 integration 服务未提供对应路由；保留以兼容存量引用
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
    connectionId?: string,
    params?: { mapping_type?: MappingType; page?: number; pageSize?: number }
  ): Promise<ApiResponse<ErpMapping[]>> => {
    return apiClient.integration.get(`/erp/mappings`, {
      params: { ...(connectionId ? { connection_id: connectionId } : {}), ...params },
    });
  },

  getMapping: async (id: string): Promise<ApiResponse<ErpMapping>> => {
    return apiClient.integration.get(`/erp/mappings/${id}`);
  },

  createMapping: async (data: CreateErpMappingRequest): Promise<ApiResponse<ErpMapping>> => {
    return apiClient.integration.post('/erp/mappings', data);
  },

  updateMapping: async (
    id: string,
    data: UpdateErpMappingRequest
  ): Promise<ApiResponse<ErpMapping>> => {
    return apiClient.integration.put(`/erp/mappings/${id}`, data);
  },

  deleteMapping: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.integration.delete(`/erp/mappings/${id}`);
  },
};

export default mappingApi;
