import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCrud } from "../../hooks/useCrud";

const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

describe("useCrud", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default values", () => {
    const { result } = renderHook(() =>
      useCrud({
        api: mockApi as any,
        basePath: "/test",
        autoFetch: false,
      })
    );

    expect(result.current.data).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.pagination.page).toBe(1);
    expect(result.current.pagination.pageSize).toBe(10);
  });

  it("should fetch data when autoFetch is true", async () => {
    const mockData = {
      data: { items: [{ id: "1", name: "Test" }], total: 1 },
    };
    mockApi.get.mockResolvedValue(mockData);

    const { result } = renderHook(() =>
      useCrud({
        api: mockApi as any,
        basePath: "/test",
        autoFetch: true,
      })
    );

    expect(result.current.loading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(mockApi.get).toHaveBeenCalledWith("/test", expect.objectContaining({
      params: { page: 1, pageSize: 10 },
    }));
    expect(result.current.data).toEqual([{ id: "1", name: "Test" }]);
  });

  it("should handle error during fetch", async () => {
    const mockError = new Error("Network error");
    mockApi.get.mockRejectedValue(mockError);

    const { result } = renderHook(() =>
      useCrud({
        api: mockApi as any,
        basePath: "/test",
        autoFetch: true,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
  });

  it("should create item", async () => {
    const mockCreatedItem = { data: { id: "1", name: "Created" } };
    mockApi.post.mockResolvedValue(mockCreatedItem);

    const { result } = renderHook(() =>
      useCrud({
        api: mockApi as any,
        basePath: "/test",
        autoFetch: false,
      })
    );

    await act(async () => {
      await result.current.create({ name: "Test" });
    });

    expect(mockApi.post).toHaveBeenCalledWith("/test", { name: "Test" });
    expect(result.current.data).toEqual([{ id: "1", name: "Created" }]);
  });

  it("should update item", async () => {
    const mockUpdatedItem = { data: { id: "1", name: "Updated" } };
    mockApi.put.mockResolvedValue(mockUpdatedItem);

    const { result } = renderHook(() =>
      useCrud({
        api: mockApi as any,
        basePath: "/test",
        initialData: [{ id: "1", name: "Original" }],
        autoFetch: false,
      })
    );

    await act(async () => {
      await result.current.update("1", { name: "Updated" });
    });

    expect(mockApi.put).toHaveBeenCalledWith("/test/1", { name: "Updated" });
    expect(result.current.data).toEqual([{ id: "1", name: "Updated" }]);
  });

  it("should delete item", async () => {
    mockApi.delete.mockResolvedValue({});

    const { result } = renderHook(() =>
      useCrud({
        api: mockApi as any,
        basePath: "/test",
        initialData: [{ id: "1", name: "Test" }],
        autoFetch: false,
      })
    );

    await act(async () => {
      await result.current.delete("1");
    });

    expect(mockApi.delete).toHaveBeenCalledWith("/test/1");
    expect(result.current.data).toEqual([]);
  });

  it("should handle bulk delete", async () => {
    mockApi.post.mockResolvedValue({});

    const { result } = renderHook(() =>
      useCrud({
        api: mockApi as any,
        basePath: "/test",
        initialData: [
          { id: "1", name: "Test 1" },
          { id: "2", name: "Test 2" },
          { id: "3", name: "Test 3" },
        ],
        autoFetch: false,
      })
    );

    await act(async () => {
      await result.current.bulkDelete(["1", "2"]);
    });

    expect(mockApi.post).toHaveBeenCalledWith("/test/bulk-delete", { ids: ["1", "2"] });
    expect(result.current.data).toEqual([{ id: "3", name: "Test 3" }]);
  });

  it("should handle pagination", () => {
    const { result } = renderHook(() =>
      useCrud({
        api: mockApi as any,
        basePath: "/test",
        autoFetch: false,
      })
    );

    act(() => {
      result.current.pagination.setPage(2);
      result.current.pagination.setPageSize(20);
    });

    expect(result.current.pagination.page).toBe(2);
    expect(result.current.pagination.pageSize).toBe(20);
  });

  it("should refresh data", async () => {
    const mockData1 = { data: { items: [{ id: "1", name: "Test 1" }], total: 1 } };
    const mockData2 = { data: { items: [{ id: "1", name: "Test Updated" }], total: 1 } };
    mockApi.get.mockResolvedValueOnce(mockData1).mockResolvedValueOnce(mockData2);

    const { result } = renderHook(() =>
      useCrud({
        api: mockApi as any,
        basePath: "/test",
        autoFetch: true,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.data).toEqual([{ id: "1", name: "Test 1" }]);

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(mockApi.get).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual([{ id: "1", name: "Test Updated" }]);
  });
});