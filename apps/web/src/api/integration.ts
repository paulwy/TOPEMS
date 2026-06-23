import apiClient from "./client";
import type { ApiResponse } from "./client";

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

// 转换规则相关类型
export type RuleStatus = "active" | "inactive" | "draft";

export type TriggerType = "event" | "scheduled" | "manual";

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
    return apiClient.integration.get("/api/integration/stats");
  },

  // 集成事件
  listEvents: async (): Promise<ApiResponse<IntegrationEvent[]>> => {
    return apiClient.integration.get("/api/integration/events");
  },

  createEvent: async (
    data: CreateIntegrationEventRequest,
  ): Promise<ApiResponse<IntegrationEvent>> => {
    return apiClient.integration.post("/api/integration/events", data);
  },

  // LIMS-QMS 同步
  listLimsQmsSyncs: async (): Promise<ApiResponse<LimsQmsSync[]>> => {
    return apiClient.integration.get("/api/integration/lims-qms");
  },

  getLimsQmsSync: async (id: string): Promise<ApiResponse<LimsQmsSync>> => {
    return apiClient.integration.get(`/api/integration/lims-qms/${id}`);
  },

  createLimsQmsSync: async (
    data: CreateLimsQmsSyncRequest,
  ): Promise<ApiResponse<LimsQmsSync>> => {
    return apiClient.integration.post("/api/integration/lims-qms", data);
  },

  syncLimsQms: async (id: string): Promise<ApiResponse<LimsQmsSync>> => {
    return apiClient.integration.post(`/api/integration/lims-qms/${id}/sync`);
  },

  // MES-ERP 同步
  listMesErpSyncs: async (): Promise<ApiResponse<MesErpSync[]>> => {
    return apiClient.integration.get("/api/integration/mes-erp");
  },

  getMesErpSync: async (id: string): Promise<ApiResponse<MesErpSync>> => {
    return apiClient.integration.get(`/api/integration/mes-erp/${id}`);
  },

  createMesErpSync: async (
    data: CreateMesErpSyncRequest,
  ): Promise<ApiResponse<MesErpSync>> => {
    return apiClient.integration.post("/api/integration/mes-erp", data);
  },

  syncMesErp: async (id: string): Promise<ApiResponse<MesErpSync>> => {
    return apiClient.integration.post(`/api/integration/mes-erp/${id}/sync`);
  },

  // WMS-SCM 同步
  listWmsScmSyncs: async (): Promise<ApiResponse<WmsScmSync[]>> => {
    return apiClient.integration.get("/api/integration/wms-scm");
  },

  getWmsScmSync: async (id: string): Promise<ApiResponse<WmsScmSync>> => {
    return apiClient.integration.get(`/api/integration/wms-scm/${id}`);
  },

  createWmsScmSync: async (
    data: CreateWmsScmSyncRequest,
  ): Promise<ApiResponse<WmsScmSync>> => {
    return apiClient.integration.post("/api/integration/wms-scm", data);
  },

  syncWmsScm: async (id: string): Promise<ApiResponse<WmsScmSync>> => {
    return apiClient.integration.post(`/api/integration/wms-scm/${id}/sync`);
  },

  // 转换规则 API
  listConversionRules: async (): Promise<ApiResponse<ConversionRule[]>> => {
    return apiClient.integration.get("/api/integration/rules");
  },

  getConversionRule: async (id: string): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.get(`/api/integration/rules/${id}`);
  },

  createConversionRule: async (
    data: CreateConversionRuleRequest,
  ): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.post("/api/integration/rules", data);
  },

  updateConversionRule: async (
    id: string,
    data: UpdateConversionRuleRequest,
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
    data: ExecuteConversionRequest,
  ): Promise<ApiResponse<ExecuteConversionResponse>> => {
    return apiClient.integration.post(`/api/integration/rules/${id}/execute`, data);
  },

  enableConversionRule: async (id: string): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.post(`/api/integration/rules/${id}/enable`);
  },

  disableConversionRule: async (id: string): Promise<ApiResponse<ConversionRule>> => {
    return apiClient.integration.post(`/api/integration/rules/${id}/disable`);
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.integration.get("/health");
  },
};

export { integrationApi as default };
