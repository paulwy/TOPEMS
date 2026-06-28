import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type { SyncRecord, SyncRecordItem, SyncStatistics, SyncPaginationParams } from './types';

export const syncRecordApi = {
  list: async (
    params?: SyncPaginationParams
  ): Promise<ApiResponse<PaginatedResponse<SyncRecord>>> => {
    return apiClient.wms.get('/sync-records', { params });
  },

  get: async (id: string): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.wms.get(`/sync-records/${id}`);
  },

  listItems: async (
    sync_record_id: string,
    params?: { status?: string; page?: number; pagesize?: number }
  ): Promise<ApiResponse<PaginatedResponse<SyncRecordItem>>> => {
    return apiClient.wms.get(`/sync-records/${sync_record_id}/items`, { params });
  },

  retry: async (id: string): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.wms.post(`/sync-records/${id}/retry`);
  },

  retryFailedItems: async (
    id: string,
    item_ids?: string[]
  ): Promise<ApiResponse<{ retried_count: number }>> => {
    return apiClient.wms.post(`/sync-records/${id}/retry-items`, { item_ids });
  },

  getStatistics: async (params?: {
    sync_type?: string;
    date_range?: string;
  }): Promise<ApiResponse<SyncStatistics>> => {
    return apiClient.wms.get('/sync-records/statistics', { params });
  },
};

export const syncApi = {
  withScm: async (data: {
    sync_type: string;
    full_sync?: boolean;
  }): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.wms.post('/sync/scm', data);
  },

  inventoryWithScm: async (data?: {
    warehouse_id?: string;
    sku?: string;
    full_sync?: boolean;
  }): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.wms.post('/sync/scm/inventory', data);
  },

  ordersWithScm: async (data?: {
    order_type?: string;
    date_range?: string;
    full_sync?: boolean;
  }): Promise<ApiResponse<SyncRecord>> => {
    return apiClient.wms.post('/sync/scm/orders', data);
  },
};

export async function listSyncRecords(
  params?: SyncPaginationParams
): Promise<ApiResponse<PaginatedResponse<SyncRecord>>> {
  return syncRecordApi.list(params);
}

export async function getSyncRecord(id: string): Promise<ApiResponse<SyncRecord>> {
  return syncRecordApi.get(id);
}

export async function listSyncRecordItems(
  sync_record_id: string,
  params?: { status?: string; page?: number; pagesize?: number }
): Promise<ApiResponse<PaginatedResponse<SyncRecordItem>>> {
  return syncRecordApi.listItems(sync_record_id, params);
}

export async function retrySyncRecord(id: string): Promise<ApiResponse<SyncRecord>> {
  return syncRecordApi.retry(id);
}

export async function retryFailedSyncItems(
  id: string,
  item_ids?: string[]
): Promise<ApiResponse<{ retried_count: number }>> {
  return syncRecordApi.retryFailedItems(id, item_ids);
}

export async function getSyncStatistics(params?: {
  sync_type?: string;
  date_range?: string;
}): Promise<ApiResponse<SyncStatistics>> {
  return syncRecordApi.getStatistics(params);
}

export async function syncWithScm(data: {
  sync_type: string;
  full_sync?: boolean;
}): Promise<ApiResponse<SyncRecord>> {
  return syncApi.withScm(data);
}

export async function syncInventoryWithScm(data?: {
  warehouse_id?: string;
  sku?: string;
  full_sync?: boolean;
}): Promise<ApiResponse<SyncRecord>> {
  return syncApi.inventoryWithScm(data);
}

export async function syncOrdersWithScm(data?: {
  order_type?: string;
  date_range?: string;
  full_sync?: boolean;
}): Promise<ApiResponse<SyncRecord>> {
  return syncApi.ordersWithScm(data);
}

export default syncRecordApi;
