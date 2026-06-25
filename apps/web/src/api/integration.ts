import apiClient from './client';
import type { ApiResponse } from './client';

// Integration 相关类型
export interface IntegrationEvent {
  id: string;
  source_system: string;
  target_system: string;
  event_type: string;
  source_record_id?: string;
  target_record_id?: string;
  payload?: any;
  status: string;
  error_message?: string;
  synced_at?: string;
  created_at: string;
}

// ERP 连接管理相关类型
export type ErpConnectionType = 'kingdee' | 'yonyou' | 'sap';
export type ErpConnectionStatus = 'connected' | 'disconnected' | 'error' | 'syncing';
export type SyncDirection = 'import' | 'export' | 'bidirectional';
export type SyncMode = 'realtime' | 'scheduled' | 'manual';

export interface ErpConnection {
  id: string;
  type: ErpConnectionType;
  name: string;
  api_url: string;
  api_version?: string;
  app_key?: string;
  app_secret?: string;
  sync_direction: SyncDirection;
  sync_mode: SyncMode;
  sync_interval?: number;
  status: ErpConnectionStatus;
  is_active: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateErpConnectionRequest {
  type: ErpConnectionType;
  name: string;
  api_url: string;
  api_version?: string;
  app_key?: string;
  app_secret?: string;
  sync_direction?: SyncDirection;
  sync_mode?: SyncMode;
  sync_interval?: number;
}

export interface UpdateErpConnectionRequest {
  name?: string;
  api_url?: string;
  api_version?: string;
  app_key?: string;
  app_secret?: string;
  sync_direction?: SyncDirection;
  sync_mode?: SyncMode;
  sync_interval?: number;
  is_active?: boolean;
}

export interface TestConnectionRequest {
  api_url: string;
  app_key?: string;
  app_secret?: string;
  timeout?: number;
}

export interface TestConnectionResponse {
  success: boolean;
  response_time_ms: number;
  error_message?: string;
}

export interface CreateIntegrationEventRequest {
  source_system: string;
  target_system: string;
  event_type: string;
  source_record_id?: string;
  payload?: any;
}

export interface LimsQmsSync {
  id: string;
  lims_sample_id: string;
  qms_inspection_id?: string;
  sample_name: string;
  inspection_result?: string;
  inspection_notes?: string;
  synced: boolean;
  sync_status: string;
  sync_error?: string;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLimsQmsSyncRequest {
  lims_sample_id: string;
  sample_name: string;
  inspection_result?: string;
  inspection_notes?: string;
}

export interface MesErpSync {
  id: string;
  mes_order_id: string;
  erp_order_id?: string;
  order_number: string;
  product_name?: string;
  quantity?: number;
  synced: boolean;
  sync_status: string;
  sync_error?: string;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMesErpSyncRequest {
  mes_order_id: string;
  order_number: string;
  product_name?: string;
  quantity?: number;
}

export interface WmsScmSync {
  id: string;
  wms_inventory_id: string;
  scm_supply_id?: string;
  item_name: string;
  quantity?: number;
  unit?: string;
  synced: boolean;
  sync_status: string;
  sync_error?: string;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWmsScmSyncRequest {
  wms_inventory_id: string;
  item_name: string;
  quantity?: number;
  unit?: string;
}

export interface SyncStats {
  lims_qms_total: number;
  lims_qms_synced: number;
  lims_qms_failed: number;
  mes_erp_total: number;
  mes_erp_synced: number;
  mes_erp_failed: number;
  wms_scm_total: number;
  wms_scm_synced: number;
  wms_scm_failed: number;
  last_sync?: string;
}

// 同步统计扩展类型
export interface SyncHistoryItem {
  id: string;
  sync_type: string;
  source_system: string;
  target_system: string;
  status: string;
  total_records: number;
  success_count: number;
  failed_count: number;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
}

export interface IntegrationSyncStats {
  total_syncs: number;
  success_rate: number;
  last_sync_at?: string;
  integration_stats: Record<string, {
    total: number;
    synced: number;
    failed: number;
  }>;
}

// 转换规则相关类型
export type RuleStatus = 'active' | 'inactive' | 'draft';

export type TriggerType = 'event' | 'scheduled' | 'manual';

export interface FieldMapping {
  source_field: string;
  target_field: string;
  default_value?: any;
  transform?: string;
}

export interface ConversionRule {
  id: string;
  code: string;
  name: string;
  description?: string;
  source_system: string;
  source_entity: string;
  target_system: string;
  target_entity: string;
  trigger_type: TriggerType;
  trigger_condition?: any;
  field_mappings: FieldMapping[];
  transform_script?: string;
  status: RuleStatus;
  priority: number;
  is_enabled: boolean;
  max_retries: number;
  retry_interval_secs: number;
  stop_on_failure: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateConversionRuleRequest {
  code: string;
  name: string;
  description?: string;
  source_system: string;
  source_entity: string;
  target_system: string;
  target_entity: string;
  trigger_type: TriggerType;
  trigger_condition?: any;
  field_mappings: FieldMapping[];
  transform_script?: string;
  priority?: number;
  max_retries?: number;
  retry_interval_secs?: number;
  stop_on_failure?: boolean;
}

export interface UpdateConversionRuleRequest {
  name?: string;
  description?: string;
  trigger_type?: TriggerType;
  trigger_condition?: any;
  field_mappings?: FieldMapping[];
  transform_script?: string;
  status?: RuleStatus;
  priority?: number;
  is_enabled?: boolean;
  max_retries?: number;
  retry_interval_secs?: number;
  stop_on_failure?: boolean;
}

// ERP 映射管理相关类型
export type MappingType = 'account' | 'customer' | 'supplier' | 'project' | 'department' | 'employee';
export type MappingDirection = 'to_external' | 'from_external' | 'bidirectional';

export interface ErpMapping {
  id: string;
  connection_id: string;
  mapping_type: MappingType;
  local_id: string;
  local_code: string;
  local_name: string;
  external_code: string;
  external_name: string;
  direction: MappingDirection;
  is_active: boolean;
  priority: number;
  condition?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateErpMappingRequest {
  mapping_type: MappingType;
  local_id: string;
  local_code: string;
  local_name: string;
  external_code: string;
  external_name: string;
  direction?: MappingDirection;
  priority?: number;
  condition?: string;
}

export interface UpdateErpMappingRequest {
  local_id?: string;
  local_code?: string;
  local_name?: string;
  external_code?: string;
  external_name?: string;
  direction?: MappingDirection;
  is_active?: boolean;
  priority?: number;
  condition?: string;
}

export interface ConversionExecution {
  id: string;
  rule_id: string;
  rule_code: string;
  source_record_id: string;
  target_record_id?: string;
  source_data?: any;
  target_data?: any;
  status: string;
  retry_count: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface ExecuteConversionRequest {
  rule_code: string;
  source_record_id: string;
  source_data: any;
}

export interface ExecuteConversionResponse {
  execution_id: string;
  success: boolean;
  target_record_id?: string;
  target_data?: any;
  message: string;
  error_message?: string;
}

// Integration API 函数
export const integrationApi = {
  // 同步统计
  getSyncStats: async (): Promise<ApiResponse<SyncStats>> => {
    return apiClient.integration.get('/api/integration/stats');
  },

  // 集成事件
  listEvents: async (): Promise<ApiResponse<IntegrationEvent[]>> => {
    return apiClient.integration.get('/api/integration/events');
  },

  createEvent: async (
    data: CreateIntegrationEventRequest
  ): Promise<ApiResponse<IntegrationEvent>> => {
    return apiClient.integration.post('/api/integration/events', data);
  },

  // LIMS-QMS 同步
  listLimsQmsSyncs: async (): Promise<ApiResponse<LimsQmsSync[]>> => {
    return apiClient.integration.get('/api/integration/lims-qms');
  },

  getLimsQmsSync: async (id: string): Promise<ApiResponse<LimsQmsSync>> => {
    return apiClient.integration.get(`/api/integration/lims-qms/${id}`);
  },

  createLimsQmsSync: async (data: CreateLimsQmsSyncRequest): Promise<ApiResponse<LimsQmsSync>> => {
    return apiClient.integration.post('/api/integration/lims-qms', data);
  },

  syncLimsQms: async (id: string): Promise<ApiResponse<LimsQmsSync>> => {
    return apiClient.integration.post(`/api/integration/lims-qms/${id}/sync`);
  },

  // MES-ERP 同步
  listMesErpSyncs: async (): Promise<ApiResponse<MesErpSync[]>> => {
    return apiClient.integration.get('/api/integration/mes-erp');
  },

  getMesErpSync: async (id: string): Promise<ApiResponse<MesErpSync>> => {
    return apiClient.integration.get(`/api/integration/mes-erp/${id}`);
  },

  createMesErpSync: async (data: CreateMesErpSyncRequest): Promise<ApiResponse<MesErpSync>> => {
    return apiClient.integration.post('/api/integration/mes-erp', data);
  },

  syncMesErp: async (id: string): Promise<ApiResponse<MesErpSync>> => {
    return apiClient.integration.post(`/api/integration/mes-erp/${id}/sync`);
  },

  // WMS-SCM 同步
  listWmsScmSyncs: async (): Promise<ApiResponse<WmsScmSync[]>> => {
    return apiClient.integration.get('/api/integration/wms-scm');
  },

  getWmsScmSync: async (id: string): Promise<ApiResponse<WmsScmSync>> => {
    return apiClient.integration.get(`/api/integration/wms-scm/${id}`);
  },

  createWmsScmSync: async (data: CreateWmsScmSyncRequest): Promise<ApiResponse<WmsScmSync>> => {
    return apiClient.integration.post('/api/integration/wms-scm', data);
  },

  syncWmsScm: async (id: string): Promise<ApiResponse<WmsScmSync>> => {
    return apiClient.integration.post(`/api/integration/wms-scm/${id}/sync`);
  },

  // 转换规则 API
  listConversionRules: async (): Promise<ApiResponse<ConversionRule[]>> => {
    return apiClient.integration.get('/api/integration/rules');
  },

  getConversionRule: async (id: string): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.get(`/api/integration/rules/${id}`);
  },

  createConversionRule: async (
    data: CreateConversionRuleRequest
  ): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.post('/api/integration/rules', data);
  },

  updateConversionRule: async (
    id: string,
    data: UpdateConversionRuleRequest
  ): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.put(`/api/integration/rules/${id}`, data);
  },

  deleteConversionRule: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.integration.delete(`/api/integration/rules/${id}`);
  },

  getRuleExecutions: async (id: string): Promise<ApiResponse<ConversionExecution[]>> => {
    return apiClient.integration.get(`/api/integration/rules/${id}/executions`);
  },

  executeConversionRule: async (
    id: string,
    data: ExecuteConversionRequest
  ): Promise<ApiResponse<ExecuteConversionResponse>> => {
    return apiClient.integration.post(`/api/integration/rules/${id}/execute`, data);
  },

  enableConversionRule: async (id: string): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.post(`/api/integration/rules/${id}/enable`);
  },

  disableConversionRule: async (id: string): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.post(`/api/integration/rules/${id}/disable`);
  },

  // ERP 连接管理 API
  listConnections: async (
    params?: { type?: string; status?: string; page?: number; pageSize?: number }
  ): Promise<ApiResponse<ErpConnection[]>> => {
    return apiClient.integration.get('/api/integration/erp/connections', { params });
  },

  getConnection: async (id: string): Promise<ApiResponse<ErpConnection>> => {
    return apiClient.integration.get(`/api/integration/erp/connections/${id}`);
  },

  createConnection: async (
    data: CreateErpConnectionRequest
  ): Promise<ApiResponse<ErpConnection>> => {
    return apiClient.integration.post('/api/integration/erp/connections', data);
  },

  updateConnection: async (
    id: string,
    data: UpdateErpConnectionRequest
  ): Promise<ApiResponse<ErpConnection>> => {
    return apiClient.integration.put(`/api/integration/erp/connections/${id}`, data);
  },

  deleteConnection: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.integration.delete(`/api/integration/erp/connections/${id}`);
  },

  testConnection: async (
    data: TestConnectionRequest
  ): Promise<ApiResponse<TestConnectionResponse>> => {
    return apiClient.integration.post('/api/integration/erp/connections/test', data);
  },

  // ERP 映射管理 API
  listMappings: async (
    connectionId: string,
    params?: { mapping_type?: MappingType; page?: number; pageSize?: number }
  ): Promise<ApiResponse<ErpMapping[]>> => {
    return apiClient.integration.get(`/api/integration/erp/mappings`, {
      params: { connection_id: connectionId, ...params },
    });
  },

  getMapping: async (id: string): Promise<ApiResponse<ErpMapping>> => {
    return apiClient.integration.get(`/api/integration/erp/mappings/${id}`);
  },

  createMapping: async (
    data: CreateErpMappingRequest
  ): Promise<ApiResponse<ErpMapping>> => {
    return apiClient.integration.post('/api/integration/erp/mappings', data);
  },

  updateMapping: async (
    id: string,
    data: UpdateErpMappingRequest
  ): Promise<ApiResponse<ErpMapping>> => {
    return apiClient.integration.put(`/api/integration/erp/mappings/${id}`, data);
  },

  deleteMapping: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.integration.delete(`/api/integration/erp/mappings/${id}`);
  },

  // 转换规则 API (补充完整)
  listRules: async (
    params?: { source_system?: string; target_system?: string; status?: RuleStatus; page?: number; pageSize?: number }
  ): Promise<ApiResponse<ConversionRule[]>> => {
    return apiClient.integration.get('/api/integration/conversion-rules', { params });
  },

  getRule: async (id: string): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.get(`/api/integration/conversion-rules/${id}`);
  },

  createRule: async (
    data: CreateConversionRuleRequest
  ): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.post('/api/integration/conversion-rules', data);
  },

  updateRule: async (
    id: string,
    data: UpdateConversionRuleRequest
  ): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.put(`/api/integration/conversion-rules/${id}`, data);
  },

  deleteRule: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.integration.delete(`/api/integration/conversion-rules/${id}`);
  },

  // 同步统计 API
  getIntegrationSyncStats: async (
    params?: { connection_id?: string; start_date?: string; end_date?: string }
  ): Promise<ApiResponse<IntegrationSyncStats>> => {
    return apiClient.integration.get('/api/integration/sync-stats', { params });
  },

  getIntegrationSyncHistory: async (
    params?: { connection_id?: string; sync_type?: string; status?: string; page?: number; pageSize?: number }
  ): Promise<ApiResponse<SyncHistoryItem[]>> => {
    return apiClient.integration.get('/api/integration/sync-stats/history', { params });
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.integration.get('/health');
  },
};

export { integrationApi as default };
