import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ErrorCode,
  AppException,
  handleApiError,
  getErrorMessage,
  logError,
  safeExecute,
} from "../../utils/errors";

describe("errors utils", () => {
  describe("ErrorCode enum", () => {
    it("should have correct error codes", () => {
      expect(ErrorCode.UNKNOWN).toBe("UNKNOWN_ERROR");
      expect(ErrorCode.NETWORK).toBe("NETWORK_ERROR");
      expect(ErrorCode.UNAUTHORIZED).toBe("UNAUTHORIZED");
      expect(ErrorCode.FORBIDDEN).toBe("FORBIDDEN");
      expect(ErrorCode.NOT_FOUND).toBe("NOT_FOUND");
      expect(ErrorCode.VALIDATION).toBe("VALIDATION_ERROR");
      expect(ErrorCode.SERVER).toBe("SERVER_ERROR");
      expect(ErrorCode.TIMEOUT).toBe("TIMEOUT_ERROR");
    });
  });

  describe("AppException class", () => {
    it("should create exception with all properties", () => {
      const error = new AppException(
        ErrorCode.VALIDATION,
        "Validation failed",
        { field: "email" },
        new Error("Original"),
      );

      expect(error.name).toBe("AppException");
      expect(error.code).toBe(ErrorCode.VALIDATION);
      expect(error.message).toBe("Validation failed");
      expect(error.details).toEqual({ field: "email" });
      expect(error.originalError).toBeInstanceOf(Error);
    });

    it("should extend Error", () => {
      const error = new AppException(ErrorCode.UNKNOWN, "Unknown error");
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("handleApiError", () => {
    beforeEach(() => {
      vi.spyOn(console, "error").mockImplementation(() => {});
    });

    it("should handle AppException", () => {
      const appException = new AppException(
        ErrorCode.VALIDATION,
        "Custom validation error",
        { field: "name" },
      );

      const result = handleApiError(appException);

      expect(result.code).toBe(ErrorCode.VALIDATION);
      expect(result.message).toBe("Custom validation error");
      expect(result.details).toEqual({ field: "name" });
    });

    it("should handle 401 unauthorized error", () => {
      const axiosError = {
        response: {
          status: 401,
          data: { message: "Session expired" },
        },
      };

      const result = handleApiError(axiosError);

      expect(result.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(result.message).toBe("未授权访问，请重新登录");
    });

    it("should handle 403 forbidden error", () => {
      const axiosError = {
        response: {
          status: 403,
          data: { message: "Access denied" },
        },
      };

      const result = handleApiError(axiosError);

      expect(result.code).toBe(ErrorCode.FORBIDDEN);
      expect(result.message).toBe("无权限访问此资源");
    });

    it("should handle 404 not found error", () => {
      const axiosError = {
        response: {
          status: 404,
          data: { message: "Resource not found" },
        },
      };

      const result = handleApiError(axiosError);

      expect(result.code).toBe(ErrorCode.NOT_FOUND);
      expect(result.message).toBe("资源未找到");
    });

    it("should handle 400 validation error", () => {
      const axiosError = {
        response: {
          status: 400,
          data: { message: "Invalid input" },
        },
      };

      const result = handleApiError(axiosError);

      expect(result.code).toBe(ErrorCode.VALIDATION);
      expect(result.message).toBe("Invalid input");
    });

    it("should handle 500 server error", () => {
      const axiosError = {
        response: {
          status: 500,
          data: { message: "Internal server error" },
        },
      };

      const result = handleApiError(axiosError);

      expect(result.code).toBe(ErrorCode.SERVER);
      expect(result.message).toBe("服务器内部错误");
    });

    it("should handle unknown status codes", () => {
      const axiosError = {
        response: {
          status: 418,
          data: { message: "I'm a teapot" },
        },
      };

      const result = handleApiError(axiosError);

      expect(result.code).toBe(ErrorCode.UNKNOWN);
      expect(result.message).toBe("I'm a teapot");
    });

    it("should handle timeout error", () => {
      const error = {
        code: "ECONNABORTED",
        message: "Request timeout",
      };

      const result = handleApiError(error);

      expect(result.code).toBe(ErrorCode.TIMEOUT);
      expect(result.message).toBe("请求超时，请稍后重试");
    });

    it("should handle network error ERR_NETWORK", () => {
      const error = {
        code: "ERR_NETWORK",
        message: "Network error",
      };

      const result = handleApiError(error);

      expect(result.code).toBe(ErrorCode.NETWORK);
      expect(result.message).toBe("网络连接失败，请检查网络设置");
    });

    it("should handle network error ENOTFOUND", () => {
      const error = {
        code: "ENOTFOUND",
        message: "Host not found",
      };

      const result = handleApiError(error);

      expect(result.code).toBe(ErrorCode.NETWORK);
      expect(result.message).toBe("网络连接失败，请检查网络设置");
    });

    it("should handle unknown error with defaults", () => {
      const error = "Something went wrong";

      const result = handleApiError(error);

      expect(result.code).toBe(ErrorCode.UNKNOWN);
      expect(result.message).toBe("发生未知错误，请稍后重试");
      expect(result.originalError).toBe("Something went wrong");
    });
  });

  describe("getErrorMessage", () => {
    it("should extract message from AppError", () => {
      const error: any = { message: "Test error message" };
      expect(getErrorMessage(error)).toBe("Test error message");
    });

    it("should handle Error object", () => {
      const error = new Error("Error object message");
      expect(getErrorMessage(error)).toBe("Error object message");
    });

    it("should return default message for unknown error", () => {
      expect(getErrorMessage(null)).toBe("发生未知错误");
      expect(getErrorMessage(undefined)).toBe("发生未知错误");
      expect(getErrorMessage(123)).toBe("发生未知错误");
      expect(getErrorMessage({})).toBe("发生未知错误");
    });

    it("should handle string error as unknown", () => {
      // getErrorMessage only handles objects with message property
      expect(getErrorMessage("String error")).toBe("发生未知错误");
    });
  });

  describe("logError", () => {
    it("should not throw when logging errors", () => {
      expect(() => logError("test", new Error("test"))).not.toThrow();
    });
  });

  describe("safeExecute", () => {
    it("should return result when function succeeds", async () => {
      const fn = vi.fn().mockResolvedValue("success");
      const result = await safeExecute(fn);
      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should call error handler on failure", async () => {
      const error = new Error("test error");
      const fn = vi.fn().mockRejectedValue(error);
      const errorHandler = vi.fn();

      const result = await safeExecute(fn, errorHandler);

      expect(result).toBeNull();
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ErrorCode.UNKNOWN,
        }),
      );
    });

    it("should handle error without handler", async () => {
      const error = new Error("test error");
      const fn = vi.fn().mockRejectedValue(error);

      const result = await safeExecute(fn);

      expect(result).toBeNull();
    });

    it("should handle AppException in safeExecute", async () => {
      const appException = new AppException(
        ErrorCode.VALIDATION,
        "Validation error",
      );
      const fn = vi.fn().mockRejectedValue(appException);
      const errorHandler = vi.fn();

      await safeExecute(fn, errorHandler);

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ErrorCode.VALIDATION,
          message: "Validation error",
        }),
      );
    });
  });
});
