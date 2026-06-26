import apiClient from '../client';
import type { ApiResponse } from '../client';

export * from './types';

export { connectionApi } from './connection';
export { syncApi } from './sync';
export { mappingApi } from './mapping';
export { conversionRuleApi } from './conversion-rule';

import { connectionApi } from './connection';
import { syncApi } from './sync';
import { mappingApi } from './mapping';
import { conversionRuleApi } from './conversion-rule';

export const integrationApi = {
  connections: connectionApi,
  sync: syncApi,
  mappings: mappingApi,
  conversionRules: conversionRuleApi,

  getSyncStats: syncApi.getSyncStats,
  listEvents: syncApi.listEvents,
  createEvent: syncApi.createEvent,
  listLimsQmsSyncs: syncApi.listLimsQmsSyncs,
  getLimsQmsSync: syncApi.getLimsQmsSync,
  createLimsQmsSync: syncApi.createLimsQmsSync,
  syncLimsQms: syncApi.syncLimsQms,
  listMesErpSyncs: syncApi.listMesErpSyncs,
  getMesErpSync: syncApi.getMesErpSync,
  createMesErpSync: syncApi.createMesErpSync,
  syncMesErp: syncApi.syncMesErp,
  listWmsScmSyncs: syncApi.listWmsScmSyncs,
  getWmsScmSync: syncApi.getWmsScmSync,
  createWmsScmSync: syncApi.createWmsScmSync,
  syncWmsScm: syncApi.syncWmsScm,

  listConversionRules: conversionRuleApi.listConversionRules,
  getConversionRule: conversionRuleApi.getConversionRule,
  createConversionRule: conversionRuleApi.createConversionRule,
  updateConversionRule: conversionRuleApi.updateConversionRule,
  deleteConversionRule: conversionRuleApi.deleteConversionRule,
  getRuleExecutions: conversionRuleApi.getRuleExecutions,
  executeConversionRule: conversionRuleApi.executeConversionRule,
  enableConversionRule: conversionRuleApi.enableConversionRule,
  disableConversionRule: conversionRuleApi.disableConversionRule,

  listConnections: connectionApi.listConnections,
  getConnection: connectionApi.getConnection,
  createConnection: connectionApi.createConnection,
  updateConnection: connectionApi.updateConnection,
  deleteConnection: connectionApi.deleteConnection,
  testConnection: connectionApi.testConnection,

  listMappings: mappingApi.listMappings,
  getMapping: mappingApi.getMapping,
  createMapping: mappingApi.createMapping,
  updateMapping: mappingApi.updateMapping,
  deleteMapping: mappingApi.deleteMapping,

  listRules: conversionRuleApi.listRules,
  getRule: conversionRuleApi.getRule,
  createRule: conversionRuleApi.createRule,
  updateRule: conversionRuleApi.updateRule,
  deleteRule: conversionRuleApi.deleteRule,

  getIntegrationSyncStats: syncApi.getIntegrationSyncStats,
  getIntegrationSyncHistory: syncApi.getIntegrationSyncHistory,

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.integration.get('/health');
  },
};

export default integrationApi;
