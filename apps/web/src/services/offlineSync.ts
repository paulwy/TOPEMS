import { getServiceClient } from '@/lib/apiClient';
import {
  getOfflineRecords,
  updateOfflineRecord,
  deleteOfflineRecord,
  type OfflineRecord,
} from './offlineStorage';

const MAX_RETRY_COUNT = 5;
const RETRY_DELAY_BASE = 1000;

function getRetryDelay(retryCount: number): number {
  return RETRY_DELAY_BASE * Math.pow(2, retryCount);
}

async function executeRequest(record: OfflineRecord): Promise<void> {
  const client = getServiceClient(record.service);

  switch (record.method) {
    case 'POST':
      await client.post(record.endpoint, record.data);
      break;
    case 'PUT':
      await client.put(record.endpoint, record.data);
      break;
    case 'PATCH':
      await client.patch(record.endpoint, record.data);
      break;
    case 'DELETE':
      await client.delete(record.endpoint);
      break;
    default:
      break;
  }
}

export async function syncPendingRecords(): Promise<{
  successCount: number;
  failedCount: number;
  skippedCount: number;
}> {
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  try {
    const pendingRecords = await getOfflineRecords('pending');

    for (const record of pendingRecords) {
      let currentRetryCount = record.retryCount;
      let success = false;

      if (record.method === 'GET') {
        skippedCount++;
        await updateOfflineRecord(record.id, { status: 'synced' });
        continue;
      }

      while (!success && currentRetryCount < MAX_RETRY_COUNT) {
        await updateOfflineRecord(record.id, { status: 'syncing' });

        try {
          await executeRequest(record);
          await deleteOfflineRecord(record.id);
          successCount++;
          success = true;
        } catch (error) {
          currentRetryCount++;

          if (currentRetryCount >= MAX_RETRY_COUNT) {
            await updateOfflineRecord(record.id, {
              status: 'failed',
              retryCount: currentRetryCount,
              error: error instanceof Error ? error.message : 'Sync failed',
            });
            failedCount++;
          } else {
            await updateOfflineRecord(record.id, {
              status: 'pending',
              retryCount: currentRetryCount,
            });
            await new Promise((resolve) =>
              setTimeout(resolve, getRetryDelay(currentRetryCount))
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('[offlineSync] Failed to get pending records:', error);
  }

  return { successCount, failedCount, skippedCount };
}

export async function syncSingleRecord(recordId: string): Promise<boolean> {
  try {
    const records = await getOfflineRecords();
    const record = records.find((r) => r.id === recordId);

    if (!record) {
      return false;
    }

    await updateOfflineRecord(record.id, { status: 'syncing' });

    const client = getServiceClient(record.service);

    switch (record.method) {
      case 'POST':
        await client.post(record.endpoint, record.data);
        break;
      case 'PUT':
        await client.put(record.endpoint, record.data);
        break;
      case 'PATCH':
        await client.patch(record.endpoint, record.data);
        break;
      case 'DELETE':
        await client.delete(record.endpoint);
        break;
      default:
        break;
    }

    await deleteOfflineRecord(record.id);
    return true;
  } catch (error) {
    console.error('[offlineSync] Failed to sync record:', error);
    return false;
  }
}