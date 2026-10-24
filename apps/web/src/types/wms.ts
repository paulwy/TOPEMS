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
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- typeof 类型位置引用（设计性保留）
const INBOUND_ORDER_STATES = [
  'created',
  'confirmed',
  'received',
  'completed',
  'cancelled',
] as const;
export type InboundOrderState = (typeof INBOUND_ORDER_STATES)[number];

// ==================== FSM-2 OutboundOrder ====================
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- typeof 类型位置引用（设计性保留）
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- typeof 类型位置引用（设计性保留）
const STOCK_TAKE_STATES = ['planned', 'in_progress', 'completed', 'cancelled'] as const;
export type StockTakeState = (typeof STOCK_TAKE_STATES)[number];

// ==================== FSM-4 TransferOrder ====================
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- typeof 类型位置引用（设计性保留）
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- typeof 类型位置引用（设计性保留）
const WAVE_PICK_STATES = ['created', 'assigned', 'picking', 'completed', 'cancelled'] as const;
export type WavePickState = (typeof WAVE_PICK_STATES)[number];

// ==================== FSM-6 InventoryMovement ====================
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- typeof 类型位置引用（设计性保留）
const INVENTORY_MOVEMENT_STATES = ['draft', 'posted', 'completed', 'cancelled'] as const;
export type InventoryMovementState = (typeof INVENTORY_MOVEMENT_STATES)[number];

// ==================== FSM-7 SerialNumber ====================
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- typeof 类型位置引用（设计性保留）
const SERIAL_NUMBER_STATES = ['pending', 'assigned', 'used', 'archived'] as const;
export type SerialNumberState = (typeof SERIAL_NUMBER_STATES)[number];

// ============================================================================
// ListResponse 泛型包装（通用分页响应）
// ============================================================================
export type { ListResponse } from '@/api/client';

// ============================================================================
// E-1 Warehouse（仓库）
// ============================================================================
