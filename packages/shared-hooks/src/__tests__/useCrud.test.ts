import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCrud } from '../useCrud';
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

  describe('fetch', () => {
    it('should fetch data successfully', async () => {
      vi.mocked(mockApi.get).mockResolvedValueOnce({
        data: { items: mockItems, total: 2 },
      });

      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockApi.get).toHaveBeenCalledWith('/test', expect.any(Object));
    });

    it('should handle fetch error', async () => {
      const errorMessage = 'Fetch failed';
      vi.mocked(mockApi.get).mockRejectedValueOnce(new Error(errorMessage));

      const onError = vi.fn();
      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', onError, autoFetch: false })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBe(errorMessage);
      expect(onError).toHaveBeenCalled();
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
      vi.mocked(mockApi.get).mockResolvedValueOnce({
        data: { items: mockItems, total: 2 },
      });

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

  describe('create', () => {
    it('should create item and add to data', async () => {
      const newItem = { id: 3, name: 'New Item' };
      vi.mocked(mockApi.post).mockResolvedValueOnce({ data: newItem });

      const { result } = renderHook(() =>
        useCrud({
          api: mockApi,
          basePath: '/test',
          initialData: mockItems,
          autoFetch: false,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const created = await result.current.create(newItem);
      expect(created).toEqual(newItem);
      expect(result.current.data).toContainEqual(newItem);
    });

    it('should call onSuccess callback', async () => {
      const newItem = { id: 3, name: 'New Item' };
      vi.mocked(mockApi.post).mockResolvedValueOnce({ data: newItem });

      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useCrud({
          api: mockApi,
          basePath: '/test',
          onSuccess,
          autoFetch: false,
        })
      );

      await result.current.create(newItem);
      expect(onSuccess).toHaveBeenCalledWith('创建成功');
    });
  });

  describe('update', () => {
    it('should update item in data', async () => {
      const updatedItem = { id: 1, name: 'Updated Item' };
      vi.mocked(mockApi.put).mockResolvedValueOnce({ data: updatedItem });

      const { result } = renderHook(() =>
        useCrud({
          api: mockApi,
          basePath: '/test',
          initialData: mockItems,
          autoFetch: false,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updated = await result.current.update(1, updatedItem);
      expect(updated).toEqual(updatedItem);
      expect(result.current.data.find((d) => d.id === 1)).toEqual(updatedItem);
    });
  });

  describe('delete', () => {
    it('should remove item from data', async () => {
      vi.mocked(mockApi.delete).mockResolvedValueOnce({});

      const { result } = renderHook(() =>
        useCrud({
          api: mockApi,
          basePath: '/test',
          initialData: mockItems,
          autoFetch: false,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.delete(1);
      expect(result.current.data.find((d) => d.id === 1)).toBeUndefined();
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

import { act } from '@testing-library/react';