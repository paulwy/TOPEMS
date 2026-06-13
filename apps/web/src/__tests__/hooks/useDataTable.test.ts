import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDataTable } from "../../hooks/useDataTable";
import type { ColumnDef } from "@tanstack/react-table";

interface TestRow {
  id: string;
  name: string;
  email: string;
}

describe("useDataTable hook", () => {
  const mockColumns: ColumnDef<TestRow, unknown>[] = [
    { id: "id", header: "ID", accessorKey: "id" },
    { id: "name", header: "Name", accessorKey: "name" },
    { id: "email", header: "Email", accessorKey: "email" },
  ];

  const mockData: TestRow[] = [
    { id: "1", name: "John", email: "john@example.com" },
    { id: "2", name: "Jane", email: "jane@example.com" },
    { id: "3", name: "Bob", email: "bob@example.com" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should initialize with default values", () => {
      const { result } = renderHook(() =>
        useDataTable({ columns: mockColumns, data: mockData }),
      );

      expect(result.current.sorting).toEqual([]);
      expect(result.current.columnFilters).toEqual([]);
      expect(result.current.pagination.pageIndex).toBe(0);
      expect(result.current.pagination.pageSize).toBe(10);
      expect(result.current.columnVisibility).toEqual({});
    });

    it("should initialize with custom pagination", () => {
      const { result } = renderHook(() =>
        useDataTable({
          columns: mockColumns,
          data: mockData,
          initialPageIndex: 2,
          initialPageSize: 25,
        }),
      );

      expect(result.current.pagination.pageIndex).toBe(2);
      expect(result.current.pagination.pageSize).toBe(25);
    });
  });

  describe("sorting", () => {
    it("should update sorting state", () => {
      const { result } = renderHook(() =>
        useDataTable({ columns: mockColumns, data: mockData }),
      );

      act(() => {
        result.current.setSorting([{ id: "name", desc: false }]);
      });

      expect(result.current.sorting).toEqual([{ id: "name", desc: false }]);
    });

    it("should handle multiple sort columns", () => {
      const { result } = renderHook(() =>
        useDataTable({ columns: mockColumns, data: mockData }),
      );

      act(() => {
        result.current.setSorting([
          { id: "name", desc: false },
          { id: "email", desc: true },
        ]);
      });

      expect(result.current.sorting).toHaveLength(2);
    });
  });

  describe("columnFilters", () => {
    it("should update column filters", () => {
      const { result } = renderHook(() =>
        useDataTable({ columns: mockColumns, data: mockData }),
      );

      act(() => {
        result.current.setColumnFilters([{ id: "name", value: "John" }]);
      });

      expect(result.current.columnFilters).toEqual([
        { id: "name", value: "John" },
      ]);
    });

    it("should clear column filters", () => {
      const { result } = renderHook(() =>
        useDataTable({ columns: mockColumns, data: mockData }),
      );

      act(() => {
        result.current.setColumnFilters([{ id: "name", value: "John" }]);
      });

      act(() => {
        result.current.setColumnFilters([]);
      });

      expect(result.current.columnFilters).toEqual([]);
    });
  });

  describe("pagination", () => {
    it("should update pagination state", () => {
      const { result } = renderHook(() =>
        useDataTable({ columns: mockColumns, data: mockData }),
      );

      act(() => {
        result.current.setPagination({ pageIndex: 1, pageSize: 20 });
      });

      expect(result.current.pagination.pageIndex).toBe(1);
      expect(result.current.pagination.pageSize).toBe(20);
    });
  });

  describe("columnVisibility", () => {
    it("should update column visibility", () => {
      const { result } = renderHook(() =>
        useDataTable({ columns: mockColumns, data: mockData }),
      );

      act(() => {
        result.current.setColumnVisibility({ id: false, email: false });
      });

      expect(result.current.columnVisibility.id).toBe(false);
      expect(result.current.columnVisibility.email).toBe(false);
    });

    it("should show all columns by default", () => {
      const { result } = renderHook(() =>
        useDataTable({ columns: mockColumns, data: mockData }),
      );

      expect(result.current.columnVisibility).toEqual({});
    });
  });

  describe("tableOptions", () => {
    it("should return table options with correct state", () => {
      const { result } = renderHook(() =>
        useDataTable({ columns: mockColumns, data: mockData }),
      );

      expect(result.current.tableOptions).toBeDefined();
      expect(result.current.tableOptions.state.sorting).toEqual([]);
      expect(result.current.tableOptions.state.columnFilters).toEqual([]);
      expect(result.current.tableOptions.state.pagination).toEqual({
        pageIndex: 0,
        pageSize: 10,
      });
    });

    it("should have row model functions", () => {
      const { result } = renderHook(() =>
        useDataTable({ columns: mockColumns, data: mockData }),
      );

      expect(result.current.tableOptions.getCoreRowModel).toBeDefined();
      expect(result.current.tableOptions.getSortedRowModel).toBeDefined();
      expect(result.current.tableOptions.getFilteredRowModel).toBeDefined();
      expect(result.current.tableOptions.getPaginationRowModel).toBeDefined();
    });
  });
});
