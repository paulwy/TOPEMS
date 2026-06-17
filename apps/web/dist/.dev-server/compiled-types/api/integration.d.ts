import type { ApiResponse } from "./client";
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
export declare const integrationApi: {
    getSyncStats: () => Promise<ApiResponse<SyncStats>>;
    listEvents: () => Promise<ApiResponse<IntegrationEvent[]>>;
    createEvent: (data: CreateIntegrationEventRequest) => Promise<ApiResponse<IntegrationEvent>>;
    listLimsQmsSyncs: () => Promise<ApiResponse<LimsQmsSync[]>>;
    getLimsQmsSync: (id: string) => Promise<ApiResponse<LimsQmsSync>>;
    createLimsQmsSync: (data: CreateLimsQmsSyncRequest) => Promise<ApiResponse<LimsQmsSync>>;
    syncLimsQms: (id: string) => Promise<ApiResponse<LimsQmsSync>>;
    listMesErpSyncs: () => Promise<ApiResponse<MesErpSync[]>>;
    getMesErpSync: (id: string) => Promise<ApiResponse<MesErpSync>>;
    createMesErpSync: (data: CreateMesErpSyncRequest) => Promise<ApiResponse<MesErpSync>>;
    syncMesErp: (id: string) => Promise<ApiResponse<MesErpSync>>;
    listWmsScmSyncs: () => Promise<ApiResponse<WmsScmSync[]>>;
    getWmsScmSync: (id: string) => Promise<ApiResponse<WmsScmSync>>;
    createWmsScmSync: (data: CreateWmsScmSyncRequest) => Promise<ApiResponse<WmsScmSync>>;
    syncWmsScm: (id: string) => Promise<ApiResponse<WmsScmSync>>;
    health: () => Promise<ApiResponse<string>>;
};
export { integrationApi as default };
