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

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.integration.get("/health");
  },
};

export { integrationApi as default };
