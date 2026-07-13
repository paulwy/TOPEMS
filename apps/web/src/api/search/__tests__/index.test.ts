import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchApi } from '../index';
import apiClient from '@/api/client';
import { getMockSearchResults, shouldUseMock, getMockFallback, isDev } from '@/mock/search';

vi.mock('@/api/client', () => ({
  default: {
    erp: {
      get: vi.fn().mockResolvedValue({
        success: true,
        code: 200,
        message: 'ok',
        data: [{ id: '1', title: 'API Result', module: 'user', path: '/api', type_name: '用户' }],
        timestamp: Date.now(),
      }),
    },
  },
}));

let mockIsDev = true;

vi.mock('@/mock/search', () => ({
  getMockSearchResults: vi.fn().mockReturnValue([
    { id: 'mock-1', title: 'Mock Result', module: 'user', path: '/mock', type_name: '用户' },
  ]),
  shouldUseMock: vi.fn().mockReturnValue(false),
  getMockFallback: vi.fn().mockReturnValue([
    { id: 'fallback-1', title: 'Fallback Result', module: 'user', path: '/fallback', type_name: '用户' },
  ]),
  get isDev() {
    return mockIsDev;
  },
}));

describe('searchApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.erp.get).mockResolvedValue({
      success: true,
      code: 200,
      message: 'ok',
      data: [{ id: '1', title: 'API Result', module: 'user', path: '/api', type_name: '用户' }],
      timestamp: Date.now(),
    });
    mockIsDev = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('globalSearch', () => {
    it('should return API response when mock is disabled', async () => {
      const { getMockSearchResults, shouldUseMock } = await import('@/mock/search');
      vi.mocked(shouldUseMock).mockReturnValue(false);

      const result = await searchApi.globalSearch('test');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('API Result');
      expect(apiClient.erp.get).toHaveBeenCalledWith('/search/global', expect.objectContaining({
        params: { query: 'test', limit: 20 },
      }));
      expect(getMockSearchResults).not.toHaveBeenCalled();
    });

    it('should return mock data when shouldUseMock returns true', async () => {
      const { getMockSearchResults, shouldUseMock } = await import('@/mock/search');
      vi.mocked(shouldUseMock).mockReturnValue(true);

      const result = await searchApi.globalSearch('test', 10);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Mock Result');
      expect(getMockSearchResults).toHaveBeenCalledWith('test', 10);
      expect(apiClient.erp.get).not.toHaveBeenCalled();
    });

    it('should fallback to mock when API request fails in dev mode', async () => {
      const { getMockFallback, shouldUseMock } = await import('@/mock/search');
      vi.mocked(shouldUseMock).mockReturnValue(false);
      mockIsDev = true;
      vi.mocked(apiClient.erp.get).mockRejectedValue(new Error('Network error'));

      const result = await searchApi.globalSearch('test', 5);

      expect(result.success).toBe(true);
      expect(result.message).toBe('mock fallback');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Fallback Result');
      expect(getMockFallback).toHaveBeenCalledWith('test', 5);
      expect(apiClient.erp.get).toHaveBeenCalled();
    });

    it('should throw error when API request fails in production mode', async () => {
      const { getMockFallback, shouldUseMock } = await import('@/mock/search');
      vi.mocked(shouldUseMock).mockReturnValue(false);
      mockIsDev = false;
      vi.mocked(apiClient.erp.get).mockRejectedValue(new Error('Network error'));

      await expect(searchApi.globalSearch('test')).rejects.toThrow('Network error');
      expect(getMockFallback).not.toHaveBeenCalled();
    });

    it('should throw AbortError without fallback when request is aborted', async () => {
      const { getMockFallback, shouldUseMock } = await import('@/mock/search');
      vi.mocked(shouldUseMock).mockReturnValue(false);
      mockIsDev = true;
      const abortError = new Error('Request aborted');
      abortError.name = 'AbortError';
      vi.mocked(apiClient.erp.get).mockRejectedValue(abortError);

      await expect(searchApi.globalSearch('test')).rejects.toThrow('Request aborted');
      expect(getMockFallback).not.toHaveBeenCalled();
    });

    it('should throw CanceledError without fallback', async () => {
      const { getMockFallback, shouldUseMock } = await import('@/mock/search');
      vi.mocked(shouldUseMock).mockReturnValue(false);
      mockIsDev = true;
      const canceledError = new Error('Request canceled');
      canceledError.name = 'CanceledError';
      vi.mocked(apiClient.erp.get).mockRejectedValue(canceledError);

      await expect(searchApi.globalSearch('test')).rejects.toThrow('Request canceled');
      expect(getMockFallback).not.toHaveBeenCalled();
    });

    it('should pass signal to API request', async () => {
      const { shouldUseMock } = await import('@/mock/search');
      vi.mocked(shouldUseMock).mockReturnValue(false);
      const abortController = new AbortController();

      await searchApi.globalSearch('test', 10, abortController.signal);

      expect(apiClient.erp.get).toHaveBeenCalledWith('/search/global', expect.objectContaining({
        signal: abortController.signal,
      }));
    });

    it('should use default limit of 20', async () => {
      const { shouldUseMock } = await import('@/mock/search');
      vi.mocked(shouldUseMock).mockReturnValue(false);

      await searchApi.globalSearch('test');

      expect(apiClient.erp.get).toHaveBeenCalledWith('/search/global', expect.objectContaining({
        params: { query: 'test', limit: 20 },
      }));
    });
  });
});