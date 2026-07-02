import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { Equipment, PaginationParams, PaginatedResult } from './types';

export const equipmentApi = {
  listEquipments: async (
    params?: PaginationParams & {
      department?: string;
      responsible_id?: string;
    }
  ): Promise<ApiResponse<PaginatedResult<Equipment>>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.department) searchParams.set('department', params.department);
    if (params?.responsible_id) searchParams.set('responsible_id', params.responsible_id);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/asset/equipments${queryString ? `?${queryString}` : ''}`);
  },

  getEquipment: async (id: string): Promise<ApiResponse<Equipment>> => {
    return apiClient.erp.get(`/asset/equipments/${id}`);
  },

  createEquipment: async (data: Partial<Equipment>): Promise<ApiResponse<Equipment>> => {
    return apiClient.erp.post('/asset/equipments', data);
  },

  updateEquipment: async (
    id: string,
    data: Partial<Equipment>
  ): Promise<ApiResponse<Equipment>> => {
    return apiClient.erp.put(`/asset/equipments/${id}`, data);
  },

  deleteEquipment: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.erp.delete(`/asset/equipments/${id}`);
  },

  batchDeleteEquipments: async (ids: string[]): Promise<ApiResponse<{ deleted_count: number }>> => {
    return apiClient.erp.post('/asset/equipments/batch-delete', { ids });
  },

  getEquipmentStats: async (): Promise<
    ApiResponse<{
      total: number;
      by_status: Record<string, number>;
      by_category: Record<string, number>;
      by_department: Record<string, number>;
    }>
  > => {
    return apiClient.erp.get('/asset/equipments/stats');
  },
};

export default equipmentApi;
