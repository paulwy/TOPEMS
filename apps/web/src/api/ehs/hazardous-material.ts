import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  CreateHazardousMaterialCategoryRequest,
  CreateHazardousMaterialInventoryRequest,
  CreateHazardousMaterialMovementRequest,
  CreateHazardousMaterialRequest,
  CreateMSDSRequest,
  HazardousMaterial,
  HazardousMaterialCategory,
  HazardousMaterialInventory,
  HazardousMaterialInventoryListQueryParams,
  HazardousMaterialListQueryParams,
  HazardousMaterialMovement,
  HazardousMaterialMovementListQueryParams,
  ListQueryParams,
  MSDS,
  PaginatedResponse,
  UpdateHazardousMaterialCategoryRequest,
  UpdateHazardousMaterialInventoryRequest,
  UpdateHazardousMaterialMovementRequest,
  UpdateHazardousMaterialRequest,
  UpdateMSDSRequest,
} from './types';

export const hazardousMaterialApi = {
  listHazardousMaterials: async (
    params?: HazardousMaterialListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<HazardousMaterial>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.hazard_class) queryParams.append('hazard_class', params.hazard_class);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<HazardousMaterial>>(
      `/api/ehs/hazardous-materials?${queryParams.toString()}`
    );
  },

  getHazardousMaterial: async (id: string): Promise<ApiResponse<HazardousMaterial>> => {
    return apiClient.ehs.get<HazardousMaterial>(`/api/ehs/hazardous-materials/${id}`);
  },

  createHazardousMaterial: async (
    data: CreateHazardousMaterialRequest
  ): Promise<ApiResponse<HazardousMaterial>> => {
    return apiClient.ehs.post<HazardousMaterial>('/api/ehs/hazardous-materials', data);
  },

  updateHazardousMaterial: async (
    id: string,
    data: Partial<UpdateHazardousMaterialRequest>
  ): Promise<ApiResponse<HazardousMaterial>> => {
    return apiClient.ehs.put<HazardousMaterial>(`/api/ehs/hazardous-materials/${id}`, data);
  },

  deleteHazardousMaterial: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/hazardous-materials/${id}`);
  },

  listHazardousMaterialCategories: async (): Promise<ApiResponse<HazardousMaterialCategory[]>> => {
    return apiClient.ehs.get<HazardousMaterialCategory[]>(
      '/api/ehs/hazardous-materials/categories'
    );
  },

  createHazardousMaterialCategory: async (
    data: CreateHazardousMaterialCategoryRequest
  ): Promise<ApiResponse<HazardousMaterialCategory>> => {
    return apiClient.ehs.post<HazardousMaterialCategory>(
      '/api/ehs/hazardous-materials/categories',
      data
    );
  },

  updateHazardousMaterialCategory: async (
    id: string,
    data: Partial<UpdateHazardousMaterialCategoryRequest>
  ): Promise<ApiResponse<HazardousMaterialCategory>> => {
    return apiClient.ehs.put<HazardousMaterialCategory>(
      `/api/ehs/hazardous-materials/categories/${id}`,
      data
    );
  },

  deleteHazardousMaterialCategory: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/hazardous-materials/categories/${id}`);
  },

  listHazardousMaterialInventory: async (
    params?: HazardousMaterialInventoryListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<HazardousMaterialInventory>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.material_id) queryParams.append('material_id', params.material_id);
    if (params?.warehouse) queryParams.append('warehouse', params.warehouse);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.ehs.get<PaginatedResponse<HazardousMaterialInventory>>(
      `/api/ehs/hazardous-materials/inventory?${queryParams.toString()}`
    );
  },

  getHazardousMaterialInventory: async (
    id: string
  ): Promise<ApiResponse<HazardousMaterialInventory>> => {
    return apiClient.ehs.get<HazardousMaterialInventory>(
      `/api/ehs/hazardous-materials/inventory/${id}`
    );
  },

  createHazardousMaterialInventory: async (
    data: CreateHazardousMaterialInventoryRequest
  ): Promise<ApiResponse<HazardousMaterialInventory>> => {
    return apiClient.ehs.post<HazardousMaterialInventory>(
      '/api/ehs/hazardous-materials/inventory',
      data
    );
  },

  updateHazardousMaterialInventory: async (
    id: string,
    data: Partial<UpdateHazardousMaterialInventoryRequest>
  ): Promise<ApiResponse<HazardousMaterialInventory>> => {
    return apiClient.ehs.put<HazardousMaterialInventory>(
      `/api/ehs/hazardous-materials/inventory/${id}`,
      data
    );
  },

  deleteHazardousMaterialInventory: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/hazardous-materials/inventory/${id}`);
  },

  listHazardousMaterialMovements: async (
    params?: HazardousMaterialMovementListQueryParams
  ): Promise<ApiResponse<PaginatedResponse<HazardousMaterialMovement>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.material_id) queryParams.append('material_id', params.material_id);
    if (params?.movement_type) queryParams.append('movement_type', params.movement_type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    return apiClient.ehs.get<PaginatedResponse<HazardousMaterialMovement>>(
      `/api/ehs/hazardous-materials/movements?${queryParams.toString()}`
    );
  },

  getHazardousMaterialMovement: async (
    id: string
  ): Promise<ApiResponse<HazardousMaterialMovement>> => {
    return apiClient.ehs.get<HazardousMaterialMovement>(
      `/api/ehs/hazardous-materials/movements/${id}`
    );
  },

  createHazardousMaterialMovement: async (
    data: CreateHazardousMaterialMovementRequest
  ): Promise<ApiResponse<HazardousMaterialMovement>> => {
    return apiClient.ehs.post<HazardousMaterialMovement>(
      '/api/ehs/hazardous-materials/movements',
      data
    );
  },

  updateHazardousMaterialMovement: async (
    id: string,
    data: Partial<UpdateHazardousMaterialMovementRequest>
  ): Promise<ApiResponse<HazardousMaterialMovement>> => {
    return apiClient.ehs.put<HazardousMaterialMovement>(
      `/api/ehs/hazardous-materials/movements/${id}`,
      data
    );
  },

  deleteHazardousMaterialMovement: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/hazardous-materials/movements/${id}`);
  },

  listMSDS: async (params?: ListQueryParams): Promise<ApiResponse<PaginatedResponse<MSDS>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);

    return apiClient.ehs.get<PaginatedResponse<MSDS>>(
      `/api/ehs/hazardous-materials/msds?${queryParams.toString()}`
    );
  },

  getMSDS: async (id: string): Promise<ApiResponse<MSDS>> => {
    return apiClient.ehs.get<MSDS>(`/api/ehs/hazardous-materials/msds/${id}`);
  },

  getMSDSByMaterialId: async (materialId: string): Promise<ApiResponse<MSDS>> => {
    return apiClient.ehs.get<MSDS>(`/api/ehs/hazardous-materials/${materialId}/msds`);
  },

  createMSDS: async (data: CreateMSDSRequest): Promise<ApiResponse<MSDS>> => {
    return apiClient.ehs.post<MSDS>('/api/ehs/hazardous-materials/msds', data);
  },

  updateMSDS: async (id: string, data: Partial<UpdateMSDSRequest>): Promise<ApiResponse<MSDS>> => {
    return apiClient.ehs.put<MSDS>(`/api/ehs/hazardous-materials/msds/${id}`, data);
  },

  deleteMSDS: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.ehs.delete<void>(`/api/ehs/hazardous-materials/msds/${id}`);
  },
};

export default hazardousMaterialApi;
