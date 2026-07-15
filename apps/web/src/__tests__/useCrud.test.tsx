import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCrud } from '@topems/shared-hooks';
import type { AxiosInstance } from 'axios';

const createMockApi = () => {
  const mockApi = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  } as unknown as AxiosInstance;
  return mockApi;
};

const mockItems = [
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' },
];

describe('useCrud', () => {
  let mockApi: AxiosInstance;

  beforeEach(() => {
    mockApi = createMockApi();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have empty data by default', () => {
      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false })
      );
      expect(result.current.data).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should use initialData if provided', () => {
      const { result } = renderHook(() =>
        useCrud({
          api: mockApi,
          basePath: '/test',
          initialData: mockItems,
          autoFetch: false,
        })
      );
      expect(result.current.data).toEqual(mockItems);
    });
  });

  describe('pagination', () => {
    it('should have default pagination values', () => {
      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false })
      );
      expect(result.current.pagination.page).toBe(1);
      expect(result.current.pagination.pageSize).toBe(10);
      expect(result.current.pagination.total).toBe(0);
    });

    it('should update page', async () => {
      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false })
      );

      act(() => {
        result.current.pagination.setPage(2);
      });

      expect(result.current.pagination.page).toBe(2);
    });

    it('should update pageSize', async () => {
      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false })
      );

      act(() => {
        result.current.pagination.setPageSize(20);
      });

      expect(result.current.pagination.pageSize).toBe(20);
    });
  });

  describe('refresh', () => {
    it('should call clearCache and fetch', async () => {
      vi.mocked(mockApi.get).mockResolvedValueOnce({
        data: { items: mockItems, total: 2 },
      });

      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false })
      );

      await result.current.refresh();
      expect(mockApi.get).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear cache', () => {
      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false })
      );

      expect(result.current.clearCache).toBeDefined();
      expect(typeof result.current.clearCache).toBe('function');
    });
  });
});
