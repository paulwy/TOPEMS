import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8019';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Warehouse {
  id: string;
  name: string;
  code?: string;
  address?: string;
  manager?: string;
  phone?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehouseRequest {
  name: string;
  code?: string;
  address?: string;
  manager?: string;
  phone?: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  specification?: string;
  unit?: string;
  quantity: number;
  locationId?: string;
  warehouseId?: string;
  minQuantity?: number;
  maxQuantity?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryItemRequest {
  sku: string;
  name: string;
  specification?: string;
  unit?: string;
  quantity: number;
  locationId?: string;
  warehouseId?: string;
  minQuantity?: number;
  maxQuantity?: number;
}

export interface InboundOrder {
  id: string;
  orderNumber: string;
  warehouseId?: string;
  supplierId?: string;
  orderDate: string;
  expectedArrival?: string;
  actualArrival?: string;
  totalAmount?: number;
  status: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInboundOrderRequest {
  orderNumber: string;
  warehouseId?: string;
  supplierId?: string;
  orderDate: string;
  expectedArrival?: string;
  totalAmount?: number;
  remarks?: string;
}

export interface OutboundOrder {
  id: string;
  orderNumber: string;
  warehouseId?: string;
  customerId?: string;
  orderDate: string;
  expectedDelivery?: string;
  actualDelivery?: string;
  totalAmount?: number;
  status: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOutboundOrderRequest {
  orderNumber: string;
  warehouseId?: string;
  customerId?: string;
  orderDate: string;
  expectedDelivery?: string;
  totalAmount?: number;
  remarks?: string;
}

export interface ApiResponse<T> {
  code: number;
  success: boolean;
  data?: T;
  message: string;
  timestamp: string;
}

export const warehouseApi = {
  getWarehouses: (params?: { page?: number; pageSize?: number; search?: string; status?: string }) =>
    api.get<ApiResponse<any>>('/api/v1/warehouses', { params }),
  createWarehouse: (data: CreateWarehouseRequest) =>
    api.post<ApiResponse<Warehouse>>('/api/v1/warehouses', data),
  getWarehouse: (id: string) =>
    api.get<ApiResponse<Warehouse>>(`/api/v1/warehouses/${id}`),
  updateWarehouse: (id: string, data: Partial<CreateWarehouseRequest> & { status?: string }) =>
    api.put<ApiResponse<Warehouse>>(`/api/v1/warehouses/${id}`, data),
  deleteWarehouse: (id: string) =>
    api.delete<ApiResponse<string>>(`/api/v1/warehouses/${id}`),
};

export const inventoryApi = {
  getInventory: (params?: { page?: number; pageSize?: number; search?: string; status?: string; warehouseId?: string }) =>
    api.get<ApiResponse<any>>('/api/v1/inventory', { params }),
  createInventory: (data: CreateInventoryItemRequest) =>
    api.post<ApiResponse<InventoryItem>>('/api/v1/inventory', data),
  getInventoryItem: (id: string) =>
    api.get<ApiResponse<InventoryItem>>(`/api/v1/inventory/${id}`),
  updateInventory: (id: string, data: Partial<CreateInventoryItemRequest> & { status?: string }) =>
    api.put<ApiResponse<InventoryItem>>(`/api/v1/inventory/${id}`, data),
  deleteInventory: (id: string) =>
    api.delete<ApiResponse<string>>(`/api/v1/inventory/${id}`),
};

export const inboundOrderApi = {
  getInboundOrders: (params?: { page?: number; pageSize?: number; search?: string; status?: string }) =>
    api.get<ApiResponse<any>>('/api/v1/inbound-orders', { params }),
  createInboundOrder: (data: CreateInboundOrderRequest) =>
    api.post<ApiResponse<InboundOrder>>('/api/v1/inbound-orders', data),
  getInboundOrder: (id: string) =>
    api.get<ApiResponse<InboundOrder>>(`/api/v1/inbound-orders/${id}`),
  updateInboundOrder: (id: string, data: any) =>
    api.put<ApiResponse<InboundOrder>>(`/api/v1/inbound-orders/${id}`, data),
  deleteInboundOrder: (id: string) =>
    api.delete<ApiResponse<string>>(`/api/v1/inbound-orders/${id}`),
};

export const outboundOrderApi = {
  getOutboundOrders: (params?: { page?: number; pageSize?: number; search?: string; status?: string }) =>
    api.get<ApiResponse<any>>('/api/v1/outbound-orders', { params }),
  createOutboundOrder: (data: CreateOutboundOrderRequest) =>
    api.post<ApiResponse<OutboundOrder>>('/api/v1/outbound-orders', data),
  getOutboundOrder: (id: string) =>
    api.get<ApiResponse<OutboundOrder>>(`/api/v1/outbound-orders/${id}`),
  updateOutboundOrder: (id: string, data: any) =>
    api.put<ApiResponse<OutboundOrder>>(`/api/v1/outbound-orders/${id}`, data),
  deleteOutboundOrder: (id: string) =>
    api.delete<ApiResponse<string>>(`/api/v1/outbound-orders/${id}`),
};

export default api;
