import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  SyncStats,
  IntegrationEvent,
  CreateIntegrationEventRequest,
  LimsQmsSync,
  CreateLimsQmsSyncRequest,
  MesErpSync,
  CreateMesErpSyncRequest,
  WmsScmSync,
  CreateWmsScmSyncRequest,
  IntegrationSyncStats,
  SyncHistoryItem,
} from './types';

export const syncApi = {
  getSyncStats: async (): Promise<ApiResponse<SyncStats>> => {
    return apiClient.integration.get('/stats');
  },

  listEvents: async (): Promise<ApiResponse<IntegrationEvent[]>> => {
    return apiClient.integration.get('/events');
  },

  createEvent: async (
    data: CreateIntegrationEventRequest
  ): Promise<ApiResponse<IntegrationEvent>> => {
    return apiClient.integration.post('/events', data);
  },

  listLimsQmsSyncs: async (): Promise<ApiResponse<LimsQmsSync[]>> => {
    return apiClient.integration.get('/lims-qms');
  },

  getLimsQmsSync: async (id: string): Promise<ApiResponse<LimsQmsSync>> => {
    return apiClient.integration.get(`/lims-qms/${id}`);
  },

  createLimsQmsSync: async (data: CreateLimsQmsSyncRequest): Promise<ApiResponse<LimsQmsSync>> => {
    return apiClient.integration.post('/lims-qms', data);
  },

  syncLimsQms: async (id: string): Promise<ApiResponse<LimsQmsSync>> => {
    return apiClient.integration.post(`/lims-qms/${id}/sync`);
  },

  listMesErpSyncs: async (): Promise<ApiResponse<MesErpSync[]>> => {
    return apiClient.integration.get('/mes-erp');
  },

  getMesErpSync: async (id: string): Promise<ApiResponse<MesErpSync>> => {
    return apiClient.integration.get(`/mes-erp/${id}`);
  },

  createMesErpSync: async (data: CreateMesErpSyncRequest): Promise<ApiResponse<MesErpSync>> => {
    return apiClient.integration.post('/mes-erp', data);
  },

  syncMesErp: async (id: string): Promise<ApiResponse<MesErpSync>> => {
    return apiClient.integration.post(`/mes-erp/${id}/sync`);
  },

  listWmsScmSyncs: async (): Promise<ApiResponse<WmsScmSync[]>> => {
    return apiClient.integration.get('/wms-scm');
  },

  getWmsScmSync: async (id: string): Promise<ApiResponse<WmsScmSync>> => {
    return apiClient.integration.get(`/wms-scm/${id}`);
  },

  createWmsScmSync: async (data: CreateWmsScmSyncRequest): Promise<ApiResponse<WmsScmSync>> => {
    return apiClient.integration.post('/wms-scm', data);
  },

  syncWmsScm: async (id: string): Promise<ApiResponse<WmsScmSync>> => {
    return apiClient.integration.post(`/wms-scm/${id}/sync`);
  },

  getIntegrationSyncStats: async (params?: {
    connection_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<IntegrationSyncStats>> => {
    return apiClient.integration.get('/sync-stats', { params });
  },

  getIntegrationSyncHistory: async (params?: {
    connection_id?: string;
    sync_type?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<SyncHistoryItem[]>> => {
    return apiClient.integration.get('/sync-stats/history', { params });
  },
};

export default syncApi;
