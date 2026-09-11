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
import { purchaseRequisitionApi } from './purchaseRequisition';
import { purchaseContractApi } from './purchaseContract';
import { supplierAdmissionApi } from './supplierAdmission';
import { scmSettingsApi } from './settings';

export * from './types';

export { supplierApi } from './supplier';
export { purchaseOrderApi } from './purchaseOrder';
export { incomingInspectionApi } from './incomingInspection';
export { syncRecordApi } from './syncRecord';
export { auditLogApi } from './auditLog';
export { deliveryAppointmentApi } from './deliveryAppointment';
export { scmAnalyticsApi } from './analytics';
export * from './analytics';
export { purchaseItemApi } from './purchaseItem';
export { supplierEvaluationApi } from './supplierEvaluation';
export { mrpPlanApi } from './mrpPlan';
export { mrpSuggestionApi } from './mrpSuggestion';
export { inspectionRecordApi } from './inspectionRecord';
export { inventoryTurnoverApi } from './inventoryTurnover';
export { supplyChainDashboardApi } from './supplyChainDashboard';
export { priceComparisonApi } from './priceComparison';
export { purchaseRequisitionApi } from './purchaseRequisition';
export { purchaseContractApi } from './purchaseContract';
export { supplierAdmissionApi } from './supplierAdmission';
export { scmSettingsApi } from './settings';

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
  purchaseRequisitions: purchaseRequisitionApi,
  purchaseContracts: purchaseContractApi,
  supplierAdmissions: supplierAdmissionApi,
  settings: scmSettingsApi,

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.scm.get('/health');
  },
};

export default scmApi;
