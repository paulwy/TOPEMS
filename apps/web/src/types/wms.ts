// ============================================================================
// WMS 模块全量 DTO 定义 — 单一事实源 (Single Source of Truth)
//
// 本文件定义 WMS 18 实体的完整 DTO（Data Transfer Object）：
// - Response DTO：完整实体（含 id/tenant_id/created_at/updated_at）
// - Request DTO：创建请求（不含 id/时间戳）
// - Update DTO：更新请求（所有字段可选）
//
// 字段命名规则：snake_case（与后端 Rust svc/wms Schema 一致）
// 字段类型规则：
//   - id / tenant_id / created_at / updated_at 为 string
//   - 可空字段用 `string | null` 或 `number | null`
//   - 数量字段为 number
//   - 日期字段为 string（ISO 8601）
//
// 18 实体清单：
//   E-1  Warehouse（仓库）
//   E-2  Location（库位）
//   E-3  InboundOrder + InboundOrderItem（入库单+行项）
//   E-4  OutboundOrder + OutboundOrderItem（出库单+行项）
//   E-5  StockTake + StockTakeItem（盘点单+行项）
//   E-6  TransferOrder + TransferOrderItem（调拨单+行项）
//   E-7  WavePick + WavePickItem（波次拣货+行项）
//   E-8  InventoryMovement（库存移动）
//   E-9  InventoryItem + InventoryAlert（库存项+库存预警）
//   E-10 SerialNumber（序列号）
//   E-11 Batch（批次）
//   E-12 CycleCountTask（循环盘点任务）
// ============================================================================

// ============================================================================
// FSM 状态枚举常量（7 个有限状态机）
// ============================================================================

// ==================== FSM-1 InboundOrder ====================
const INBOUND_ORDER_STATES = [
  'created',
  'confirmed',
  'received',
  'completed',
  'cancelled',
] as const;
export type InboundOrderState = (typeof INBOUND_ORDER_STATES)[number];

// ==================== FSM-2 OutboundOrder ====================
const OUTBOUND_ORDER_STATES = [
  'created',
  'confirmed',
  'picking',
  'packing',
  'shipping',
  'completed',
  'cancelled',
] as const;
export type OutboundOrderState = (typeof OUTBOUND_ORDER_STATES)[number];

// ==================== FSM-3 StockTake ====================
const STOCK_TAKE_STATES = ['planned', 'in_progress', 'completed', 'cancelled'] as const;
export type StockTakeState = (typeof STOCK_TAKE_STATES)[number];

// ==================== FSM-4 TransferOrder ====================
const TRANSFER_ORDER_STATES = [
  'pending',
  'confirmed',
  'shipped',
  'received',
  'completed',
  'cancelled',
] as const;
export type TransferOrderState = (typeof TRANSFER_ORDER_STATES)[number];

// ==================== FSM-5 WavePick ====================
const WAVE_PICK_STATES = ['created', 'assigned', 'picking', 'completed', 'cancelled'] as const;
export type WavePickState = (typeof WAVE_PICK_STATES)[number];

// ==================== FSM-6 InventoryMovement ====================
const INVENTORY_MOVEMENT_STATES = ['draft', 'posted', 'completed', 'cancelled'] as const;
export type InventoryMovementState = (typeof INVENTORY_MOVEMENT_STATES)[number];

// ==================== FSM-7 SerialNumber ====================
const SERIAL_NUMBER_STATES = ['pending', 'assigned', 'used', 'archived'] as const;
export type SerialNumberState = (typeof SERIAL_NUMBER_STATES)[number];

// ============================================================================
// ListResponse 泛型包装（通用分页响应）
// ============================================================================
export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ============================================================================
// E-1 Warehouse（仓库）
// ============================================================================

export interface WarehouseDto {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  address: string | null;
  contact: string | null;
  phone: string | null;
  manager: string | null;
  status: string;
  total_capacity: number | null;
  used_capacity: number | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateWarehouseDto {
  code: string;
  name: string;
  address?: string | null;
  contact?: string | null;
  phone?: string | null;
  manager?: string | null;
  status?: string;
  total_capacity?: number | null;
  description?: string | null;
  created_by?: string;
}

interface UpdateWarehouseDto {
  name?: string;
  address?: string | null;
  contact?: string | null;
  phone?: string | null;
  manager?: string | null;
  status?: string;
  total_capacity?: number | null;
  description?: string | null;
}

// ============================================================================
// E-2 Location（库位）
// ============================================================================

export interface LocationDto {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  warehouse_name: string | null;
  code: string;
  name: string;
  zone_id: string | null;
  zone_name: string | null;
  aisle: string | null;
  row: string | null;
  column: string | null;
  layer: string | null;
  location_type: string;
  storage_type: string | null;
  capacity: number | null;
  occupied_quantity: number | null;
  available_capacity: number | null;
  volume: number | null;
  occupied_volume: number | null;
  weight_limit: number | null;
  current_weight: number | null;
  status: string;
  temperature_zone: string | null;
  is_active: boolean;
  barcode: string | null;
  rfid: string | null;
  sort_order: number | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateLocationDto {
  warehouse_id: string;
  code: string;
  name: string;
  zone_id?: string | null;
  aisle?: string | null;
  row?: string | null;
  column?: string | null;
  layer?: string | null;
  location_type: string;
  storage_type?: string | null;
  capacity?: number | null;
  volume?: number | null;
  weight_limit?: number | null;
  status?: string;
  temperature_zone?: string | null;
  is_active?: boolean;
  barcode?: string | null;
  rfid?: string | null;
  sort_order?: number | null;
  remarks?: string | null;
}

interface UpdateLocationDto {
  name?: string;
  zone_id?: string | null;
  aisle?: string | null;
  row?: string | null;
  column?: string | null;
  layer?: string | null;
  location_type?: string;
  storage_type?: string | null;
  capacity?: number | null;
  volume?: number | null;
  weight_limit?: number | null;
  status?: string;
  temperature_zone?: string | null;
  is_active?: boolean;
  barcode?: string | null;
  rfid?: string | null;
  sort_order?: number | null;
  remarks?: string | null;
}

// ============================================================================
// E-3 InboundOrder + InboundOrderItem（入库单）
// ============================================================================

export interface InboundOrderDto {
  id: string;
  tenant_id: string;
  order_number: string;
  order_type: string;
  warehouse_id: string;
  warehouse_name: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  expected_date: string | null;
  actual_date: string | null;
  status: InboundOrderState | string;
  total_amount: number | null;
  total_quantity: number | null;
  received_quantity: number | null;
  remarks: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateInboundOrderDto {
  order_number: string;
  order_type: string;
  warehouse_id: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
  expected_date?: string | null;
  remarks?: string | null;
  items: CreateInboundOrderItemDto[];
  created_by?: string;
}

interface UpdateInboundOrderDto {
  order_type?: string;
  warehouse_id?: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
  expected_date?: string | null;
  remarks?: string | null;
  items?: CreateInboundOrderItemDto[];
  status?: InboundOrderState | string;
}

interface InboundOrderItemDto {
  id: string;
  tenant_id: string;
  order_id: string;
  line_number: number;
  material_code: string;
  material_name: string;
  specification: string | null;
  batch_number: string | null;
  location_id: string | null;
  location_code: string | null;
  unit: string;
  expected_quantity: number;
  received_quantity: number;
  unit_price: number | null;
  total_amount: number | null;
  status: string;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateInboundOrderItemDto {
  material_code: string;
  material_name: string;
  specification?: string | null;
  batch_number?: string | null;
  location_id?: string | null;
  unit: string;
  expected_quantity: number;
  unit_price?: number | null;
  remarks?: string | null;
}

interface UpdateInboundOrderItemDto {
  received_quantity?: number;
  location_id?: string | null;
  batch_number?: string | null;
  status?: string;
  remarks?: string | null;
}

// ============================================================================
// E-4 OutboundOrder + OutboundOrderItem（出库单）
// ============================================================================

export interface OutboundOrderDto {
  id: string;
  tenant_id: string;
  order_number: string;
  order_type: string;
  warehouse_id: string;
  warehouse_name: string | null;
  customer_id: string | null;
  customer_name: string | null;
  shipping_address: string | null;
  expected_date: string | null;
  expected_delivery: string | null;
  actual_delivery: string | null;
  order_date: string | null;
  status: OutboundOrderState | string;
  total_amount: number | null;
  total_quantity: number | null;
  picked_quantity: number | null;
  shipped_quantity: number | null;
  remarks: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  carrier: string | null;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateOutboundOrderDto {
  order_number: string;
  order_type: string;
  warehouse_id: string;
  customer_id?: string | null;
  customer_name?: string | null;
  shipping_address?: string | null;
  expected_date?: string | null;
  order_date?: string | null;
  expected_delivery?: string | null;
  total_amount?: number | null;
  remarks?: string | null;
  items: CreateOutboundOrderItemDto[];
  created_by?: string;
}

interface UpdateOutboundOrderDto {
  order_type?: string;
  warehouse_id?: string;
  customer_id?: string | null;
  customer_name?: string | null;
  shipping_address?: string | null;
  expected_date?: string | null;
  order_date?: string | null;
  expected_delivery?: string | null;
  total_amount?: number | null;
  remarks?: string | null;
  items?: CreateOutboundOrderItemDto[];
  status?: OutboundOrderState | string;
  carrier?: string | null;
  tracking_number?: string | null;
}

interface OutboundOrderItemDto {
  id: string;
  tenant_id: string;
  order_id: string;
  line_number: number;
  material_code: string;
  material_name: string;
  specification: string | null;
  batch_number: string | null;
  location_id: string | null;
  location_code: string | null;
  unit: string;
  requested_quantity: number;
  picked_quantity: number;
  shipped_quantity: number;
  unit_price: number | null;
  total_amount: number | null;
  status: string;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateOutboundOrderItemDto {
  material_code: string;
  material_name: string;
  specification?: string | null;
  batch_number?: string | null;
  location_id?: string | null;
  unit: string;
  requested_quantity: number;
  unit_price?: number | null;
  remarks?: string | null;
}

interface UpdateOutboundOrderItemDto {
  picked_quantity?: number;
  shipped_quantity?: number;
  location_id?: string | null;
  batch_number?: string | null;
  status?: string;
  remarks?: string | null;
}

// ============================================================================
// E-5 StockTake + StockTakeItem（盘点单）
// ============================================================================

export interface StockTakeDto {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  warehouse_name: string | null;
  location_id: string | null;
  location_code: string | null;
  location_name: string | null;
  stock_take_number: string;
  stock_take_type: string;
  status: StockTakeState | string;
  planned_date: string | null;
  actual_date: string | null;
  total_items: number | null;
  counted_items: number | null;
  discrepancy_items: number | null;
  total_quantity: number | null;
  counted_quantity: number | null;
  discrepancy_quantity: number | null;
  discrepancy_value: number | null;
  accuracy_rate: number | null;
  approval_status: string | null;
  adjustment_status: string | null;
  remarks: string | null;
  stock_adjusted: boolean | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  counter: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateStockTakeDto {
  stock_take_number: string;
  warehouse_id: string;
  location_id?: string | null;
  stock_take_type?: string;
  planned_date?: string | null;
  remarks?: string | null;
  created_by?: string;
}

interface UpdateStockTakeDto {
  location_id?: string | null;
  stock_take_type?: string;
  planned_date?: string | null;
  actual_date?: string | null;
  remarks?: string | null;
  status?: StockTakeState | string;
  counter?: string | null;
}

interface StockTakeItemDto {
  id: string;
  tenant_id: string;
  stock_take_id: string;
  line_number: number;
  material_code: string;
  material_name: string;
  specification: string | null;
  batch_number: string | null;
  location_id: string | null;
  location_code: string | null;
  location_name: string | null;
  system_quantity: number;
  counted_quantity: number | null;
  discrepancy_quantity: number | null;
  discrepancy_type: string | null;
  unit: string;
  unit_price: number | null;
  discrepancy_value: number | null;
  quality_status: string | null;
  counter: string | null;
  counting_time: string | null;
  recount_required: boolean | null;
  recount_quantity: number | null;
  discrepancy_reason: string | null;
  discrepancy_notes: string | null;
  adjustment_required: boolean | null;
  adjustment_quantity: number | null;
  adjustment_status: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateStockTakeItemDto {
  material_code: string;
  material_name: string;
  specification?: string | null;
  batch_number?: string | null;
  location_id?: string | null;
  system_quantity: number;
  unit: string;
  unit_price?: number | null;
}

interface CountStockTakeItemDto {
  counted_quantity: number;
  discrepancy_reason?: string | null;
  remarks?: string | null;
  counter?: string | null;
}

// ============================================================================
// E-6 TransferOrder + TransferOrderItem（调拨单）
// ============================================================================

export interface TransferOrderDto {
  id: string;
  tenant_id: string;
  order_number: string;
  transfer_type: string;
  from_warehouse_id: string;
  from_warehouse_name: string | null;
  from_location_id: string | null;
  from_location_code: string | null;
  to_warehouse_id: string;
  to_warehouse_name: string | null;
  to_location_id: string | null;
  to_location_code: string | null;
  status: TransferOrderState | string;
  total_quantity: number | null;
  total_amount: number | null;
  planned_date: string | null;
  actual_date: string | null;
  transporter: string | null;
  tracking_number: string | null;
  priority: string | null;
  remarks: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  shipped_by: string | null;
  shipped_at: string | null;
  received_by: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateTransferOrderDto {
  order_number: string;
  transfer_type?: string;
  from_warehouse_id: string;
  from_location_id?: string | null;
  to_warehouse_id: string;
  to_location_id?: string | null;
  planned_date?: string | null;
  transporter?: string | null;
  priority?: string | null;
  remarks?: string | null;
  items: CreateTransferOrderItemDto[];
  created_by?: string;
}

interface UpdateTransferOrderDto {
  transfer_type?: string;
  from_location_id?: string | null;
  to_location_id?: string | null;
  planned_date?: string | null;
  transporter?: string | null;
  tracking_number?: string | null;
  priority?: string | null;
  remarks?: string | null;
  items?: CreateTransferOrderItemDto[];
  status?: TransferOrderState | string;
}

interface TransferOrderItemDto {
  id: string;
  tenant_id: string;
  transfer_id: string;
  line_number: number;
  sku: string;
  material_name: string;
  specification: string | null;
  batch_number: string | null;
  unit: string;
  planned_quantity: number;
  shipped_quantity: number;
  received_quantity: number;
  unit_price: number | null;
  total_amount: number | null;
  from_location_id: string | null;
  to_location_id: string | null;
  status: string;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateTransferOrderItemDto {
  sku: string;
  material_name: string;
  specification?: string | null;
  batch_number?: string | null;
  unit: string;
  planned_quantity: number;
  unit_price?: number | null;
  from_location_id?: string | null;
  to_location_id?: string | null;
}

// ============================================================================
// E-7 WavePick + WavePickItem（波次拣货）
// ============================================================================

export interface WavePickDto {
  id: string;
  tenant_id: string;
  wave_pick_number: string;
  wave_pick_type: string;
  warehouse_id: string;
  warehouse_name: string | null;
  status: WavePickState | string;
  priority: string | null;
  assigned_to: string | null;
  assigned_user_name: string | null;
  batch_id: string | null;
  start_time: string | null;
  end_time: string | null;
  total_items: number | null;
  picked_items: number | null;
  total_quantity: number | null;
  picked_quantity: number | null;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateWavePickDto {
  wave_pick_number: string;
  wave_pick_type: string;
  warehouse_id: string;
  priority?: string | null;
  batch_id?: string | null;
  remarks?: string | null;
  created_by?: string;
}

interface UpdateWavePickDto {
  wave_pick_type?: string;
  priority?: string | null;
  assigned_to?: string | null;
  batch_id?: string | null;
  remarks?: string | null;
  status?: WavePickState | string;
}

interface AssignWavePickDto {
  assigned_to: string;
}

interface WavePickItemDto {
  id: string;
  tenant_id: string;
  wave_pick_id: string;
  outbound_order_id: string | null;
  outbound_order_number: string | null;
  material_code: string;
  material_name: string;
  location_id: string | null;
  location_code: string | null;
  planned_quantity: number;
  picked_quantity: number;
  status: string;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// E-8 InventoryMovement（库存移动）
// ============================================================================

export interface InventoryMovementDto {
  id: string;
  tenant_id: string;
  movement_number: string;
  movement_type: string;
  warehouse_id: string;
  warehouse_name: string | null;
  source_location_id: string | null;
  source_location_code: string | null;
  target_location_id: string | null;
  target_location_code: string | null;
  status: InventoryMovementState | string;
  total_quantity: number | null;
  material_code: string | null;
  material_name: string | null;
  batch_number: string | null;
  serial_number: string | null;
  quantity: number | null;
  unit: string | null;
  reason: string | null;
  remarks: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  posted_by: string | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateInventoryMovementDto {
  movement_number: string;
  movement_type: string;
  warehouse_id: string;
  source_location_id?: string | null;
  target_location_id?: string | null;
  material_code?: string | null;
  material_name?: string | null;
  batch_number?: string | null;
  serial_number?: string | null;
  quantity?: number | null;
  unit?: string | null;
  reason?: string | null;
  remarks?: string | null;
  created_by?: string;
}

interface UpdateInventoryMovementDto {
  movement_type?: string;
  source_location_id?: string | null;
  target_location_id?: string | null;
  reason?: string | null;
  remarks?: string | null;
  status?: InventoryMovementState | string;
}

// ============================================================================
// E-9 InventoryItem + InventoryAlert（库存项）
// ============================================================================

export interface InventoryItemDto {
  id: string;
  tenant_id: string;
  sku: string;
  name: string;
  specification: string | null;
  unit: string;
  quantity: number;
  available_quantity: number;
  reserved_quantity: number | null;
  location_id: string;
  location_code: string | null;
  warehouse_id: string;
  warehouse_name: string | null;
  min_quantity: number | null;
  max_quantity: number | null;
  reorder_point: number | null;
  status: string;
  batch_number: string | null;
  lot_number: string | null;
  expiry_date: string | null;
  supplier_name: string | null;
  supplier_code: string | null;
  purchase_price: number | null;
  total_value: number | null;
  last_movement_date: string | null;
  last_movement_type: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateInventoryItemDto {
  warehouse_id: string;
  location_id: string;
  sku: string;
  name: string;
  specification?: string | null;
  quantity: number;
  unit: string;
  min_quantity?: number | null;
  max_quantity?: number | null;
  reorder_point?: number | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  purchase_price?: number | null;
}

interface UpdateInventoryItemDto {
  warehouse_id?: string;
  location_id?: string;
  sku?: string;
  name?: string;
  specification?: string | null;
  quantity?: number;
  unit?: string;
  min_quantity?: number | null;
  max_quantity?: number | null;
  reorder_point?: number | null;
  status?: string;
  batch_number?: string | null;
  expiry_date?: string | null;
}

interface InventoryAlertDto {
  id: string;
  tenant_id: string;
  rule_id: string | null;
  rule_name: string | null;
  alert_type: string;
  alert_level: string;
  warehouse_id: string | null;
  warehouse_name: string | null;
  sku: string | null;
  material_name: string | null;
  location_id: string | null;
  location_code: string | null;
  current_quantity: number | null;
  threshold_quantity: number | null;
  expiry_date: string | null;
  alert_message: string;
  status: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  confirmation_notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// E-10 SerialNumber（序列号）
// ============================================================================

export interface SerialNumberDto {
  id: string;
  tenant_id: string;
  serial_no: string;
  sku: string;
  material_name: string;
  specification: string | null;
  unit: string | null;
  warehouse_id: string;
  warehouse_name: string | null;
  location_id: string | null;
  location_code: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  batch_no: string | null;
  production_date: string | null;
  expiry_date: string | null;
  quality_status: string;
  status: SerialNumberState | string;
  warranty_start_date: string | null;
  warranty_end_date: string | null;
  inbound_order_no: string | null;
  outbound_order_no: string | null;
  current_owner: string | null;
  unit_price: number | null;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateSerialNumberDto {
  serial_no: string;
  sku: string;
  material_name: string;
  specification?: string | null;
  unit?: string | null;
  warehouse_id: string;
  location_id?: string | null;
  supplier_id?: string | null;
  batch_no?: string | null;
  production_date?: string | null;
  expiry_date?: string | null;
  quality_status?: string;
  warranty_start_date?: string | null;
  warranty_end_date?: string | null;
  unit_price?: number | null;
  remark?: string | null;
}

interface UpdateSerialNumberDto {
  location_id?: string | null;
  quality_status?: string;
  status?: SerialNumberState | string;
  warranty_start_date?: string | null;
  warranty_end_date?: string | null;
  current_owner?: string | null;
  remark?: string | null;
}

// ============================================================================
// E-11 Batch（批次）
// ============================================================================

export interface BatchDto {
  id: string;
  tenant_id: string;
  batch_no: string;
  sku: string;
  material_name: string;
  specification: string | null;
  unit: string | null;
  quantity: number;
  available_quantity: number;
  warehouse_id: string;
  warehouse_name: string | null;
  location_id: string | null;
  location_code: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  production_date: string | null;
  expiry_date: string | null;
  receipt_date: string | null;
  quality_status: string;
  status: string;
  manufacture_date: string | null;
  shelf_life_days: number | null;
  remaining_days: number | null;
  unit_price: number | null;
  total_value: number | null;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateBatchDto {
  batch_no: string;
  sku: string;
  material_name: string;
  specification?: string | null;
  unit?: string | null;
  quantity: number;
  warehouse_id: string;
  location_id?: string | null;
  supplier_id?: string | null;
  production_date?: string | null;
  expiry_date?: string | null;
  receipt_date?: string | null;
  quality_status?: string;
  manufacture_date?: string | null;
  shelf_life_days?: number | null;
  unit_price?: number | null;
  remark?: string | null;
}

interface UpdateBatchDto {
  quantity?: number;
  location_id?: string | null;
  quality_status?: string;
  status?: string;
  expiry_date?: string | null;
  remark?: string | null;
}

// ============================================================================
// E-12 CycleCountTask（循环盘点任务）
// ============================================================================

interface CycleCountTaskDto {
  id: string;
  tenant_id: string;
  task_number: string;
  cycle_count_plan_id: string | null;
  warehouse_id: string;
  warehouse_name: string | null;
  location_id: string | null;
  location_code: string | null;
  location_name: string | null;
  count_type: string;
  cycle_code: string;
  frequency: string;
  status: string;
  scheduled_date: string | null;
  actual_date: string | null;
  total_items: number | null;
  counted_items: number | null;
  discrepancy_items: number | null;
  accuracy_rate: number | null;
  assignee: string | null;
  assignee_name: string | null;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateCycleCountTaskDto {
  task_number: string;
  warehouse_id: string;
  location_id?: string | null;
  count_type?: string;
  cycle_code?: string;
  frequency?: string;
  scheduled_date?: string | null;
  assignee?: string | null;
  remarks?: string | null;
  created_by?: string;
}

interface UpdateCycleCountTaskDto {
  count_type?: string;
  cycle_code?: string;
  frequency?: string;
  scheduled_date?: string | null;
  actual_date?: string | null;
  assignee?: string | null;
  remarks?: string | null;
  status?: string;
}
