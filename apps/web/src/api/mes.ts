import apiClient from './client';
import type { ApiResponse } from './client';

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

// ========== 生产订单相关类型 ==========
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

export interface CreateFromErpRequest {
  erp_order_ids?: string[];
  sync_all?: boolean;
}

// ========== 生产工艺相关类型 ==========
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

// ========== 工站管理相关类型 ==========
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

// ========== 生产记录相关类型 ==========
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

export interface CompleteRecordRequest {
  end_time: string;
  quantity_completed: number;
  quantity_rejected?: number;
  notes?: string;
}

// ========== 设备管理相关类型 ==========
export interface Equipment {
  id: string;
  code: string;
  name: string;
  type?: string;
  model?: string;
  manufacturer?: string;
  purchase_date?: string;
  location?: string;
  status: string;
  value?: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEquipmentRequest {
  code: string;
  name: string;
  type?: string;
  model?: string;
  manufacturer?: string;
  purchase_date?: string;
  location?: string;
  status?: string;
  value?: number;
  description?: string;
}

export interface UpdateEquipmentRequest {
  name?: string;
  type?: string;
  model?: string;
  manufacturer?: string;
  purchase_date?: string;
  location?: string;
  status?: string;
  value?: number;
  description?: string;
}

export interface MaintenanceEquipmentRequest {
  maintenance_type: string;
  description: string;
  maintainer: string;
  start_time: string;
  end_time?: string;
  cost?: number;
  parts_replaced?: any;
  result?: string;
  remarks?: string;
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

// ========== 生产排产相关类型 ==========
export interface ProductionSchedule {
  id: string;
  order_id: string;
  order_number?: string;
  process_id?: string;
  process_name?: string;
  work_station_id?: string;
  work_station_name?: string;
  planned_start_time: string;
  planned_end_time: string;
  actual_start_time?: string;
  actual_end_time?: string;
  quantity: number;
  priority?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductionScheduleRequest {
  order_id: string;
  process_id?: string;
  work_station_id?: string;
  planned_start_time: string;
  planned_end_time: string;
  quantity: number;
  priority?: string;
  notes?: string;
}

export interface UpdateProductionScheduleRequest {
  process_id?: string;
  work_station_id?: string;
  planned_start_time?: string;
  planned_end_time?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  quantity?: number;
  priority?: string;
  status?: string;
  notes?: string;
}

export interface AdjustScheduleRequest {
  planned_start_time?: string;
  planned_end_time?: string;
  work_station_id?: string;
  reason?: string;
}

export interface GanttTask {
  id: string;
  name: string;
  order_id: string;
  order_number: string;
  work_station_id?: string;
  work_station_name?: string;
  start_time: string;
  end_time: string;
  progress?: number;
  status: string;
}

export interface GanttData {
  tasks: GanttTask[];
  work_stations: Array<{ id: string; name: string }>;
  date_range: { start: string; end: string };
}

// ========== 物料 BOM 相关类型 ==========
export interface MaterialBom {
  id: string;
  product_code: string;
  product_name: string;
  version?: string;
  status: string;
  description?: string;
  items?: MaterialBomItem[];
  created_at: string;
  updated_at: string;
}

export interface MaterialBomItem {
  id: string;
  bom_id: string;
  material_code: string;
  material_name: string;
  quantity: number;
  unit?: string;
  sequence?: number;
  remark?: string;
}

export interface CreateMaterialBomRequest {
  product_code: string;
  product_name: string;
  version?: string;
  status?: string;
  description?: string;
  items?: Array<{
    material_code: string;
    material_name: string;
    quantity: number;
    unit?: string;
    sequence?: number;
    remark?: string;
  }>;
}

export interface UpdateMaterialBomRequest {
  product_name?: string;
  version?: string;
  status?: string;
  description?: string;
  items?: Array<{
    id?: string;
    material_code: string;
    material_name: string;
    quantity: number;
    unit?: string;
    sequence?: number;
    remark?: string;
  }>;
}

// 物料领料相关类型
export interface MaterialIssue {
  id: string;
  issue_no: string;
  order_id: string;
  order_number?: string;
  work_station_id?: string;
  operator: string;
  issue_time: string;
  status: string;
  remark?: string;
  items?: MaterialIssueItem[];
  created_at: string;
}

export interface MaterialIssueItem {
  id: string;
  issue_id: string;
  material_code: string;
  material_name: string;
  quantity: number;
  unit?: string;
  batch_no?: string;
}

export interface CreateMaterialIssueRequest {
  order_id: string;
  work_station_id?: string;
  operator: string;
  items: Array<{
    material_code: string;
    material_name: string;
    quantity: number;
    unit?: string;
    batch_no?: string;
  }>;
  remark?: string;
}

// 物料退料相关类型
export interface MaterialReturn {
  id: string;
  return_no: string;
  order_id: string;
  order_number?: string;
  work_station_id?: string;
  operator: string;
  return_time: string;
  status: string;
  reason?: string;
  items?: MaterialReturnItem[];
  created_at: string;
}

export interface MaterialReturnItem {
  id: string;
  return_id: string;
  material_code: string;
  material_name: string;
  quantity: number;
  unit?: string;
  batch_no?: string;
}

export interface CreateMaterialReturnRequest {
  order_id: string;
  work_station_id?: string;
  operator: string;
  reason?: string;
  items: Array<{
    material_code: string;
    material_name: string;
    quantity: number;
    unit?: string;
    batch_no?: string;
  }>;
}

// ========== 质量追溯相关类型 ==========
export interface TraceNode {
  id: string;
  type: string;
  name: string;
  code: string;
  batch_no?: string;
  quantity?: number;
  timestamp?: string;
}

export interface TraceLink {
  from_id: string;
  to_id: string;
  relation_type: string;
}

export interface TraceChain {
  nodes: TraceNode[];
  links: TraceLink[];
  root_id: string;
  direction: 'forward' | 'backward';
}

export interface QualityRecord {
  id: string;
  batch_no: string;
  product_code: string;
  product_name: string;
  inspection_type: string;
  quantity: number;
  qualified_quantity: number;
  unqualified_quantity: number;
  qualification_rate: number;
  status: string;
  inspector?: string;
  inspection_time?: string;
  result?: string;
  memo?: string;
  created_at: string;
}

// ========== 设备 OEE 相关类型 ==========
export interface OeeRecord {
  id: string;
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  record_date: string;
  shift?: string;
  planned_production_time: number;
  run_time: number;
  downtime: number;
  ideal_cycle_time: number;
  total_count: number;
  good_count: number;
  reject_count: number;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  created_at: string;
  updated_at: string;
}

export interface CreateOeeRecordRequest {
  equipment_id: string;
  record_date: string;
  shift?: string;
  planned_production_time: number;
  run_time: number;
  downtime: number;
  ideal_cycle_time: number;
  total_count: number;
  good_count: number;
  reject_count: number;
}

export interface UpdateOeeRecordRequest {
  shift?: string;
  planned_production_time?: number;
  run_time?: number;
  downtime?: number;
  ideal_cycle_time?: number;
  total_count?: number;
  good_count?: number;
  reject_count?: number;
}

export interface OeeStatistics {
  total_records: number;
  avg_availability: number;
  avg_performance: number;
  avg_quality: number;
  avg_oee: number;
  trend: Array<{
    date: string;
    availability: number;
    performance: number;
    quality: number;
    oee: number;
  }>;
  by_equipment: Array<{
    equipment_id: string;
    equipment_code: string;
    equipment_name: string;
    availability: number;
    performance: number;
    quality: number;
    oee: number;
  }>;
}

export interface EquipmentEfficiencyAnalysis {
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  period: string;
  total_run_time: number;
  total_downtime: number;
  total_output: number;
  avg_oee: number;
  availability: number;
  performance: number;
  quality: number;
  downtime_reasons: Array<{
    reason: string;
    duration: number;
    percentage: number;
  }>;
  production_trend: Array<{
    date: string;
    output: number;
    oee: number;
  }>;
}

// ========== WIP 管理相关类型 ==========
export interface Wip {
  id: string;
  order_id: string;
  order_number?: string;
  process_id?: string;
  process_name?: string;
  work_station_id?: string;
  work_station_name?: string;
  quantity: number;
  unit?: string;
  batch_no?: string;
  status: string;
  inbound_time?: string;
  outbound_time?: string;
  operator?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWipRequest {
  order_id: string;
  process_id?: string;
  work_station_id?: string;
  quantity: number;
  unit?: string;
  batch_no?: string;
  operator?: string;
  remarks?: string;
}

export interface UpdateWipRequest {
  quantity?: number;
  status?: string;
  inbound_time?: string;
  outbound_time?: string;
  operator?: string;
  remarks?: string;
}

export interface WipTransfer {
  id: string;
  transfer_no: string;
  wip_id: string;
  from_work_station_id?: string;
  from_work_station_name?: string;
  to_work_station_id?: string;
  to_work_station_name?: string;
  from_process_id?: string;
  from_process_name?: string;
  to_process_id?: string;
  to_process_name?: string;
  quantity: number;
  unit?: string;
  operator: string;
  transfer_time: string;
  status: string;
  remarks?: string;
  created_at: string;
}

export interface TransferWipRequest {
  wip_id: string;
  to_work_station_id?: string;
  to_process_id?: string;
  quantity: number;
  operator: string;
  remarks?: string;
}

export interface WipStatistics {
  total_wip: number;
  total_quantity: number;
  by_process: Array<{
    process_id: string;
    process_name: string;
    wip_count: number;
    quantity: number;
  }>;
  by_work_station: Array<{
    work_station_id: string;
    work_station_name: string;
    wip_count: number;
    quantity: number;
  }>;
  by_status: Array<{
    status: string;
    wip_count: number;
    quantity: number;
  }>;
}

// ========== 生产订单 API ==========
export const productionOrderApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      orders: ProductionOrder[];
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
    return apiClient.mes.get(`/api/mes/orders${queryString ? '?' + queryString : ''}`);
  },

  async get(id: string): Promise<ApiResponse<ProductionOrder>> {
    return apiClient.mes.get(`/api/mes/orders/${id}`);
  },

  async create(data: CreateProductionOrderRequest): Promise<ApiResponse<ProductionOrder>> {
    return apiClient.mes.post('/api/mes/orders', data);
  },

  async update(
    id: string,
    data: UpdateProductionOrderRequest
  ): Promise<ApiResponse<ProductionOrder>> {
    return apiClient.mes.put(`/api/mes/orders/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/api/mes/orders/${id}`);
  },

  async release(id: string): Promise<ApiResponse<ProductionOrder>> {
    return apiClient.mes.put(`/api/mes/orders/${id}/release`);
  },

  async start(id: string): Promise<ApiResponse<ProductionOrder>> {
    return apiClient.mes.put(`/api/mes/orders/${id}/start`);
  },

  async complete(id: string): Promise<ApiResponse<ProductionOrder>> {
    return apiClient.mes.put(`/api/mes/orders/${id}/complete`);
  },

  async cancel(id: string): Promise<ApiResponse<ProductionOrder>> {
    return apiClient.mes.put(`/api/mes/orders/${id}/cancel`);
  },

  async createFromErp(data: CreateFromErpRequest): Promise<ApiResponse<ProductionOrder[]>> {
    return apiClient.mes.post('/api/mes/orders/from-erp', data);
  },
};

// ========== 生产工艺 API ==========
export const productionProcessApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      processes: ProductionProcess[];
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
    return apiClient.mes.get(`/api/mes/processes${queryString ? '?' + queryString : ''}`);
  },

  async get(id: string): Promise<ApiResponse<ProductionProcess>> {
    return apiClient.mes.get(`/api/mes/processes/${id}`);
  },

  async create(data: CreateProductionProcessRequest): Promise<ApiResponse<ProductionProcess>> {
    return apiClient.mes.post('/api/mes/processes', data);
  },

  async update(
    id: string,
    data: UpdateProductionProcessRequest
  ): Promise<ApiResponse<ProductionProcess>> {
    return apiClient.mes.put(`/api/mes/processes/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/api/mes/processes/${id}`);
  },

  async deactivate(id: string): Promise<ApiResponse<ProductionProcess>> {
    return apiClient.mes.put(`/api/mes/processes/${id}/deactivate`);
  },
};

// ========== 工站管理 API ==========
export const workStationApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      workstations: WorkStation[];
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
    return apiClient.mes.get(`/api/mes/workstations${queryString ? '?' + queryString : ''}`);
  },

  async get(id: string): Promise<ApiResponse<WorkStation>> {
    return apiClient.mes.get(`/api/mes/workstations/${id}`);
  },

  async create(data: CreateWorkStationRequest): Promise<ApiResponse<WorkStation>> {
    return apiClient.mes.post('/api/mes/workstations', data);
  },

  async update(id: string, data: UpdateWorkStationRequest): Promise<ApiResponse<WorkStation>> {
    return apiClient.mes.put(`/api/mes/workstations/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/api/mes/workstations/${id}`);
  },

  async activate(id: string): Promise<ApiResponse<WorkStation>> {
    return apiClient.mes.put(`/api/mes/workstations/${id}/activate`);
  },

  async deactivate(id: string): Promise<ApiResponse<WorkStation>> {
    return apiClient.mes.put(`/api/mes/workstations/${id}/deactivate`);
  },
};

// ========== 生产记录 API ==========
export const productionRecordApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      records: ProductionRecord[];
      total: number;
      page: number;
      page_size: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/mes/records${queryString ? '?' + queryString : ''}`);
  },

  async get(id: string): Promise<ApiResponse<ProductionRecord>> {
    return apiClient.mes.get(`/api/mes/records/${id}`);
  },

  async create(data: CreateProductionRecordRequest): Promise<ApiResponse<ProductionRecord>> {
    return apiClient.mes.post('/api/mes/records', data);
  },

  async update(
    id: string,
    data: UpdateProductionRecordRequest
  ): Promise<ApiResponse<ProductionRecord>> {
    return apiClient.mes.put(`/api/mes/records/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/api/mes/records/${id}`);
  },

  async complete(id: string, data: CompleteRecordRequest): Promise<ApiResponse<ProductionRecord>> {
    return apiClient.mes.put(`/api/mes/records/${id}/complete`, data);
  },
};

// ========== 设备管理 API ==========
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

// ========== 设备点检和维护 API ==========
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

// ========== 生产排产 API ==========
export const productionScheduleApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      schedules: ProductionSchedule[];
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
    return apiClient.mes.get(`/api/mes/schedules${queryString ? '?' + queryString : ''}`);
  },

  async get(id: string): Promise<ApiResponse<ProductionSchedule>> {
    return apiClient.mes.get(`/api/mes/schedules/${id}`);
  },

  async create(
    data: CreateProductionScheduleRequest
  ): Promise<ApiResponse<ProductionSchedule>> {
    return apiClient.mes.post('/api/mes/schedules', data);
  },

  async update(
    id: string,
    data: UpdateProductionScheduleRequest
  ): Promise<ApiResponse<ProductionSchedule>> {
    return apiClient.mes.put(`/api/mes/schedules/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/api/mes/schedules/${id}`);
  },

  async adjust(
    id: string,
    data: AdjustScheduleRequest
  ): Promise<ApiResponse<ProductionSchedule>> {
    return apiClient.mes.put(`/api/mes/schedules/${id}/adjust`, data);
  },

  async getGanttData(params?: {
    start_date?: string;
    end_date?: string;
    work_station_id?: string;
  }): Promise<ApiResponse<GanttData>> {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.work_station_id) searchParams.set('work_station_id', params.work_station_id);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/mes/schedules/gantt${queryString ? '?' + queryString : ''}`);
  },
};

// ========== 物料 BOM API ==========
export const materialBomApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      boms: MaterialBom[];
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
    return apiClient.mes.get(`/api/mes/boms${queryString ? '?' + queryString : ''}`);
  },

  async get(id: string): Promise<ApiResponse<MaterialBom>> {
    return apiClient.mes.get(`/api/mes/boms/${id}`);
  },

  async create(data: CreateMaterialBomRequest): Promise<ApiResponse<MaterialBom>> {
    return apiClient.mes.post('/api/mes/boms', data);
  },

  async update(id: string, data: UpdateMaterialBomRequest): Promise<ApiResponse<MaterialBom>> {
    return apiClient.mes.put(`/api/mes/boms/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/api/mes/boms/${id}`);
  },
};

// ========== 物料领料 API ==========
export const materialIssueApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      issues: MaterialIssue[];
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
    return apiClient.mes.get(`/api/mes/material-issues${queryString ? '?' + queryString : ''}`);
  },

  async create(data: CreateMaterialIssueRequest): Promise<ApiResponse<MaterialIssue>> {
    return apiClient.mes.post('/api/mes/material-issues', data);
  },
};

// ========== 物料退料 API ==========
export const materialReturnApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      returns: MaterialReturn[];
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
    return apiClient.mes.get(`/api/mes/material-returns${queryString ? '?' + queryString : ''}`);
  },

  async create(data: CreateMaterialReturnRequest): Promise<ApiResponse<MaterialReturn>> {
    return apiClient.mes.post('/api/mes/material-returns', data);
  },
};

// ========== 质量追溯 API ==========
export const traceabilityApi = {
  async forwardTraceability(orderId: string): Promise<ApiResponse<TraceChain>> {
    return apiClient.mes.get(`/api/mes/traceability/forward/${orderId}`);
  },

  async backwardTraceability(batchNo: string): Promise<ApiResponse<TraceChain>> {
    return apiClient.mes.get(`/api/mes/traceability/backward/${batchNo}`);
  },

  async getTraceChain(params: {
    type: 'forward' | 'backward';
    identifier: string;
  }): Promise<ApiResponse<TraceChain>> {
    const searchParams = new URLSearchParams();
    searchParams.set('type', params.type);
    searchParams.set('identifier', params.identifier);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/mes/traceability/chain${queryString ? '?' + queryString : ''}`);
  },

  async listQualityRecords(params?: PaginationParams): Promise<
    ApiResponse<{
      records: QualityRecord[];
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
    return apiClient.mes.get(`/api/mes/traceability/quality-records${queryString ? '?' + queryString : ''}`);
  },
};

// ========== 设备 OEE API ==========
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

// ========== WIP 管理 API ==========
export const wipApi = {
  async list(params?: PaginationParams): Promise<
    ApiResponse<{
      wips: Wip[];
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
    return apiClient.mes.get(`/api/mes/wips${queryString ? '?' + queryString : ''}`);
  },

  async get(id: string): Promise<ApiResponse<Wip>> {
    return apiClient.mes.get(`/api/mes/wips/${id}`);
  },

  async create(data: CreateWipRequest): Promise<ApiResponse<Wip>> {
    return apiClient.mes.post('/api/mes/wips', data);
  },

  async update(id: string, data: UpdateWipRequest): Promise<ApiResponse<Wip>> {
    return apiClient.mes.put(`/api/mes/wips/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.mes.delete(`/api/mes/wips/${id}`);
  },

  async transfer(data: TransferWipRequest): Promise<ApiResponse<WipTransfer>> {
    return apiClient.mes.post('/api/mes/wips/transfer', data);
  },

  async listTransfers(params?: PaginationParams & { wip_id?: string }): Promise<
    ApiResponse<{
      transfers: WipTransfer[];
      total: number;
      page: number;
      page_size: number;
    }>
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.wip_id) searchParams.set('wip_id', params.wip_id);

    const queryString = searchParams.toString();
    return apiClient.mes.get(`/api/mes/wips/transfers${queryString ? '?' + queryString : ''}`);
  },

  async getStatistics(): Promise<ApiResponse<WipStatistics>> {
    return apiClient.mes.get('/api/mes/wips/statistics');
  },
};

// ========== MES API 统一导出 ==========
export const mesApi = {
  orders: productionOrderApi,
  processes: productionProcessApi,
  workstations: workStationApi,
  records: productionRecordApi,
  equipment: equipmentApi,
  equipmentInspection: mesEquipmentApi,
  schedules: productionScheduleApi,
  boms: materialBomApi,
  materialIssues: materialIssueApi,
  materialReturns: materialReturnApi,
  traceability: traceabilityApi,
  equipmentOee: equipmentOeeApi,
  wips: wipApi,

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.mes.get('/health');
  },
};

export default mesApi;
