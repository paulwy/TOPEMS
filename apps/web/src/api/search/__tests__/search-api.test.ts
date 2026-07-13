import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/api/client', () => ({
  default: {
    erp: {
      get: vi.fn(),
    },
  },
}));

import { searchApi } from '../index';
import { getMockSearchResults, shouldUseMock, isDev } from '@/mock/search';

describe('search-api mock logic', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('shouldUseMock', () => {
    it('should return true when VITE_USE_MOCK is true', () => {
      vi.stubEnv('VITE_USE_MOCK', 'true');
      expect(shouldUseMock()).toBe(true);
    });

    it('should return true when in dev and VITE_API_BASE_URL is not set', () => {
      vi.stubEnv('NODE_ENV', 'development');
      delete process.env.VITE_API_BASE_URL;
      delete process.env.VITE_USE_MOCK;
      expect(shouldUseMock()).toBe(true);
    });

    it('should return false when VITE_API_BASE_URL is set', () => {
      vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000');
      delete process.env.VITE_USE_MOCK;
      expect(shouldUseMock()).toBe(false);
    });
  });

  describe('getMockSearchResults', () => {
    it('should return all results when query is empty', () => {
      const results = getMockSearchResults('', 10);
      expect(results).toHaveLength(10);
    });

    it('should return empty array when query has no matches', () => {
      const results = getMockSearchResults('nonexistent-keyword-xyz', 10);
      expect(results).toHaveLength(0);
    });

    it('should return results matching title', () => {
      const results = getMockSearchResults('管理员', 10);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('管理员账户');
    });

    it('should return results matching description', () => {
      const results = getMockSearchResults('VIP客户', 10);
      expect(results).toHaveLength(1);
      expect(results[0].module).toBe('customer');
    });

    it('should return results matching module', () => {
      const results = getMockSearchResults('user', 10);
      expect(results).toHaveLength(3);
      expect(results.every((r) => r.module === 'user')).toBe(true);
    });

    it('should return results matching type_name', () => {
      const results = getMockSearchResults('报表', 10);
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.type_name === '报表')).toBe(true);
    });

    it('should respect limit parameter', () => {
      const results = getMockSearchResults('用户', 2);
      expect(results).toHaveLength(2);
    });

    it('should be case insensitive for English', () => {
      const results = getMockSearchResults('USER', 10);
      expect(results).toHaveLength(3);
    });
  });

  describe('isDev', () => {
    it('should reflect import.meta.env.DEV', () => {
      expect(isDev).toBe(true);
    });
  });
});

describe('searchApi.globalSearch', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return mock results when shouldUseMock returns true', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'true');

    const result = await searchApi.globalSearch('用户', 10);

    expect(result.success).toBe(true);
    expect(result.code).toBe(200);
    expect(result.data).toHaveLength(3);
    expect(result.data[0].title).toBe('管理员账户');
  });

  it('should make API call when shouldUseMock returns false', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000');

    const mockResponse = {
      success: true,
      code: 200,
      message: 'ok',
      data: [
        { id: 'test', title: 'Test Result', description: '', module: 'user', path: '/test', type_name: '测试' },
      ],
      timestamp: Date.now(),
    };

    const { default: apiClient } = await import('@/api/client');
    apiClient.erp.get = vi.fn().mockResolvedValue(mockResponse);

    const result = await searchApi.globalSearch('test', 10);

    expect(apiClient.erp.get).toHaveBeenCalledWith('/search/global', {
      params: { query: 'test', limit: 10 },
      signal: undefined,
    });
    expect(result).toEqual(mockResponse);
  });

  it('should fallback to mock when API call fails', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000');

    const { default: apiClient } = await import('@/api/client');
    apiClient.erp.get = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await searchApi.globalSearch('用户', 10);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(3);
    expect(result.message).toBe('mock fallback');
  });

  it('should not fallback when request is aborted', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000');

    const abortError = new Error('AbortError');
    abortError.name = 'AbortError';

    const { default: apiClient } = await import('@/api/client');
    apiClient.erp.get = vi.fn().mockRejectedValue(abortError);

    await expect(searchApi.globalSearch('用户', 10, new AbortController().signal)).rejects.toThrow('AbortError');
  });

  it('should pass signal parameter to API call', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000');

    const mockResponse = {
      success: true,
      code: 200,
      message: 'ok',
      data: [],
      timestamp: Date.now(),
    };

    const { default: apiClient } = await import('@/api/client');
    apiClient.erp.get = vi.fn().mockResolvedValue(mockResponse);

    const controller = new AbortController();
    await searchApi.globalSearch('test', 10, controller.signal);

    expect(apiClient.erp.get).toHaveBeenCalledWith('/search/global', {
      params: { query: 'test', limit: 10 },
      signal: controller.signal,
    });
  });
});
