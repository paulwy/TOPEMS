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

export * from './types';

export { supplierApi } from './supplier';
export { purchaseOrderApi } from './purchaseOrder';
export { incomingInspectionApi } from './incomingInspection';
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
  purchaseRequisitions: purchaseRequisitionApi,
  purchaseContracts: purchaseContractApi,
  supplierAdmissions: supplierAdmissionApi,

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.scm.get('/health');
  },
};

export default scmApi;
