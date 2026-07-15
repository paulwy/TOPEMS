import { OfflineService, type OfflineRecord } from './offlineService';
import { NetworkService } from './networkService';
import { apiClient } from '../api/client';

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
  private static syncTimeout: ReturnType<typeof setTimeout> | null = null;
  private static networkListenerUnsubscribe: (() => void) | null = null;

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

    if (NetworkService.isOffline()) {
      console.log('[SyncService] Cannot sync while offline');
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

        if (NetworkService.isOffline()) {
          console.log('[SyncService] Network lost during sync, stopping');
          break;
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
    
    const url = (data as Record<string, unknown>).url as string || '';
    const method = ((data as Record<string, unknown>).method as string || 'POST').toUpperCase();
    const body = (data as Record<string, unknown>).data as Record<string, unknown> || {};

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
      case 'PATCH':
        await apiClient.patch(url, body);
        break;
      default:
        await apiClient.post(url, body);
    }
  }

  static async startAutoSync(): Promise<void> {
    if (this.networkListenerUnsubscribe) {
      this.networkListenerUnsubscribe();
    }

    this.networkListenerUnsubscribe = NetworkService.addListener(async (state) => {
      if (state.status === 'online') {
        const pendingCount = await OfflineService.getPendingCount();
        if (pendingCount > 0) {
          console.log(`[SyncService] Network restored, syncing ${pendingCount} pending records`);
          await this.delaySync();
        }
      }
    });

    this.schedulePeriodicSync();
  }

  private static delaySync(): Promise<void> {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    return new Promise((resolve) => {
      this.syncTimeout = setTimeout(async () => {
        await this.syncAll();
        resolve();
      }, 2000);
    });
  }

  private static schedulePeriodicSync(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    this.syncTimeout = setTimeout(async () => {
      if (!this.syncInProgress && NetworkService.isOnline()) {
        const pendingCount = await OfflineService.getPendingCount();
        if (pendingCount > 0) {
          await this.syncAll();
        }
      }
      this.schedulePeriodicSync();
    }, this.syncDelay);
  }

  static stopAutoSync(): void {
    if (this.networkListenerUnsubscribe) {
      this.networkListenerUnsubscribe();
      this.networkListenerUnsubscribe = null;
    }
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }
  }

  static async syncModule(module: string): Promise<SyncResult> {
    if (this.syncInProgress) {
      return { success: 0, failed: 0, skipped: 0, errors: [] };
    }

    if (NetworkService.isOffline()) {
      console.log('[SyncService] Cannot sync while offline');
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

        if (NetworkService.isOffline()) {
          break;
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
    data: Record<string, unknown>,
  ): Promise<{ offlineId: string; isOffline: boolean }> {
    const isOffline = NetworkService.isOffline();

    if (isOffline) {
      const offlineId = await OfflineService.saveOfflineAction(module, action, data);
      return { offlineId, isOffline: true };
    }

    return { offlineId: '', isOffline: false };
  }
}
