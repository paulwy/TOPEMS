import apiClient from '../client';
import type { ApiResponse } from '../client';

import { productionOrderApi } from './production-order';
import { productionProcessApi } from './production-process';
import { workStationApi } from './work-station';
import { productionRecordApi } from './production-record';
import { equipmentApi, mesEquipmentApi, equipmentOeeApi } from './equipment';
import { productionScheduleApi } from './production-schedule';
import { materialBomApi, materialIssueApi, materialReturnApi } from './material';
import { traceabilityApi } from './traceability';
import { wipApi } from './wip';
import { processRouteApi } from './process';
import { processFlowApi } from './process-flow';
import { qualityApi } from './quality';

export * from './types';

export { productionOrderApi } from './production-order';
export { productionProcessApi } from './production-process';
export { workStationApi } from './work-station';
export { productionRecordApi } from './production-record';
export { equipmentApi, mesEquipmentApi, equipmentOeeApi } from './equipment';
export { productionScheduleApi } from './production-schedule';
export { materialBomApi, materialIssueApi, materialReturnApi } from './material';
export { traceabilityApi } from './traceability';
export { wipApi } from './wip';
export { processRouteApi } from './process';
export { processFlowApi } from './process-flow';
export { qualityApi } from './quality';

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

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.mes.get('/health');
  },
};

export default mesApi;
