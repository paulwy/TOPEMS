import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface Material {
  id: string;
  tenant_id: string;
  material_no: string;
  name: string;
  spec?: string;
  unit?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMaterialRequest {
  material_no: string;
  name: string;
  spec?: string;
  unit?: string;
  status?: string;
}

export interface UpdateMaterialRequest {
  material_no?: string;
  name?: string;
  spec?: string;
  unit?: string;
  status?: string;
}

/** V259 TypeMap: 导出供 config.ts ListPageProps<MaterialQuery> 使用 */
export interface MaterialQuery {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
}

interface MaterialListResponse {
  materials: Material[];
  total: number;
  page: number;
  page_size: number;
}

export const pdmMaterialApi = {
  async listMaterials(params?: MaterialQuery): Promise<ApiResponse<MaterialListResponse>> {
    return apiClient.pdm.get<MaterialListResponse>('/materials', { params });
  },

  async getMaterial(id: string): Promise<ApiResponse<Material>> {
    return apiClient.pdm.get<Material>(`/materials/${id}`);
  },

  async createMaterial(data: CreateMaterialRequest): Promise<ApiResponse<Material>> {
    return apiClient.pdm.post<Material>('/materials', data);
  },

  async updateMaterial(id: string, data: UpdateMaterialRequest): Promise<ApiResponse<Material>> {
    return apiClient.pdm.put<Material>(`/materials/${id}`, data);
  },

  async deleteMaterial(id: string): Promise<ApiResponse<boolean>> {
    return apiClient.pdm.delete<boolean>(`/materials/${id}`);
  },
};
