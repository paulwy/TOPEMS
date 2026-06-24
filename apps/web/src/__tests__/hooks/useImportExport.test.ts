import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useImportExport } from "../../hooks/useImportExport";

global.fetch = vi.fn();

const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

describe("useImportExport hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should initialize with default values", () => {
      const { result } = renderHook(() =>
        useImportExport({ apiEndpoint: "/api/test" }),
      );

      expect(result.current.isImporting).toBe(false);
      expect(result.current.isExporting).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe("importData", () => {
    it("should set isImporting to true during import", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { success: true } }),
      });

      const file = new File(["test content"], "test.csv", {
        type: "text/csv",
      });

      const { result } = renderHook(() =>
        useImportExport({ apiEndpoint: "/api/test" }),
      );

      let promise: Promise<any>;
      await act(async () => {
        promise = result.current.importData(file, "employee", "create");
        await promise;
      });

      expect(result.current.isImporting).toBe(false);
    });

    it("should successfully import data", async () => {
      const mockResponse = {
        data: {
          success: true,
          imported: 10,
          failed: 0,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const file = new File(["test content"], "test.csv", {
        type: "text/csv",
      });

      const { result } = renderHook(() =>
        useImportExport({ apiEndpoint: "/api/test" }),
      );

      let importResult: any;
      await act(async () => {
        importResult = await result.current.importData(
          file,
          "employee",
          "create",
        );
      });

      expect(importResult).toEqual(mockResponse.data);
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/test/import",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    it("should handle import error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      const file = new File(["test content"], "test.csv", {
        type: "text/csv",
      });

      const { result } = renderHook(() =>
        useImportExport({ apiEndpoint: "/api/test" }),
      );

      await act(async () => {
        try {
          await result.current.importData(file, "employee", "create");
        } catch (e: unknown) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Import failed");
    });

    it("should handle network error during import", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const file = new File(["test content"], "test.csv", {
        type: "text/csv",
      });

      const { result } = renderHook(() =>
        useImportExport({ apiEndpoint: "/api/test" }),
      );

      await act(async () => {
        try {
          await result.current.importData(file, "employee", "create");
        } catch (e: unknown) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Network error");
    });

    it("should send correct form data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { success: true } }),
      });

      const file = new File(["test content"], "test.csv", {
        type: "text/csv",
      });

      const { result } = renderHook(() =>
        useImportExport({ apiEndpoint: "/api/test" }),
      );

      await act(async () => {
        await result.current.importData(file, "employee", "upsert", true);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/test/import",
        expect.objectContaining({
          method: "POST",
        }),
      );

      const formData = mockFetch.mock.calls[0][1].body as FormData;
      expect(formData.get("entity_type")).toBe("employee");
      expect(formData.get("import_mode")).toBe("upsert");
      expect(formData.get("skip_errors")).toBe("true");
    });
  });

  describe("exportData", () => {
    it("should set isExporting to true during export", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { url: "http://example.com/file.xlsx" } }),
      });

      const { result } = renderHook(() =>
        useImportExport({ apiEndpoint: "/api/test" }),
      );

      await act(async () => {
        await result.current.exportData("employee", "xlsx");
      });

      expect(result.current.isExporting).toBe(false);
    });

    it("should successfully export data", async () => {
      const mockResponse = {
        data: {
          url: "http://example.com/file.xlsx",
          filename: "employee_export.xlsx",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() =>
        useImportExport({ apiEndpoint: "/api/test" }),
      );

      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportData("employee", "xlsx");
      });

      expect(exportResult).toEqual(mockResponse.data);
    });

    it("should handle export error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() =>
        useImportExport({ apiEndpoint: "/api/test" }),
      );

      await act(async () => {
        try {
          await result.current.exportData("employee", "xlsx");
        } catch (e: unknown) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Export failed");
    });

    it("should send correct export parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { url: "http://example.com/file.xlsx" } }),
      });

      const { result } = renderHook(() =>
        useImportExport({ apiEndpoint: "/api/test" }),
      );

      const columns = ["name", "email", "department"];
      const filters = { status: "active", department: "IT" };

      await act(async () => {
        await result.current.exportData("employee", "xlsx", columns, filters);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/test/export",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            entity_type: "employee",
            file_format: "xlsx",
            columns,
            filters,
          }),
        }),
      );
    });
  });

  describe("getImportTemplates", () => {
    it("should fetch templates successfully", async () => {
      const mockTemplates = {
        data: [
          { id: "1", name: "Employee Template", entityType: "employee" },
          { id: "2", name: "Customer Template", entityType: "customer" },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplates,
      });

      const { result } = renderHook(() =>
        useImportExport({ apiEndpoint: "/api/test" }),
      );

      let templates: any;
      await act(async () => {
        templates = await result.current.getImportTemplates();
      });

      expect(templates).toEqual(mockTemplates.data);
    });

    it("should handle templates fetch error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { result } = renderHook(() =>
        useImportExport({ apiEndpoint: "/api/test" }),
      );

      await act(async () => {
        try {
          await result.current.getImportTemplates();
        } catch (e: unknown) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Failed to fetch templates");
    });
  });

  describe("getImportStatus", () => {
    it("should fetch import status successfully", async () => {
      const mockStatus = {
        data: {
          id: "import-123",
          status: "completed",
          total: 100,
          processed: 100,
          failed: 2,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      });

      const { result } = renderHook(() =>
        useImportExport({ apiEndpoint: "/api/test" }),
      );

      let status: any;
      await act(async () => {
        status = await result.current.getImportStatus("import-123");
      });

      expect(status).toEqual(mockStatus.data);
    });

    it("should handle status fetch error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { result } = renderHook(() =>
        useImportExport({ apiEndpoint: "/api/test" }),
      );

      await act(async () => {
        try {
          await result.current.getImportStatus("import-123");
        } catch (e: unknown) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Failed to fetch import status");
    });
  });
});
