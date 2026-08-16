import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchApi } from '../index';
import apiClient from '@/api/client';

vi.mock('@/api/client', () => {
  const portalGetMock = vi.fn();
  const apiClient = {
    portal: {
      get: portalGetMock,
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
    auth: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    im: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    gis: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    core: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    request: vi.fn(),
    setBaseURL: vi.fn(),
    setRequestHeader: vi.fn(),
    setRequestInterceptor: vi.fn(),
    setResponseInterceptor: vi.fn(),
    upload: vi.fn(),
    download: vi.fn(),
  };
  return {
    default: apiClient,
    apiClient,
    __portalGetMock: portalGetMock,
  };
});

describe('searchApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.portal.get).mockResolvedValue({
      success: true,
      code: 200,
      message: 'ok',
      data: {
        total: 1,
        by_service: {},
        results: [{ id: '1', title: 'API Result', summary: 'summary', highlight_title: 'API Result', highlight_summary: 'summary', service: 'user', service_name: '用户', url: '/api', result_type: 'page', type_name: '用户' }],
        duration_ms: 50,
      },
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
      expect(result.data.results).toHaveLength(1);
      expect(result.data.results[0].title).toBe('API Result');
      expect(apiClient.portal.get).toHaveBeenCalledWith(
        '/search?q=test&limit=20',
        expect.objectContaining({})
      );
    });

    it('should pass signal to API request', async () => {
      const abortController = new AbortController();

      await searchApi.globalSearch('test', 10, abortController.signal);

      expect(apiClient.portal.get).toHaveBeenCalledWith(
        '/search?q=test&limit=10',
        expect.objectContaining({
          signal: abortController.signal,
        })
      );
    });

    it('should call API with correct query and limit params', async () => {
      vi.mocked(apiClient.portal.get).mockResolvedValue({
        success: true, code: 200, message: 'ok',
        data: { total: 0, by_service: {}, results: [], duration_ms: 0 },
        timestamp: Date.now(),
      });

      await searchApi.globalSearch('myquery', 50);

      expect(apiClient.portal.get).toHaveBeenCalledWith(
        '/search?q=myquery&limit=50',
        expect.any(Object)
      );
    });

    it('should reject promise on API error (bubbles up)', async () => {
      vi.mocked(apiClient.portal.get).mockRejectedValue(new Error('Network error'));

      await expect(searchApi.globalSearch('test')).rejects.toThrow('Network error');
    });

    it('should return empty query if provided (API is still called)', async () => {
      vi.mocked(apiClient.portal.get).mockResolvedValue({
        success: true, code: 200, message: 'ok',
        data: { total: 0, by_service: {}, results: [], duration_ms: 0 },
        timestamp: Date.now(),
      });

      const result = await searchApi.globalSearch('');

      expect(result.success).toBe(true);
      expect(result.data.results).toEqual([]);
      expect(apiClient.portal.get).toHaveBeenCalledWith('/search?q=&limit=20', expect.any(Object));
    });

    it('should accept custom limit', async () => {
      await searchApi.globalSearch('keyword', 50);

      expect(apiClient.portal.get).toHaveBeenCalledWith(
        '/search?q=keyword&limit=50',
        expect.any(Object)
      );
    });
  });
});
