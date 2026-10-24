import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  ApprovalActionRequest,
  InboundOrder,
  OutboundOrder,
  StockTake,
  TransferOrder,
} from './types';
import { inventoryApi, inventoryAlertsApi, inventoryStatsApi } from './inventory';
import { wmsDashboardApi } from './dashboard';
import { warehouseApi } from './warehouse';
import { locationApi } from './location';
import { inboundOrderApi } from './inbound';
import { outboundOrderApi } from './outbound';
import { wavePickApi } from './wavePick';
import { stockTakeApi } from './stocktake';
import { cycleCountApi } from './cycleCount';
import { discrepancyApi } from './discrepancy';
import { transferApi } from './transfer';
import { smartReplenishmentApi } from './replenishment';
import { syncRecordApi, syncApi } from './sync';
import { auditLogApi } from './audit';
import { batchApi } from './batch';
import { serialNumberApi } from './serialNumber';
import { inventoryAlertApi } from './inventoryAlert';
import { inventoryMovementApi } from './inventoryMovement';
import { advancedReplenishmentApi } from './smartReplenishment';
import { slottingApi } from './slotting';
import { laborApi } from './labor';
import { pickingApi } from './picking';
import { wmsAnalyticsApi } from './analytics';

export * from './types';

export { inventoryApi } from './inventory';
export { wmsDashboardApi } from './dashboard';
export * from './inventory';

export { warehouseApi } from './warehouse';
export * from './warehouse';

export { locationApi } from './location';
export * from './location';

export { inboundOrderApi } from './inbound';
export * from './inbound';

export * from './outbound';

export * from './wavePick';

export * from './stocktake';

export { cycleCountApi } from './cycleCount';
export * from './cycleCount';

export { discrepancyApi } from './discrepancy';
export * from './discrepancy';

export * from './transfer';

export * from './replenishment';

export { syncRecordApi, syncApi } from './sync';
export * from './sync';

export { auditLogApi } from './audit';
export * from './audit';

export { batchApi } from './batch';
export * from './batch';

export * from './serialNumber';

export type {
  InventoryAlert,
  AlertSummary,
  AlertStatistics,
  InventoryAlertRule,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
  InventoryAlertRecord,
  AlertQueryParams,
} from './inventoryAlert';

export type {
  InventoryMovement,
  CreateInventoryMovementRequest,
  InventoryMovementQueryParams,
} from './inventoryMovement';

export type {
  SlottingSuggestion,
  SlottingZone,
  SlottingRule,
  SlottingImpactAnalysis,
  SlottingStrategy,
} from './slotting';

export type {
  LaborEfficiency,
  ProductivityMetric,
  Workload,
  PerformanceDashboard,
  Shift,
} from './labor';

export type {
  PickingTask,
  PickingTaskLine,
  PickingList,
  PickingStrategyConfig,
  PickingStatistics,
  PickingTaskStatus,
  PickingStrategy,
  ShortPickReason,
  CreatePickingTaskRequest,
  AssignPickingTaskRequest,
  PickLineRequest,
  ShortPickLineRequest,
  CreatePickingListRequest,
  CreatePickingStrategyRequest,
} from './picking';

export type {
  AnalyticsQueryParams,
  InventoryTurnoverSummary,
  InventoryTurnoverResponse,
  WmsOrderFulfillmentData,
  WmsOrderFulfillmentSummary,
  WmsOrderFulfillmentResponse,
} from './analytics';

export const wmsApi = {
  dashboard: wmsDashboardApi,
  inventory: inventoryApi,
  inboundOrders: inboundOrderApi,
  outboundOrders: outboundOrderApi,
  stockTakes: stockTakeApi,
  cycleCounts: cycleCountApi,
  discrepancies: discrepancyApi,
  warehouses: warehouseApi,
  inventoryAlerts: inventoryAlertsApi,
  smartReplenishment: smartReplenishmentApi,
  locations: locationApi,
  transfers: transferApi,
  syncRecords: syncRecordApi,
  sync: syncApi,
  auditLogs: auditLogApi,
  inventoryStats: inventoryStatsApi,
  wavePicks: wavePickApi,
  batches: batchApi,
  serialNumbers: serialNumberApi,
  inventoryAlert: inventoryAlertApi,
  inventoryMovements: inventoryMovementApi,
  advancedReplenishment: advancedReplenishmentApi,
  slotting: slottingApi,
  labor: laborApi,
  picking: pickingApi,
  analytics: wmsAnalyticsApi,
};

// ============================================================================
// 审批端点（4 类实体 × 3 端点 = 12 个调用）
// 走 apiClient.wms（base=/api/wms），路径严格对齐 svc/wms Route：
//   /inbound-orders/${id}/approval/{start,approve,reject}
//   /outbound-orders/${id}/approval/{start,approve,reject}
//   /stock-takes/${id}/approval/{start,approve,reject}
//   /transfers/${id}/approval/{start,approve,reject}（调拨真实命名为 transfers）
// ============================================================================

const approvalEntity = <T>(
  start: (id: string, req?: ApprovalActionRequest) => Promise<ApiResponse<T>>,
  approve: (id: string, req?: ApprovalActionRequest) => Promise<ApiResponse<T>>,
  reject: (id: string, req?: ApprovalActionRequest) => Promise<ApiResponse<T>>
) => ({ start, approve, reject });

export const wmsApprovalApi = {
  inbound: approvalEntity(
    async (id, req) => apiClient.wms.post(`/inbound-orders/${id}/approval/start`, req ?? {}),
    async (id, req) => apiClient.wms.post(`/inbound-orders/${id}/approval/approve`, req ?? {}),
    async (id, req) => apiClient.wms.post(`/inbound-orders/${id}/approval/reject`, req ?? {})
  ) as {
    start: (id: string, req?: ApprovalActionRequest) => Promise<ApiResponse<InboundOrder>>;
    approve: (id: string, req?: ApprovalActionRequest) => Promise<ApiResponse<InboundOrder>>;
    reject: (id: string, req?: ApprovalActionRequest) => Promise<ApiResponse<InboundOrder>>;
  },
  outbound: approvalEntity(
    async (id, req) => apiClient.wms.post(`/outbound-orders/${id}/approval/start`, req ?? {}),
    async (id, req) => apiClient.wms.post(`/outbound-orders/${id}/approval/approve`, req ?? {}),
    async (id, req) => apiClient.wms.post(`/outbound-orders/${id}/approval/reject`, req ?? {})
  ) as {
    start: (id: string, req?: ApprovalActionRequest) => Promise<ApiResponse<OutboundOrder>>;
    approve: (id: string, req?: ApprovalActionRequest) => Promise<ApiResponse<OutboundOrder>>;
    reject: (id: string, req?: ApprovalActionRequest) => Promise<ApiResponse<OutboundOrder>>;
  },
  stockTake: approvalEntity(
    async (id, req) => apiClient.wms.post(`/stock-takes/${id}/approval/start`, req ?? {}),
    async (id, req) => apiClient.wms.post(`/stock-takes/${id}/approval/approve`, req ?? {}),
    async (id, req) => apiClient.wms.post(`/stock-takes/${id}/approval/reject`, req ?? {})
  ) as {
    start: (id: string, req?: ApprovalActionRequest) => Promise<ApiResponse<StockTake>>;
    approve: (id: string, req?: ApprovalActionRequest) => Promise<ApiResponse<StockTake>>;
    reject: (id: string, req?: ApprovalActionRequest) => Promise<ApiResponse<StockTake>>;
  },
  transferOrder: approvalEntity(
    async (id, req) => apiClient.wms.post(`/transfers/${id}/approval/start`, req ?? {}),
    async (id, req) => apiClient.wms.post(`/transfers/${id}/approval/approve`, req ?? {}),
    async (id, req) => apiClient.wms.post(`/transfers/${id}/approval/reject`, req ?? {})
  ) as {
    start: (id: string, req?: ApprovalActionRequest) => Promise<ApiResponse<TransferOrder>>;
    approve: (id: string, req?: ApprovalActionRequest) => Promise<ApiResponse<TransferOrder>>;
    reject: (id: string, req?: ApprovalActionRequest) => Promise<ApiResponse<TransferOrder>>;
  },
};

export { approvalEntity };

export default wmsApi;
