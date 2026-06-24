/**
 * MES (Manufacturing Execution System) API Client
 * 制造执行系统 API 客户端
 *
 * 包含生产订单、生产工序、工作站、生产记录、设备管理、设备维护等业务模块
 */

import { createRequest } from '@topems/shared-utils';
import type { PaginatedResponse } from '@topems/shared-types';

const api = createRequest('/api/mes');

const unwrap = <T,>(response: unknown): T => response as T;

const requestList = async <T,>(
  path: string,
  params?: Record<string, unknown>
): Promise<PaginatedResponse<T>> => {
  const response = await api.get(path, { params });
  return unwrap<PaginatedResponse<T>>(response);
};

const requestItem = async <T,>(path: string): Promise<T> => {
  const response = await api.get(path);
  return unwrap<T>(response);
};

const requestVoid = async (path: string): Promise<void> => {
  await api.delete(path);
};

// ==================== Types ====================

/**
 * 生产订单
 */
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

export interface ProductionOrderQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  priority?: string;
}

/**
 * 生产工序
 */
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

export interface ProductionProcessQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

/**
 * 工作站
 */
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

export interface WorkStationQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

/**
 * 生产记录
 */
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

export interface ProductionRecordQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  order_id?: string;
}

/**
 * 设备
 */
export interface Equipment {
  id: string;
  code: string;
  name: string;
  model?: string;
  manufacturer?: string;
  category?: string;
  location?: string;
  purchase_date?: string;
  status: string;
  responsible_person?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEquipmentRequest {
  code: string;
  name: string;
  model?: string;
  manufacturer?: string;
  category?: string;
  location?: string;
  purchase_date?: string;
  status?: string;
  responsible_person?: string;
}

export interface UpdateEquipmentRequest {
  name?: string;
  model?: string;
  manufacturer?: string;
  category?: string;
  location?: string;
  status?: string;
  responsible_person?: string;
}

export interface EquipmentQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  category?: string;
}

/**
 * 设备点检记录
 */
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

export interface MesInspectionRecordQueryParams {
  page?: number;
  pageSize?: number;
  equipment_id?: string;
}

/**
 * 设备维护记录
 */
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

export interface MaintenanceQueryParams {
  page?: number;
  pageSize?: number;
  equipment_id?: string;
}

/**
 * 设备统计
 */
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

/**
 * MES 仪表盘汇总
 */
export interface MesDashboardSummary {
  total_orders: number;
  pending_orders: number;
  in_progress_orders: number;
  completed_orders: number;
  total_workstations: number;
  active_workstations: number;
  total_equipment: number;
  equipment_in_use: number;
  equipment_maintenance: number;
  equipment_scrapped: number;
  today_records: number;
  month_records: number;
  total_output: number;
  quality_rate: number;
  recent_orders: ProductionOrder[];
  recent_records: ProductionRecord[];
}

// ==================== Production Order API ====================

const productionOrderApi = {
  list: (params?: ProductionOrderQueryParams) =>
    requestList<ProductionOrder>('/orders', params as Record<string, unknown>),
  get: (id: string) => requestItem<ProductionOrder>(`/orders/${id}`),
  create: async (data: CreateProductionOrderRequest): Promise<ProductionOrder> => {
    const response = await api.post('/orders', data);
    return unwrap<ProductionOrder>(response);
  },
  update: async (id: string, data: UpdateProductionOrderRequest): Promise<ProductionOrder> => {
    const response = await api.put(`/orders/${id}`, data);
    return unwrap<ProductionOrder>(response);
  },
  delete: (id: string) => requestVoid(`/orders/${id}`),
};

// ==================== Production Process API ====================

const productionProcessApi = {
  list: (params?: ProductionProcessQueryParams) =>
    requestList<ProductionProcess>('/processes', params as Record<string, unknown>),
  get: (id: string) => requestItem<ProductionProcess>(`/processes/${id}`),
  create: async (data: CreateProductionProcessRequest): Promise<ProductionProcess> => {
    const response = await api.post('/processes', data);
    return unwrap<ProductionProcess>(response);
  },
  update: async (id: string, data: UpdateProductionProcessRequest): Promise<ProductionProcess> => {
    const response = await api.put(`/processes/${id}`, data);
    return unwrap<ProductionProcess>(response);
  },
  delete: (id: string) => requestVoid(`/processes/${id}`),
};

// ==================== WorkStation API ====================

const workStationApi = {
  list: (params?: WorkStationQueryParams) =>
    requestList<WorkStation>('/workstations', params as Record<string, unknown>),
  get: (id: string) => requestItem<WorkStation>(`/workstations/${id}`),
  create: async (data: CreateWorkStationRequest): Promise<WorkStation> => {
    const response = await api.post('/workstations', data);
    return unwrap<WorkStation>(response);
  },
  update: async (id: string, data: UpdateWorkStationRequest): Promise<WorkStation> => {
    const response = await api.put(`/workstations/${id}`, data);
    return unwrap<WorkStation>(response);
  },
  delete: (id: string) => requestVoid(`/workstations/${id}`),
};

// ==================== Production Record API ====================

const productionRecordApi = {
  list: (params?: ProductionRecordQueryParams) =>
    requestList<ProductionRecord>('/records', params as Record<string, unknown>),
  get: (id: string) => requestItem<ProductionRecord>(`/records/${id}`),
  create: async (data: CreateProductionRecordRequest): Promise<ProductionRecord> => {
    const response = await api.post('/records', data);
    return unwrap<ProductionRecord>(response);
  },
  update: async (id: string, data: UpdateProductionRecordRequest): Promise<ProductionRecord> => {
    const response = await api.put(`/records/${id}`, data);
    return unwrap<ProductionRecord>(response);
  },
  delete: (id: string) => requestVoid(`/records/${id}`),
};

// ==================== Equipment API ====================

const equipmentApi = {
  list: (params?: EquipmentQueryParams) =>
    requestList<Equipment>('/equipment', params as Record<string, unknown>),
  get: (id: string) => requestItem<Equipment>(`/equipment/${id}`),
  create: async (data: CreateEquipmentRequest): Promise<Equipment> => {
    const response = await api.post('/equipment', data);
    return unwrap<Equipment>(response);
  },
  update: async (id: string, data: UpdateEquipmentRequest): Promise<Equipment> => {
    const response = await api.put(`/equipment/${id}`, data);
    return unwrap<Equipment>(response);
  },
  delete: (id: string) => requestVoid(`/equipment/${id}`),
  getStatistics: () => requestItem<EquipmentStatistics>('/equipment/statistics'),
};

// ==================== Equipment Inspection API ====================

const inspectionApi = {
  list: (params?: MesInspectionRecordQueryParams) =>
    requestList<InspectionRecord>('/inspections', params as Record<string, unknown>),
  get: (id: string) => requestItem<InspectionRecord>(`/inspections/${id}`),
  create: async (data: CreateInspectionRecord): Promise<InspectionRecord> => {
    const response = await api.post('/inspections', data);
    return unwrap<InspectionRecord>(response);
  },
};

// ==================== Equipment Maintenance API ====================

const maintenanceApi = {
  list: (params?: MaintenanceQueryParams) =>
    requestList<MaintenanceRecord>('/maintenances', params as Record<string, unknown>),
  get: (id: string) => requestItem<MaintenanceRecord>(`/maintenances/${id}`),
  create: async (data: CreateMaintenanceRecord): Promise<MaintenanceRecord> => {
    const response = await api.post('/maintenances', data);
    return unwrap<MaintenanceRecord>(response);
  },
  updateStatus: async (id: string, data: UpdateMaintenanceStatus): Promise<MaintenanceRecord> => {
    const response = await api.put(`/maintenances/${id}/status`, data);
    return unwrap<MaintenanceRecord>(response);
  },
};

// ==================== Dashboard API ====================

const dashboardApi = {
  summary: () => requestItem<MesDashboardSummary>('/dashboard/summary'),
  recentOrders: () => requestItem<ProductionOrder[]>('/dashboard/recent-orders'),
  recentRecords: () => requestItem<ProductionRecord[]>('/dashboard/recent-records'),
};

// ==================== MES API Export ====================

/**
 * MES API 统一导出
 */
export const mesApi = {
  orders: productionOrderApi,
  processes: productionProcessApi,
  workstations: workStationApi,
  records: productionRecordApi,
  equipment: equipmentApi,
  inspections: inspectionApi,
  maintenances: maintenanceApi,
  dashboard: dashboardApi,

  /**
   * 健康检查
   */
  health: async (): Promise<string> => {
    const response = await api.get('/health');
    return unwrap<string>(response);
  },
};

// 导出独立的 API 对象供直接使用
export {
  productionOrderApi,
  productionProcessApi,
  workStationApi,
  productionRecordApi,
  equipmentApi,
  inspectionApi,
  maintenanceApi,
  dashboardApi,
};
