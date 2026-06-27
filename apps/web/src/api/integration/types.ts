import type { ApiResponse } from '../client';

export interface IntegrationEventPayload {
  [key: string]: unknown;
}

export interface IntegrationEvent {
  id: string;
  source_system: string;
  target_system: string;
  event_type: string;
  source_record_id?: string;
  target_record_id?: string;
  payload?: IntegrationEventPayload;
  status: string;
  error_message?: string;
  synced_at?: string;
  created_at: string;
}

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
  payload?: IntegrationEventPayload;
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
  integration_stats: Record<
    string,
    {
      total: number;
      synced: number;
      failed: number;
    }
  >;
}

export type RuleStatus = 'active' | 'inactive' | 'draft';

export type TriggerType = 'event' | 'scheduled' | 'manual';

export interface FieldMapping {
  source_field: string;
  target_field: string;
  default_value?: unknown;
  transform?: string;
}

export interface TriggerCondition {
  [key: string]: unknown;
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
  trigger_condition?: TriggerCondition;
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
  trigger_condition?: TriggerCondition;
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
  trigger_condition?: TriggerCondition;
  field_mappings?: FieldMapping[];
  transform_script?: string;
  status?: RuleStatus;
  priority?: number;
  is_enabled?: boolean;
  max_retries?: number;
  retry_interval_secs?: number;
  stop_on_failure?: boolean;
}

export type MappingType =
  | 'account'
  | 'customer'
  | 'supplier'
  | 'project'
  | 'department'
  | 'employee';
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
  source_data?: Record<string, unknown>;
  target_data?: Record<string, unknown>;
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
  source_data: Record<string, unknown>;
}

export interface ExecuteConversionResponse {
  execution_id: string;
  success: boolean;
  target_record_id?: string;
  target_data?: Record<string, unknown>;
  message: string;
  error_message?: string;
}
