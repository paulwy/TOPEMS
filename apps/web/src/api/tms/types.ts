// TMS 运输管理系统 - 类型定义

// ==================== 审批相关类型 ====================

/** 审批请求体 */
export interface ApprovalRequest {
  operator: string;
  comment?: string;
}

/** 审批响应体 */
export interface ApprovalResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

// ==================== 状态类型 ====================

export type VehicleStatus = 'active' | 'maintenance' | 'inactive' | 'retired';
export type DriverStatus = 'active' | 'on_leave' | 'suspended' | 'inactive';
export type CarrierStatus = 'pending_review' | 'active' | 'suspended' | 'blacklisted' | 'rejected';
export type RouteStatus = 'planning' | 'active' | 'closed' | 'deprecated' | 'cancelled';
export type ShipmentStatus = 'draft' | 'pending' | 'in_transit' | 'delivered' | 'cancelled';

// ==================== 实体类型 ====================

export interface Vehicle {
  id: string;
  vehicle_no: string;
  plate_number?: string;
  vehicle_type?: string;
  capacity?: number;
  status?: VehicleStatus;
  carrier_id?: string;
  notes?: string;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateVehicleRequest {
  vehicle_no: string;
  plate_number?: string;
  vehicle_type?: string;
  capacity?: number;
  carrier_id?: string;
  notes?: string;
}

export type UpdateVehicleRequest = Partial<CreateVehicleRequest>;

export interface Driver {
  id: string;
  driver_no: string;
  name: string;
  phone?: string;
  license_no?: string;
  license_type?: string;
  status?: DriverStatus;
  carrier_id?: string;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type CreateDriverRequest = Omit<Driver, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>;
export type UpdateDriverRequest = Partial<CreateDriverRequest>;

export interface Carrier {
  id: string;
  carrier_no: string;
  name: string;
  contact_person?: string;
  contact_phone?: string;
  status?: CarrierStatus;
  service_area?: string;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type CreateCarrierRequest = Omit<Carrier, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>;
export type UpdateCarrierRequest = Partial<CreateCarrierRequest>;

export interface Route {
  id: string;
  route_no: string;
  name: string;
  origin?: string;
  destination?: string;
  distance_km?: number;
  estimated_hours?: number;
  status?: RouteStatus;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type CreateRouteRequest = Omit<Route, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>;
export type UpdateRouteRequest = Partial<CreateRouteRequest>;

export interface Shipment {
  id: string;
  shipment_no: string;
  order_id?: string;
  carrier_id?: string;
  vehicle_id?: string;
  driver_id?: string;
  route_id?: string;
  origin?: string;
  destination?: string;
  status?: ShipmentStatus;
  freight_amount?: number;
  planned_departure?: string;
  planned_arrival?: string;
  actual_departure?: string;
  actual_arrival?: string;
  notes?: string;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type CreateShipmentRequest = Omit<
  Shipment,
  'id' | 'tenant_id' | 'created_at' | 'updated_at'
>;
export type UpdateShipmentRequest = Partial<CreateShipmentRequest>;

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  tenant_id?: string;
}
