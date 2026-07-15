import { useState, useEffect, useCallback, useRef } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { syncPendingRecords } from '@/services/offlineSync';
import { getOfflineCount, saveOfflineRecord } from '@/services/offlineStorage';
import type { ServiceName } from '@/lib/apiClient';
import { logger } from '@/utils/logger';

export interface SyncStatus {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime?: number;
  syncError?: string;
}

export interface OfflineRequest {
  service: ServiceName;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data: unknown;
}

export function useOfflineSync(): {
  syncStatus: SyncStatus;
  triggerSync: () => Promise<void>;
  queueOfflineRequest: (request: OfflineRequest) => Promise<string | null>;
} {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    pendingCount: 0,
  });

  const isSyncingRef = useRef(false);
  const { status: networkStatus } = useNetworkStatus();

  const updatePendingCount = useCallback(async () => {
    const count = await getOfflineCount();
    setSyncStatus((prev) => ({ ...prev, pendingCount: count }));
  }, []);

  const triggerSync = useCallback(async () => {
    if (isSyncingRef.current) return;
    if (networkStatus === 'offline') return;

    isSyncingRef.current = true;
    setSyncStatus((prev) => ({ ...prev, isSyncing: true, syncError: undefined }));

    try {
      await syncPendingRecords();
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: Date.now(),
      }));
      await updatePendingCount();
    } catch (error) {
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        syncError: error instanceof Error ? error.message : 'Sync failed',
      }));
    } finally {
      isSyncingRef.current = false;
    }
  }, [networkStatus, updatePendingCount]);

  const queueOfflineRequest = useCallback(
    async (request: OfflineRequest): Promise<string | null> => {
      try {
        const recordId = await saveOfflineRecord({
          service: request.service,
          endpoint: request.endpoint,
          method: request.method,
          data: request.data,
          timestamp: Date.now(),
        });
        await updatePendingCount();
        return recordId;
      } catch (error) {
        logger.error('[useOfflineSync] Failed to queue request:', error);
        return null;
      }
    },
    [updatePendingCount]
  );

  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  useEffect(() => {
    if (networkStatus === 'online') {
      const timer = setTimeout(() => {
        triggerSync();
      }, 1000);
      return () => clearTimeout(timer);
    }
    return;
  }, [networkStatus, triggerSync]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (networkStatus === 'online') {
        updatePendingCount();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [networkStatus, updatePendingCount]);

  return {
    syncStatus,
    triggerSync,
    queueOfflineRequest,
  };
}
