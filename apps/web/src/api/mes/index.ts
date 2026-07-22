import apiClient from '../client';
import type { ApiResponse } from '../client';

import { productionOrderApi } from './productionOrder';
import { productionProcessApi } from './productionProcess';
import { workStationApi } from './workStation';
import { productionRecordApi } from './productionRecord';
import { equipmentApi, mesEquipmentApi, equipmentOeeApi } from './equipment';
import { productionScheduleApi } from './productionSchedule';
import { materialBomApi, materialIssueApi, materialReturnApi } from './material';
import { traceabilityApi } from './traceability';
import { wipApi } from './wip';
import { processRouteApi } from './process';
import { processFlowApi } from './processFlow';
import { qualityApi } from './quality';
import { workReportApi } from './workReport';
import { workOrderApi } from './workOrder';
import { teamApi } from './team';
import { materialRequirementApi } from './materialRequirement';
import { productionKanbanApi } from './productionKanban';
import { apsApi } from './aps';
import { anomalyDetectionApi } from './anomalyDetection';

export * from './types';
export * from './aps';

export { productionOrderApi } from './productionOrder';
export { productionProcessApi } from './productionProcess';
export { workStationApi } from './workStation';
export { productionRecordApi } from './productionRecord';
export { equipmentApi, mesEquipmentApi, equipmentOeeApi } from './equipment';
export { productionScheduleApi } from './productionSchedule';
export { materialBomApi, materialIssueApi, materialReturnApi } from './material';
export { traceabilityApi } from './traceability';
export { wipApi } from './wip';
export { processRouteApi } from './process';
export { processFlowApi } from './processFlow';
export { qualityApi } from './quality';
export { workReportApi } from './workReport';
export { workOrderApi } from './workOrder';
export { teamApi } from './team';
export { materialRequirementApi } from './materialRequirement';
export { productionKanbanApi } from './productionKanban';
export { anomalyDetectionApi } from './anomalyDetection';

export const mesApi = {
  orders: productionOrderApi,
  processes: productionProcessApi,
  workstations: workStationApi,
  records: productionRecordApi,
  equipment: equipmentApi,
  equipmentInspection: mesEquipmentApi,
  schedules: productionScheduleApi,
  boms: materialBomApi,
  materialIssues: materialIssueApi,
  materialReturns: materialReturnApi,
  traceability: traceabilityApi,
  equipmentOee: equipmentOeeApi,
  wips: wipApi,
  processRoutes: processRouteApi,
  processFlows: processFlowApi,
  quality: qualityApi,
  workReports: workReportApi,
  workOrders: workOrderApi,
  teams: teamApi,
  materialRequirements: materialRequirementApi,
  kanban: productionKanbanApi,
  aps: apsApi,
  anomaly: anomalyDetectionApi,

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.mes.get('/health');
  },
};

export default mesApi;
