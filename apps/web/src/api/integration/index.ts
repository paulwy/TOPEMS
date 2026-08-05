import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { IntegrationEndpoint } from './types';

import { connectionApi } from './connection';
import { syncApi } from './sync';
import { mappingApi } from './mapping';
import { conversionRuleApi } from './conversionRule';

export * from './types';

export { connectionApi } from './connection';
export { syncApi } from './sync';
export { mappingApi } from './mapping';
export { conversionRuleApi } from './conversionRule';

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

  /**
   * 获取所有可触发的集成端点列表。
   *
   * 供 automation designer 在编排自动化流程时选择可触发的集成点，
   * 返回每个端点的协议、鉴权方式、状态等元数据。
   *
   * @returns 集成端点列表
   */
  listEndpoints: async (): Promise<ApiResponse<IntegrationEndpoint[]>> => {
    return apiClient.integration.get('/endpoints');
  },
};

export default integrationApi;
