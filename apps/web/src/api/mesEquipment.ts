import apiClient from "./client";
import type { ApiResponse } from "./client";

export interface InspectionRecord {
  id: string;
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  inspector: string;
  inspection_date: string;
  location?: string;
  temperature?: number;
  vibration?: number;
  noise_level?: number;
  status: string;
  items?: any;
  abnormalities?: string;
  remarks?: string;
  created_at: string;
}

export interface CreateInspectionRecord {
  equipment_id: string;
  inspector: string;
  inspection_date: string;
  location?: string;
  temperature?: number;
  vibration?: number;
  noise_level?: number;
  status: string;
  items?: any;
  abnormalities?: string;
  remarks?: string;
}

export interface MaintenanceRecord {
  id: string;
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  maintenance_type: string;
  description: string;
  maintainer: string;
  start_time: string;
  end_time?: string;
  cost?: number;
  parts_replaced?: any;
  result?: string;
  status: string;
  remarks?: string;
  created_at: string;
}

export interface CreateMaintenanceRecord {
  equipment_id: string;
  maintenance_type: string;
  description: string;
  maintainer: string;
  start_time: string;
  end_time?: string;
  cost?: number;
  parts_replaced?: any;
  result?: string;
  status?: string;
  remarks?: string;
}

export interface UpdateMaintenanceStatus {
  status: string;
  result?: string;
}

export interface EquipmentStatistics {
  total: number;
  in_use: number;
  idle: number;
  maintenance: number;
  scrapped: number;
  total_value: number;
  monthly_inspections: number;
  monthly_maintenances: number;
  pending_repairs: number;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  equipment_id?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export const mesEquipmentApi = {
  async getStatistics(): Promise<ApiResponse<EquipmentStatistics>> {
    return apiClient.mes.get("/api/v1/equipment/statistics");
  },

  async listInspections(
    params?: PaginationParams,
  ): Promise<ApiResponse<PaginatedResult<InspectionRecord>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());
    if (params?.equipment_id)
      searchParams.set("equipment_id", params.equipment_id);

    const queryString = searchParams.toString();
    return apiClient.mes.get(
      `/api/v1/inspections${queryString ? "?" + queryString : ""}`,
    );
  },

  async createInspection(
    data: CreateInspectionRecord,
  ): Promise<ApiResponse<InspectionRecord>> {
    return apiClient.mes.post("/api/v1/inspections", data);
  },

  async listMaintenances(
    params?: PaginationParams,
  ): Promise<ApiResponse<PaginatedResult<MaintenanceRecord>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size)
      searchParams.set("page_size", params.page_size.toString());
    if (params?.equipment_id)
      searchParams.set("equipment_id", params.equipment_id);

    const queryString = searchParams.toString();
    return apiClient.mes.get(
      `/api/v1/maintenances${queryString ? "?" + queryString : ""}`,
    );
  },

  async createMaintenance(
    data: CreateMaintenanceRecord,
  ): Promise<ApiResponse<MaintenanceRecord>> {
    return apiClient.mes.post("/api/v1/maintenances", data);
  },

  async updateMaintenanceStatus(
    id: string,
    data: UpdateMaintenanceStatus,
  ): Promise<ApiResponse<MaintenanceRecord>> {
    return apiClient.mes.put(`/api/v1/maintenances/${id}/status`, data);
  },
};
