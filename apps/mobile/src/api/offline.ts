import { apiClient } from './client';
import type { ApiResponse } from '@/types';
import { OfflineService } from '@/services/offlineService';
import { SyncService, type SyncStatus } from '@/services/syncService';
import { NetworkService } from '@/services/networkService';

export interface MobileSyncRecord {
  id: string;
  module: string;
  action: string;
  data: Record<string, unknown>;
  createdAt: number;
  synced: boolean;
  syncAttempts: number;
  lastSyncAttempt?: number;
  error?: string;
}

export interface MobileSyncResponse {
  success: string[];
  failed: Array<{ id: string; error: string }>;
}

export const offlineApi = {
  getSyncRecords: async (params: {
    page?: number;
    pageSize?: number;
    status?: string;
  }): Promise<ApiResponse<{ items: MobileSyncRecord[]; total: number }>> => {
    const allRecords = await OfflineService.getAllRecords();

    let filtered = allRecords;
    if (params.status === 'pending') {
      filtered = filtered.filter((r) => !r.synced);
    } else if (params.status === 'synced') {
      filtered = filtered.filter((r) => r.synced);
    }

    filtered.sort((a, b) => b.createdAt - a.createdAt);

    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const items = filtered.slice(start, end).map((r) => ({
      id: r.id,
      module: r.module,
      action: r.action,
      data: JSON.parse(r.data),
      createdAt: r.createdAt,
      synced: r.synced,
      syncAttempts: r.syncAttempts,
      lastSyncAttempt: r.lastSyncAttempt,
      error: r.error,
    }));

    return {
      success: true,
      message: '',
      data: { items, total: filtered.length },
    };
  },

  syncRecords: async (records: MobileSyncRecord[]): Promise<ApiResponse<MobileSyncResponse>> => {
    if (NetworkService.isOffline()) {
      return {
        success: false,
        message: '当前处于离线状态，无法同步',
        data: { success: [], failed: records.map((r) => ({ id: r.id, error: 'Offline' })) },
      };
    }

    let success: string[] = [];
    let failed: Array<{ id: string; error: string }> = [];

    for (const record of records) {
      try {
        const data = JSON.parse((await OfflineService.getRecord(record.id))?.data || '{}');
        const url = ((data as Record<string, unknown>).url as string) || '';
        const method = (
          ((data as Record<string, unknown>).method as string) || 'POST'
        ).toUpperCase();
        const body = ((data as Record<string, unknown>).data as Record<string, unknown>) || {};

        switch (method) {
          case 'POST':
            await apiClient.post(url, body);
            break;
          case 'PUT':
            await apiClient.put(url, body);
            break;
          case 'DELETE':
            await apiClient.delete(url, { data: body });
            break;
          default:
            await apiClient.post(url, body);
        }

        await OfflineService.markAsSynced(record.id);
        success.push(record.id);
      } catch (error) {
        failed.push({
          id: record.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: true,
      message: '',
      data: { success, failed },
    };
  },

  syncAll: async (): Promise<ApiResponse<{ success: number; failed: number; skipped: number }>> => {
    if (NetworkService.isOffline()) {
      return {
        success: false,
        message: '当前处于离线状态，无法同步',
        data: { success: 0, failed: 0, skipped: 0 },
      };
    }

    const result = await SyncService.syncAll();
    return {
      success: result.failed === 0,
      message: result.failed > 0 ? `同步完成，${result.failed} 条失败` : '同步完成',
      data: { success: result.success, failed: result.failed, skipped: result.skipped },
    };
  },

  markAsSynced: async (recordId: string): Promise<ApiResponse<void>> => {
    await OfflineService.markAsSynced(recordId);
    return { success: true, message: '', data: undefined };
  },

  clearSynced: async (): Promise<ApiResponse<void>> => {
    await OfflineService.clearAllSynced();
    return { success: true, message: '', data: undefined };
  },

  getSyncStatus: async (): Promise<
    ApiResponse<{
      isSyncing: boolean;
      status: SyncStatus;
      pendingCount: number;
      lastSyncTime?: number;
    }>
  > => {
    const [stats, syncStats] = await Promise.all([
      OfflineService.getStats(),
      SyncService.getSyncStats(),
    ]);

    return {
      success: true,
      message: '',
      data: {
        isSyncing: SyncService.isSyncing(),
        ...syncStats,
        status: SyncService.getStatus(),
        pendingCount: stats.pendingRecords,
      },
    };
  },

  getOfflineStats: async (): Promise<
    ApiResponse<{
      pendingRecords: number;
      cachedEntries: number;
      userSessions: number;
    }>
  > => {
    const stats = await OfflineService.getStats();
    return { success: true, message: '', data: stats };
  },

  saveOfflineAction: async (
    module: string,
    action: string,
    data: Record<string, unknown>,
  ): Promise<ApiResponse<{ offlineId: string }>> => {
    const offlineId = await OfflineService.saveOfflineAction(module, action, data);
    return { success: true, message: '', data: { offlineId } };
  },

  getPendingRecords: async (module?: string): Promise<ApiResponse<MobileSyncRecord[]>> => {
    const records = await OfflineService.getPendingRecords(module);
    const items = records.map((r) => ({
      id: r.id,
      module: r.module,
      action: r.action,
      data: JSON.parse(r.data),
      createdAt: r.createdAt,
      synced: r.synced,
      syncAttempts: r.syncAttempts,
      lastSyncAttempt: r.lastSyncAttempt,
      error: r.error,
    }));
    return { success: true, message: '', data: items };
  },

  deleteRecord: async (recordId: string): Promise<ApiResponse<void>> => {
    await OfflineService.deleteRecord(recordId);
    return { success: true, message: '', data: undefined };
  },

  clearAll: async (): Promise<ApiResponse<void>> => {
    await OfflineService.clearAll();
    return { success: true, message: '', data: undefined };
  },
};
