import type { ListQueryParams } from './common';

// ============ Data Sync Types ============
export interface SyncErrorDetail {
  code?: string;
  message?: string;
  stack?: string;
  [key: string]: unknown;
}

export interface SyncRecord {
  id: string;
  sync_no: string;
  sync_type: string;
  source_system: string;
  target_system: string;
  entity_type: string;
  entity_count: number;
  success_count: number;
  failed_count: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial';
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  triggered_by: string | null;
  trigger_type: 'manual' | 'scheduled' | 'event';
  error_message: string | null;
  error_details: SyncErrorDetail;
  created_at: string;
  updated_at: string;
}

export interface SyncRecordDetail {
  id: string;
  sync_id: string;
  entity_id: string;
  entity_type: string;
  entity_name: string;
  operation: 'create' | 'update' | 'delete';
  status: 'success' | 'failed' | 'skipped' | 'pending';
  error_message: string | null;
  source_data: Record<string, unknown>;
  target_data: Record<string, unknown>;
  retried_count: number;
  last_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncFilter {
  [key: string]: unknown;
}

export interface SyncFieldMapping {
  source_field: string;
  target_field: string;
  transform?: string;
  default_value?: unknown;
}

export interface SyncConfig {
  id: string;
  config_name: string;
  sync_type: string;
  source_system: string;
  target_system: string;
  entity_type: string;
  direction: 'bidirectional' | 'source_totarget' | 'target_to_source';
  schedule: string | null;
  enabled: boolean;
  last_sync_at: string | null;
  next_sync_at: string | null;
  filters: SyncFilter;
  field_mapping: SyncFieldMapping[];
  created_at: string;
  updated_at: string;
}

export interface CreateSyncRequest {
  sync_type: string;
  source_system: string;
  target_system: string;
  entity_type: string;
  trigger_type?: 'manual' | 'scheduled' | 'event';
  entity_ids?: string[] | null;
  filters?: SyncFilter;
}

export interface SyncRetryRequest {
  sync_id: string;
  detail_ids?: string[] | null;
  all_failed?: boolean;
}

export interface SyncRecordListQueryParams extends ListQueryParams {
  sync_type?: string;
  source_system?: string;
  target_system?: string;
  entity_type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}
