import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { searchApi } from '../index';
import apiClient from '@/api/client';

vi.mock('@/api/client', () => ({
  default: {
    core: {
      get: vi.fn(),
    },
  },
}));

describe('searchApi.globalSearch', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
    vi.mocked(apiClient.core.get).mockResolvedValue({
      success: true,
      code: 200,
      message: 'ok',
      data: [{ id: '1', title: 'API Result', module: 'user', path: '/api', type_name: '用户' }],
      timestamp: Date.now(),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should make API call to core service', async () => {
    const mockResponse = {
      success: true,
      code: 200,
      message: 'ok',
      data: [
        {
          id: 'test',
          title: 'Test Result',
          description: '',
          module: 'user',
          path: '/test',
          type_name: '测试',
        },
      ],
      timestamp: Date.now(),
    };

    vi.mocked(apiClient.core.get).mockResolvedValue(mockResponse);

    const result = await searchApi.globalSearch('test', 10);

    expect(apiClient.core.get).toHaveBeenCalledWith('/api/core/search/global', {
      params: { query: 'test', limit: 10 },
      signal: undefined,
    });
    expect(result).toEqual(mockResponse);
  });

  it('should pass signal parameter to API call', async () => {
    const mockResponse = {
      success: true,
      code: 200,
      message: 'ok',
      data: [],
      timestamp: Date.now(),
    };

    vi.mocked(apiClient.core.get).mockResolvedValue(mockResponse);

    const controller = new AbortController();
    await searchApi.globalSearch('test', 10, controller.signal);

    expect(apiClient.core.get).toHaveBeenCalledWith('/api/core/search/global', {
      params: { query: 'test', limit: 10 },
      signal: controller.signal,
    });
  });

  it('should use default limit of 20', async () => {
    await searchApi.globalSearch('test');

    expect(apiClient.core.get).toHaveBeenCalledWith('/api/core/search/global', {
      params: { query: 'test', limit: 20 },
      signal: undefined,
    });
  });

  it('should throw error when API call fails', async () => {
    vi.mocked(apiClient.core.get).mockRejectedValue(new Error('Network error'));

    await expect(searchApi.globalSearch('test')).rejects.toThrow('Network error');
  });

  it('should throw AbortError when request is aborted', async () => {
    const abortError = new Error('AbortError');
    abortError.name = 'AbortError';

    vi.mocked(apiClient.core.get).mockRejectedValue(abortError);

    await expect(searchApi.globalSearch('test', 10, new AbortController().signal)).rejects.toThrow(
      'AbortError'
    );
  });
});
