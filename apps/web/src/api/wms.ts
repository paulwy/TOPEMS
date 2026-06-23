import apiClient from "./client";
import type { ApiResponse } from "./client";

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  specification: string;
  unit: string;
  quantity: number;
  available_quantity: number;
  reserved_quantity?: number;
  location_id: string;
  warehouse_id: string;
  min_quantity?: number;
  max_quantity?: number;
  reorder_point?: number;
  status: string;
  batch_number?: string;
  lot_number?: string;
  expiry_date?: string;
  supplier_name?: string;
  supplier_code?: string;
  purchase_price?: number;
  total_value?: number;
  last_movement_date?: string;
  last_movement_type?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInventoryItemRequest {
  warehouse_id: string;
  location_id: string;
  sku: string;
  name: string;
  specification: string;
  quantity: number;
  unit: string;
  min_quantity: number;
  max_quantity: number;
}

export interface UpdateInventoryItemRequest {
  warehouse_id?: string;
  location_id?: string;
  sku?: string;
  name?: string;
  specification?: string;
  quantity?: number;
  unit?: string;
  min_quantity?: number;
  max_quantity?: number;
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

export interface InboundOrderItem {
  id: string;
  order_id: string;
  line_number: number;
  material_code: string;
  material_name: string;
  specification?: string;
  batch_number?: string;
  location_id?: string;
  unit: string;
  expected_quantity: number;
  received_quantity: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInboundOrderRequest {
  order_number: string;
  order_type: string;
  warehouse_id: string;
  supplier_id?: string;
  supplier_name?: string;
  expected_date?: string;
  items: CreateInboundOrderItemRequest[];
}

export interface CreateInboundOrderItemRequest {
  material_code: string;
  material_name: string;
  specification?: string;
  batch_number?: string;
  location_id?: string;
  unit: string;
  expected_quantity: number;
}

export interface ReceiveItemRequest {
  item_id: string;
  received_quantity: number;
}

export interface OutboundOrder {
  id: string;
  order_number: string;
  order_type: string;
  warehouse_id: string;
  warehouse_name?: string;
  customer_id?: string;
  customer_name?: string;
  shipping_address?: string;
  expected_date?: string;
  expected_delivery?: string;
  actual_delivery?: string;
  order_date?: string;
  status: string;
  total_amount?: number;
  total_quantity?: number;
  created_at: string;
  updated_at: string;
}

export interface OutboundOrderItem {
  id: string;
  order_id: string;
  line_number: number;
  material_code: string;
  material_name: string;
  specification?: string;
  batch_number?: string;
  location_id?: string;
  unit: string;
  requested_quantity: number;
  picked_quantity: number;
  shipped_quantity: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOutboundOrderRequest {
  order_number: string;
  order_type: string;
  warehouse_id: string;
  customer_id?: string;
  customer_name?: string;
  shipping_address?: string;
  expected_date?: string;
  order_date?: string;
  expected_delivery?: string;
  total_amount?: number;
  remarks?: string;
  items: CreateOutboundOrderItemRequest[];
}

export interface CreateOutboundOrderItemRequest {
  material_code: string;
  material_name: string;
  specification?: string;
  batch_number?: string;
  location_id?: string;
  unit: string;
  requested_quantity: number;
}

export interface ShipItemRequest {
  item_id: string;
  shipped_quantity: number;
}

export interface StockTake {
  id: string;
  warehouse_id: string;
  warehouse_name?: string;
  location_id?: string;
  location_code?: string;
  location_name?: string;
  stock_take_number: string;
  stock_take_type: string;
  status: string;
  planned_date?: string;
  actual_date?: string;
  total_items?: number;
  counted_items?: number;
  discrepancy_items?: number;
  total_quantity?: number;
  counted_quantity?: number;
  discrepancy_quantity?: number;
  discrepancy_value?: number;
  accuracy_rate?: number;
  approval_status?: string;
  adjustment_status?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
  stock_adjusted?: boolean;
}

export interface StockTakeItem {
  id: string;
  stock_take_id: string;
  line_number: number;
  material_code: string;
  material_name: string;
  specification?: string;
  batch_number?: string;
  location_id?: string;
  location_code?: string;
  location_name?: string;
  system_quantity: number;
  counted_quantity?: number;
  discrepancy_quantity?: number;
  discrepancy_type?: string;
  unit: string;
  unit_price?: number;
  discrepancy_value?: number;
  quality_status?: string;
  counter?: string;
  counting_time?: string;
  recount_required?: boolean;
  recount_quantity?: number;
  discrepancy_reason?: string;
  discrepancy_notes?: string;
  adjustment_required?: boolean;
  adjustment_quantity?: number;
  adjustment_status?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateStockTakeRequest {
  stock_take_number: string;
  warehouse_id: string;
  location_id?: string;
  remarks?: string;
}

export interface CreateStockTakeItemRequest {
  inventory_item_id: string;
  expected_quantity: number;
  actual_quantity?: number;
  remarks?: string;
}

export interface CountItemRequest {
  item_id: string;
  counted_quantity: number;
  discrepancy_reason?: string;
  remarks?: string;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  warehouse_id?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export async function listInventory(
  params?: PaginationParams,
): Promise<ApiResponse<PaginatedResponse<InventoryItem>>> {
  return apiClient.wms.get("/inventory", { params });
}

export async function getInventory(
  id: string,
): Promise<ApiResponse<InventoryItem>> {
  return apiClient.wms.get(`/inventory/${id}`);
}

export async function createInventory(
  data: CreateInventoryItemRequest,
): Promise<ApiResponse<InventoryItem>> {
  return apiClient.wms.post("/inventory", data);
}

export async function updateInventory(
  id: string,
  data: UpdateInventoryItemRequest,
): Promise<ApiResponse<InventoryItem>> {
  return apiClient.wms.put(`/inventory/${id}`, data);
}

export async function deleteInventory(
  id: string,
): Promise<ApiResponse<string>> {
  return apiClient.wms.delete(`/inventory/${id}`);
}

export async function listLowStockInventory(): Promise<
  ApiResponse<{ items: InventoryItem[]; total: number }>
> {
  return apiClient.wms.get("/inventory/low-stock");
}

export async function listInventoryByWarehouse(warehouse_id: string): Promise<
  ApiResponse<{
    items: InventoryItem[];
    total: number;
    total_quantity: number;
    total_value: number;
  }>
> {
  return apiClient.wms.get(`/inventory/warehouse/${warehouse_id}`);
}

export async function listInboundOrders(
  params?: PaginationParams,
): Promise<ApiResponse<PaginatedResponse<InboundOrder>>> {
  return apiClient.wms.get("/inbound-orders", { params });
}

export async function getInboundOrder(
  id: string,
): Promise<ApiResponse<InboundOrder>> {
  return apiClient.wms.get(`/inbound-orders/${id}`);
}

export async function createInboundOrder(
  data: CreateInboundOrderRequest,
): Promise<ApiResponse<InboundOrder>> {
  return apiClient.wms.post("/inbound-orders", data);
}

export async function updateInboundOrder(
  id: string,
  data: Partial<InboundOrder>,
): Promise<ApiResponse<InboundOrder>> {
  return apiClient.wms.put(`/inbound-orders/${id}`, data);
}

export async function deleteInboundOrder(
  id: string,
): Promise<ApiResponse<string>> {
  return apiClient.wms.delete(`/inbound-orders/${id}`);
}

export async function listInboundOrderItems(
  order_id: string,
): Promise<ApiResponse<{ items: InboundOrderItem[]; total: number }>> {
  return apiClient.wms.get(`/inbound-orders/${order_id}/items`);
}

export async function createInboundOrderItem(
  order_id: string,
  data: CreateInboundOrderItemRequest,
): Promise<ApiResponse<InboundOrderItem>> {
  return apiClient.wms.post(`/inbound-orders/${order_id}/items`, data);
}

export async function updateInboundOrderItem(
  order_id: string,
  item_id: string,
  data: Partial<InboundOrderItem>,
): Promise<ApiResponse<InboundOrderItem>> {
  return apiClient.wms.put(`/inbound-orders/${order_id}/items/${item_id}`, data);
}

export async function deleteInboundOrderItem(
  order_id: string,
  item_id: string,
): Promise<ApiResponse<string>> {
  return apiClient.wms.delete(`/inbound-orders/${order_id}/items/${item_id}`);
}

export async function confirmInboundOrder(
  id: string,
): Promise<ApiResponse<InboundOrder>> {
  return apiClient.wms.post(`/inbound-orders/${id}/confirm`);
}

export async function receiveInboundOrder(
  id: string,
  items: ReceiveItemRequest[],
): Promise<ApiResponse<InboundOrder>> {
  return apiClient.wms.post(`/inbound-orders/${id}/receive`, items);
}

export async function completeInboundOrder(
  id: string,
): Promise<ApiResponse<InboundOrder>> {
  return apiClient.wms.post(`/inbound-orders/${id}/complete`);
}

export async function listOutboundOrders(
  params?: PaginationParams,
): Promise<ApiResponse<PaginatedResponse<OutboundOrder>>> {
  return apiClient.wms.get("/outbound-orders", { params });
}

export async function getOutboundOrder(
  id: string,
): Promise<ApiResponse<OutboundOrder>> {
  return apiClient.wms.get(`/outbound-orders/${id}`);
}

export async function createOutboundOrder(
  data: CreateOutboundOrderRequest,
): Promise<ApiResponse<OutboundOrder>> {
  return apiClient.wms.post("/outbound-orders", data);
}

export async function updateOutboundOrder(
  id: string,
  data: Partial<OutboundOrder>,
): Promise<ApiResponse<OutboundOrder>> {
  return apiClient.wms.put(`/outbound-orders/${id}`, data);
}

export async function deleteOutboundOrder(
  id: string,
): Promise<ApiResponse<string>> {
  return apiClient.wms.delete(`/outbound-orders/${id}`);
}

export async function listOutboundOrderItems(
  order_id: string,
): Promise<ApiResponse<{ items: OutboundOrderItem[]; total: number }>> {
  return apiClient.wms.get(`/outbound-orders/${order_id}/items`);
}

export async function createOutboundOrderItem(
  order_id: string,
  data: CreateOutboundOrderItemRequest,
): Promise<ApiResponse<OutboundOrderItem>> {
  return apiClient.wms.post(`/outbound-orders/${order_id}/items`, data);
}

export async function updateOutboundOrderItem(
  order_id: string,
  item_id: string,
  data: Partial<OutboundOrderItem>,
): Promise<ApiResponse<OutboundOrderItem>> {
  return apiClient.wms.put(`/outbound-orders/${order_id}/items/${item_id}`, data);
}

export async function deleteOutboundOrderItem(
  order_id: string,
  item_id: string,
): Promise<ApiResponse<string>> {
  return apiClient.wms.delete(`/outbound-orders/${order_id}/items/${item_id}`);
}

export async function confirmOutboundOrder(
  id: string,
): Promise<ApiResponse<OutboundOrder>> {
  return apiClient.wms.post(`/outbound-orders/${id}/confirm`);
}

export async function pickOutboundOrder(
  id: string,
): Promise<ApiResponse<OutboundOrder>> {
  return apiClient.wms.post(`/outbound-orders/${id}/pick`);
}

export async function packOutboundOrder(
  id: string,
): Promise<ApiResponse<OutboundOrder>> {
  return apiClient.wms.post(`/outbound-orders/${id}/pack`);
}

export async function shipOutboundOrder(
  id: string,
  items: ShipItemRequest[],
): Promise<ApiResponse<OutboundOrder>> {
  return apiClient.wms.post(`/outbound-orders/${id}/ship`, items);
}

export async function completeOutboundOrder(
  id: string,
): Promise<ApiResponse<OutboundOrder>> {
  return apiClient.wms.post(`/outbound-orders/${id}/complete`);
}

export async function listStockTakes(
  params?: PaginationParams,
): Promise<ApiResponse<PaginatedResponse<StockTake>>> {
  return apiClient.wms.get("/stock-takes", { params });
}

export async function getStockTake(
  id: string,
): Promise<ApiResponse<StockTake>> {
  return apiClient.wms.get(`/stock-takes/${id}`);
}

export async function createStockTake(
  data: CreateStockTakeRequest,
): Promise<ApiResponse<StockTake>> {
  return apiClient.wms.post("/stock-takes", data);
}

export async function updateStockTake(
  id: string,
  data: Partial<StockTake>,
): Promise<ApiResponse<StockTake>> {
  return apiClient.wms.put(`/stock-takes/${id}`, data);
}

export async function deleteStockTake(
  id: string,
): Promise<ApiResponse<string>> {
  return apiClient.wms.delete(`/stock-takes/${id}`);
}

export async function listStockTakeItems(id: string): Promise<
  ApiResponse<{
    items: StockTakeItem[];
    total: number;
    completed_count: number;
    discrepancy_count: number;
  }>
> {
  return apiClient.wms.get(`/stock-takes/${id}/items`);
}

export async function getStockTakeItem(
  id: string,
  item_id: string,
): Promise<ApiResponse<StockTakeItem>> {
  return apiClient.wms.get(`/stock-takes/${id}/items/${item_id}`);
}

export async function createStockTakeItem(
  id: string,
  data: CreateStockTakeItemRequest,
): Promise<ApiResponse<StockTakeItem>> {
  return apiClient.wms.post(`/stock-takes/${id}/items`, data);
}

export async function updateStockTakeItem(
  id: string,
  item_id: string,
  data: Partial<StockTakeItem>,
): Promise<ApiResponse<StockTakeItem>> {
  return apiClient.wms.put(`/stock-takes/${id}/items/${item_id}`, data);
}

export async function deleteStockTakeItem(
  id: string,
  item_id: string,
): Promise<ApiResponse<string>> {
  return apiClient.wms.delete(`/stock-takes/${id}/items/${item_id}`);
}

export async function startStockTake(
  id: string,
): Promise<ApiResponse<StockTake>> {
  return apiClient.wms.post(`/stock-takes/${id}/start`);
}

export async function countStockTake(
  id: string,
  items: CountItemRequest[],
): Promise<ApiResponse<{ message: string }>> {
  return apiClient.wms.post(`/stock-takes/${id}/count`, items);
}

export async function completeStockTake(
  id: string,
): Promise<ApiResponse<StockTake>> {
  return apiClient.wms.post(`/stock-takes/${id}/complete`);
}

export async function adjustStockTake(
  id: string,
): Promise<ApiResponse<{ message: string }>> {
  return apiClient.wms.post(`/stock-takes/${id}/adjust`);
}

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
  status?: string;
}

export async function listWarehouses(
  params?: PaginationParams,
): Promise<ApiResponse<PaginatedResponse<Warehouse>>> {
  return apiClient.wms.get("/warehouses", { params });
}

export async function getWarehouse(id: string): Promise<ApiResponse<Warehouse>> {
  return apiClient.wms.get(`/warehouses/${id}`);
}

export async function createWarehouse(
  data: CreateWarehouseRequest,
): Promise<ApiResponse<Warehouse>> {
  return apiClient.wms.post("/warehouses", data);
}

export async function updateWarehouse(
  id: string,
  data: UpdateWarehouseRequest,
): Promise<ApiResponse<Warehouse>> {
  return apiClient.wms.put(`/warehouses/${id}`, data);
}

export async function deleteWarehouse(id: string): Promise<ApiResponse<string>> {
  return apiClient.wms.delete(`/warehouses/${id}`);
}

export const wmsApi = {
  inventory: {
    list: listInventory,
    get: getInventory,
    create: createInventory,
    update: updateInventory,
    delete: deleteInventory,
    listLowStock: listLowStockInventory,
    listByWarehouse: listInventoryByWarehouse,
  },
  inboundOrders: {
    list: listInboundOrders,
    get: getInboundOrder,
    create: createInboundOrder,
    update: updateInboundOrder,
    delete: deleteInboundOrder,
    listItems: listInboundOrderItems,
    createItem: createInboundOrderItem,
    updateItem: updateInboundOrderItem,
    deleteItem: deleteInboundOrderItem,
    confirm: confirmInboundOrder,
    receive: receiveInboundOrder,
    complete: completeInboundOrder,
  },
  outboundOrders: {
    list: listOutboundOrders,
    get: getOutboundOrder,
    create: createOutboundOrder,
    update: updateOutboundOrder,
    delete: deleteOutboundOrder,
    listItems: listOutboundOrderItems,
    createItem: createOutboundOrderItem,
    updateItem: updateOutboundOrderItem,
    deleteItem: deleteOutboundOrderItem,
    confirm: confirmOutboundOrder,
    pick: pickOutboundOrder,
    pack: packOutboundOrder,
    ship: shipOutboundOrder,
    complete: completeOutboundOrder,
  },
  stockTakes: {
    list: listStockTakes,
    get: getStockTake,
    create: createStockTake,
    update: updateStockTake,
    delete: deleteStockTake,
    listItems: listStockTakeItems,
    getItem: getStockTakeItem,
    createItem: createStockTakeItem,
    updateItem: updateStockTakeItem,
    deleteItem: deleteStockTakeItem,
    start: startStockTake,
    count: countStockTake,
    complete: completeStockTake,
    adjust: adjustStockTake,
  },
  warehouses: {
    list: listWarehouses,
    get: getWarehouse,
    create: createWarehouse,
    update: updateWarehouse,
    delete: deleteWarehouse,
  },
};
