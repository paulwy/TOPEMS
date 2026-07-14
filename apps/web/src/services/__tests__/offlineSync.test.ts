import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { getServiceClient } from '@/lib/apiClient';
import {
  getOfflineRecords,
  updateOfflineRecord,
  deleteOfflineRecord,
} from '../offlineStorage';
import { syncPendingRecords } from '../offlineSync';

vi.mock('@/lib/apiClient');
vi.mock('../offlineStorage');

describe('offlineSync service', () => {
  const mockGetServiceClient = getServiceClient as Mock;
  const mockGetOfflineRecords = getOfflineRecords as Mock;
  const mockUpdateOfflineRecord = updateOfflineRecord as Mock;
  const mockDeleteOfflineRecord = deleteOfflineRecord as Mock;

  beforeEach(() => {
    mockGetOfflineRecords.mockResolvedValue([]);
    mockUpdateOfflineRecord.mockResolvedValue();
    mockDeleteOfflineRecord.mockResolvedValue();
    mockGetServiceClient.mockReturnValue({
      post: vi.fn().mockResolvedValue({}),
      put: vi.fn().mockResolvedValue({}),
      patch: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should sync pending records successfully', async () => {
    const mockPost = vi.fn().mockResolvedValue({});
    mockGetServiceClient.mockReturnValue({
      post: mockPost,
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    });
    mockGetOfflineRecords.mockResolvedValue([
      {
        id: 'record-1',
        service: 'hrm',
        endpoint: '/api/employees',
        method: 'POST',
        data: { name: 'Test' },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      },
    ]);

    const result = await syncPendingRecords();

    expect(result.successCount).toBe(1);
    expect(result.failedCount).toBe(0);
    expect(result.skippedCount).toBe(0);
    expect(mockPost).toHaveBeenCalledWith('/api/employees', { name: 'Test' });
    expect(mockUpdateOfflineRecord).toHaveBeenCalledWith('record-1', {
      status: 'syncing',
    });
    expect(mockDeleteOfflineRecord).toHaveBeenCalledWith('record-1');
  });

  it('should retry failed sync with exponential backoff', async () => {
    let callCount = 0;
    const mockPost = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        throw new Error('Network error');
      }
      return Promise.resolve({});
    });
    mockGetServiceClient.mockReturnValue({
      post: mockPost,
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    });
    mockGetOfflineRecords.mockResolvedValue([
      {
        id: 'record-1',
        service: 'hrm',
        endpoint: '/api/employees',
        method: 'POST',
        data: { name: 'Test' },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      },
    ]);

    const mockSetTimeout = vi.spyOn(global, 'setTimeout').mockImplementation((callback) => {
      callback();
      return 0 as ReturnType<typeof setTimeout>;
    });

    const result = await syncPendingRecords();

    expect(mockPost).toHaveBeenCalledTimes(3);
    expect(result.successCount).toBe(1);
    expect(mockDeleteOfflineRecord).toHaveBeenCalledWith('record-1');

    mockSetTimeout.mockRestore();
  });

  it('should mark record as failed after max retries', async () => {
    const mockPost = vi.fn().mockRejectedValue(new Error('Persistent error'));
    mockGetServiceClient.mockReturnValue({
      post: mockPost,
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    });
    mockGetOfflineRecords.mockResolvedValue([
      {
        id: 'record-1',
        service: 'hrm',
        endpoint: '/api/employees',
        method: 'POST',
        data: { name: 'Test' },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      },
    ]);

    const mockSetTimeout = vi.spyOn(global, 'setTimeout').mockImplementation((callback) => {
      callback();
      return 0 as ReturnType<typeof setTimeout>;
    });

    const result = await syncPendingRecords();

    expect(mockPost).toHaveBeenCalledTimes(5);
    expect(result.failedCount).toBe(1);
    expect(mockUpdateOfflineRecord).toHaveBeenLastCalledWith('record-1', {
      status: 'failed',
      retryCount: 5,
      error: 'Persistent error',
    });
    expect(mockDeleteOfflineRecord).not.toHaveBeenCalled();

    mockSetTimeout.mockRestore();
  });

  it('should skip GET requests', async () => {
    mockGetOfflineRecords.mockResolvedValue([
      {
        id: 'get-record',
        service: 'hrm',
        endpoint: '/api/employees',
        method: 'GET',
        data: {},
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      },
    ]);

    const result = await syncPendingRecords();

    expect(result.skippedCount).toBe(1);
    expect(result.successCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(mockUpdateOfflineRecord).toHaveBeenCalledWith('get-record', {
      status: 'synced',
    });
    expect(mockDeleteOfflineRecord).not.toHaveBeenCalled();
  });

  it('should handle multiple pending records', async () => {
    const mockPost = vi.fn().mockResolvedValue({});
    const mockPut = vi.fn().mockResolvedValue({});
    mockGetServiceClient.mockReturnValue({
      post: mockPost,
      put: mockPut,
      patch: vi.fn(),
      delete: vi.fn(),
    });
    mockGetOfflineRecords.mockResolvedValue([
      {
        id: 'record-1',
        service: 'hrm',
        endpoint: '/api/employees',
        method: 'POST',
        data: { name: 'Test1' },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      },
      {
        id: 'record-2',
        service: 'hrm',
        endpoint: '/api/employees/1',
        method: 'PUT',
        data: { name: 'Updated' },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      },
    ]);

    const result = await syncPendingRecords();

    expect(result.successCount).toBe(2);
    expect(mockPost).toHaveBeenCalledWith('/api/employees', { name: 'Test1' });
    expect(mockPut).toHaveBeenCalledWith('/api/employees/1', { name: 'Updated' });
    expect(mockDeleteOfflineRecord).toHaveBeenCalledTimes(2);
  });

  it('should handle mixed success and failure', async () => {
    const mockPost = vi.fn().mockImplementation((endpoint) => {
      if (endpoint === '/api/employees/2') {
        throw new Error('Network error');
      }
      return Promise.resolve({});
    });
    mockGetServiceClient.mockReturnValue({
      post: mockPost,
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    });
    mockGetOfflineRecords.mockResolvedValue([
      {
        id: 'record-1',
        service: 'hrm',
        endpoint: '/api/employees/1',
        method: 'POST',
        data: { name: 'Success' },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      },
      {
        id: 'record-2',
        service: 'hrm',
        endpoint: '/api/employees/2',
        method: 'POST',
        data: { name: 'Failure' },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      },
      {
        id: 'record-3',
        service: 'hrm',
        endpoint: '/api/employees/3',
        method: 'POST',
        data: { name: 'Success2' },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      },
    ]);

    const mockSetTimeout = vi.spyOn(global, 'setTimeout').mockImplementation((callback) => {
      callback();
      return 0 as ReturnType<typeof setTimeout>;
    });

    const result = await syncPendingRecords();

    expect(result.successCount).toBe(2);
    expect(result.failedCount).toBe(1);

    mockSetTimeout.mockRestore();
  });
});