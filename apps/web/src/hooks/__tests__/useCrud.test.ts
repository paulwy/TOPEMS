import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
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

  describe('pagination', () => {
    it('should have default pagination values', () => {
      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false })
      );
      expect(result.current.pagination.page).toBe(1);
      expect(result.current.pagination.pageSize).toBe(10);
      expect(result.current.pagination.total).toBe(0);
    });

    it('should update page', () => {
      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false })
      );

      act(() => {
        result.current.pagination.setPage(2);
      });

      expect(result.current.pagination.page).toBe(2);
    });

    it('should update pageSize', () => {
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

  describe('fetch', () => {
    it('should fetch data from API', async () => {
      vi.mocked(mockApi.get).mockResolvedValue({
        data: { items: mockItems, total: 2 },
      });

      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false })
      );

      await act(async () => {
        await result.current.fetch();
      });

      expect(mockApi.get).toHaveBeenCalledWith('/test', expect.objectContaining({
        params: { page: 1, pageSize: 10 },
      }));
      expect(result.current.data).toEqual(mockItems);
      expect(result.current.pagination.total).toBe(2);
    });

    it('should handle API error', async () => {
      vi.mocked(mockApi.get).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false })
      );

      await act(async () => {
        await result.current.fetch().catch(() => {});
      });

      expect(result.current.error).toBe('Network error');
    });

    it('should respect cacheTime', async () => {
      vi.mocked(mockApi.get)
        .mockResolvedValueOnce({ data: { items: mockItems, total: 2 } })
        .mockResolvedValueOnce({ data: { items: [], total: 0 } });

      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false, cacheTime: 5000 })
      );

      await act(async () => {
        await result.current.fetch();
      });

      expect(mockApi.get).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.fetch();
      });

      expect(mockApi.get).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual(mockItems);
    });
  });

  describe('get', () => {
    it('should get single item', async () => {
      const item = { id: 1, name: 'Item 1' };
      vi.mocked(mockApi.get).mockResolvedValue({ data: item });

      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false })
      );

      const fetchedItem = await act(async () => {
        return result.current.get(1);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/test/1', expect.anything());
      expect(fetchedItem).toEqual(item);
    });

    it('should handle get error', async () => {
      vi.mocked(mockApi.get).mockRejectedValue(new Error('Not found'));

      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false })
      );

      await act(async () => {
        await result.current.get(1).catch(() => {});
      });

      expect(result.current.error).toBe('Not found');
    });
  });

  describe('create', () => {
    it('should create new item', async () => {
      const newItem = { id: 3, name: 'Item 3' };
      vi.mocked(mockApi.post).mockResolvedValue({ data: newItem });

      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false })
      );

      const createdItem = await act(async () => {
        return result.current.create({ name: 'Item 3' });
      });

      expect(mockApi.post).toHaveBeenCalledWith('/test', { name: 'Item 3' });
      expect(createdItem).toEqual(newItem);
      expect(result.current.data).toContainEqual(newItem);
    });

    it('should call onSuccess callback', async () => {
      const onSuccess = vi.fn();
      vi.mocked(mockApi.post).mockResolvedValue({ data: { id: 3, name: 'Item 3' } });

      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false, onSuccess })
      );

      await act(async () => {
        await result.current.create({ name: 'Item 3' });
      });

      expect(onSuccess).toHaveBeenCalledWith('创建成功');
    });

    it('should handle create error', async () => {
      vi.mocked(mockApi.post).mockRejectedValue(new Error('Create failed'));

      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false })
      );

      await act(async () => {
        await result.current.create({ name: 'Item 3' }).catch(() => {});
      });

      expect(result.current.error).toBe('Create failed');
    });
  });

  describe('update', () => {
    it('should update existing item', async () => {
      const updatedItem = { id: 1, name: 'Updated Item' };
      vi.mocked(mockApi.put).mockResolvedValue({ data: updatedItem });

      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false, initialData: mockItems })
      );

      const resultItem = await act(async () => {
        return result.current.update(1, { name: 'Updated Item' });
      });

      expect(mockApi.put).toHaveBeenCalledWith('/test/1', { name: 'Updated Item' });
      expect(resultItem).toEqual(updatedItem);
      expect(result.current.data).toContainEqual(updatedItem);
    });

    it('should call onSuccess callback', async () => {
      const onSuccess = vi.fn();
      vi.mocked(mockApi.put).mockResolvedValue({ data: { id: 1, name: 'Updated' } });

      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false, initialData: mockItems, onSuccess })
      );

      await act(async () => {
        await result.current.update(1, { name: 'Updated' });
      });

      expect(onSuccess).toHaveBeenCalledWith('更新成功');
    });

    it('should handle update error', async () => {
      vi.mocked(mockApi.put).mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false, initialData: mockItems })
      );

      await act(async () => {
        await result.current.update(1, { name: 'Updated' }).catch(() => {});
      });

      expect(result.current.error).toBe('Update failed');
    });
  });

  describe('delete', () => {
    it('should delete item', async () => {
      vi.mocked(mockApi.delete).mockResolvedValue({});

      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false, initialData: mockItems })
      );

      await act(async () => {
        await result.current.delete(1);
      });

      expect(mockApi.delete).toHaveBeenCalledWith('/test/1');
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data[0].id).toBe(2);
    });

    it('should call onSuccess callback', async () => {
      const onSuccess = vi.fn();
      vi.mocked(mockApi.delete).mockResolvedValue({});

      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false, initialData: mockItems, onSuccess })
      );

      await act(async () => {
        await result.current.delete(1);
      });

      expect(onSuccess).toHaveBeenCalledWith('删除成功');
    });

    it('should handle delete error', async () => {
      vi.mocked(mockApi.delete).mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false, initialData: mockItems })
      );

      await act(async () => {
        await result.current.delete(1).catch(() => {});
      });

      expect(result.current.error).toBe('Delete failed');
    });
  });

  describe('bulkDelete', () => {
    it('should bulk delete items', async () => {
      vi.mocked(mockApi.post).mockResolvedValue({});

      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false, initialData: mockItems })
      );

      await act(async () => {
        await result.current.bulkDelete([1, 2]);
      });

      expect(mockApi.post).toHaveBeenCalledWith('/test/bulk-delete', { ids: [1, 2] });
      expect(result.current.data).toEqual([]);
    });

    it('should call onSuccess callback', async () => {
      const onSuccess = vi.fn();
      vi.mocked(mockApi.post).mockResolvedValue({});

      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false, initialData: mockItems, onSuccess })
      );

      await act(async () => {
        await result.current.bulkDelete([1, 2]);
      });

      expect(onSuccess).toHaveBeenCalledWith('已删除 2 条记录');
    });

    it('should handle bulkDelete error', async () => {
      vi.mocked(mockApi.post).mockRejectedValue(new Error('Bulk delete failed'));

      const { result } = renderHook(() =>
        useCrud({ api: mockApi, basePath: '/test', autoFetch: false, initialData: mockItems })
      );

      await act(async () => {
        await result.current.bulkDelete([1, 2]).catch(() => {});
      });

      expect(result.current.error).toBe('Bulk delete failed');
    });
  });

  describe('autoFetch', () => {
    it('should auto fetch data when autoFetch is true', async () => {
      vi.mocked(mockApi.get).mockResolvedValue({ data: { items: mockItems, total: 2 } });

      renderHook(() => useCrud({ api: mockApi, basePath: '/test', autoFetch: true }));

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalled();
      });
    });

    it('should not auto fetch when autoFetch is false', () => {
      renderHook(() => useCrud({ api: mockApi, basePath: '/test', autoFetch: false }));

      expect(mockApi.get).not.toHaveBeenCalled();
    });
  });
});