import apiClient from './client';
import type { ApiResponse } from './client';

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
  remarks?: string;
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

export interface UpdateInboundOrderRequest {
  order_number?: string;
  order_type?: string;
  warehouse_id?: string;
  supplier_id?: string;
  supplier_name?: string;
  expected_date?: string;
  items?: CreateInboundOrderItemRequest[];
}

export interface UpdateOutboundOrderRequest {
  order_number?: string;
  order_type?: string;
  warehouse_id?: string;
  customer_id?: string;
  customer_name?: string;
  shipping_address?: string;
  expected_date?: string;
  order_date?: string;
  expected_delivery?: string;
  total_amount?: number;
  remarks?: string;
  items?: CreateOutboundOrderItemRequest[];
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
  params?: PaginationParams
): Promise<ApiResponse<PaginatedResponse<InventoryItem>>> {
  return apiClient.wms.get('/inventory', { params });
}

export async function getInventory(id: string): Promise<ApiResponse<InventoryItem>> {
  return apiClient.wms.get(`/inventory/${id}`);
}

export async function createInventory(
  data: CreateInventoryItemRequest
): Promise<ApiResponse<InventoryItem>> {
  return apiClient.wms.post('/inventory', data);
}

export async function updateInventory(
  id: string,
  data: UpdateInventoryItemRequest
): Promise<ApiResponse<InventoryItem>> {
  return apiClient.wms.put(`/inventory/${id}`, data);
}

export async function deleteInventory(id: string): Promise<ApiResponse<string>> {
  return apiClient.wms.delete(`/inventory/${id}`);
}

export async function listLowStockInventory(): Promise<
  ApiResponse<{ items: InventoryItem[]; total: number }>
> {
  return apiClient.wms.get('/inventory/low-stock');
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
  params?: PaginationParams
): Promise<ApiResponse<PaginatedResponse<InboundOrder>>> {
  return apiClient.wms.get('/inbound-orders', { params });
}

export async function getInboundOrder(id: string): Promise<ApiResponse<InboundOrder>> {
  return apiClient.wms.get(`/inbound-orders/${id}`);
}

export async function createInboundOrder(
  data: CreateInboundOrderRequest
): Promise<ApiResponse<InboundOrder>> {
  return apiClient.wms.post('/inbound-orders', data);
}

export async function updateInboundOrder(
  id: string,
  data: Partial<InboundOrder>
): Promise<ApiResponse<InboundOrder>> {
  return apiClient.wms.put(`/inbound-orders/${id}`, data);
}

export async function deleteInboundOrder(id: string): Promise<ApiResponse<string>> {
  return apiClient.wms.delete(`/inbound-orders/${id}`);
}

export async function listInboundOrderItems(
  order_id: string
): Promise<ApiResponse<{ items: InboundOrderItem[]; total: number }>> {
  return apiClient.wms.get(`/inbound-orders/${order_id}/items`);
}

export async function createInboundOrderItem(
  order_id: string,
  data: CreateInboundOrderItemRequest
): Promise<ApiResponse<InboundOrderItem>> {
  return apiClient.wms.post(`/inbound-orders/${order_id}/items`, data);
}

export async function updateInboundOrderItem(
  order_id: string,
  item_id: string,
  data: Partial<InboundOrderItem>
): Promise<ApiResponse<InboundOrderItem>> {
  return apiClient.wms.put(`/inbound-orders/${order_id}/items/${item_id}`, data);
}

export async function deleteInboundOrderItem(
  order_id: string,
  item_id: string
): Promise<ApiResponse<string>> {
  return apiClient.wms.delete(`/inbound-orders/${order_id}/items/${item_id}`);
}

export async function confirmInboundOrder(id: string): Promise<ApiResponse<InboundOrder>> {
  return apiClient.wms.post(`/inbound-orders/${id}/confirm`);
}

export async function receiveInboundOrder(
  id: string,
  items: ReceiveItemRequest[]
): Promise<ApiResponse<InboundOrder>> {
  return apiClient.wms.post(`/inbound-orders/${id}/receive`, items);
}

export async function completeInboundOrder(id: string): Promise<ApiResponse<InboundOrder>> {
  return apiClient.wms.post(`/inbound-orders/${id}/complete`);
}

export async function listOutboundOrders(
  params?: PaginationParams
): Promise<ApiResponse<PaginatedResponse<OutboundOrder>>> {
  return apiClient.wms.get('/outbound-orders', { params });
}

export async function getOutboundOrder(id: string): Promise<ApiResponse<OutboundOrder>> {
  return apiClient.wms.get(`/outbound-orders/${id}`);
}

export async function createOutboundOrder(
  data: CreateOutboundOrderRequest
): Promise<ApiResponse<OutboundOrder>> {
  return apiClient.wms.post('/outbound-orders', data);
}

export async function updateOutboundOrder(
  id: string,
  data: Partial<OutboundOrder>
): Promise<ApiResponse<OutboundOrder>> {
  return apiClient.wms.put(`/outbound-orders/${id}`, data);
}

export async function deleteOutboundOrder(id: string): Promise<ApiResponse<string>> {
  return apiClient.wms.delete(`/outbound-orders/${id}`);
}

export async function listOutboundOrderItems(
  order_id: string
): Promise<ApiResponse<{ items: OutboundOrderItem[]; total: number }>> {
  return apiClient.wms.get(`/outbound-orders/${order_id}/items`);
}

export async function createOutboundOrderItem(
  order_id: string,
  data: CreateOutboundOrderItemRequest
): Promise<ApiResponse<OutboundOrderItem>> {
  return apiClient.wms.post(`/outbound-orders/${order_id}/items`, data);
}

export async function updateOutboundOrderItem(
  order_id: string,
  item_id: string,
  data: Partial<OutboundOrderItem>
): Promise<ApiResponse<OutboundOrderItem>> {
  return apiClient.wms.put(`/outbound-orders/${order_id}/items/${item_id}`, data);
}

export async function deleteOutboundOrderItem(
  order_id: string,
  item_id: string
): Promise<ApiResponse<string>> {
  return apiClient.wms.delete(`/outbound-orders/${order_id}/items/${item_id}`);
}

export async function confirmOutboundOrder(id: string): Promise<ApiResponse<OutboundOrder>> {
  return apiClient.wms.post(`/outbound-orders/${id}/confirm`);
}

export async function pickOutboundOrder(id: string): Promise<ApiResponse<OutboundOrder>> {
  return apiClient.wms.post(`/outbound-orders/${id}/pick`);
}

export async function packOutboundOrder(id: string): Promise<ApiResponse<OutboundOrder>> {
  return apiClient.wms.post(`/outbound-orders/${id}/pack`);
}

export async function shipOutboundOrder(
  id: string,
  items: ShipItemRequest[]
): Promise<ApiResponse<OutboundOrder>> {
  return apiClient.wms.post(`/outbound-orders/${id}/ship`, items);
}

export async function completeOutboundOrder(id: string): Promise<ApiResponse<OutboundOrder>> {
  return apiClient.wms.post(`/outbound-orders/${id}/complete`);
}

export async function listStockTakes(
  params?: PaginationParams
): Promise<ApiResponse<PaginatedResponse<StockTake>>> {
  return apiClient.wms.get('/stock-takes', { params });
}

export async function getStockTake(id: string): Promise<ApiResponse<StockTake>> {
  return apiClient.wms.get(`/stock-takes/${id}`);
}

export async function createStockTake(
  data: CreateStockTakeRequest
): Promise<ApiResponse<StockTake>> {
  return apiClient.wms.post('/stock-takes', data);
}

export async function updateStockTake(
  id: string,
  data: Partial<StockTake>
): Promise<ApiResponse<StockTake>> {
  return apiClient.wms.put(`/stock-takes/${id}`, data);
}

export async function deleteStockTake(id: string): Promise<ApiResponse<string>> {
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
  item_id: string
): Promise<ApiResponse<StockTakeItem>> {
  return apiClient.wms.get(`/stock-takes/${id}/items/${item_id}`);
}

export async function createStockTakeItem(
  id: string,
  data: CreateStockTakeItemRequest
): Promise<ApiResponse<StockTakeItem>> {
  return apiClient.wms.post(`/stock-takes/${id}/items`, data);
}

export async function updateStockTakeItem(
  id: string,
  item_id: string,
  data: Partial<StockTakeItem>
): Promise<ApiResponse<StockTakeItem>> {
  return apiClient.wms.put(`/stock-takes/${id}/items/${item_id}`, data);
}

export async function deleteStockTakeItem(
  id: string,
  item_id: string
): Promise<ApiResponse<string>> {
  return apiClient.wms.delete(`/stock-takes/${id}/items/${item_id}`);
}

export async function startStockTake(id: string): Promise<ApiResponse<StockTake>> {
  return apiClient.wms.post(`/stock-takes/${id}/start`);
}

export async function countStockTake(
  id: string,
  items: CountItemRequest[]
): Promise<ApiResponse<{ message: string }>> {
  return apiClient.wms.post(`/stock-takes/${id}/count`, items);
}

export async function completeStockTake(id: string): Promise<ApiResponse<StockTake>> {
  return apiClient.wms.post(`/stock-takes/${id}/complete`);
}

export async function adjustStockTake(id: string): Promise<ApiResponse<{ message: string }>> {
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
  params?: PaginationParams
): Promise<ApiResponse<PaginatedResponse<Warehouse>>> {
  return apiClient.wms.get('/warehouses', { params });
}

export async function getWarehouse(id: string): Promise<ApiResponse<Warehouse>> {
  return apiClient.wms.get(`/warehouses/${id}`);
}

export async function createWarehouse(
  data: CreateWarehouseRequest
): Promise<ApiResponse<Warehouse>> {
  return apiClient.wms.post('/warehouses', data);
}

export async function updateWarehouse(
  id: string,
  data: UpdateWarehouseRequest
): Promise<ApiResponse<Warehouse>> {
  return apiClient.wms.put(`/warehouses/${id}`, data);
}

export async function deleteWarehouse(id: string): Promise<ApiResponse<string>> {
  return apiClient.wms.delete(`/warehouses/${id}`);
}

export interface InventoryAlertRule {
  id: string;
  rule_name: string;
  rule_type: string;
  warehouse_id?: string;
  warehouse_name?: string;
  sku?: string;
  material_name?: string;
  category_id?: string;
  category_name?: string;
  min_quantity?: number;
  max_quantity?: number;
  reorder_point?: number;
  expiry_days?: number;
  alert_level: string;
  notification_channels?: string[];
  recipients?: string[];
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInventoryAlertRuleRequest {
  rule_name: string;
  rule_type: string;
  warehouse_id?: string;
  sku?: string;
  category_id?: string;
  min_quantity?: number;
  max_quantity?: number;
  reorder_point?: number;
  expiry_days?: number;
  alert_level: string;
  notification_channels?: string[];
  recipients?: string[];
  is_active?: boolean;
  description?: string;
}

export interface UpdateInventoryAlertRuleRequest {
  rule_name?: string;
  rule_type?: string;
  warehouse_id?: string;
  sku?: string;
  category_id?: string;
  min_quantity?: number;
  max_quantity?: number;
  reorder_point?: number;
  expiry_days?: number;
  alert_level?: string;
  notification_channels?: string[];
  recipients?: string[];
  is_active?: boolean;
  description?: string;
}

export interface InventoryAlertRecord {
  id: string;
  rule_id: string;
  rule_name?: string;
  alert_type: string;
  alert_level: string;
  warehouse_id?: string;
  warehouse_name?: string;
  sku?: string;
  material_name?: string;
  location_id?: string;
  location_code?: string;
  current_quantity?: number;
  threshold_quantity?: number;
  expiry_date?: string;
  alert_message: string;
  status: string;
  confirmed_by?: string;
  confirmed_at?: string;
  confirmation_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryAlertStatistics {
  total_alerts: number;
  pending_alerts: number;
  confirmed_alerts: number;
  low_stock_count: number;
  over_stock_count: number;
  expiry_count: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
}

export interface AlertPaginationParams extends PaginationParams {
  alert_type?: string;
  alert_level?: string;
  status?: string;
  warehouse_id?: string;
}

export async function listInventoryAlertRules(
  params?: AlertPaginationParams
): Promise<ApiResponse<PaginatedResponse<InventoryAlertRule>>> {
  return apiClient.wms.get('/inventory-alerts/rules', { params });
}

export async function getInventoryAlertRule(id: string): Promise<ApiResponse<InventoryAlertRule>> {
  return apiClient.wms.get(`/inventory-alerts/rules/${id}`);
}

export async function createInventoryAlertRule(
  data: CreateInventoryAlertRuleRequest
): Promise<ApiResponse<InventoryAlertRule>> {
  return apiClient.wms.post('/inventory-alerts/rules', data);
}

export async function updateInventoryAlertRule(
  id: string,
  data: UpdateInventoryAlertRuleRequest
): Promise<ApiResponse<InventoryAlertRule>> {
  return apiClient.wms.put(`/inventory-alerts/rules/${id}`, data);
}

export async function deleteInventoryAlertRule(id: string): Promise<ApiResponse<string>> {
  return apiClient.wms.delete(`/inventory-alerts/rules/${id}`);
}

export async function listInventoryAlertRecords(
  params?: AlertPaginationParams
): Promise<ApiResponse<PaginatedResponse<InventoryAlertRecord>>> {
  return apiClient.wms.get('/inventory-alerts/records', { params });
}

export async function getInventoryAlertRecord(id: string): Promise<ApiResponse<InventoryAlertRecord>> {
  return apiClient.wms.get(`/inventory-alerts/records/${id}`);
}

export async function confirmInventoryAlert(
  id: string,
  data?: { notes?: string }
): Promise<ApiResponse<InventoryAlertRecord>> {
  return apiClient.wms.post(`/inventory-alerts/records/${id}/confirm`, data);
}

export async function getInventoryAlertStatistics(
  params?: { warehouse_id?: string }
): Promise<ApiResponse<InventoryAlertStatistics>> {
  return apiClient.wms.get('/inventory-alerts/statistics', { params });
}

export interface ReplenishmentSuggestion {
  id: string;
  suggestion_number: string;
  warehouse_id: string;
  warehouse_name?: string;
  sku: string;
  material_name: string;
  specification?: string;
  unit: string;
  current_quantity: number;
  available_quantity: number;
  reorder_point: number;
  safety_stock: number;
  max_stock: number;
  suggested_quantity: number;
  supplier_id?: string;
  supplier_name?: string;
  unit_price?: number;
  total_cost?: number;
  lead_time_days?: number;
  priority: string;
  status: string;
  source: string;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

export interface ReplenishmentOrder {
  id: string;
  order_number: string;
  warehouse_id: string;
  warehouse_name?: string;
  supplier_id?: string;
  supplier_name?: string;
  order_type: string;
  status: string;
  total_quantity?: number;
  total_amount?: number;
  expected_date?: string;
  priority?: string;
  source?: string;
  related_suggestion_ids?: string[];
  remarks?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReplenishmentOrderItem {
  id: string;
  order_id: string;
  line_number: number;
  sku: string;
  material_name: string;
  specification?: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_amount?: number;
  received_quantity?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SafetyStockSetting {
  id: string;
  warehouse_id: string;
  warehouse_name?: string;
  sku: string;
  material_name: string;
  specification?: string;
  unit: string;
  safety_stock: number;
  reorder_point: number;
  max_stock?: number;
  min_order_quantity?: number;
  lead_time_days?: number;
  calculation_method?: string;
  last_calculated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReplenishmentStatistics {
  total_suggestions: number;
  pending_suggestions: number;
  processed_suggestions: number;
  total_orders: number;
  pending_orders: number;
  in_progress_orders: number;
  completed_orders: number;
  total_cost?: number;
  low_stock_items: number;
  safety_stock_items: number;
}

export interface CreateReplenishmentOrderRequest {
  warehouse_id: string;
  supplier_id?: string;
  supplier_name?: string;
  order_type?: string;
  expected_date?: string;
  priority?: string;
  remarks?: string;
  items: CreateReplenishmentOrderItemRequest[];
}

export interface CreateReplenishmentOrderItemRequest {
  sku: string;
  material_name: string;
  specification?: string;
  unit: string;
  quantity: number;
  unit_price?: number;
}

export interface UpdateSafetyStockRequest {
  safety_stock?: number;
  reorder_point?: number;
  max_stock?: number;
  min_order_quantity?: number;
  lead_time_days?: number;
}

export async function listReplenishmentSuggestions(
  params?: AlertPaginationParams & { priority?: string; status?: string }
): Promise<ApiResponse<PaginatedResponse<ReplenishmentSuggestion>>> {
  return apiClient.wms.get('/smart-replenishment/suggestions', { params });
}

export async function getReplenishmentSuggestion(
  id: string
): Promise<ApiResponse<ReplenishmentSuggestion>> {
  return apiClient.wms.get(`/smart-replenishment/suggestions/${id}`);
}

export async function generateReplenishmentSuggestions(
  data?: { warehouse_id?: string; sku?: string; category_id?: string }
): Promise<ApiResponse<{ count: number; suggestions: ReplenishmentSuggestion[] }>> {
  return apiClient.wms.post('/smart-replenishment/suggestions/generate', data);
}

export async function listReplenishmentOrders(
  params?: PaginationParams
): Promise<ApiResponse<PaginatedResponse<ReplenishmentOrder>>> {
  return apiClient.wms.get('/smart-replenishment/orders', { params });
}

export async function getReplenishmentOrder(
  id: string
): Promise<ApiResponse<ReplenishmentOrder>> {
  return apiClient.wms.get(`/smart-replenishment/orders/${id}`);
}

export async function createReplenishmentOrder(
  data: CreateReplenishmentOrderRequest
): Promise<ApiResponse<ReplenishmentOrder>> {
  return apiClient.wms.post('/smart-replenishment/orders', data);
}

export async function updateReplenishmentOrder(
  id: string,
  data: Partial<ReplenishmentOrder>
): Promise<ApiResponse<ReplenishmentOrder>> {
  return apiClient.wms.put(`/smart-replenishment/orders/${id}`, data);
}

export async function deleteReplenishmentOrder(id: string): Promise<ApiResponse<string>> {
  return apiClient.wms.delete(`/smart-replenishment/orders/${id}`);
}

export async function listReplenishmentOrderItems(
  order_id: string
): Promise<ApiResponse<{ items: ReplenishmentOrderItem[]; total: number }>> {
  return apiClient.wms.get(`/smart-replenishment/orders/${order_id}/items`);
}

export async function confirmReplenishmentOrder(
  id: string
): Promise<ApiResponse<ReplenishmentOrder>> {
  return apiClient.wms.post(`/smart-replenishment/orders/${id}/confirm`);
}

export async function completeReplenishmentOrder(
  id: string
): Promise<ApiResponse<ReplenishmentOrder>> {
  return apiClient.wms.post(`/smart-replenishment/orders/${id}/complete`);
}

export async function listSafetyStockSettings(
  params?: PaginationParams
): Promise<ApiResponse<PaginatedResponse<SafetyStockSetting>>> {
  return apiClient.wms.get('/smart-replenishment/safety-stock', { params });
}

export async function getSafetyStockSetting(
  id: string
): Promise<ApiResponse<SafetyStockSetting>> {
  return apiClient.wms.get(`/smart-replenishment/safety-stock/${id}`);
}

export async function updateSafetyStockSetting(
  id: string,
  data: UpdateSafetyStockRequest
): Promise<ApiResponse<SafetyStockSetting>> {
  return apiClient.wms.put(`/smart-replenishment/safety-stock/${id}`, data);
}

export async function batchUpdateSafetyStock(
  data: UpdateSafetyStockRequest & { ids: string[] }
): Promise<ApiResponse<{ updated_count: number }>> {
  return apiClient.wms.post('/smart-replenishment/safety-stock/batch-update', data);
}

export async function calculateSafetyStock(
  data?: { warehouse_id?: string; sku?: string; category_id?: string }
): Promise<ApiResponse<{ updated_count: number }>> {
  return apiClient.wms.post('/smart-replenishment/safety-stock/calculate', data);
}

export async function getReplenishmentStatistics(
  params?: { warehouse_id?: string }
): Promise<ApiResponse<ReplenishmentStatistics>> {
  return apiClient.wms.get('/smart-replenishment/statistics', { params });
}

export interface Location {
  id: string;
  code: string;
  name: string;
  warehouse_id: string;
  warehouse_name?: string;
  zone_id?: string;
  zone_name?: string;
  aisle?: string;
  row?: string;
  column?: string;
  layer?: string;
  location_type: string;
  storage_type?: string;
  capacity?: number;
  occupied_quantity?: number;
  available_capacity?: number;
  volume?: number;
  occupied_volume?: number;
  weight_limit?: number;
  current_weight?: number;
  status: string;
  temperature_zone?: string;
  is_active: boolean;
  barcode?: string;
  rfid?: string;
  sort_order?: number;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLocationRequest {
  code: string;
  name: string;
  warehouse_id: string;
  zone_id?: string;
  aisle?: string;
  row?: string;
  column?: string;
  layer?: string;
  location_type: string;
  storage_type?: string;
  capacity?: number;
  volume?: number;
  weight_limit?: number;
  temperature_zone?: string;
  is_active?: boolean;
  barcode?: string;
  rfid?: string;
  sort_order?: number;
  remarks?: string;
}

export interface UpdateLocationRequest {
  name?: string;
  zone_id?: string;
  aisle?: string;
  row?: string;
  column?: string;
  layer?: string;
  location_type?: string;
  storage_type?: string;
  capacity?: number;
  volume?: number;
  weight_limit?: number;
  status?: string;
  temperature_zone?: string;
  is_active?: boolean;
  barcode?: string;
  rfid?: string;
  sort_order?: number;
  remarks?: string;
}

export interface LocationStatusSummary {
  warehouse_id: string;
  total_locations: number;
  empty_locations: number;
  partially_filled: number;
  full_locations: number;
  inactive_locations: number;
}

export interface LocationPaginationParams extends PaginationParams {
  warehouse_id?: string;
  zone_id?: string;
  location_type?: string;
  storage_type?: string;
  status?: string;
  is_active?: boolean;
}

export async function listLocations(
  params?: LocationPaginationParams
): Promise<ApiResponse<PaginatedResponse<Location>>> {
  return apiClient.wms.get('/locations', { params });
}

export async function getLocation(id: string): Promise<ApiResponse<Location>> {
  return apiClient.wms.get(`/locations/${id}`);
}

export async function createLocation(
  data: CreateLocationRequest
): Promise<ApiResponse<Location>> {
  return apiClient.wms.post('/locations', data);
}

export async function updateLocation(
  id: string,
  data: UpdateLocationRequest
): Promise<ApiResponse<Location>> {
  return apiClient.wms.put(`/locations/${id}`, data);
}

export async function deleteLocation(id: string): Promise<ApiResponse<string>> {
  return apiClient.wms.delete(`/locations/${id}`);
}

export async function getLocationStatus(
  warehouse_id?: string
): Promise<ApiResponse<LocationStatusSummary>> {
  return apiClient.wms.get('/locations/status', { params: { warehouse_id } });
}

export async function batchCreateLocations(
  data: CreateLocationRequest[]
): Promise<ApiResponse<{ created_count: number; locations: Location[] }>> {
  return apiClient.wms.post('/locations/batch', data);
}

export async function batchUpdateLocations(
  data: { ids: string[]; updates: UpdateLocationRequest }
): Promise<ApiResponse<{ updated_count: number }>> {
  return apiClient.wms.put('/locations/batch', data);
}

export async function batchDeleteLocations(
  ids: string[]
): Promise<ApiResponse<{ deleted_count: number }>> {
  return apiClient.wms.post('/locations/batch-delete', { ids });
}

export interface TransferOrder {
  id: string;
  order_number: string;
  transfer_type: string;
  from_warehouse_id: string;
  from_warehouse_name?: string;
  from_location_id?: string;
  from_location_code?: string;
  to_warehouse_id: string;
  to_warehouse_name?: string;
  to_location_id?: string;
  to_location_code?: string;
  status: string;
  total_quantity?: number;
  total_amount?: number;
  planned_date?: string;
  actual_date?: string;
  transporter?: string;
  tracking_number?: string;
  priority?: string;
  remarks?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  shipped_by?: string;
  shipped_at?: string;
  received_by?: string;
  received_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TransferOrderItem {
  id: string;
  transfer_id: string;
  line_number: number;
  sku: string;
  material_name: string;
  specification?: string;
  batch_number?: string;
  unit: string;
  planned_quantity: number;
  shipped_quantity: number;
  received_quantity: number;
  unit_price?: number;
  total_amount?: number;
  from_location_id?: string;
  to_location_id?: string;
  status: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTransferOrderRequest {
  transfer_type?: string;
  from_warehouse_id: string;
  from_location_id?: string;
  to_warehouse_id: string;
  to_location_id?: string;
  planned_date?: string;
  transporter?: string;
  priority?: string;
  remarks?: string;
  items: CreateTransferOrderItemRequest[];
}

export interface CreateTransferOrderItemRequest {
  sku: string;
  material_name: string;
  specification?: string;
  batch_number?: string;
  unit: string;
  planned_quantity: number;
  unit_price?: number;
  from_location_id?: string;
  to_location_id?: string;
}

export async function listTransferOrders(
  params?: PaginationParams
): Promise<ApiResponse<PaginatedResponse<TransferOrder>>> {
  return apiClient.wms.get('/transfers', { params });
}

export async function getTransferOrder(id: string): Promise<ApiResponse<TransferOrder>> {
  return apiClient.wms.get(`/transfers/${id}`);
}

export async function createTransferOrder(
  data: CreateTransferOrderRequest
): Promise<ApiResponse<TransferOrder>> {
  return apiClient.wms.post('/transfers', data);
}

export async function updateTransferOrder(
  id: string,
  data: Partial<TransferOrder>
): Promise<ApiResponse<TransferOrder>> {
  return apiClient.wms.put(`/transfers/${id}`, data);
}

export async function deleteTransferOrder(id: string): Promise<ApiResponse<string>> {
  return apiClient.wms.delete(`/transfers/${id}`);
}

export async function listTransferOrderItems(
  transfer_id: string
): Promise<ApiResponse<{ items: TransferOrderItem[]; total: number }>> {
  return apiClient.wms.get(`/transfers/${transfer_id}/items`);
}

export async function confirmTransferOrder(id: string): Promise<ApiResponse<TransferOrder>> {
  return apiClient.wms.post(`/transfers/${id}/confirm`);
}

export async function shipTransferOrder(id: string): Promise<ApiResponse<TransferOrder>> {
  return apiClient.wms.post(`/transfers/${id}/ship`);
}

export async function receiveTransferOrder(
  id: string,
  items?: { item_id: string; received_quantity: number }[]
): Promise<ApiResponse<TransferOrder>> {
  return apiClient.wms.post(`/transfers/${id}/receive`, { items });
}

export async function completeTransferOrder(id: string): Promise<ApiResponse<TransferOrder>> {
  return apiClient.wms.post(`/transfers/${id}/complete`);
}

export interface SyncRecord {
  id: string;
  sync_type: string;
  sync_direction: string;
  source_system: string;
  target_system: string;
  status: string;
  total_count: number;
  success_count: number;
  failed_count: number;
  skipped_count?: number;
  start_time?: string;
  end_time?: string;
  duration_seconds?: number;
  error_message?: string;
  data_size?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SyncRecordItem {
  id: string;
  sync_record_id: string;
  record_id: string;
  record_type: string;
  record_name?: string;
  status: string;
  error_message?: string;
  source_data?: Record<string, any>;
  target_data?: Record<string, any>;
  created_at: string;
}

export interface SyncStatistics {
  total_syncs: number;
  successful_syncs: number;
  failed_syncs: number;
  in_progress_syncs: number;
  total_records_synced: number;
  total_records_failed: number;
  last_sync_time?: string;
}

export interface SyncPaginationParams extends PaginationParams {
  sync_type?: string;
  sync_direction?: string;
  status?: string;
  source_system?: string;
  target_system?: string;
}

export async function listSyncRecords(
  params?: SyncPaginationParams
): Promise<ApiResponse<PaginatedResponse<SyncRecord>>> {
  return apiClient.wms.get('/sync-records', { params });
}

export async function getSyncRecord(id: string): Promise<ApiResponse<SyncRecord>> {
  return apiClient.wms.get(`/sync-records/${id}`);
}

export async function listSyncRecordItems(
  sync_record_id: string,
  params?: { status?: string; page?: number; page_size?: number }
): Promise<ApiResponse<PaginatedResponse<SyncRecordItem>>> {
  return apiClient.wms.get(`/sync-records/${sync_record_id}/items`, { params });
}

export async function retrySyncRecord(id: string): Promise<ApiResponse<SyncRecord>> {
  return apiClient.wms.post(`/sync-records/${id}/retry`);
}

export async function retryFailedSyncItems(
  id: string,
  item_ids?: string[]
): Promise<ApiResponse<{ retried_count: number }>> {
  return apiClient.wms.post(`/sync-records/${id}/retry-items`, { item_ids });
}

export async function getSyncStatistics(
  params?: { sync_type?: string; date_range?: string }
): Promise<ApiResponse<SyncStatistics>> {
  return apiClient.wms.get('/sync-records/statistics', { params });
}

export async function syncWithScm(
  data: { sync_type: string; full_sync?: boolean }
): Promise<ApiResponse<SyncRecord>> {
  return apiClient.wms.post('/sync/scm', data);
}

export async function syncInventoryWithScm(
  data?: { warehouse_id?: string; sku?: string; full_sync?: boolean }
): Promise<ApiResponse<SyncRecord>> {
  return apiClient.wms.post('/sync/scm/inventory', data);
}

export async function syncOrdersWithScm(
  data?: { order_type?: string; date_range?: string; full_sync?: boolean }
): Promise<ApiResponse<SyncRecord>> {
  return apiClient.wms.post('/sync/scm/orders', data);
}

export interface AuditLog {
  id: string;
  action: string;
  module: string;
  entity_type: string;
  entity_id: string;
  entity_name?: string;
  description: string;
  operation_type: string;
  before_data?: Record<string, any>;
  after_data?: Record<string, any>;
  changed_fields?: string[];
  ip_address?: string;
  user_agent?: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
}

export interface AuditLogPaginationParams extends PaginationParams {
  module?: string;
  entity_type?: string;
  entity_id?: string;
  operation_type?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
}

export async function listAuditLogs(
  params?: AuditLogPaginationParams
): Promise<ApiResponse<PaginatedResponse<AuditLog>>> {
  return apiClient.wms.get('/audit-logs', { params });
}

export async function getAuditLog(id: string): Promise<ApiResponse<AuditLog>> {
  return apiClient.wms.get(`/audit-logs/${id}`);
}

export async function getAuditLogModules(): Promise<ApiResponse<{ modules: string[] }>> {
  return apiClient.wms.get('/audit-logs/modules');
}

export interface InventoryStatistics {
  total_quantity: number;
  total_value: number;
  total_items: number;
  total_sku_count: number;
  warehouse_count: number;
  location_count: number;
  low_stock_items: number;
  out_of_stock_items: number;
  over_stock_items?: number;
  average_turnover_days?: number;
  turnover_rate?: number;
}

export interface ABCAnalysisItem {
  category: string;
  sku_count: number;
  sku_percentage: number;
  total_value: number;
  value_percentage: number;
  cumulative_value_percentage: number;
}

export interface InventoryTurnoverData {
  period: string;
  turnover_rate: number;
  turnover_days: number;
  cost_of_goods_sold: number;
  average_inventory_value: number;
}

export interface InventoryValueByWarehouse {
  warehouse_id: string;
  warehouse_name: string;
  total_quantity: number;
  total_value: number;
  sku_count: number;
}

export interface InventoryStatisticsParams {
  warehouse_id?: string;
  category_id?: string;
  start_date?: string;
  end_date?: string;
}

export async function getInventoryStatistics(
  params?: InventoryStatisticsParams
): Promise<ApiResponse<InventoryStatistics>> {
  return apiClient.wms.get('/inventory/statistics', { params });
}

export async function getInventoryABCAnalysis(
  params?: InventoryStatisticsParams & { a_threshold?: number; b_threshold?: number }
): Promise<ApiResponse<{ items: ABCAnalysisItem[]; total_sku: number; total_value: number }>> {
  return apiClient.wms.get('/inventory/abc-analysis', { params });
}

export async function getInventoryTurnover(
  params?: InventoryStatisticsParams & { period_type?: string; periods?: number }
): Promise<ApiResponse<{ items: InventoryTurnoverData[] }>> {
  return apiClient.wms.get('/inventory/turnover', { params });
}

export async function getInventoryValueByWarehouse(
  params?: { category_id?: string }
): Promise<ApiResponse<{ items: InventoryValueByWarehouse[]; total_value: number }>> {
  return apiClient.wms.get('/inventory/value-by-warehouse', { params });
}

export interface WavePick {
  id: string;
  wave_number: string;
  warehouse_id: string;
  warehouse_name?: string;
  wave_type: string;
  status: string;
  priority?: string;
  total_orders: number;
  total_items: number;
  total_quantity: number;
  picked_orders?: number;
  picked_items?: number;
  picked_quantity?: number;
  picker_id?: string;
  picker_name?: string;
  zone_id?: string;
  zone_name?: string;
  started_at?: string;
  completed_at?: string;
  remarks?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WavePickItem {
  id: string;
  wave_id: string;
  order_id: string;
  order_number?: string;
  line_number: number;
  sku: string;
  material_name: string;
  specification?: string;
  batch_number?: string;
  unit: string;
  required_quantity: number;
  picked_quantity: number;
  location_id?: string;
  location_code?: string;
  status: string;
  picked_by?: string;
  picked_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWavePickRequest {
  warehouse_id: string;
  wave_type?: string;
  priority?: string;
  zone_id?: string;
  order_ids?: string[];
  order_count?: number;
  remarks?: string;
}

export interface AssignWavePickRequest {
  picker_id: string;
  picker_name?: string;
}

export async function listWavePicks(
  params?: PaginationParams
): Promise<ApiResponse<PaginatedResponse<WavePick>>> {
  return apiClient.wms.get('/wave-picks', { params });
}

export async function getWavePick(id: string): Promise<ApiResponse<WavePick>> {
  return apiClient.wms.get(`/wave-picks/${id}`);
}

export async function createWavePick(
  data: CreateWavePickRequest
): Promise<ApiResponse<WavePick>> {
  return apiClient.wms.post('/wave-picks', data);
}

export async function updateWavePick(
  id: string,
  data: Partial<WavePick>
): Promise<ApiResponse<WavePick>> {
  return apiClient.wms.put(`/wave-picks/${id}`, data);
}

export async function deleteWavePick(id: string): Promise<ApiResponse<string>> {
  return apiClient.wms.delete(`/wave-picks/${id}`);
}

export async function listWavePickItems(
  wave_id: string
): Promise<ApiResponse<{ items: WavePickItem[]; total: number }>> {
  return apiClient.wms.get(`/wave-picks/${wave_id}/items`);
}

export async function assignWavePick(
  id: string,
  data: AssignWavePickRequest
): Promise<ApiResponse<WavePick>> {
  return apiClient.wms.post(`/wave-picks/${id}/assign`, data);
}

export async function startWavePick(id: string): Promise<ApiResponse<WavePick>> {
  return apiClient.wms.post(`/wave-picks/${id}/start`);
}

export async function completeWavePick(id: string): Promise<ApiResponse<WavePick>> {
  return apiClient.wms.post(`/wave-picks/${id}/complete`);
}

export async function cancelWavePick(id: string): Promise<ApiResponse<WavePick>> {
  return apiClient.wms.post(`/wave-picks/${id}/cancel`);
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
  inventoryAlerts: {
    listRules: listInventoryAlertRules,
    getRule: getInventoryAlertRule,
    createRule: createInventoryAlertRule,
    updateRule: updateInventoryAlertRule,
    deleteRule: deleteInventoryAlertRule,
    listRecords: listInventoryAlertRecords,
    getRecord: getInventoryAlertRecord,
    confirm: confirmInventoryAlert,
    getStatistics: getInventoryAlertStatistics,
  },
  smartReplenishment: {
    listSuggestions: listReplenishmentSuggestions,
    getSuggestion: getReplenishmentSuggestion,
    generateSuggestions: generateReplenishmentSuggestions,
    listOrders: listReplenishmentOrders,
    getOrder: getReplenishmentOrder,
    createOrder: createReplenishmentOrder,
    updateOrder: updateReplenishmentOrder,
    deleteOrder: deleteReplenishmentOrder,
    listOrderItems: listReplenishmentOrderItems,
    confirmOrder: confirmReplenishmentOrder,
    completeOrder: completeReplenishmentOrder,
    listSafetyStock: listSafetyStockSettings,
    getSafetyStock: getSafetyStockSetting,
    updateSafetyStock: updateSafetyStockSetting,
    batchUpdateSafetyStock: batchUpdateSafetyStock,
    calculateSafetyStock: calculateSafetyStock,
    getStatistics: getReplenishmentStatistics,
  },
  locations: {
    list: listLocations,
    get: getLocation,
    create: createLocation,
    update: updateLocation,
    delete: deleteLocation,
    getStatus: getLocationStatus,
    batchCreate: batchCreateLocations,
    batchUpdate: batchUpdateLocations,
    batchDelete: batchDeleteLocations,
  },
  transfers: {
    list: listTransferOrders,
    get: getTransferOrder,
    create: createTransferOrder,
    update: updateTransferOrder,
    delete: deleteTransferOrder,
    listItems: listTransferOrderItems,
    confirm: confirmTransferOrder,
    ship: shipTransferOrder,
    receive: receiveTransferOrder,
    complete: completeTransferOrder,
  },
  syncRecords: {
    list: listSyncRecords,
    get: getSyncRecord,
    listItems: listSyncRecordItems,
    retry: retrySyncRecord,
    retryFailedItems: retryFailedSyncItems,
    getStatistics: getSyncStatistics,
  },
  sync: {
    withScm: syncWithScm,
    inventoryWithScm: syncInventoryWithScm,
    ordersWithScm: syncOrdersWithScm,
  },
  auditLogs: {
    list: listAuditLogs,
    get: getAuditLog,
    getModules: getAuditLogModules,
  },
  inventoryStats: {
    getStatistics: getInventoryStatistics,
    getABCAnalysis: getInventoryABCAnalysis,
    getTurnover: getInventoryTurnover,
    getValueByWarehouse: getInventoryValueByWarehouse,
  },
  wavePicks: {
    list: listWavePicks,
    get: getWavePick,
    create: createWavePick,
    update: updateWavePick,
    delete: deleteWavePick,
    listItems: listWavePickItems,
    assign: assignWavePick,
    start: startWavePick,
    complete: completeWavePick,
    cancel: cancelWavePick,
  },
};
