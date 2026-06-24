/**
 * WMS (Warehouse Management System) API
 * 仓库管理 API
 */

import { createRequest } from '@topems/shared-utils';

// ============= 基础类型 =============

export interface ListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  warehouse_id?: string;
  [key: string]: string | number | undefined;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

function buildQueryString(params?: ListParams): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, value.toString());
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

// ============= 业务实体 =============

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string;
  contact?: string;
  phone?: string;
  manager?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWarehouseRequest {
  name: string;
  code: string;
  address?: string;
  contact?: string;
  phone?: string;
  manager?: string;
}

export interface UpdateWarehouseRequest {
  name?: string;
  code?: string;
  address?: string;
  contact?: string;
  phone?: string;
  manager?: string;
  status?: string;
}

export interface InboundOrder {
  id: string;
  order_number: string;
  order_type: string;
  warehouse_id: string;
  warehouse_name?: string;
  supplier_id?: string;
  supplier_name?: string;
  expected_date?: string;
  status: string;
  total_amount?: number;
  total_quantity?: number;
  created_at: string;
  updated_at: string;
}

export interface OutboundOrder {
  id: string;
  order_number: string;
  order_type: string;
  warehouse_id: string;
  warehouse_name?: string;
  customer_id?: string;
  customer_name?: string;
  expected_date?: string;
  status: string;
  total_amount?: number;
  total_quantity?: number;
  created_at: string;
  updated_at: string;
}

export interface StockTake {
  id: string;
  warehouse_id: string;
  warehouse_name?: string;
  stock_take_number: string;
  stock_take_type: string;
  status: string;
  planned_date?: string;
  actual_date?: string;
  total_items?: number;
  counted_items?: number;
  discrepancy_items?: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryAlert {
  id: string;
  inventory_item_id: string;
  sku: string;
  product_name: string;
  warehouse_name?: string;
  alert_type: 'low_stock' | 'over_stock' | 'expiring' | 'expired';
  current_quantity: number;
  min_quantity?: number;
  max_quantity?: number;
  status: 'pending' | 'acknowledged' | 'resolved';
  alert_date: string;
  created_at: string;
  updated_at: string;
}

// ============= 客户端 =============

const api = createRequest('/api/wms');

// ============= 仓库管理 API =============

export const warehouseApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/warehouses${queryString}`);
    return response.data as PaginatedResult<Warehouse>;
  },
  get: async (id: string) => {
    const response = await api.get(`/warehouses/${id}`);
    return response.data as Warehouse;
  },
  create: async (data: CreateWarehouseRequest) => {
    const response = await api.post('/warehouses', data);
    return response.data as Warehouse;
  },
  update: async (id: string, data: UpdateWarehouseRequest) => {
    const response = await api.put(`/warehouses/${id}`, data);
    return response.data as Warehouse;
  },
  delete: async (id: string) => {
    await api.delete(`/warehouses/${id}`);
  },
};

// ============= 出入库 API =============

export const inboundOrderApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/inbound-orders${queryString}`);
    return response.data as PaginatedResult<InboundOrder>;
  },
  get: async (id: string) => {
    const response = await api.get(`/inbound-orders/${id}`);
    return response.data as InboundOrder;
  },
  create: async (data: Partial<InboundOrder>) => {
    const response = await api.post('/inbound-orders', data);
    return response.data as InboundOrder;
  },
  update: async (id: string, data: Partial<InboundOrder>) => {
    const response = await api.put(`/inbound-orders/${id}`, data);
    return response.data as InboundOrder;
  },
  delete: async (id: string) => {
    await api.delete(`/inbound-orders/${id}`);
  },
  confirm: async (id: string) => {
    const response = await api.put(`/inbound-orders/${id}/confirm`);
    return response.data as InboundOrder;
  },
  complete: async (id: string) => {
    const response = await api.put(`/inbound-orders/${id}/complete`);
    return response.data as InboundOrder;
  },
};

export const outboundOrderApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/outbound-orders${queryString}`);
    return response.data as PaginatedResult<OutboundOrder>;
  },
  get: async (id: string) => {
    const response = await api.get(`/outbound-orders/${id}`);
    return response.data as OutboundOrder;
  },
  create: async (data: Partial<OutboundOrder>) => {
    const response = await api.post('/outbound-orders', data);
    return response.data as OutboundOrder;
  },
  update: async (id: string, data: Partial<OutboundOrder>) => {
    const response = await api.put(`/outbound-orders/${id}`, data);
    return response.data as OutboundOrder;
  },
  delete: async (id: string) => {
    await api.delete(`/outbound-orders/${id}`);
  },
  confirm: async (id: string) => {
    const response = await api.put(`/outbound-orders/${id}/confirm`);
    return response.data as OutboundOrder;
  },
  ship: async (id: string) => {
    const response = await api.put(`/outbound-orders/${id}/ship`);
    return response.data as OutboundOrder;
  },
  complete: async (id: string) => {
    const response = await api.put(`/outbound-orders/${id}/complete`);
    return response.data as OutboundOrder;
  },
};

// ============= 库存盘点 API =============

export const stockTakeApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/stock-takes${queryString}`);
    return response.data as PaginatedResult<StockTake>;
  },
  get: async (id: string) => {
    const response = await api.get(`/stock-takes/${id}`);
    return response.data as StockTake;
  },
  create: async (data: Partial<StockTake>) => {
    const response = await api.post('/stock-takes', data);
    return response.data as StockTake;
  },
  update: async (id: string, data: Partial<StockTake>) => {
    const response = await api.put(`/stock-takes/${id}`, data);
    return response.data as StockTake;
  },
  delete: async (id: string) => {
    await api.delete(`/stock-takes/${id}`);
  },
  start: async (id: string) => {
    const response = await api.put(`/stock-takes/${id}/start`);
    return response.data as StockTake;
  },
  complete: async (id: string) => {
    const response = await api.put(`/stock-takes/${id}/complete`);
    return response.data as StockTake;
  },
};

// ============= 库存预警 API =============

export const inventoryAlertApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/inventory-alerts${queryString}`);
    return response.data as PaginatedResult<InventoryAlert>;
  },
  get: async (id: string) => {
    const response = await api.get(`/inventory-alerts/${id}`);
    return response.data as InventoryAlert;
  },
  acknowledge: async (id: string) => {
    const response = await api.put(`/inventory-alerts/${id}/acknowledge`);
    return response.data as InventoryAlert;
  },
  resolve: async (id: string) => {
    const response = await api.put(`/inventory-alerts/${id}/resolve`);
    return response.data as InventoryAlert;
  },
  listLowStock: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/inventory-alerts/low-stock${queryString}`);
    return response.data as PaginatedResult<InventoryAlert>;
  },
  listExpiring: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/inventory-alerts/expiring${queryString}`);
    return response.data as PaginatedResult<InventoryAlert>;
  },
};

// ============= 统一导出 =============

export const wmsApi = {
  warehouses: warehouseApi,
  inboundOrders: inboundOrderApi,
  outboundOrders: outboundOrderApi,
  stockTakes: stockTakeApi,
  inventoryAlerts: inventoryAlertApi,

  health: async (): Promise<string> => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default wmsApi;
