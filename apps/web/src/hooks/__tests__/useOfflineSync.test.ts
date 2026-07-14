import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOfflineSync } from '../useOfflineSync';
import { useNetworkStatus } from '../useNetworkStatus';
import { getServiceClient } from '@/lib/apiClient';
import {
  saveOfflineRecord,
  getOfflineRecords,
  updateOfflineRecord,
  deleteOfflineRecord,
  getOfflineCount,
  clearAllOfflineRecords,
} from '@/services/offlineStorage';
import { syncPendingRecords } from '@/services/offlineSync';

vi.mock('../useNetworkStatus');
vi.mock('@/lib/apiClient');
vi.mock('@/services/offlineStorage');
vi.mock('@/services/offlineSync');

describe('useOfflineSync', () => {
  const mockUseNetworkStatus = useNetworkStatus as Mock;
  const mockGetServiceClient = getServiceClient as Mock;
  const mockSaveOfflineRecord = saveOfflineRecord as Mock;
  const mockGetOfflineRecords = getOfflineRecords as Mock;
  const mockUpdateOfflineRecord = updateOfflineRecord as Mock;
  const mockDeleteOfflineRecord = deleteOfflineRecord as Mock;
  const mockGetOfflineCount = getOfflineCount as Mock;
  const mockClearAllOfflineRecords = clearAllOfflineRecords as Mock;
  const mockSyncPendingRecords = syncPendingRecords as Mock;

  beforeEach(() => {
    vi.useFakeTimers();
    mockUseNetworkStatus.mockReturnValue({
      status: 'online',
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false,
    });
    mockSaveOfflineRecord.mockResolvedValue('test-record-id');
    mockGetOfflineRecords.mockResolvedValue([]);
    mockUpdateOfflineRecord.mockResolvedValue();
    mockDeleteOfflineRecord.mockResolvedValue();
    mockGetOfflineCount.mockResolvedValue(0);
    mockClearAllOfflineRecords.mockResolvedValue();
    mockSyncPendingRecords.mockResolvedValue({
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
    });
    mockGetServiceClient.mockReturnValue({
      post: vi.fn().mockResolvedValue({}),
      put: vi.fn().mockResolvedValue({}),
      patch: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should initialize with default sync status', async () => {
    mockGetOfflineCount.mockResolvedValue(0);

    const { result } = renderHook(() => useOfflineSync());

    expect(result.current.syncStatus).toEqual({
      isSyncing: false,
      pendingCount: 0,
    });
  });

  it('should queue offline request when offline', async () => {
    mockUseNetworkStatus.mockReturnValue({
      status: 'offline',
      effectiveType: undefined,
      downlink: undefined,
      rtt: undefined,
      saveData: undefined,
    });
    mockSaveOfflineRecord.mockResolvedValue('offline-record-1');
    mockGetOfflineCount.mockResolvedValue(1);

    const { result } = renderHook(() => useOfflineSync());

    let recordId: string | null = null;
    await act(async () => {
      recordId = await result.current.queueOfflineRequest({
        service: 'hrm' as any,
        endpoint: '/api/employees',
        method: 'POST',
        data: { name: 'John' },
      });
    });

    expect(mockSaveOfflineRecord).toHaveBeenCalledWith({
      service: 'hrm',
      endpoint: '/api/employees',
      method: 'POST',
      data: { name: 'John' },
      timestamp: expect.any(Number),
    });
    expect(recordId).toBe('offline-record-1');
    expect(result.current.syncStatus.pendingCount).toBe(1);
  });

  it('should trigger sync when network status changes from offline to online', async () => {
    mockUseNetworkStatus.mockReturnValue({
      status: 'offline',
      effectiveType: undefined,
      downlink: undefined,
      rtt: undefined,
      saveData: undefined,
    });
    mockGetOfflineCount.mockResolvedValue(2);

    const { result, rerender } = renderHook(() => useOfflineSync());

    await act(async () => {
      await result.current.queueOfflineRequest({
        service: 'hrm' as any,
        endpoint: '/api/employees/1',
        method: 'PUT',
        data: { name: 'Updated' },
      });
    });

    expect(result.current.syncStatus.pendingCount).toBe(2);

    mockUseNetworkStatus.mockReturnValue({
      status: 'online',
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false,
    });
    mockSyncPendingRecords.mockResolvedValue({
      successCount: 2,
      failedCount: 0,
      skippedCount: 0,
    });
    mockGetOfflineCount.mockResolvedValue(0);

    rerender();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockSyncPendingRecords).toHaveBeenCalled();
    expect(result.current.syncStatus.isSyncing).toBe(false);
    expect(result.current.syncStatus.pendingCount).toBe(0);
  });

  it('should not trigger sync when already syncing', async () => {
    mockUseNetworkStatus.mockReturnValue({
      status: 'online',
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false,
    });
    mockGetOfflineCount.mockResolvedValue(1);

    let resolveSync: () => void;
    mockSyncPendingRecords.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSync = resolve;
        })
    );

    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      result.current.triggerSync();
    });

    expect(result.current.syncStatus.isSyncing).toBe(true);

    await act(async () => {
      result.current.triggerSync();
    });

    expect(mockSyncPendingRecords).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSync!();
    });

    expect(result.current.syncStatus.isSyncing).toBe(false);
  });

  it('should not trigger sync when network is offline', async () => {
    mockUseNetworkStatus.mockReturnValue({
      status: 'offline',
      effectiveType: undefined,
      downlink: undefined,
      rtt: undefined,
      saveData: undefined,
    });

    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      result.current.triggerSync();
    });

    expect(mockSyncPendingRecords).not.toHaveBeenCalled();
    expect(result.current.syncStatus.isSyncing).toBe(false);
  });

  it('should handle sync errors', async () => {
    mockUseNetworkStatus.mockReturnValue({
      status: 'online',
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false,
    });
    mockSyncPendingRecords.mockRejectedValue(new Error('API connection failed'));
    mockGetOfflineCount.mockResolvedValue(1);

    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      result.current.triggerSync();
    });

    expect(result.current.syncStatus.isSyncing).toBe(false);
    expect(result.current.syncStatus.syncError).toBe('API connection failed');
    expect(result.current.syncStatus.pendingCount).toBe(1);
  });

  it('should update pending count on interval when online', async () => {
    mockUseNetworkStatus.mockReturnValue({
      status: 'online',
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false,
    });
    mockGetOfflineCount.mockResolvedValue(3);

    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    expect(mockGetOfflineCount).toHaveBeenCalled();
    expect(result.current.syncStatus.pendingCount).toBe(3);
  });

  it('should update lastSyncTime on successful sync', async () => {
    mockUseNetworkStatus.mockReturnValue({
      status: 'online',
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false,
    });
    mockSyncPendingRecords.mockResolvedValue({
      successCount: 1,
      failedCount: 0,
      skippedCount: 0,
    });
    mockGetOfflineCount.mockResolvedValue(0);

    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      result.current.triggerSync();
    });

    expect(result.current.syncStatus.lastSyncTime).toBeDefined();
    expect(typeof result.current.syncStatus.lastSyncTime).toBe('number');
  });
});