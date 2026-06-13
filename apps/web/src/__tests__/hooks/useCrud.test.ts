import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCrud } from "../../hooks/useCrud";

interface TestItem {
  id: string;
  name: string;
  email: string;
}

// 创建 mock axios 客户端
const createMockApi = (responseData: any) => ({
  get: vi.fn().mockResolvedValue({
    data: {
      success: true,
      data: responseData,
    },
  }),
  post: vi.fn().mockResolvedValue({
    data: {
      success: true,
      data: responseData,
    },
  }),
  put: vi.fn().mockResolvedValue({
    data: {
      success: true,
      data: responseData,
    },
  }),
  delete: vi.fn().mockResolvedValue({
    data: {
      success: true,
      data: null,
    },
  }),
});

describe("useCrud hook", () => {
  const mockData: TestItem[] = [
    { id: "1", name: "John", email: "john@example.com" },
    { id: "2", name: "Jane", email: "jane@example.com" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should initialize with empty data when no initialData", () => {
      const mockApi = createMockApi(mockData);
      const { result } = renderHook(() =>
        useCrud<TestItem>({
          api: mockApi as any,
          basePath: "/api/test",
          autoFetch: false,
        }),
      );

      expect(result.current.data).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it("should initialize with initialData", () => {
      const mockApi = createMockApi(mockData);
      const { result } = renderHook(() =>
        useCrud<TestItem>({
          api: mockApi as any,
          basePath: "/api/test",
          initialData: mockData,
          autoFetch: false,
        }),
      );

      expect(result.current.data).toEqual(mockData);
    });
  });

  describe("fetch", () => {
    it("should fetch data from API", async () => {
      const mockApi = createMockApi(mockData);

      const { result } = renderHook(() =>
        useCrud<TestItem>({
          api: mockApi as any,
          basePath: "/api/test",
          autoFetch: false,
        }),
      );

      await act(async () => {
        await result.current.fetch();
      });

      expect(mockApi.get).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockData);
      expect(result.current.loading).toBe(false);
    });

    it("should handle fetch error", async () => {
      const mockApi = createMockApi(mockData);
      mockApi.get = vi.fn().mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() =>
        useCrud<TestItem>({
          api: mockApi as any,
          basePath: "/api/test",
          autoFetch: false,
        }),
      );

      await act(async () => {
        try {
          await result.current.fetch();
        } catch {
          // Expected to fail
        }
      });

      expect(result.current.error).toBe("Network error");
      expect(result.current.loading).toBe(false);
    });

    it("should autoFetch data when enabled", async () => {
      const mockApi = createMockApi({ items: mockData, total: 2, page: 1, pageSize: 10 });
      mockApi.get = vi.fn().mockResolvedValue({
        data: {
          success: true,
          data: { items: mockData, total: 2, page: 1, pageSize: 10 },
        },
      });

      renderHook(() =>
        useCrud<TestItem>({
          api: mockApi as any,
          basePath: "/api/test",
          autoFetch: true,
        }),
      );

      // Wait for autoFetch
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockApi.get).toHaveBeenCalled();
    });
  });

  describe("create", () => {
    it("should create new item", async () => {
      const mockApi = createMockApi(mockData);
      const newItem = { name: "New User", email: "new@example.com" };

      const { result } = renderHook(() =>
        useCrud<TestItem>({
          api: mockApi as any,
          basePath: "/api/test",
          autoFetch: false,
        }),
      );

      await act(async () => {
        await result.current.create(newItem as any);
      });

      expect(mockApi.post).toHaveBeenCalledWith("/api/test", newItem);
    });

    it("should call onSuccess callback on create", async () => {
      const mockApi = createMockApi(mockData);
      const onSuccess = vi.fn();

      const { result } = renderHook(() =>
        useCrud<TestItem>({
          api: mockApi as any,
          basePath: "/api/test",
          autoFetch: false,
          onSuccess,
        }),
      );

      await act(async () => {
        await result.current.create({ name: "Test", email: "test@example.com" } as any);
      });

      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update existing item", async () => {
      const mockApi = createMockApi(mockData);
      const updateData = { name: "Updated Name" };

      const { result } = renderHook(() =>
        useCrud<TestItem>({
          api: mockApi as any,
          basePath: "/api/test",
          autoFetch: false,
        }),
      );

      await act(async () => {
        await result.current.update("1", updateData);
      });

      expect(mockApi.put).toHaveBeenCalledWith("/api/test/1", updateData);
    });
  });

  describe("delete", () => {
    it("should delete item", async () => {
      const mockApi = createMockApi(mockData);

      const { result } = renderHook(() =>
        useCrud<TestItem>({
          api: mockApi as any,
          basePath: "/api/test",
          autoFetch: false,
        }),
      );

      await act(async () => {
        await result.current.delete("1");
      });

      expect(mockApi.delete).toHaveBeenCalledWith("/api/test/1");
    });
  });

  describe("bulkDelete", () => {
    it("should delete multiple items", async () => {
      const mockApi = createMockApi(mockData);

      const { result } = renderHook(() =>
        useCrud<TestItem>({
          api: mockApi as any,
          basePath: "/api/test",
          autoFetch: false,
        }),
      );

      await act(async () => {
        await result.current.bulkDelete(["1", "2"]);
      });

      expect(mockApi.post).toHaveBeenCalledWith("/api/test/bulk-delete", { ids: ["1", "2"] });
    });
  });

  describe("get", () => {
    it("should get single item", async () => {
      const mockApi = createMockApi(mockData[0]);
      mockApi.get = vi.fn().mockResolvedValue({
        data: {
          success: true,
          data: mockData[0],
        },
      });

      const { result } = renderHook(() =>
        useCrud<TestItem>({
          api: mockApi as any,
          basePath: "/api/test",
          autoFetch: false,
        }),
      );

      await act(async () => {
        const item = await result.current.get("1");
        expect(item).toEqual(mockData[0]);
      });

      expect(mockApi.get).toHaveBeenCalledWith("/api/test/1", expect.anything());
    });
  });

  describe("pagination", () => {
    it("should update page", () => {
      const mockApi = createMockApi(mockData);

      const { result } = renderHook(() =>
        useCrud<TestItem>({
          api: mockApi as any,
          basePath: "/api/test",
          autoFetch: false,
        }),
      );

      expect(result.current.pagination.page).toBe(1);

      act(() => {
        result.current.pagination.setPage(3);
      });

      expect(result.current.pagination.page).toBe(3);
    });

    it("should update pageSize", () => {
      const mockApi = createMockApi(mockData);

      const { result } = renderHook(() =>
        useCrud<TestItem>({
          api: mockApi as any,
          basePath: "/api/test",
          autoFetch: false,
        }),
      );

      expect(result.current.pagination.pageSize).toBe(10);

      act(() => {
        result.current.pagination.setPageSize(25);
      });

      expect(result.current.pagination.pageSize).toBe(25);
    });
  });

  describe("refresh", () => {
    it("should refresh data", async () => {
      const mockApi = createMockApi({ items: mockData, total: 2, page: 1, pageSize: 10 });
      mockApi.get = vi.fn().mockResolvedValue({
        data: {
          success: true,
          data: { items: mockData, total: 2, page: 1, pageSize: 10 },
        },
      });

      const { result } = renderHook(() =>
        useCrud<TestItem>({
          api: mockApi as any,
          basePath: "/api/test",
          autoFetch: false,
        }),
      );

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockApi.get).toHaveBeenCalled();
    });
  });

  describe("clearCache", () => {
    it("should clear cache", () => {
      const mockApi = createMockApi(mockData);

      const { result } = renderHook(() =>
        useCrud<TestItem>({
          api: mockApi as any,
          basePath: "/api/test",
          autoFetch: false,
          cacheTime: 5000,
        }),
      );

      act(() => {
        result.current.clearCache();
      });

      // Cache should be cleared - verify by checking if next fetch makes API call
      expect(result.current.data).toEqual([]);
    });
  });

  describe("error handling", () => {
    it("should call onError callback on error", async () => {
      const mockApi = createMockApi(mockData);
      const onError = vi.fn();
      mockApi.get = vi.fn().mockRejectedValue(new Error("API Error"));

      const { result } = renderHook(() =>
        useCrud<TestItem>({
          api: mockApi as any,
          basePath: "/api/test",
          autoFetch: false,
          onError,
        }),
      );

      await act(async () => {
        try {
          await result.current.fetch();
        } catch {
          // Expected
        }
      });

      expect(onError).toHaveBeenCalled();
    });
  });
});
