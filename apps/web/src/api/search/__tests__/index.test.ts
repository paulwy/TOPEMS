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

describe('searchApi', () => {
  beforeEach(() => {
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
    vi.restoreAllMocks();
  });

  describe('globalSearch', () => {
    it('should return API response', async () => {
      const result = await searchApi.globalSearch('test');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('API Result');
      expect(apiClient.core.get).toHaveBeenCalledWith(
        '/api/core/search/global',
        expect.objectContaining({
          params: { query: 'test', limit: 20 },
        })
      );
    });

    it('should pass signal to API request', async () => {
      const abortController = new AbortController();

      await searchApi.globalSearch('test', 10, abortController.signal);

      expect(apiClient.core.get).toHaveBeenCalledWith(
        '/api/core/search/global',
        expect.objectContaining({
          signal: abortController.signal,
        })
      );
    });

    it('should use default limit of 20', async () => {
      await searchApi.globalSearch('test');

      expect(apiClient.core.get).toHaveBeenCalledWith(
        '/api/core/search/global',
        expect.objectContaining({
          params: { query: 'test', limit: 20 },
        })
      );
    });

    it('should throw error when API request fails', async () => {
      vi.mocked(apiClient.core.get).mockRejectedValue(new Error('Network error'));

      await expect(searchApi.globalSearch('test')).rejects.toThrow('Network error');
    });

    it('should throw AbortError without fallback when request is aborted', async () => {
      const abortError = new Error('Request aborted');
      abortError.name = 'AbortError';
      vi.mocked(apiClient.core.get).mockRejectedValue(abortError);

      await expect(searchApi.globalSearch('test')).rejects.toThrow('Request aborted');
    });

    it('should throw CanceledError without fallback', async () => {
      const canceledError = new Error('Request canceled');
      canceledError.name = 'CanceledError';
      vi.mocked(apiClient.core.get).mockRejectedValue(canceledError);

      await expect(searchApi.globalSearch('test')).rejects.toThrow('Request canceled');
    });
  });
});
