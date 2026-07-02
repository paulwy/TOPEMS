import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  MaintenanceRecord,
  InspectionRecord,
  PaginationParams,
  PaginatedResult,
} from './types';

export const maintenanceApi = {
  listMaintenances: async (
    params?: PaginationParams & {
      equipment_id?: string;
      maintenance_type?: string;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<ApiResponse<PaginatedResult<MaintenanceRecord>>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.equipment_id) searchParams.set('equipment_id', params.equipment_id);
    if (params?.maintenance_type) searchParams.set('maintenance_type', params.maintenance_type);
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/asset/maintenances${queryString ? `?${queryString}` : ''}`);
  },

  getMaintenance: async (id: string): Promise<ApiResponse<MaintenanceRecord>> => {
    return apiClient.erp.get(`/asset/maintenances/${id}`);
  },

  createMaintenance: async (
    data: Partial<MaintenanceRecord>
  ): Promise<ApiResponse<MaintenanceRecord>> => {
    return apiClient.erp.post('/asset/maintenances', data);
  },

  updateMaintenance: async (
    id: string,
    data: Partial<MaintenanceRecord>
  ): Promise<ApiResponse<MaintenanceRecord>> => {
    return apiClient.erp.put(`/asset/maintenances/${id}`, data);
  },

  deleteMaintenance: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.erp.delete(`/asset/maintenances/${id}`);
  },

  getMaintenanceByEquipment: async (
    equipmentId: string,
    params?: { page?: number; pagesize?: number }
  ): Promise<ApiResponse<PaginatedResult<MaintenanceRecord>>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    return apiClient.erp.get(
      `/asset/equipments/${equipmentId}/maintenances?${searchParams.toString()}`
    );
  },
};

export const inspectionApi = {
  listInspections: async (
    params?: PaginationParams & {
      equipment_id?: string;
      result?: string;
      start_date?: string;
      end_date?: string;
      inspector?: string;
    }
  ): Promise<ApiResponse<PaginatedResult<InspectionRecord>>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.equipment_id) searchParams.set('equipment_id', params.equipment_id);
    if (params?.result) searchParams.set('result', params.result);
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.inspector) searchParams.set('inspector', params.inspector);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/asset/inspections${queryString ? `?${queryString}` : ''}`);
  },

  getInspection: async (id: string): Promise<ApiResponse<InspectionRecord>> => {
    return apiClient.erp.get(`/asset/inspections/${id}`);
  },

  createInspection: async (
    data: Partial<InspectionRecord>
  ): Promise<ApiResponse<InspectionRecord>> => {
    return apiClient.erp.post('/asset/inspections', data);
  },

  updateInspection: async (
    id: string,
    data: Partial<InspectionRecord>
  ): Promise<ApiResponse<InspectionRecord>> => {
    return apiClient.erp.put(`/asset/inspections/${id}`, data);
  },

  deleteInspection: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.erp.delete(`/asset/inspections/${id}`);
  },

  getInspectionByEquipment: async (
    equipmentId: string,
    params?: { page?: number; pagesize?: number }
  ): Promise<ApiResponse<PaginatedResult<InspectionRecord>>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    return apiClient.erp.get(
      `/asset/equipments/${equipmentId}/inspections?${searchParams.toString()}`
    );
  },
};

export default maintenanceApi;
