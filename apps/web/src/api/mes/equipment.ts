import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  PaginationParams,
  PaginatedResult,
  Equipment,
  CreateEquipmentRequest,
  UpdateEquipmentRequest,
  MaintenanceEquipmentRequest,
  InspectionRecord,
  CreateInspectionRecord,
  MaintenanceRecord,
  CreateMaintenanceRecord,
  UpdateMaintenanceStatus,
  EquipmentStatistics,
  OeeRecord,
  CreateOeeRecordRequest,
  UpdateOeeRecordRequest,
  OeeStatistics,
  EquipmentEfficiencyAnalysis,
} from './types';

export const equipmentApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      equipments: Equipment[];
      total: number;
      page: number;
      page_size: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/mes/equipment${queryString ? '?' + queryString : ''}`);
  },

  async get(id: string): Promise<ApiResponse<Equipment>> {
    return apiClient.mes.get(`/api/mes/equipment/${id}`);
  },

  async create(data: CreateEquipmentRequest): Promise<ApiResponse<Equipment>> {
    return apiClient.mes.post('/api/mes/equipment', data);
  },

  async update(id: string, data: UpdateEquipmentRequest): Promise<ApiResponse<Equipment>> {
    return apiClient.mes.put(`/api/mes/equipment/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/api/mes/equipment/${id}`);
  },

  async maintenance(
    id: string,
    data: MaintenanceEquipmentRequest
  ): Promise<ApiResponse<MaintenanceRecord>> {
    return apiClient.mes.post(`/api/mes/equipment/${id}/maintenance`, data);
  },

  async getStatistics(): Promise<ApiResponse<EquipmentStatistics>> {
    return apiClient.mes.get('/api/mes/equipment/statistics');
  },
};

export const mesEquipmentApi = {
  async getStatistics(): Promise<ApiResponse<EquipmentStatistics>> {
    return apiClient.mes.get('/api/mes/equipment/statistics');
  },

  async listInspections(
    params?: PaginationParams & { equipment_id?: string }
  ): Promise<ApiResponse<PaginatedResult<InspectionRecord>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.equipment_id) searchParams.set('equipment_id', params.equipment_id);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/mes/inspections${queryString ? '?' + queryString : ''}`);
  },

  async createInspection(data: CreateInspectionRecord): Promise<ApiResponse<InspectionRecord>> {
    return apiClient.mes.post('/api/mes/inspections', data);
  },

  async listMaintenances(
    params?: PaginationParams & { equipment_id?: string }
  ): Promise<ApiResponse<PaginatedResult<MaintenanceRecord>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.equipment_id) searchParams.set('equipment_id', params.equipment_id);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/mes/maintenances${queryString ? '?' + queryString : ''}`);
  },

  async createMaintenance(data: CreateMaintenanceRecord): Promise<ApiResponse<MaintenanceRecord>> {
    return apiClient.mes.post('/api/mes/maintenances', data);
  },

  async updateMaintenanceStatus(
    id: string,
    data: UpdateMaintenanceStatus
  ): Promise<ApiResponse<MaintenanceRecord>> {
    return apiClient.mes.put(`/api/mes/maintenances/${id}/status`, data);
  },
};

export const equipmentOeeApi = {
  async list(params?: PaginationParams & { equipment_id?: string; start_date?: string; end_date?: string }): Promise<
    ApiResponse<{
      records: OeeRecord[];
      total: number;
      page: number;
      page_size: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.equipment_id) searchParams.set('equipment_id', params.equipment_id);
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/mes/equipment-oee${queryString ? '?' + queryString : ''}`);
  },

  async get(id: string): Promise<ApiResponse<OeeRecord>> {
    return apiClient.mes.get(`/api/mes/equipment-oee/${id}`);
  },

  async create(data: CreateOeeRecordRequest): Promise<ApiResponse<OeeRecord>> {
    return apiClient.mes.post('/api/mes/equipment-oee', data);
  },

  async update(id: string, data: UpdateOeeRecordRequest): Promise<ApiResponse<OeeRecord>> {
    return apiClient.mes.put(`/api/mes/equipment-oee/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/api/mes/equipment-oee/${id}`);
  },

  async getStatistics(params?: {
    start_date?: string;
    end_date?: string;
    equipment_id?: string;
  }): Promise<ApiResponse<OeeStatistics>> {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.equipment_id) searchParams.set('equipment_id', params.equipment_id);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/mes/equipment-oee/statistics${queryString ? '?' + queryString : ''}`);
  },

  async getEquipmentEfficiencyAnalysis(
    equipmentId: string,
    params?: { period?: string; start_date?: string; end_date?: string }
  ): Promise<ApiResponse<EquipmentEfficiencyAnalysis>> {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set('period', params.period);
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);

    const queryString = searchParams.toString();
    return apiClient.mes.get(
      `/api/mes/equipment-oee/${equipmentId}/efficiency${queryString ? '?' + queryString : ''}`
    );
  },
};
