import apiClient from '../client';
import type { ApiResponse } from '../client';

export * from './types';

export { supplierApi } from './supplier';
export { purchaseOrderApi } from './purchase-order';
export { purchaseItemApi } from './purchase-item';
export { supplierEvaluationApi } from './supplier-evaluation';
export { mrpPlanApi } from './mrp-plan';
export { mrpSuggestionApi } from './mrp-suggestion';
export { incomingInspectionApi } from './incoming-inspection';
export { inspectionRecordApi } from './inspection-record';
export { inventoryTurnoverApi } from './inventory-turnover';
export { supplyChainDashboardApi } from './supply-chain-dashboard';
export { priceComparisonApi } from './price-comparison';
export { syncRecordApi } from './sync-record';
export { auditLogApi } from './audit-log';
export { deliveryAppointmentApi } from './delivery-appointment';

import { supplierApi } from './supplier';
import { purchaseOrderApi } from './purchase-order';
import { purchaseItemApi } from './purchase-item';
import { supplierEvaluationApi } from './supplier-evaluation';
import { mrpPlanApi } from './mrp-plan';
import { mrpSuggestionApi } from './mrp-suggestion';
import { incomingInspectionApi } from './incoming-inspection';
import { inspectionRecordApi } from './inspection-record';
import { inventoryTurnoverApi } from './inventory-turnover';
import { supplyChainDashboardApi } from './supply-chain-dashboard';
import { priceComparisonApi } from './price-comparison';
import { syncRecordApi } from './sync-record';
import { auditLogApi } from './audit-log';
import { deliveryAppointmentApi } from './delivery-appointment';

export const scmApi = {
  suppliers: supplierApi,
  purchaseOrders: purchaseOrderApi,
  purchaseItems: purchaseItemApi,
  evaluations: supplierEvaluationApi,
  deliveryAppointments: deliveryAppointmentApi,
  mrpPlans: mrpPlanApi,
  mrpSuggestions: mrpSuggestionApi,
  incomingInspections: incomingInspectionApi,
  inspectionRecords: inspectionRecordApi,
  inventoryTurnover: inventoryTurnoverApi,
  supplyChainDashboard: supplyChainDashboardApi,
  priceComparisons: priceComparisonApi,
  syncRecords: syncRecordApi,
  auditLogs: auditLogApi,

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.scm.get('/health');
  },
};

export default scmApi;
