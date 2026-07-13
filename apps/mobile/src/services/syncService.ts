import { OfflineService, type OfflineRecord } from './offlineService';
import { apiClient } from '../api/client';
import NetInfo from '@react-native-community/netinfo';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'completed';

export interface SyncResult {
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{ recordId: string; error: string }>;
}

export class SyncService {
  private static syncStatus: SyncStatus = 'idle';
  private static syncInProgress = false;
  private static maxRetryAttempts = 3;
  private static syncDelay = 5000;

  static getStatus(): SyncStatus {
    return this.syncStatus;
  }

  static isSyncing(): boolean {
    return this.syncInProgress;
  }

  static async syncAll(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return { success: 0, failed: 0, skipped: 0, errors: [] };
    }

    this.syncInProgress = true;
    this.syncStatus = 'syncing';

    let success = 0;
    let failed = 0;
    let skipped = 0;
    const errors: Array<{ recordId: string; error: string }> = [];

    try {
      const pendingRecords = await OfflineService.getPendingRecords();

      for (const record of pendingRecords) {
        if (record.syncAttempts >= this.maxRetryAttempts) {
          skipped++;
          continue;
        }

        try {
          await this.syncRecord(record);
          await OfflineService.markAsSynced(record.id);
          success++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await OfflineService.updateSyncAttempt(record.id, errorMessage);
          failed++;
          errors.push({ recordId: record.id, error: errorMessage });
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } finally {
      this.syncInProgress = false;
      this.syncStatus = failed > 0 ? 'error' : 'completed';
    }

    return { success, failed, skipped, errors };
  }

  private static async syncRecord(record: OfflineRecord): Promise<void> {
    const data = JSON.parse(record.data);
    const endpoint = this.getEndpoint(record.module, record.action);

    switch (record.action) {
      case 'create':
        await apiClient.post(endpoint, data);
        break;
      case 'update':
        await apiClient.put(endpoint, data);
        break;
      case 'delete':
        await apiClient.delete(endpoint, { data });
        break;
      default:
        await apiClient.post(endpoint, data);
    }
  }

  private static getEndpoint(module: string, action: string): string {
    const endpoints: Record<string, Record<string, string>> = {
      attendance: {
        create: '/api/core/hrm/v1/attendance',
        update: '/api/core/hrm/v1/attendance',
        delete: '/api/core/hrm/v1/attendance',
      },
      task: {
        create: '/api/core/task/v1/tasks',
        update: '/api/core/task/v1/tasks',
        delete: '/api/core/task/v1/tasks',
      },
      approval: {
        create: '/api/core/flow/v1/approvals',
        update: '/api/core/flow/v1/approvals',
        delete: '/api/core/flow/v1/approvals',
      },
    };

    return endpoints[module]?.[action] || `/api/core/${module}/v1/${action}`;
  }

  static async startAutoSync(): Promise<void> {
    NetInfo.addEventListener(async (state) => {
      if (state.isConnected && state.isInternetReachable) {
        await this.syncAll();
      }
    });
  }

  static async scheduleSync(): Promise<void> {
    setTimeout(async () => {
      const state = await NetInfo.fetch();
      if (state.isConnected && state.isInternetReachable) {
        await this.syncAll();
      }
      this.scheduleSync();
    }, this.syncDelay);
  }

  static async syncModule(module: string): Promise<SyncResult> {
    if (this.syncInProgress) {
      return { success: 0, failed: 0, skipped: 0, errors: [] };
    }

    this.syncInProgress = true;
    this.syncStatus = 'syncing';

    let success = 0;
    let failed = 0;
    let skipped = 0;
    const errors: Array<{ recordId: string; error: string }> = [];

    try {
      const pendingRecords = await OfflineService.getPendingRecords(module);

      for (const record of pendingRecords) {
        if (record.syncAttempts >= this.maxRetryAttempts) {
          skipped++;
          continue;
        }

        try {
          await this.syncRecord(record);
          await OfflineService.markAsSynced(record.id);
          success++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await OfflineService.updateSyncAttempt(record.id, errorMessage);
          failed++;
          errors.push({ recordId: record.id, error: errorMessage });
        }
      }
    } finally {
      this.syncInProgress = false;
      this.syncStatus = failed > 0 ? 'error' : 'completed';
    }

    return { success, failed, skipped, errors };
  }

  static async getSyncStats(): Promise<{
    pendingCount: number;
    status: SyncStatus;
    lastSyncTime?: number;
  }> {
    const pendingCount = await OfflineService.getPendingCount();
    return {
      pendingCount,
      status: this.syncStatus,
    };
  }

  static async handleOfflineAction(
    module: string,
    action: string,
    data: Record<string, unknown>
  ): Promise<{ offlineId: string; isOffline: boolean }> {
    const state = await NetInfo.fetch();
    const isOffline = !state.isConnected || !state.isInternetReachable;

    if (isOffline) {
      const offlineId = await OfflineService.saveOfflineAction(module, action, data);
      return { offlineId, isOffline: true };
    }

    return { offlineId: '', isOffline: false };
  }
}