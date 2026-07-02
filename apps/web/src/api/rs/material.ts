import apiClient, { downloadBlob } from '../client';
import type { ApiResponse } from '../client';
import config from '../../config/runtime';
import type {
  Material,
  CreateMaterialRequest,
  UpdateMaterialRequest,
  MaterialQueryParams,
  BatchOperationResult,
} from './types';

export const materialApi = {
  listMaterials: async (
    params?: MaterialQueryParams
  ): Promise<
    ApiResponse<{
      materials: Material[];
      total: number;
      page: number;
      pagesize: number;
    }>
  > => {
    const queryParams = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, String(v)])
        )
      : '';
    const url = queryParams ? `/materials?${queryParams}` : '/materials';
    return apiClient.rs.get(url);
  },

  getMaterial: async (id: string): Promise<ApiResponse<Material>> => {
    return apiClient.rs.get(`/materials/${id}`);
  },

  createMaterial: async (data: CreateMaterialRequest): Promise<ApiResponse<Material>> => {
    return apiClient.rs.post('/materials', data);
  },

  updateMaterial: async (
    id: string,
    data: UpdateMaterialRequest
  ): Promise<ApiResponse<Material>> => {
    return apiClient.rs.put(`/materials/${id}`, data);
  },

  deleteMaterial: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.rs.delete(`/materials/${id}`);
  },

  batchDeleteMaterials: async (ids: string[]): Promise<ApiResponse<BatchOperationResult>> => {
    return apiClient.rs.delete('/materials/batch', { data: { ids } });
  },

  importMaterials: async (file: File): Promise<ApiResponse<BatchOperationResult>> => {
    const content = await file.text();
    return apiClient.rs.post('/materials/import', content, {
      headers: {
        'Content-Type': 'text/csv',
      },
    });
  },

  exportMaterials: async (): Promise<Blob> => {
    const baseURL = config.services.rs;
    return downloadBlob(baseURL, '/materials/export');
  },
};
