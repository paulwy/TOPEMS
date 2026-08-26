// ============================================================================
// WMS Mock 数据生成器
//
// 参考 apps/web/src/api/qms/_mock.ts 的模式，提供：
// - useWmsMock hook
// - 12 实体的 mock 数据生成函数
// - 6 BI 聚合 mock 数据
// ============================================================================

import { useEffect, useState } from 'react';
import type {
  InboundOrderDto,
  OutboundOrderDto,
  StockTakeDto,
  TransferOrderDto,
  WavePickDto,
  InventoryMovementDto,
  InventoryItemDto,
  SerialNumberDto,
  BatchDto,
  WarehouseDto,
  LocationDto,
} from '@/types/wms';
import i18n from '@/i18n';

// ============================================================================
// Seeded RNG (mulberry32)
// ============================================================================
function mulberry32(seed: number) {
  let t = seed;
  return function () {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rnd: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function int(rnd: () => number, min: number, max: number): number {
  return Math.floor(min + rnd() * (max - min + 1));
}

function isoDate(rnd: () => number, daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(int(rnd, 0, 23), int(rnd, 0, 59), int(rnd, 0, 59));
  return d.toISOString();
}

function isoFutureDate(rnd: () => number, daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(int(rnd, 0, 23), int(rnd, 0, 59), int(rnd, 0, 59));
  return d.toISOString();
}

function uuid(rnd: () => number, prefix: string): string {
  const hex = '0123456789abcdef';
  let s = prefix;
  for (let i = 0; i < 8; i++) s += hex[Math.floor(rnd() * 16)];
  return s;
}

// ============================================================================
// BI 聚合类型
// ============================================================================
export interface TurnoverDatum {
  warehouse: string;
  month: string;
  turnoverRate: number;
  days: number;
}

export interface ParetoDatum {
  sku: string;
  amount: number;
  cumulative: number;
}

export interface FlowDatum {
  date: string;
  inboundQty: number;
  outboundQty: number;
  net: number;
}

export interface AbcCategory {
  category: 'A' | 'B' | 'C';
  count: number;
  amount: number;
  percent: number;
}

export interface LocationDatum {
  area: string;
  utilization: number;
  vacancy: number;
  deadStock: number;
}

export interface FulfillmentDatum {
  warehouse: string;
  onTimeRate: number;
  avgHours: number;
  slaPass: number;
}

// ============================================================================
// WMS Mock 数据形状
// ============================================================================
export interface WmsMockShape {
  inboundList: InboundOrderDto[];
  outboundList: OutboundOrderDto[];
  stockTakeList: StockTakeDto[];
  transferList: TransferOrderDto[];
  wavePickList: WavePickDto[];
  movementList: InventoryMovementDto[];
  inventoryList: InventoryItemDto[];
  serialList: SerialNumberDto[];
  batchList: BatchDto[];
  warehouseList: WarehouseDto[];
  locationList: LocationDto[];
  turnover: TurnoverDatum[];
  agePareto: ParetoDatum[];
  flowTrend: FlowDatum[];
  abcAnalysis: AbcCategory[];
  locationUtil: LocationDatum[];
  fulfillment: FulfillmentDatum[];
}

// ============================================================================
// 静态选项池
// ============================================================================
const WAREHOUSE_NAMES = [
  i18n.t('shared._mock.k4'),
  i18n.t('shared._mock.k3'),
  i18n.t('shared._mock.k2'),
  i18n.t('shared._mock.k1'),
  i18n.t('shared._mock.k0'),
] as const;
const WAREHOUSE_CODES = ['WH-EAST', 'WH-SOUTH', 'WH-NORTH', 'WH-WEST', 'WH-CENTER'] as const;
const INBOUND_STATUSES = ['created', 'confirmed', 'received', 'completed', 'cancelled'] as const;
const OUTBOUND_STATUSES = [
  'created',
  'confirmed',
  'picking',
  'packing',
  'shipping',
  'completed',
  'cancelled',
] as const;
const STOCKTAKE_STATUSES = ['planned', 'in_progress', 'completed', 'cancelled'] as const;
const TRANSFER_STATUSES = [
  'pending',
  'confirmed',
  'shipped',
  'received',
  'completed',
  'cancelled',
] as const;
const WAVEPICK_STATUSES = ['created', 'assigned', 'picking', 'completed', 'cancelled'] as const;
const MOVEMENT_STATUSES = ['draft', 'posted', 'completed', 'cancelled'] as const;
const SERIAL_STATUSES = ['pending', 'assigned', 'used', 'archived'] as const;
const MATERIALS = [
  { code: 'MAT-001', name: i18n.t('shared._mock.a_6'), unit: i18n.t('shared._mock.k5') },
  { code: 'MAT-002', name: i18n.t('shared._mock.b_8'), unit: i18n.t('shared._mock.k7') },
  { code: 'MAT-003', name: i18n.t('shared._mock.c_10'), unit: i18n.t('shared._mock.k9') },
  { code: 'MAT-004', name: i18n.t('shared._mock.d_12'), unit: i18n.t('shared._mock.k11') },
  { code: 'MAT-005', name: i18n.t('shared._mock.e_14'), unit: i18n.t('shared._mock.k13') },
  { code: 'MAT-006', name: i18n.t('shared._mock.f_16'), unit: i18n.t('shared._mock.k15') },
  { code: 'MAT-007', name: i18n.t('shared._mock.g_18'), unit: i18n.t('shared._mock.k17') },
  { code: 'MAT-008', name: i18n.t('shared._mock.h_20'), unit: i18n.t('shared._mock.k19') },
] as const;
const SUPPLIERS = [
  i18n.t('shared._mock.k25'),
  i18n.t('shared._mock.k24'),
  i18n.t('shared._mock.k23'),
  i18n.t('shared._mock.k22'),
  i18n.t('shared._mock.k21'),
] as const;
const CUSTOMERS = [
  i18n.t('shared._mock.k30'),
  i18n.t('shared._mock.k29'),
  i18n.t('shared._mock.k28'),
  i18n.t('shared._mock.k27'),
  i18n.t('shared._mock.k26'),
] as const;
const LOCATION_AREAS = [
  i18n.t('shared._mock.k36'),
  i18n.t('shared._mock.k35'),
  i18n.t('shared._mock.k34'),
  i18n.t('shared._mock.k33'),
  i18n.t('shared._mock.k32'),
  i18n.t('shared._mock.k31'),
] as const;
const ZONES = [
  i18n.t('shared._mock.a_3'),
  i18n.t('shared._mock.b_2'),
  i18n.t('shared._mock.c_1'),
  i18n.t('shared._mock.d_0'),
] as const;

// ============================================================================
// 实体 mock 构建函数
// ============================================================================

function buildWarehouses(rnd: () => number, count: number): WarehouseDto[] {
  return WAREHOUSE_NAMES.slice(0, count).map((name, i) => {
    const createdAt = isoDate(rnd, int(rnd, 90, 365));
    return {
      id: uuid(rnd, 'wh-'),
      tenant_id: 'tenant-demo',
      code: WAREHOUSE_CODES[i],
      name,
      address: `${[i18n.t('shared._mock.k41'), i18n.t('shared._mock.k40'), i18n.t('shared._mock.k39'), i18n.t('shared._mock.k38'), i18n.t('shared._mock.k37')][i]}${i18n.t('shared._mock.xx_4')}${i + 1}${i18n.t('shared._mock.k5')}`,
      contact: `${i18n.t('shared._mock.k6')}${i + 1}`,
      phone: `1380000${String(1000 + i).padStart(4, '0')}`,
      manager: `${i18n.t('shared._mock.k7')}${i + 1}`,
      status: 'active',
      total_capacity: 10000 + i * 2000,
      used_capacity: 6000 + i * 1000,
      description: `${name}${i18n.t('shared._mock.k8')}${[i18n.t('shared._mock.k46'), i18n.t('shared._mock.k45'), i18n.t('shared._mock.k44'), i18n.t('shared._mock.k43'), i18n.t('shared._mock.k42')][i]}${i18n.t('shared._mock.k9')}`,
      created_by: 'system',
      created_at: createdAt,
      updated_at: isoDate(rnd, int(rnd, 0, 30)),
    };
  });
}

function buildLocations(
  rnd: () => number,
  count: number,
  warehouses: WarehouseDto[]
): LocationDto[] {
  return Array.from({ length: count }, (_, i) => {
    const wh = pick(rnd, warehouses);
    const zone = pick(rnd, ZONES);
    const aisle = String.fromCharCode(65 + int(rnd, 0, 5));
    const row = String(int(rnd, 1, 20));
    const col = String(int(rnd, 1, 10)).padStart(2, '0');
    const layer = String(int(rnd, 1, 4));
    const capacity = int(rnd, 100, 1000);
    const used = int(rnd, 30, capacity);
    return {
      id: uuid(rnd, 'loc-'),
      tenant_id: 'tenant-demo',
      warehouse_id: wh.id,
      warehouse_name: wh.name,
      code: `${wh.code}-${zone}-${aisle}${row}-${col}-${layer}`,
      name: `${zone}${aisle}${row}${i18n.t('shared._mock.k10')}${col}${i18n.t('shared._mock.k11')}${layer}${i18n.t('shared._mock.k12')}`,
      zone_id: uuid(rnd, 'zone-'),
      zone_name: zone,
      aisle,
      row,
      column: col,
      layer,
      location_type: pick(rnd, ['storage', 'picking', 'staging', 'quality']),
      storage_type: pick(rnd, ['pallet', 'shelf', 'bin', 'bulk']),
      capacity,
      occupied_quantity: used,
      available_capacity: capacity - used,
      volume: capacity * 2,
      occupied_volume: used * 2,
      weight_limit: capacity * 50,
      current_weight: used * 50,
      status: 'active',
      temperature_zone: pick(rnd, ['normal', 'cool', 'frozen', null]),
      is_active: rnd() > 0.1,
      barcode: `BC${String(i + 1).padStart(6, '0')}`,
      rfid: rnd() > 0.5 ? `RFID${String(i + 1).padStart(8, '0')}` : null,
      sort_order: i,
      remarks: null,
      created_at: isoDate(rnd, int(rnd, 60, 300)),
      updated_at: isoDate(rnd, int(rnd, 0, 15)),
    };
  });
}

function buildInboundOrders(
  rnd: () => number,
  count: number,
  warehouses: WarehouseDto[]
): InboundOrderDto[] {
  return Array.from({ length: count }, (_, i) => {
    const wh = pick(rnd, warehouses);
    const qty = int(rnd, 10, 500);
    const recv = pick(rnd, [0, Math.floor(qty * 0.5), qty]);
    const created = isoDate(rnd, int(rnd, 1, 60));
    return {
      id: uuid(rnd, 'ib-'),
      tenant_id: 'tenant-demo',
      order_number: `IN${new Date().getFullYear()}${String(i + 1).padStart(6, '0')}`,
      order_type: pick(rnd, ['purchase', 'return', 'transfer', 'other']),
      warehouse_id: wh.id,
      warehouse_name: wh.name,
      supplier_id: uuid(rnd, 'sup-'),
      supplier_name: pick(rnd, SUPPLIERS),
      expected_date: isoFutureDate(rnd, int(rnd, 0, 10)),
      actual_date: rnd() > 0.5 ? isoDate(rnd, int(rnd, 0, 5)) : null,
      status: pick(rnd, INBOUND_STATUSES),
      total_amount: Math.round(qty * (50 + rnd() * 500) * 100) / 100,
      total_quantity: qty,
      received_quantity: recv,
      remarks: rnd() > 0.7 ? i18n.t('shared._mock.k47') : null,
      created_by: `${i18n.t('shared._mock.k13')}${int(rnd, 1, 10)}`,
      approved_by: rnd() > 0.5 ? `${i18n.t('shared._mock.k14')}${int(rnd, 1, 5)}` : null,
      approved_at: rnd() > 0.5 ? isoDate(rnd, int(rnd, 0, 3)) : null,
      created_at: created,
      updated_at: isoDate(rnd, int(rnd, 0, 10)),
    };
  });
}

function buildOutboundOrders(
  rnd: () => number,
  count: number,
  warehouses: WarehouseDto[]
): OutboundOrderDto[] {
  return Array.from({ length: count }, (_, i) => {
    const wh = pick(rnd, warehouses);
    const qty = int(rnd, 5, 300);
    const picked = pick(rnd, [0, Math.floor(qty * 0.6), qty]);
    const shipped = pick(rnd, [0, Math.floor(picked * 0.8), picked]);
    const created = isoDate(rnd, int(rnd, 1, 60));
    return {
      id: uuid(rnd, 'ob-'),
      tenant_id: 'tenant-demo',
      order_number: `OUT${new Date().getFullYear()}${String(i + 1).padStart(6, '0')}`,
      order_type: pick(rnd, ['sales', 'transfer', 'return', 'other']),
      warehouse_id: wh.id,
      warehouse_name: wh.name,
      customer_id: uuid(rnd, 'cust-'),
      customer_name: pick(rnd, CUSTOMERS),
      shipping_address: `${pick(rnd, [i18n.t('shared._mock.k52'), i18n.t('shared._mock.k51'), i18n.t('shared._mock.k50'), i18n.t('shared._mock.k49'), i18n.t('shared._mock.k48')])}${i18n.t('shared._mock.xxxx_15')}${int(rnd, 1, 999)}${i18n.t('shared._mock.k16')}`,
      expected_date: isoFutureDate(rnd, int(rnd, 1, 15)),
      expected_delivery: isoFutureDate(rnd, int(rnd, 3, 20)),
      actual_delivery: rnd() > 0.6 ? isoDate(rnd, int(rnd, 0, 5)) : null,
      order_date: created,
      status: pick(rnd, OUTBOUND_STATUSES),
      total_amount: Math.round(qty * (100 + rnd() * 1000) * 100) / 100,
      total_quantity: qty,
      picked_quantity: picked,
      shipped_quantity: shipped,
      remarks: rnd() > 0.7 ? i18n.t('shared._mock.k53') : null,
      created_by: `${i18n.t('shared._mock.k17')}${int(rnd, 1, 10)}`,
      approved_by: rnd() > 0.5 ? `${i18n.t('shared._mock.k18')}${int(rnd, 1, 5)}` : null,
      approved_at: rnd() > 0.5 ? isoDate(rnd, int(rnd, 0, 3)) : null,
      carrier: pick(rnd, [
        i18n.t('shared._mock.k58'),
        i18n.t('shared._mock.k57'),
        i18n.t('shared._mock.k56'),
        i18n.t('shared._mock.k55'),
        i18n.t('shared._mock.k54'),
      ]),
      tracking_number: rnd() > 0.4 ? `SF${String(int(rnd, 100000000, 999999999))}` : null,
      created_at: created,
      updated_at: isoDate(rnd, int(rnd, 0, 10)),
    };
  });
}

function buildStockTakes(
  rnd: () => number,
  count: number,
  warehouses: WarehouseDto[]
): StockTakeDto[] {
  return Array.from({ length: count }, (_, i) => {
    const wh = pick(rnd, warehouses);
    const total = int(rnd, 20, 200);
    const counted = Math.floor(total * pick(rnd, [0, 0.5, 0.9, 1]));
    const disc = Math.floor(counted * 0.1);
    const totalQty = int(rnd, 100, 5000);
    const countedQty = Math.floor(totalQty * pick(rnd, [0.9, 0.95, 1, 1.05]));
    return {
      id: uuid(rnd, 'st-'),
      tenant_id: 'tenant-demo',
      warehouse_id: wh.id,
      warehouse_name: wh.name,
      location_id: rnd() > 0.5 ? uuid(rnd, 'loc-') : null,
      location_code: rnd() > 0.5 ? `${pick(rnd, ZONES)}-${int(rnd, 1, 20)}` : null,
      location_name: rnd() > 0.5 ? `${pick(rnd, LOCATION_AREAS)}${int(rnd, 1, 20)}` : null,
      stock_take_number: `ST${new Date().getFullYear()}${String(i + 1).padStart(6, '0')}`,
      stock_take_type: pick(rnd, ['full', 'cycle', 'spot', 'blind']),
      status: pick(rnd, STOCKTAKE_STATUSES),
      planned_date: isoDate(rnd, int(rnd, 0, 20)),
      actual_date: rnd() > 0.4 ? isoDate(rnd, int(rnd, 0, 10)) : null,
      total_items: total,
      counted_items: counted,
      discrepancy_items: disc,
      total_quantity: totalQty,
      counted_quantity: countedQty,
      discrepancy_quantity: Math.abs(totalQty - countedQty),
      discrepancy_value:
        Math.round(Math.abs(totalQty - countedQty) * (50 + rnd() * 200) * 100) / 100,
      accuracy_rate: counted === 0 ? 0 : Math.round(((counted - disc) / counted) * 1000) / 10,
      approval_status: rnd() > 0.5 ? pick(rnd, ['pending', 'approved', 'rejected']) : null,
      adjustment_status: rnd() > 0.5 ? pick(rnd, ['none', 'pending', 'done']) : null,
      remarks:
        rnd() > 0.6
          ? `${pick(rnd, [i18n.t('shared._mock.k61'), i18n.t('shared._mock.k60'), i18n.t('shared._mock.k59')])}${i18n.t('shared._mock.k19')}`
          : null,
      stock_adjusted: rnd() > 0.5,
      created_by: `${i18n.t('shared._mock.k20')}${int(rnd, 1, 10)}`,
      approved_by: rnd() > 0.5 ? `${i18n.t('shared._mock.k21')}${int(rnd, 1, 5)}` : null,
      approved_at: rnd() > 0.5 ? isoDate(rnd, int(rnd, 0, 3)) : null,
      counter: rnd() > 0.5 ? `${i18n.t('shared._mock.k22')}${int(rnd, 1, 10)}` : null,
      created_at: isoDate(rnd, int(rnd, 1, 45)),
      updated_at: isoDate(rnd, int(rnd, 0, 10)),
    };
  });
}

function buildTransfers(
  rnd: () => number,
  count: number,
  warehouses: WarehouseDto[]
): TransferOrderDto[] {
  return Array.from({ length: count }, (_, i) => {
    const from = pick(rnd, warehouses);
    let to = pick(rnd, warehouses);
    while (to.id === from.id) to = pick(rnd, warehouses);
    const qty = int(rnd, 10, 300);
    return {
      id: uuid(rnd, 'tr-'),
      tenant_id: 'tenant-demo',
      order_number: `TR${new Date().getFullYear()}${String(i + 1).padStart(6, '0')}`,
      transfer_type: pick(rnd, ['normal', 'urgent', 'return']),
      from_warehouse_id: from.id,
      from_warehouse_name: from.name,
      from_location_id: rnd() > 0.5 ? uuid(rnd, 'loc-') : null,
      from_location_code: rnd() > 0.5 ? `FROM-${int(rnd, 1, 20)}` : null,
      to_warehouse_id: to.id,
      to_warehouse_name: to.name,
      to_location_id: rnd() > 0.5 ? uuid(rnd, 'loc-') : null,
      to_location_code: rnd() > 0.5 ? `TO-${int(rnd, 1, 20)}` : null,
      status: pick(rnd, TRANSFER_STATUSES),
      total_quantity: qty,
      total_amount: Math.round(qty * (50 + rnd() * 500) * 100) / 100,
      planned_date: isoDate(rnd, int(rnd, 0, 10)),
      actual_date: rnd() > 0.5 ? isoDate(rnd, int(rnd, 0, 5)) : null,
      transporter: pick(rnd, [
        i18n.t('shared._mock.k65'),
        i18n.t('shared._mock.k64'),
        i18n.t('shared._mock.k63'),
        i18n.t('shared._mock.k62'),
      ]),
      tracking_number: rnd() > 0.4 ? `TRK${String(int(rnd, 100000, 999999))}` : null,
      priority: pick(rnd, ['low', 'normal', 'high', 'urgent']),
      remarks: rnd() > 0.6 ? `${from.name} → ${to.name}${i18n.t('shared._mock.k23')}` : null,
      created_by: `${i18n.t('shared._mock.k24')}${int(rnd, 1, 10)}`,
      approved_by: rnd() > 0.5 ? `${i18n.t('shared._mock.k25')}${int(rnd, 1, 5)}` : null,
      approved_at: rnd() > 0.5 ? isoDate(rnd, int(rnd, 0, 3)) : null,
      shipped_by: rnd() > 0.5 ? `${i18n.t('shared._mock.k26')}${int(rnd, 1, 5)}` : null,
      shipped_at: rnd() > 0.5 ? isoDate(rnd, int(rnd, 0, 5)) : null,
      received_by: rnd() > 0.5 ? `${i18n.t('shared._mock.k27')}${int(rnd, 1, 5)}` : null,
      received_at: rnd() > 0.5 ? isoDate(rnd, int(rnd, 0, 2)) : null,
      created_at: isoDate(rnd, int(rnd, 1, 45)),
      updated_at: isoDate(rnd, int(rnd, 0, 10)),
    };
  });
}

function buildWavePicks(
  rnd: () => number,
  count: number,
  warehouses: WarehouseDto[]
): WavePickDto[] {
  return Array.from({ length: count }, (_, i) => {
    const wh = pick(rnd, warehouses);
    const total = int(rnd, 10, 100);
    const picked = Math.floor(total * pick(rnd, [0, 0.3, 0.7, 1]));
    const totalQty = int(rnd, 50, 1000);
    const pickedQty = Math.floor(totalQty * (picked / total || 0));
    return {
      id: uuid(rnd, 'wp-'),
      tenant_id: 'tenant-demo',
      wave_pick_number: `WP${new Date().getFullYear()}${String(i + 1).padStart(6, '0')}`,
      wave_pick_type: pick(rnd, ['order', 'batch', 'zone', 'bulk']),
      warehouse_id: wh.id,
      warehouse_name: wh.name,
      status: pick(rnd, WAVEPICK_STATUSES),
      priority: pick(rnd, ['low', 'normal', 'high']),
      assigned_to: rnd() > 0.3 ? uuid(rnd, 'user-') : null,
      assigned_user_name: rnd() > 0.3 ? `${i18n.t('shared._mock.k28')}${int(rnd, 1, 15)}` : null,
      batch_id: rnd() > 0.5 ? uuid(rnd, 'batch-') : null,
      start_time: rnd() > 0.5 ? isoDate(rnd, int(rnd, 0, 1)) : null,
      end_time: rnd() > 0.7 ? isoDate(rnd, int(rnd, 0, 1)) : null,
      total_items: total,
      picked_items: picked,
      total_quantity: totalQty,
      picked_quantity: pickedQty,
      remarks: rnd() > 0.6 ? `${wh.name}${i18n.t('shared._mock.k29')}` : null,
      created_by: `${i18n.t('shared._mock.k30')}${int(rnd, 1, 5)}`,
      created_at: isoDate(rnd, int(rnd, 1, 30)),
      updated_at: isoDate(rnd, int(rnd, 0, 5)),
    };
  });
}

function buildMovements(
  rnd: () => number,
  count: number,
  warehouses: WarehouseDto[]
): InventoryMovementDto[] {
  return Array.from({ length: count }, (_, i) => {
    const wh = pick(rnd, warehouses);
    return {
      id: uuid(rnd, 'mv-'),
      tenant_id: 'tenant-demo',
      movement_number: `MV${new Date().getFullYear()}${String(i + 1).padStart(6, '0')}`,
      movement_type: pick(rnd, ['transfer', 'adjust', 'putaway', 'picking']),
      warehouse_id: wh.id,
      warehouse_name: wh.name,
      source_location_id: uuid(rnd, 'loc-'),
      source_location_code: `SRC-${int(rnd, 1, 99)}`,
      target_location_id: uuid(rnd, 'loc-'),
      target_location_code: `TGT-${int(rnd, 1, 99)}`,
      status: pick(rnd, MOVEMENT_STATUSES),
      total_quantity: int(rnd, 1, 500),
      material_code: pick(rnd, MATERIALS).code,
      material_name: pick(rnd, MATERIALS).name,
      batch_number: rnd() > 0.5 ? `B${String(int(rnd, 1000, 9999))}` : null,
      serial_number: rnd() > 0.7 ? `SN${String(int(rnd, 100000, 999999))}` : null,
      quantity: int(rnd, 1, 500),
      unit: pick(rnd, [
        i18n.t('shared._mock.k69'),
        i18n.t('shared._mock.k68'),
        i18n.t('shared._mock.k67'),
        i18n.t('shared._mock.k66'),
      ]),
      reason: pick(rnd, [
        i18n.t('shared._mock.k74'),
        i18n.t('shared._mock.k73'),
        i18n.t('shared._mock.k72'),
        i18n.t('shared._mock.k71'),
        i18n.t('shared._mock.k70'),
      ]),
      remarks: rnd() > 0.6 ? i18n.t('shared._mock.k75') : null,
      created_by: `${i18n.t('shared._mock.k31')}${int(rnd, 1, 10)}`,
      approved_by: rnd() > 0.5 ? `${i18n.t('shared._mock.k32')}${int(rnd, 1, 5)}` : null,
      approved_at: rnd() > 0.5 ? isoDate(rnd, int(rnd, 0, 3)) : null,
      posted_by: rnd() > 0.5 ? `${i18n.t('shared._mock.k33')}${int(rnd, 1, 5)}` : null,
      posted_at: rnd() > 0.5 ? isoDate(rnd, int(rnd, 0, 2)) : null,
      created_at: isoDate(rnd, int(rnd, 1, 45)),
      updated_at: isoDate(rnd, int(rnd, 0, 10)),
    };
  });
}

function buildInventory(
  rnd: () => number,
  count: number,
  _warehouses: WarehouseDto[],
  locations: LocationDto[]
): InventoryItemDto[] {
  return Array.from({ length: count }, (_, i) => {
    const mat = MATERIALS[i % MATERIALS.length];
    const loc = pick(rnd, locations);
    const qty = int(rnd, 1, 2000);
    const avail = Math.floor(qty * (0.7 + rnd() * 0.3));
    return {
      id: uuid(rnd, 'inv-'),
      tenant_id: 'tenant-demo',
      sku: mat.code,
      name: mat.name,
      specification: `${['Φ10mm', 'Φ20mm', 'Φ30mm', '5×10cm', '10×20cm'][i % 5]}`,
      unit: mat.unit,
      quantity: qty,
      available_quantity: avail,
      reserved_quantity: qty - avail,
      location_id: loc.id,
      location_code: loc.code,
      warehouse_id: loc.warehouse_id,
      warehouse_name: loc.warehouse_name,
      min_quantity: int(rnd, 10, 100),
      max_quantity: int(rnd, 500, 5000),
      reorder_point: int(rnd, 50, 300),
      status: pick(rnd, ['normal', 'low', 'over', 'expired']),
      batch_number: rnd() > 0.5 ? `B${String(int(rnd, 1000, 9999))}` : null,
      lot_number: rnd() > 0.7 ? `LOT${String(int(rnd, 10000, 99999))}` : null,
      expiry_date: rnd() > 0.5 ? isoFutureDate(rnd, int(rnd, 30, 365)) : null,
      supplier_name: pick(rnd, SUPPLIERS),
      supplier_code: `SUP${String(int(rnd, 100, 999))}`,
      purchase_price: Math.round((10 + rnd() * 500) * 100) / 100,
      total_value: Math.round(qty * (10 + rnd() * 500) * 100) / 100,
      last_movement_date: isoDate(rnd, int(rnd, 0, 60)),
      last_movement_type: pick(rnd, ['inbound', 'outbound', 'transfer', 'movement']),
      created_at: isoDate(rnd, int(rnd, 30, 365)),
      updated_at: isoDate(rnd, int(rnd, 0, 15)),
    };
  });
}

function buildSerials(
  rnd: () => number,
  count: number,
  warehouses: WarehouseDto[]
): SerialNumberDto[] {
  return Array.from({ length: count }, (_, i) => {
    const mat = MATERIALS[i % MATERIALS.length];
    const wh = pick(rnd, warehouses);
    return {
      id: uuid(rnd, 'sn-'),
      tenant_id: 'tenant-demo',
      serial_no: `SN${new Date().getFullYear()}${String(i + 1).padStart(8, '0')}`,
      sku: mat.code,
      material_name: mat.name,
      specification: `${i18n.t('shared._mock.k34')}${i + 1}`,
      unit: mat.unit,
      warehouse_id: wh.id,
      warehouse_name: wh.name,
      location_id: rnd() > 0.5 ? uuid(rnd, 'loc-') : null,
      location_code: rnd() > 0.5 ? `LOC-${int(rnd, 1, 99)}` : null,
      supplier_id: rnd() > 0.5 ? uuid(rnd, 'sup-') : null,
      supplier_name: pick(rnd, SUPPLIERS),
      batch_no: rnd() > 0.5 ? `B${String(int(rnd, 1000, 9999))}` : null,
      production_date: isoDate(rnd, int(rnd, 30, 365)),
      expiry_date: rnd() > 0.5 ? isoFutureDate(rnd, int(rnd, 60, 730)) : null,
      quality_status: pick(rnd, ['qualified', 'pending', 'rejected', 'scrap']),
      status: pick(rnd, SERIAL_STATUSES),
      warranty_start_date: isoDate(rnd, int(rnd, 0, 30)),
      warranty_end_date: isoFutureDate(rnd, int(rnd, 365, 1095)),
      inbound_order_no: rnd() > 0.5 ? `IN${int(rnd, 100000, 999999)}` : null,
      outbound_order_no: rnd() > 0.5 ? `OUT${int(rnd, 100000, 999999)}` : null,
      current_owner: rnd() > 0.5 ? `${i18n.t('shared._mock.k35')}${int(rnd, 1, 20)}` : null,
      unit_price: Math.round((100 + rnd() * 5000) * 100) / 100,
      remark: rnd() > 0.7 ? `${i18n.t('shared._mock.k36')}${i + 1}` : null,
      created_at: isoDate(rnd, int(rnd, 30, 365)),
      updated_at: isoDate(rnd, int(rnd, 0, 30)),
    };
  });
}

function buildBatches(rnd: () => number, count: number, warehouses: WarehouseDto[]): BatchDto[] {
  return Array.from({ length: count }, (_, i) => {
    const mat = MATERIALS[i % MATERIALS.length];
    const wh = pick(rnd, warehouses);
    const qty = int(rnd, 10, 5000);
    const shelfLife = int(rnd, 90, 1095);
    return {
      id: uuid(rnd, 'batch-'),
      tenant_id: 'tenant-demo',
      batch_no: `B${new Date().getFullYear()}${String(i + 1).padStart(6, '0')}`,
      sku: mat.code,
      material_name: mat.name,
      specification: `${i18n.t('shared._mock.k37')}${i + 1}`,
      unit: mat.unit,
      quantity: qty,
      available_quantity: Math.floor(qty * (0.7 + rnd() * 0.3)),
      warehouse_id: wh.id,
      warehouse_name: wh.name,
      location_id: rnd() > 0.5 ? uuid(rnd, 'loc-') : null,
      location_code: rnd() > 0.5 ? `BATCH-${int(rnd, 1, 99)}` : null,
      supplier_id: rnd() > 0.5 ? uuid(rnd, 'sup-') : null,
      supplier_name: pick(rnd, SUPPLIERS),
      production_date: isoDate(rnd, int(rnd, 1, 365)),
      expiry_date: isoFutureDate(rnd, int(rnd, 30, shelfLife)),
      receipt_date: isoDate(rnd, int(rnd, 1, 60)),
      quality_status: pick(rnd, ['qualified', 'pending', 'rejected', 'scrap']),
      status: pick(rnd, ['active', 'quarantined', 'depleted', 'expired']),
      manufacture_date: rnd() > 0.5 ? isoDate(rnd, int(rnd, 1, 365)) : null,
      shelf_life_days: shelfLife,
      remaining_days: int(rnd, 0, shelfLife),
      unit_price: Math.round((10 + rnd() * 500) * 100) / 100,
      total_value: Math.round(qty * (10 + rnd() * 500) * 100) / 100,
      remark:
        rnd() > 0.6 ? `${i18n.t('shared._mock.k38')}${i + 1}${i18n.t('shared._mock.k39')}` : null,
      created_at: isoDate(rnd, int(rnd, 10, 365)),
      updated_at: isoDate(rnd, int(rnd, 0, 30)),
    };
  });
}

// ============================================================================
// 6 BI 聚合构建函数
// ============================================================================

function buildTurnover(rnd: () => number): TurnoverDatum[] {
  const months = [
    '2026-01',
    '2026-02',
    '2026-03',
    '2026-04',
    '2026-05',
    '2026-06',
    '2026-07',
    '2026-08',
  ];
  const result: TurnoverDatum[] = [];
  for (const wh of WAREHOUSE_NAMES.slice(0, 4)) {
    for (const m of months) {
      const rate = Number((2 + rnd() * 6).toFixed(2));
      result.push({
        warehouse: wh,
        month: m,
        turnoverRate: rate,
        days: Number((365 / rate).toFixed(1)),
      });
    }
  }
  return result;
}

function buildAgePareto(rnd: () => number): ParetoDatum[] {
  const skus = MATERIALS.map((m) => m.name);
  const amounts = skus.map(() => Math.round((1000 + rnd() * 50000) * 100) / 100);
  const sorted = skus
    .map((sku, i) => ({ sku, amount: amounts[i] }))
    .sort((a, b) => b.amount - a.amount);
  const total = sorted.reduce((s, c) => s + c.amount, 0) || 1;
  let acc = 0;
  return sorted.map((c) => {
    acc += c.amount;
    return {
      sku: c.sku,
      amount: c.amount,
      cumulative: Number(((acc / total) * 100).toFixed(2)),
    };
  });
}

function buildFlowTrend(rnd: () => number): FlowDatum[] {
  const result: FlowDatum[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const inb = int(rnd, 100, 1000);
    const out = int(rnd, 80, 900);
    result.push({
      date: d.toISOString().slice(5, 10),
      inboundQty: inb,
      outboundQty: out,
      net: inb - out,
    });
  }
  return result;
}

function buildAbcAnalysis(rnd: () => number): AbcCategory[] {
  const aCount = Math.floor(8 * 0.2);
  const bCount = Math.floor(8 * 0.3);
  const cCount = 8 - aCount - bCount;
  const totalAmount = 100000 + rnd() * 400000;
  return [
    { category: 'A', count: aCount, amount: Math.round(totalAmount * 0.7), percent: 70 },
    { category: 'B', count: bCount, amount: Math.round(totalAmount * 0.2), percent: 20 },
    { category: 'C', count: cCount, amount: Math.round(totalAmount * 0.1), percent: 10 },
  ];
}

function buildLocationUtil(rnd: () => number): LocationDatum[] {
  return LOCATION_AREAS.map((area) => {
    const util = 40 + Math.floor(rnd() * 50);
    const vac = 100 - util - Math.floor(rnd() * 15);
    return {
      area,
      utilization: util,
      vacancy: vac,
      deadStock: 100 - util - vac,
    };
  });
}

function buildFulfillment(rnd: () => number): FulfillmentDatum[] {
  return WAREHOUSE_NAMES.slice(0, 4).map((wh) => ({
    warehouse: wh,
    onTimeRate: Number((85 + rnd() * 14).toFixed(1)),
    avgHours: Number((6 + rnd() * 18).toFixed(1)),
    slaPass: Number((88 + rnd() * 11).toFixed(1)),
  }));
}

// ============================================================================
// 主构建器：构建 WMS Mock 全量数据
// ============================================================================
function buildWmsMock(): WmsMockShape {
  const rnd = mulberry32(20260812);
  const warehouses = buildWarehouses(rnd, 5);
  const locations = buildLocations(rnd, 60, warehouses);
  return {
    warehouseList: warehouses,
    locationList: locations,
    inboundList: buildInboundOrders(rnd, 20, warehouses),
    outboundList: buildOutboundOrders(rnd, 20, warehouses),
    stockTakeList: buildStockTakes(rnd, 15, warehouses),
    transferList: buildTransfers(rnd, 15, warehouses),
    wavePickList: buildWavePicks(rnd, 15, warehouses),
    movementList: buildMovements(rnd, 15, warehouses),
    inventoryList: buildInventory(rnd, 40, warehouses, locations),
    serialList: buildSerials(rnd, 30, warehouses),
    batchList: buildBatches(rnd, 25, warehouses),
    turnover: buildTurnover(rnd),
    agePareto: buildAgePareto(rnd),
    flowTrend: buildFlowTrend(rnd),
    abcAnalysis: buildAbcAnalysis(rnd),
    locationUtil: buildLocationUtil(rnd),
    fulfillment: buildFulfillment(rnd),
  };
}

// ============================================================================
// useWmsMock Hook
// ============================================================================
export function useWmsMock<T = WmsMockShape>(enabled = true): { data: T; loading: boolean } {
  const [state, setState] = useState<{ data: T; loading: boolean }>(() => ({
    data: (enabled ? buildWmsMock() : {}) as T,
    loading: false,
  }));

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    const t = setTimeout(() => {
      if (!cancelled) {
        setState({ data: buildWmsMock() as T, loading: false });
      }
    }, 50);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [enabled]);

  return state;
}

export default useWmsMock;
