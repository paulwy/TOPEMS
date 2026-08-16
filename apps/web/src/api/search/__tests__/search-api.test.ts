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

describe('searchApi.globalSearch', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
    vi.mocked(apiClient.portal.get).mockResolvedValue({
      success: true,
      code: 200,
      message: 'ok',
      data: { total: 1, by_service: {}, results: [{ id: '1', title: 'API Result', summary: '', highlight_title: 'API Result', highlight_summary: '', service: 'user', service_name: '用户', url: '/api', result_type: 'page', module: 'user', type_name: '用户' }], duration_ms: 0 },
      timestamp: Date.now(),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should make API call to portal service', async () => {
    const mockResponse = {
      success: true,
      code: 200,
      message: 'ok',
      data: {
        total: 1,
        by_service: {},
        results: [
          {
            id: 'test',
            title: 'Test Result',
            summary: 'summary',
            description: '',
            highlight_title: 'Test Result',
            highlight_summary: 'summary',
            service: 'user',
            service_name: '用户',
            module: 'user',
            url: '/test',
            result_type: 'page',
            type_name: '测试',
          },
        ],
        duration_ms: 10,
      },
      timestamp: Date.now(),
    };

    vi.mocked(apiClient.portal.get).mockResolvedValue(mockResponse);

    const result = await searchApi.globalSearch('test', 10);

    expect(apiClient.portal.get).toHaveBeenCalledWith('/search?q=test&limit=10', { signal: undefined });
    expect(result).toEqual(mockResponse);
  });

  it('should pass signal parameter to API call', async () => {
    const mockResponse = {
      success: true,
      code: 200,
      message: 'ok',
      data: { total: 0, by_service: {}, results: [], duration_ms: 0 },
      timestamp: Date.now(),
    };

    vi.mocked(apiClient.portal.get).mockResolvedValue(mockResponse);

    const controller = new AbortController();
    await searchApi.globalSearch('test', 10, controller.signal);

    expect(apiClient.portal.get).toHaveBeenCalledWith('/search?q=test&limit=10', { signal: controller.signal });
  });

  it('should use default limit of 20', async () => {
    await searchApi.globalSearch('test');

    expect(apiClient.portal.get).toHaveBeenCalledWith('/search?q=test&limit=20', { signal: undefined });
  });

  it('should throw error when API call fails', async () => {
    vi.mocked(apiClient.portal.get).mockRejectedValue(new Error('Network error'));

    await expect(searchApi.globalSearch('test')).rejects.toThrow('Network error');
  });

  it('should throw AbortError when request is aborted', async () => {
    const abortError = new Error('AbortError');
    abortError.name = 'AbortError';

    vi.mocked(apiClient.portal.get).mockRejectedValue(abortError);

    await expect(searchApi.globalSearch('test', 10, new AbortController().signal)).rejects.toThrow(
      'AbortError'
    );
  });
});
