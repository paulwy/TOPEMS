import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBatchSelection } from "../../hooks/useBatchSelection";

describe("useBatchSelection hook", () => {
  const mockItems = [
    { id: "1", name: "Item 1" },
    { id: "2", name: "Item 2" },
    { id: "3", name: "Item 3" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should initialize with empty selection", () => {
      const { result } = renderHook(() => useBatchSelection(mockItems));
      expect(result.current.selectedIds).toEqual([]);
      expect(result.current.allItemsSelected).toBe(false);
      expect(result.current.isIndeterminate).toBe(false);
    });

    it("should handle empty items array", () => {
      const { result } = renderHook(() => useBatchSelection([]));
      expect(result.current.selectedIds).toEqual([]);
      expect(result.current.allItemsSelected).toBe(false);
    });
  });

  describe("toggleSelect", () => {
    it("should select an item when not selected", () => {
      const { result } = renderHook(() => useBatchSelection(mockItems));

      act(() => {
        result.current.toggleSelect("1");
      });

      expect(result.current.selectedIds).toContain("1");
      expect(result.current.isSelected("1")).toBe(true);
    });

    it("should deselect an item when already selected", () => {
      const { result } = renderHook(() => useBatchSelection(mockItems));

      // First select
      act(() => {
        result.current.toggleSelect("1");
      });
      expect(result.current.selectedIds).toContain("1");

      // Then deselect
      act(() => {
        result.current.toggleSelect("1");
      });
      expect(result.current.selectedIds).not.toContain("1");
    });

    it("should handle multiple selections", () => {
      const { result } = renderHook(() => useBatchSelection(mockItems));

      act(() => {
        result.current.toggleSelect("1");
      });
      act(() => {
        result.current.toggleSelect("2");
      });

      expect(result.current.selectedIds).toEqual(["1", "2"]);
      expect(result.current.isIndeterminate).toBe(true);
      expect(result.current.allItemsSelected).toBe(false);
    });
  });

  describe("selectAll", () => {
    it("should select all items", () => {
      const { result } = renderHook(() => useBatchSelection(mockItems));

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedIds).toEqual(["1", "2", "3"]);
      expect(result.current.allItemsSelected).toBe(true);
      expect(result.current.isIndeterminate).toBe(false);
    });

    it("should select all when called multiple times", () => {
      const { result } = renderHook(() => useBatchSelection(mockItems));

      act(() => {
        result.current.selectAll();
      });
      act(() => {
        result.current.selectAll();
      });

      expect(result.current.allItemsSelected).toBe(true);
    });
  });

  describe("deselectAll", () => {
    it("should deselect all items", () => {
      const { result } = renderHook(() => useBatchSelection(mockItems));

      // Select all first
      act(() => {
        result.current.selectAll();
      });
      expect(result.current.selectedIds).toEqual(["1", "2", "3"]);

      // Then deselect all
      act(() => {
        result.current.deselectAll();
      });

      expect(result.current.selectedIds).toEqual([]);
      expect(result.current.allItemsSelected).toBe(false);
      expect(result.current.isIndeterminate).toBe(false);
    });
  });

  describe("isSelected", () => {
    it("should return true for selected item", () => {
      const { result } = renderHook(() => useBatchSelection(mockItems));

      act(() => {
        result.current.toggleSelect("1");
      });

      expect(result.current.isSelected("1")).toBe(true);
      expect(result.current.isSelected("2")).toBe(false);
    });
  });

  describe("clearSelection", () => {
    it("should clear all selections", () => {
      const { result } = renderHook(() => useBatchSelection(mockItems));

      act(() => {
        result.current.selectAll();
      });
      expect(result.current.selectedIds).toEqual(["1", "2", "3"]);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedIds).toEqual([]);
    });
  });

  describe("allItemsSelected", () => {
    it("should be true when all items selected", () => {
      const { result } = renderHook(() => useBatchSelection(mockItems));

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.allItemsSelected).toBe(true);
    });

    it("should be false when not all items selected", () => {
      const { result } = renderHook(() => useBatchSelection(mockItems));

      act(() => {
        result.current.toggleSelect("1");
      });

      expect(result.current.allItemsSelected).toBe(false);
    });
  });

  describe("isIndeterminate", () => {
    it("should be true when some items selected", () => {
      const { result } = renderHook(() => useBatchSelection(mockItems));

      act(() => {
        result.current.toggleSelect("1");
      });

      expect(result.current.isIndeterminate).toBe(true);
    });

    it("should be false when no items selected", () => {
      const { result } = renderHook(() => useBatchSelection(mockItems));
      expect(result.current.isIndeterminate).toBe(false);
    });

    it("should be false when all items selected", () => {
      const { result } = renderHook(() => useBatchSelection(mockItems));

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.isIndeterminate).toBe(false);
    });
  });

  describe("custom idKey", () => {
    const customItems = [
      { key: "a", name: "Item A" },
      { key: "b", name: "Item B" },
    ];

    it("should use custom idKey for selection", () => {
      const { result } = renderHook(() =>
        useBatchSelection(customItems, "key"),
      );

      act(() => {
        result.current.toggleSelect("a");
      });

      expect(result.current.selectedIds).toContain("a");
      expect(result.current.isSelected("a")).toBe(true);
    });

    it("should select all using custom idKey", () => {
      const { result } = renderHook(() =>
        useBatchSelection(customItems, "key"),
      );

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedIds).toEqual(["a", "b"]);
    });
  });
});
