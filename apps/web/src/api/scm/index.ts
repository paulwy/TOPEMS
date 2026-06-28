import apiClient from '../client';
import type { ApiResponse } from '../client';

import { supplierApi } from './supplier';
import { purchaseOrderApi } from './purchaseOrder';
import { purchaseItemApi } from './purchaseItem';
import { supplierEvaluationApi } from './supplierEvaluation';
import { mrpPlanApi } from './mrpPlan';
import { mrpSuggestionApi } from './mrpSuggestion';
import { incomingInspectionApi } from './incomingInspection';
import { inspectionRecordApi } from './inspectionRecord';
import { inventoryTurnoverApi } from './inventoryTurnover';
import { supplyChainDashboardApi } from './supplyChainDashboard';
import { priceComparisonApi } from './priceComparison';
import { syncRecordApi } from './syncRecord';
import { auditLogApi } from './auditLog';
import { deliveryAppointmentApi } from './deliveryAppointment';

export * from './types';

export { supplierApi } from './supplier';
export { purchaseOrderApi } from './purchaseOrder';
export { purchaseItemApi } from './purchaseItem';
export { supplierEvaluationApi } from './supplierEvaluation';
export { mrpPlanApi } from './mrpPlan';
export { mrpSuggestionApi } from './mrpSuggestion';
export { incomingInspectionApi } from './incomingInspection';
export { inspectionRecordApi } from './inspectionRecord';
export { inventoryTurnoverApi } from './inventoryTurnover';
export { supplyChainDashboardApi } from './supplyChainDashboard';
export { priceComparisonApi } from './priceComparison';
export { syncRecordApi } from './syncRecord';
export { auditLogApi } from './auditLog';
export { deliveryAppointmentApi } from './deliveryAppointment';

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
