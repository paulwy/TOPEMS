import { describe, it, expect, vi } from "vitest";
import { ErrorCode, AppException, handleApiError, getErrorMessage, safeExecute } from "../../utils/errors";

describe("errors utils", () => {
  describe("ErrorCode", () => {
    it("should have all error codes defined", () => {
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

  describe("AppException", () => {
    it("should create exception with code and message", () => {
      const exception = new AppException(ErrorCode.UNAUTHORIZED, "Unauthorized");
      expect(exception.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(exception.message).toBe("Unauthorized");
      expect(exception.name).toBe("AppException");
    });

    it("should create exception with details", () => {
      const details = { field: "email" };
      const exception = new AppException(ErrorCode.VALIDATION, "Validation failed", details);
      expect(exception.details).toEqual(details);
    });

    it("should create exception with original error", () => {
      const originalError = new Error("Original error");
      const exception = new AppException(ErrorCode.SERVER, "Server error", undefined, originalError);
      expect(exception.originalError).toBe(originalError);
    });
  });

  describe("handleApiError", () => {
    it("should handle AppException", () => {
      const exception = new AppException(ErrorCode.UNAUTHORIZED, "Unauthorized");
      const result = handleApiError(exception);
      expect(result.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(result.message).toBe("Unauthorized");
    });

    it("should handle 401 error", () => {
      const error = { response: { status: 401, data: { message: "Unauthorized" } } };
      const result = handleApiError(error);
      expect(result.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(result.message).toBe("未授权访问，请重新登录");
    });

    it("should handle 403 error", () => {
      const error = { response: { status: 403, data: {} } };
      const result = handleApiError(error);
      expect(result.code).toBe(ErrorCode.FORBIDDEN);
      expect(result.message).toBe("无权限访问此资源");
    });

    it("should handle 404 error", () => {
      const error = { response: { status: 404, data: {} } };
      const result = handleApiError(error);
      expect(result.code).toBe(ErrorCode.NOT_FOUND);
      expect(result.message).toBe("资源未找到");
    });

    it("should handle 400 validation error", () => {
      const error = { response: { status: 400, data: { message: "Invalid input" } } };
      const result = handleApiError(error);
      expect(result.code).toBe(ErrorCode.VALIDATION);
      expect(result.message).toBe("Invalid input");
    });

    it("should handle 500 server error", () => {
      const error = { response: { status: 500, data: {} } };
      const result = handleApiError(error);
      expect(result.code).toBe(ErrorCode.SERVER);
      expect(result.message).toBe("服务器内部错误");
    });

    it("should handle timeout error", () => {
      const error = { code: "ECONNABORTED" };
      const result = handleApiError(error);
      expect(result.code).toBe(ErrorCode.TIMEOUT);
      expect(result.message).toBe("请求超时，请稍后重试");
    });

    it("should handle network error", () => {
      const error = { code: "ERR_NETWORK" };
      const result = handleApiError(error);
      expect(result.code).toBe(ErrorCode.NETWORK);
      expect(result.message).toBe("网络连接失败，请检查网络设置");
    });

    it("should handle ENOTFOUND error", () => {
      const error = { code: "ENOTFOUND" };
      const result = handleApiError(error);
      expect(result.code).toBe(ErrorCode.NETWORK);
    });

    it("should handle unknown error", () => {
      const error = new Error("Unknown error");
      const result = handleApiError(error);
      expect(result.code).toBe(ErrorCode.UNKNOWN);
    });
  });

  describe("getErrorMessage", () => {
    it("should return message from AppError", () => {
      const error = { code: ErrorCode.UNKNOWN, message: "Test error" };
      expect(getErrorMessage(error)).toBe("Test error");
    });

    it("should return message from Error object", () => {
      const error = new Error("Test error");
      expect(getErrorMessage(error)).toBe("Test error");
    });

    it("should return default message for unknown error", () => {
      expect(getErrorMessage(null)).toBe("发生未知错误");
      expect(getErrorMessage(undefined)).toBe("发生未知错误");
      expect(getErrorMessage(42)).toBe("发生未知错误");
    });
  });

  describe("safeExecute", () => {
    it("should return result on success", async () => {
      const fn = async () => "success";
      const result = await safeExecute(fn);
      expect(result).toBe("success");
    });

    it("should return null on error", async () => {
      const fn = async () => {
        throw new Error("Test error");
      };
      const result = await safeExecute(fn);
      expect(result).toBe(null);
    });

    it("should call errorHandler on error", async () => {
      const errorHandler = vi.fn();
      const fn = async () => {
        throw new AppException(ErrorCode.UNAUTHORIZED, "Unauthorized");
      };
      await safeExecute(fn, errorHandler);
      expect(errorHandler).toHaveBeenCalled();
      expect(errorHandler.mock.calls[0][0].code).toBe(ErrorCode.UNAUTHORIZED);
    });
  });
});