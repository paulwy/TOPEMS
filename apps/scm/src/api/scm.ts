/**
 * SCM (Supply Chain Management) API
 * 供应链管理 API
 */

import { createRequest } from '@topems/shared-utils';

// ============= 基础类型 =============

export interface ListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  supplier_id?: string;
  order_id?: string;
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

export interface Supplier {
  id: string;
  name: string;
  short_name?: string;
  contact_name?: string;
  contact_phone?: string;
  email?: string;
  address?: string;
  bank_account?: string;
  tax_number?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierRequest {
  name: string;
  short_name?: string;
  contact_name?: string;
  contact_phone?: string;
  email?: string;
  address?: string;
  bank_account?: string;
  tax_number?: string;
}

export interface UpdateSupplierRequest {
  name?: string;
  short_name?: string;
  contact_name?: string;
  contact_phone?: string;
  email?: string;
  address?: string;
  bank_account?: string;
  tax_number?: string;
  status?: string;
}

export interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id?: string;
  supplier_name?: string;
  order_date: string;
  delivery_date?: string;
  total_amount?: number;
  status: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseOrderRequest {
  order_number: string;
  supplier_id?: string;
  order_date: string;
  delivery_date?: string;
  total_amount?: number;
  remarks?: string;
}

export interface UpdatePurchaseOrderRequest {
  supplier_id?: string;
  delivery_date?: string;
  total_amount?: number;
  status?: string;
  remarks?: string;
}

export interface PurchaseReceipt {
  id: string;
  receipt_number: string;
  purchase_order_id?: string;
  supplier_id?: string;
  supplier_name?: string;
  warehouse_id?: string;
  receipt_date: string;
  total_quantity?: number;
  total_amount?: number;
  status: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseReceiptRequest {
  receipt_number: string;
  purchase_order_id?: string;
  supplier_id?: string;
  warehouse_id?: string;
  receipt_date: string;
  total_quantity?: number;
  total_amount?: number;
  remarks?: string;
}

export interface UpdatePurchaseReceiptRequest {
  purchase_order_id?: string;
  supplier_id?: string;
  warehouse_id?: string;
  receipt_date?: string;
  total_quantity?: number;
  total_amount?: number;
  status?: string;
  remarks?: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  specification?: string;
  unit?: string;
  quantity: number;
  available_quantity: number;
  warehouse_id: string;
  warehouse_name?: string;
  min_quantity?: number;
  max_quantity?: number;
  reorder_point?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

// ============= 客户端 =============

const api = createRequest('/api/scm');

// ============= 供应商 API =============

export const supplierApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/suppliers${queryString}`);
    return response.data as PaginatedResult<Supplier>;
  },
  get: async (id: string) => {
    const response = await api.get(`/suppliers/${id}`);
    return response.data as Supplier;
  },
  create: async (data: CreateSupplierRequest) => {
    const response = await api.post('/suppliers', data);
    return response.data as Supplier;
  },
  update: async (id: string, data: UpdateSupplierRequest) => {
    const response = await api.put(`/suppliers/${id}`, data);
    return response.data as Supplier;
  },
  delete: async (id: string) => {
    await api.delete(`/suppliers/${id}`);
  },
};

// ============= 采购订单 API =============

export const purchaseOrderApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/purchase-orders${queryString}`);
    return response.data as PaginatedResult<PurchaseOrder>;
  },
  get: async (id: string) => {
    const response = await api.get(`/purchase-orders/${id}`);
    return response.data as PurchaseOrder;
  },
  create: async (data: CreatePurchaseOrderRequest) => {
    const response = await api.post('/purchase-orders', data);
    return response.data as PurchaseOrder;
  },
  update: async (id: string, data: UpdatePurchaseOrderRequest) => {
    const response = await api.put(`/purchase-orders/${id}`, data);
    return response.data as PurchaseOrder;
  },
  delete: async (id: string) => {
    await api.delete(`/purchase-orders/${id}`);
  },
  approve: async (id: string) => {
    const response = await api.put(`/purchase-orders/${id}/approve`);
    return response.data as PurchaseOrder;
  },
  cancel: async (id: string) => {
    const response = await api.put(`/purchase-orders/${id}/cancel`);
    return response.data as PurchaseOrder;
  },
};

// ============= 采购入库 API =============

export const purchaseReceiptApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/purchase-receipts${queryString}`);
    return response.data as PaginatedResult<PurchaseReceipt>;
  },
  get: async (id: string) => {
    const response = await api.get(`/purchase-receipts/${id}`);
    return response.data as PurchaseReceipt;
  },
  create: async (data: CreatePurchaseReceiptRequest) => {
    const response = await api.post('/purchase-receipts', data);
    return response.data as PurchaseReceipt;
  },
  update: async (id: string, data: UpdatePurchaseReceiptRequest) => {
    const response = await api.put(`/purchase-receipts/${id}`, data);
    return response.data as PurchaseReceipt;
  },
  delete: async (id: string) => {
    await api.delete(`/purchase-receipts/${id}`);
  },
  confirm: async (id: string) => {
    const response = await api.put(`/purchase-receipts/${id}/confirm`);
    return response.data as PurchaseReceipt;
  },
};

// ============= 库存管理 API =============

export const inventoryApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/inventory${queryString}`);
    return response.data as PaginatedResult<InventoryItem>;
  },
  get: async (id: string) => {
    const response = await api.get(`/inventory/${id}`);
    return response.data as InventoryItem;
  },
  listLowStock: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    const response = await api.get(`/inventory/low-stock${queryString}`);
    return response.data as PaginatedResult<InventoryItem>;
  },
};

// ============= 统一导出 =============

export const scmApi = {
  suppliers: supplierApi,
  purchaseOrders: purchaseOrderApi,
  purchaseReceipts: purchaseReceiptApi,
  inventory: inventoryApi,

  health: async (): Promise<string> => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default scmApi;
