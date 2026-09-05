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
import { kittingApi } from './kitting';
import { laborApi } from './labor';
import { pickingApi } from './picking';
import { putawayApi } from './putaway';
import { manifestApi } from './manifest';
import apiClient from '../client';
import type { ApprovalStartRequest, ApprovalApproveRequest, ApprovalRejectRequest } from './types';

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
  KittingOrder,
  BillOfMaterials,
  CreateKittingOrderRequest,
  KittingStatus,
} from './kitting';

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
  PutawayPlan,
  PutawayPlanItem,
  PutawaySuggestion,
  PutawayRule,
  PutawayTask,
  PutawayStatistics,
  PutawayPlanStatus,
  PutawayStrategy,
  PutawayTaskStatus,
  CreatePutawayPlanRequest,
  ExecutePutawayPlanRequest,
  ConfirmPutawayItemRequest,
  CreatePutawayRuleRequest,
  CreatePutawayTaskRequest,
} from './putaway';

export type {
  Manifest,
  ManifestItem,
  Carrier,
  ManifestLabel,
  ManifestStatistics,
  ManifestStatus,
  CarrierType,
  LabelStatus,
  CreateManifestRequest,
  UpdateManifestRequest,
  AddManifestItemRequest,
  BatchCreateManifestRequest,
  CreateCarrierRequest,
} from './manifest';

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
  kitting: kittingApi,
  labor: laborApi,
  picking: pickingApi,
  putaway: putawayApi,
  manifests: manifestApi,
};

// ============================================================================
// 审批端点（4 类实体 × 3 端点 = 12 个调用）
// 路径严格与后端 svc/wms Route 对齐：
//   /wms/inbound-orders/${id}/approval/{start,approve,reject}
//   /wms/outbound-orders/${id}/approval/{start,approve,reject}
//   /wms/stock-takes/${id}/approval/{start,approve,reject}
//   /wms/transfer-orders/${id}/approval/{start,approve,reject}
// ============================================================================
export const wmsApprovalApi = {
  inbound: {
    start: (id: string, body: ApprovalStartRequest) =>
      apiClient.post(`/wms/inbound-orders/${id}/approval/start`, body),
    approve: (id: string, body: ApprovalApproveRequest) =>
      apiClient.post(`/wms/inbound-orders/${id}/approval/approve`, body),
    reject: (id: string, body: ApprovalRejectRequest) =>
      apiClient.post(`/wms/inbound-orders/${id}/approval/reject`, body),
  },
  outbound: {
    start: (id: string, body: ApprovalStartRequest) =>
      apiClient.post(`/wms/outbound-orders/${id}/approval/start`, body),
    approve: (id: string, body: ApprovalApproveRequest) =>
      apiClient.post(`/wms/outbound-orders/${id}/approval/approve`, body),
    reject: (id: string, body: ApprovalRejectRequest) =>
      apiClient.post(`/wms/outbound-orders/${id}/approval/reject`, body),
  },
  stockTake: {
    start: (id: string, body: ApprovalStartRequest) =>
      apiClient.post(`/wms/stock-takes/${id}/approval/start`, body),
    approve: (id: string, body: ApprovalApproveRequest) =>
      apiClient.post(`/wms/stock-takes/${id}/approval/approve`, body),
    reject: (id: string, body: ApprovalRejectRequest) =>
      apiClient.post(`/wms/stock-takes/${id}/approval/reject`, body),
  },
  transferOrder: {
    start: (id: string, body: ApprovalStartRequest) =>
      apiClient.post(`/wms/transfer-orders/${id}/approval/start`, body),
    approve: (id: string, body: ApprovalApproveRequest) =>
      apiClient.post(`/wms/transfer-orders/${id}/approval/approve`, body),
    reject: (id: string, body: ApprovalRejectRequest) =>
      apiClient.post(`/wms/transfer-orders/${id}/approval/reject`, body),
  },
};

export default wmsApi;
