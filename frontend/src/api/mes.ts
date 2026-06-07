import apiClient from './client';
import type { ApiResponse } from './client';

// 生产订单相关类型
export interface ProductionOrder {
  id: string;
  order_number: string;
  product_name: string;
  product_code?: string;
  quantity: number;
  unit?: string;
  scheduled_start_date?: string;
  scheduled_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  status: string;
  priority?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductionOrderRequest {
  order_number: string;
  product_name: string;
  product_code?: string;
  quantity: number;
  unit?: string;
  scheduled_start_date?: string;
  scheduled_end_date?: string;
  priority?: string;
}

export interface UpdateProductionOrderRequest {
  product_name?: string;
  product_code?: string;
  quantity?: number;
  unit?: string;
  scheduled_start_date?: string;
  scheduled_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  status?: string;
  priority?: string;
}

// 生产工序相关类型
export interface ProductionProcess {
  id: string;
  name: string;
  code?: string;
  description?: string;
  sequence: number;
  standard_time?: number;
  work_station_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductionProcessRequest {
  name: string;
  code?: string;
  description?: string;
  sequence: number;
  standard_time?: number;
  work_station_id?: string;
}

export interface UpdateProductionProcessRequest {
  name?: string;
  code?: string;
  description?: string;
  sequence?: number;
  standard_time?: number;
  work_station_id?: string;
  status?: string;
}

// 工作站相关类型
export interface WorkStation {
  id: string;
  name: string;
  code?: string;
  location?: string;
  capacity?: number;
  status: string;
  supervisor?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkStationRequest {
  name: string;
  code: string;
  location?: string;
  capacity?: number;
  supervisor?: string;
}

export interface UpdateWorkStationRequest {
  name?: string;
  code?: string;
  location?: string;
  capacity?: number;
  status?: string;
  supervisor?: string;
}

// 生产记录相关类型
export interface ProductionRecord {
  id: string;
  order_id: string;
  process_id?: string;
  work_station_id?: string;
  operator: string;
  quantity_completed: number;
  quantity_rejected?: number;
  start_time: string;
  end_time?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductionRecordRequest {
  order_id: string;
  process_id?: string;
  work_station_id?: string;
  operator: string;
  quantity_completed: number;
  quantity_rejected?: number;
  start_time: string;
}

export interface UpdateProductionRecordRequest {
  quantity_completed?: number;
  quantity_rejected?: number;
  end_time?: string;
  status?: string;
  notes?: string;
}

// 设备点检记录相关类型
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

// 设备维护记录相关类型
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

// 设备统计
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

// 分页参数
export interface PaginationParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// 生产订单 API
export const productionOrderApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<{ orders: ProductionOrder[]; total: number; page: number; page_size: number }>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/v1/orders${queryString ? '?' + queryString : ''}`);
  },

  async get(id: string): Promise<ApiResponse<ProductionOrder>> {
    return apiClient.mes.get(`/api/v1/orders/${id}`);
  },

  async create(data: CreateProductionOrderRequest): Promise<ApiResponse<ProductionOrder>> {
    return apiClient.mes.post('/api/v1/orders', data);
  },

  async update(id: string, data: UpdateProductionOrderRequest): Promise<ApiResponse<ProductionOrder>> {
    return apiClient.mes.put(`/api/v1/orders/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/api/v1/orders/${id}`);
  },
};

// 生产工序 API
export const productionProcessApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<{ processes: ProductionProcess[]; total: number; page: number; page_size: number }>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/v1/processes${queryString ? '?' + queryString : ''}`);
  },

  async get(id: string): Promise<ApiResponse<ProductionProcess>> {
    return apiClient.mes.get(`/api/v1/processes/${id}`);
  },

  async create(data: CreateProductionProcessRequest): Promise<ApiResponse<ProductionProcess>> {
    return apiClient.mes.post('/api/v1/processes', data);
  },

  async update(id: string, data: UpdateProductionProcessRequest): Promise<ApiResponse<ProductionProcess>> {
    return apiClient.mes.put(`/api/v1/processes/${id}`, data);
  },
};

// 工作站 API
export const workStationApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<{ workstations: WorkStation[]; total: number; page: number; page_size: number }>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/v1/workstations${queryString ? '?' + queryString : ''}`);
  },

  async get(id: string): Promise<ApiResponse<WorkStation>> {
    return apiClient.mes.get(`/api/v1/workstations/${id}`);
  },

  async create(data: CreateWorkStationRequest): Promise<ApiResponse<WorkStation>> {
    return apiClient.mes.post('/api/v1/workstations', data);
  },

  async update(id: string, data: UpdateWorkStationRequest): Promise<ApiResponse<WorkStation>> {
    return apiClient.mes.put(`/api/v1/workstations/${id}`, data);
  },
};

// 生产记录 API
export const productionRecordApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<{ records: ProductionRecord[]; total: number; page: number; page_size: number }>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/v1/records${queryString ? '?' + queryString : ''}`);
  },

  async get(id: string): Promise<ApiResponse<ProductionRecord>> {
    return apiClient.mes.get(`/api/v1/records/${id}`);
  },

  async create(data: CreateProductionRecordRequest): Promise<ApiResponse<ProductionRecord>> {
    return apiClient.mes.post('/api/v1/records', data);
  },

  async update(id: string, data: UpdateProductionRecordRequest): Promise<ApiResponse<ProductionRecord>> {
    return apiClient.mes.put(`/api/v1/records/${id}`, data);
  },
};

// 设备点检和维护 API
export const mesEquipmentApi = {
  async getStatistics(): Promise<ApiResponse<EquipmentStatistics>> {
    return apiClient.mes.get('/api/v1/equipment/statistics');
  },

  async listInspections(params?: PaginationParams & { equipment_id?: string }): Promise<ApiResponse<PaginatedResult<InspectionRecord>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.equipment_id) searchParams.set('equipment_id', params.equipment_id);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/v1/inspections${queryString ? '?' + queryString : ''}`);
  },

  async createInspection(data: CreateInspectionRecord): Promise<ApiResponse<InspectionRecord>> {
    return apiClient.mes.post('/api/v1/inspections', data);
  },

  async listMaintenances(params?: PaginationParams & { equipment_id?: string }): Promise<ApiResponse<PaginatedResult<MaintenanceRecord>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.equipment_id) searchParams.set('equipment_id', params.equipment_id);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/v1/maintenances${queryString ? '?' + queryString : ''}`);
  },

  async createMaintenance(data: CreateMaintenanceRecord): Promise<ApiResponse<MaintenanceRecord>> {
    return apiClient.mes.post('/api/v1/maintenances', data);
  },

  async updateMaintenanceStatus(id: string, data: UpdateMaintenanceStatus): Promise<ApiResponse<MaintenanceRecord>> {
    return apiClient.mes.put(`/api/v1/maintenances/${id}/status`, data);
  },
};

// MES API 统一导出
export const mesApi = {
  orders: productionOrderApi,
  processes: productionProcessApi,
  workstations: workStationApi,
  records: productionRecordApi,
  equipment: mesEquipmentApi,

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.mes.get('/health');
  },
};

export default mesApi;