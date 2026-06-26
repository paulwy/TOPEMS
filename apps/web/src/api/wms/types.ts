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

export interface UpdateInboundOrderRequest {
  order_number?: string;
  order_type?: string;
  warehouse_id?: string;
  supplier_id?: string;
  supplier_name?: string;
  expected_date?: string;
  items?: CreateInboundOrderItemRequest[];
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
