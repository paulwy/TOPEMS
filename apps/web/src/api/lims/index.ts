import apiClient from '../client';
import type { ApiResponse } from '../client';

import { sampleApi, lifecycleStageApi } from './sample';
import { processApi, taskApi, recordApi } from './inspection';
import { instrumentApi, maintenanceApi, instrumentDataApi } from './instrument';
import { reagentApi } from './reagent';
import { barcodeApi, rfidTagApi, printConfigApi } from './barcode';
import { testMethodApi, methodCategoryApi, methodValidationApi } from './testMethod';
import {
  ptPlanApi,
  ptSampleApi,
  ptResultApi,
  ptEvaluationApi,
  ptCorrectiveActionApi,
} from './proficiencyTesting';
import {
  uncertaintyProjectApi,
  uncertaintySourceApi,
  uncertaintyComponentApi,
} from './uncertainty';
import { collectionTaskApi, parseRuleApi } from './collection';
import { syncRecordApi } from './sync';
import { auditLimsApi } from './audit';
import type { LimsStatistics } from './types';

export * from './types';
export * from './utils';

export { sampleApi, lifecycleStageApi } from './sample';
export { processApi, taskApi, recordApi } from './inspection';
export { instrumentApi, maintenanceApi, instrumentDataApi } from './instrument';
export { reagentApi } from './reagent';
export { barcodeApi, rfidTagApi, printConfigApi } from './barcode';
export { testMethodApi, methodCategoryApi, methodValidationApi } from './testMethod';
export {
  ptPlanApi,
  ptSampleApi,
  ptResultApi,
  ptEvaluationApi,
  ptCorrectiveActionApi,
} from './proficiencyTesting';
export {
  uncertaintyProjectApi,
  uncertaintySourceApi,
  uncertaintyComponentApi,
} from './uncertainty';
export { collectionTaskApi, parseRuleApi } from './collection';
export { syncRecordApi } from './sync';
export { auditLimsApi } from './audit';

export const limsApi = {
  samples: sampleApi,
  processes: processApi,
  tasks: taskApi,
  records: recordApi,
  instruments: instrumentApi,
  maintenance: maintenanceApi,
  audit: auditLimsApi,
  lifecycleStages: lifecycleStageApi,
  reagents: reagentApi,
  barcodes: barcodeApi,
  rfidTags: rfidTagApi,
  printConfigs: printConfigApi,
  testMethods: testMethodApi,
  methodCategories: methodCategoryApi,
  methodValidations: methodValidationApi,
  ptPlans: ptPlanApi,
  ptSamples: ptSampleApi,
  ptResults: ptResultApi,
  ptEvaluations: ptEvaluationApi,
  ptCorrectiveActions: ptCorrectiveActionApi,
  uncertaintyProjects: uncertaintyProjectApi,
  uncertaintySources: uncertaintySourceApi,
  uncertaintyComponents: uncertaintyComponentApi,
  syncRecords: syncRecordApi,
  instrumentData: instrumentDataApi,
  collectionTasks: collectionTaskApi,
  parseRules: parseRuleApi,

  listSamples: sampleApi.listSamples,
  getSample: sampleApi.getSample,
  createSample: sampleApi.createSample,
  updateSample: sampleApi.updateSample,
  deleteSample: sampleApi.deleteSample,
  batchCreateSamples: sampleApi.batchCreateSamples,
  batchDeleteSamples: sampleApi.batchDeleteSamples,
  exportSamples: sampleApi.exportSamples,
  importSamples: sampleApi.importSamples,
  getSampleLifecycle: sampleApi.getSampleLifecycle,
  recordLifecycleEvent: sampleApi.recordLifecycleEvent,
  transitionSampleStage: sampleApi.transitionSampleStage,
  getSampleTraceability: sampleApi.getSampleTraceability,

  listLifecycleStages: lifecycleStageApi.listLifecycleStages,
  getLifecycleStage: lifecycleStageApi.getLifecycleStage,

  listProcesses: processApi.listProcesses,
  getProcess: processApi.getProcess,

  listTasks: taskApi.listTasks,
  createTask: taskApi.createTask,
  getTask: taskApi.getTask,
  updateTask: taskApi.updateTask,
  deleteTask: taskApi.deleteTask,
  completeStep: taskApi.completeStep,
  submitResult: taskApi.submitResult,
  listTasksBySample: taskApi.listTasksBySample,

  listRecords: recordApi.listRecords,
  getRecord: recordApi.getRecord,
  createRecord: recordApi.createRecord,
  deleteRecord: recordApi.deleteRecord,
  listRecordsByTask: recordApi.listRecordsByTask,

  listInstruments: instrumentApi.listInstruments,
  getInstrument: instrumentApi.getInstrument,
  createInstrument: instrumentApi.createInstrument,
  updateInstrument: instrumentApi.updateInstrument,
  deleteInstrument: instrumentApi.deleteInstrument,
  calibrateInstrument: instrumentApi.calibrate,
  listCalibrationRecords: instrumentApi.listCalibrationRecords,

  listMaintenanceByInstrument: maintenanceApi.listByInstrument,
  createMaintenance: maintenanceApi.create,
  updateMaintenance: maintenanceApi.update,
  deleteMaintenance: maintenanceApi.delete,

  listReagents: reagentApi.listReagents,
  getReagent: reagentApi.getReagent,
  createReagent: reagentApi.createReagent,
  updateReagent: reagentApi.updateReagent,
  deleteReagent: reagentApi.deleteReagent,
  listLowStockReagents: reagentApi.listLowStock,
  listExpiringReagents: reagentApi.listExpiring,

  listBarcodes: barcodeApi.listBarcodes,
  getBarcode: barcodeApi.getBarcode,
  generateBarcode: barcodeApi.generateBarcode,
  updateBarcode: barcodeApi.updateBarcode,
  deleteBarcode: barcodeApi.deleteBarcode,
  printBarcode: barcodeApi.printBarcode,
  scanBarcode: barcodeApi.scanBarcode,
  getBarcodeTypes: barcodeApi.getBarcodeTypes,
  traceSampleByBarcode: barcodeApi.traceSampleByBarcode,

  listRfidTags: rfidTagApi.listRfidTags,
  createRfidTag: rfidTagApi.createRfidTag,
  deleteRfidTag: rfidTagApi.deleteRfidTag,
  assignRfidTag: rfidTagApi.assignRfidTag,
  unassignRfidTag: rfidTagApi.unassignRfidTag,

  listTestMethods: testMethodApi.listTestMethods,
  getTestMethod: testMethodApi.getTestMethod,
  createTestMethod: testMethodApi.createTestMethod,
  updateTestMethod: testMethodApi.updateTestMethod,
  deleteTestMethod: testMethodApi.deleteTestMethod,
  listMethodVersions: testMethodApi.listMethodVersions,
  createNewMethodVersion: testMethodApi.createNewVersion,

  listMethodCategories: methodCategoryApi.listMethodCategories,
  createMethodCategory: methodCategoryApi.createCategory,
  updateMethodCategory: methodCategoryApi.updateCategory,
  deleteMethodCategory: methodCategoryApi.deleteCategory,

  listMethodValidations: methodValidationApi.listMethodValidations,
  createMethodValidation: methodValidationApi.createValidation,

  listPtPlans: ptPlanApi.listPtPlans,
  getPtPlan: ptPlanApi.getPtPlan,
  createPtPlan: ptPlanApi.createPtPlan,
  updatePtPlan: ptPlanApi.updatePtPlan,
  deletePtPlan: ptPlanApi.deletePtPlan,
  listPlanSamples: ptPlanApi.listPlanSamples,
  listPlanResults: ptPlanApi.listPlanResults,
  listPlanEvaluations: ptPlanApi.listPlanEvaluations,
  listPlanCorrectiveActions: ptPlanApi.listPlanCorrectiveActions,
  receivePtSample: ptSampleApi.receivePtSample,
  submitPtResult: ptResultApi.submitPtResult,
  evaluatePtResult: ptEvaluationApi.evaluatePtResult,
  createPtCorrectiveAction: ptCorrectiveActionApi.createPtCorrectiveAction,
  updatePtCorrectiveAction: ptCorrectiveActionApi.updatePtCorrectiveAction,

  listUncertaintyProjects: uncertaintyProjectApi.listUncertaintyProjects,
  getUncertaintyProject: uncertaintyProjectApi.getUncertaintyProject,
  createUncertaintyProject: uncertaintyProjectApi.createUncertaintyProject,
  updateUncertaintyProject: uncertaintyProjectApi.updateUncertaintyProject,
  deleteUncertaintyProject: uncertaintyProjectApi.deleteUncertaintyProject,
  listUncertaintySources: uncertaintySourceApi.listUncertaintySources,
  createUncertaintySource: uncertaintySourceApi.createUncertaintySource,
  updateUncertaintySource: uncertaintySourceApi.updateUncertaintySource,
  deleteUncertaintySource: uncertaintySourceApi.deleteUncertaintySource,
  listUncertaintyComponents: uncertaintyComponentApi.listUncertaintyComponents,
  createUncertaintyComponent: uncertaintyComponentApi.createUncertaintyComponent,
  updateUncertaintyComponent: uncertaintyComponentApi.updateUncertaintyComponent,
  deleteUncertaintyComponent: uncertaintyComponentApi.deleteUncertaintyComponent,
  calculateTypeA: uncertaintyComponentApi.calculateTypeA,
  calculateTypeB: uncertaintyComponentApi.calculateTypeB,
  calculateCombinedUncertainty: uncertaintyComponentApi.calculateCombinedUncertainty,
  generateUncertaintyReport: uncertaintyComponentApi.generateUncertaintyReport,

  listSyncRecords: syncRecordApi.listSyncRecords,
  getSyncRecord: syncRecordApi.getSyncRecord,
  deleteSyncRecord: syncRecordApi.deleteSyncRecord,
  retrySync: syncRecordApi.retrySync,
  syncRecordToQms: syncRecordApi.syncRecordToQms,
  syncReagentToEhs: syncRecordApi.syncReagentToEhs,

  listInstrumentData: instrumentDataApi.listInstrumentData,
  getInstrumentData: instrumentDataApi.getInstrumentData,
  createInstrumentData: instrumentDataApi.createInstrumentData,
  updateInstrumentData: instrumentDataApi.updateInstrumentData,
  deleteInstrumentData: instrumentDataApi.deleteInstrumentData,
  parseInstrumentData: instrumentDataApi.parseInstrumentData,
  testParseData: instrumentDataApi.testParseData,
  getInstrumentDataStatistics: instrumentDataApi.getStatistics,

  listCollectionTasks: collectionTaskApi.listCollectionTasks,
  getCollectionTask: collectionTaskApi.getCollectionTask,
  createCollectionTask: collectionTaskApi.createCollectionTask,
  updateCollectionTask: collectionTaskApi.updateCollectionTask,
  deleteCollectionTask: collectionTaskApi.deleteCollectionTask,
  triggerCollection: collectionTaskApi.triggerCollection,

  listParseRules: parseRuleApi.listParseRules,
  getParseRule: parseRuleApi.getParseRule,
  createParseRule: parseRuleApi.createParseRule,
  updateParseRule: parseRuleApi.updateParseRule,
  deleteParseRule: parseRuleApi.deleteParseRule,

  getStatistics: async (): Promise<ApiResponse<LimsStatistics>> => {
    return apiClient.lims.get('/api/lims/statistics');
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.lims.get('/health');
  },
};

export default limsApi;
