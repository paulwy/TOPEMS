import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiResponse, PaginatedResponse } from "../../api/client";

describe("API Client types", () => {
  describe("ApiResponse", () => {
    it("should have correct structure", () => {
      const response: ApiResponse<string> = {
        code: 200,
        success: true,
        data: "test",
        message: "success",
        timestamp: "2024-01-01T00:00:00",
      };

      expect(response.code).toBe(200);
      expect(response.success).toBe(true);
      expect(response.data).toBe("test");
      expect(response.message).toBe("success");
      expect(response.timestamp).toBe("2024-01-01T00:00:00");
    });

    it("should handle undefined data", () => {
      const response: ApiResponse<string> = {
        code: 404,
        success: false,
        data: undefined,
        message: "Not found",
        timestamp: "2024-01-01T00:00:00",
      };

      expect(response.data).toBeUndefined();
      expect(response.success).toBe(false);
    });
  });

  describe("PaginatedResponse", () => {
    it("should have correct structure", () => {
      const response: PaginatedResponse<string> = {
        items: ["item1", "item2", "item3"],
        total: 100,
        page: 1,
        pageSize: 10,
        totalPages: 10,
      };

      expect(response.items).toHaveLength(3);
      expect(response.total).toBe(100);
      expect(response.page).toBe(1);
      expect(response.pageSize).toBe(10);
      expect(response.totalPages).toBe(10);
    });
  });
});
