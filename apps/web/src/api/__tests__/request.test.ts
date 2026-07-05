import { describe, it, expect, vi, beforeEach } from 'vitest';

import { handleResponse, safeRequest, paginatedRequest } from '@/api/request';

// We test the request utilities (handleResponse, safeRequest, paginatedRequest, handleRequestError)
// These are pure functions that don't depend on axios instance, making them easy to test.

// Mock the logger to avoid side effects
vi.mock('@/utils/logger', () => ({
  default: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock the errors module to control behavior
vi.mock('@/utils/errors', () => ({
  handleApiError: vi.fn((error: unknown) => {
    // Simulate axios-style error response
    const axiosError = error as {
      response?: { status: number; data?: { message?: string } };
      code?: string;
    };
    if (axiosError.response) {
      const { status, data } = axiosError.response;
      return { code: status, message: data?.message || 'Error', details: null };
    }
    return { code: 'UNKNOWN_ERROR', message: 'Unknown error', details: null };
  }),
  AppExceptionError: class extends Error {
    code: string;
    details?: unknown;
    originalError?: unknown;
    constructor(msg: string, opts: { code: string; details?: unknown; originalError?: unknown }) {
      super(msg);
      this.code = opts.code;
      this.details = opts.details;
      this.originalError = opts.originalError;
    }
  },
}));

describe('handleResponse', () => {
  it('should return data when response is successful', () => {
    const response = { success: true, code: 200, message: 'OK', data: { id: 1 } };
    const result = handleResponse(response);
    expect(result).toEqual({ id: 1 });
  });

  it('should throw error when response is not successful', () => {
    const response = { success: false, code: 400, message: 'Bad Request', data: null };
    expect(() => handleResponse(response)).toThrow();
  });

  it('should throw error with correct message', () => {
    const response = { success: false, code: 404, message: 'Not Found', data: null };
    try {
      handleResponse(response);
      expect.unreachable('Should have thrown');
    } catch (error: unknown) {
      const err = error as { message: string };
      expect(err.message).toBe('Not Found');
    }
  });

  it('should handle null data in successful response', () => {
    const response = { success: true, code: 200, message: 'OK', data: null };
    expect(handleResponse(response)).toBeNull();
  });
});

describe('safeRequest', () => {
  it('should return data for successful request', async () => {
    const requestFn = vi.fn().mockResolvedValue({
      success: true,
      code: 200,
      message: 'OK',
      data: { items: [1, 2, 3] },
    });

    const result = await safeRequest(requestFn);
    expect(result).toEqual({ items: [1, 2, 3] });
  });

  it('should throw for failed request by default', async () => {
    const requestFn = vi.fn().mockResolvedValue({
      success: false,
      code: 500,
      message: 'Server Error',
      data: null,
    });

    await expect(safeRequest(requestFn)).rejects.toThrow();
  });

  it('should throw error when skipErrorHandler is false', async () => {
    const requestFn = vi.fn().mockResolvedValue({
      success: false,
      code: 500,
      message: 'Server Error',
      data: null,
    });

    // Default behavior: skipErrorHandler is not set, error is thrown
    await expect(safeRequest(requestFn, { skipErrorHandler: false })).rejects.toThrow();
  });

  it('should not throw when skipErrorHandler is true', async () => {
    const requestFn = vi.fn().mockResolvedValue({
      success: false,
      code: 500,
      message: 'Server Error',
      data: null,
    });

    const result = await safeRequest(requestFn, { skipErrorHandler: true });
    expect(result).toBeNull();
  });
});

describe('paginatedRequest', () => {
  it('should return paginated data for successful request', async () => {
    const requestFn = vi.fn().mockResolvedValue({
      success: true,
      code: 200,
      message: 'OK',
      data: { items: [{ id: 1 }, { id: 2 }], total: 2, page: 1, pagesize: 10 },
    });

    const result = await paginatedRequest(requestFn, { page: 1, pagesize: 10 });
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(requestFn).toHaveBeenCalledWith({ page: 1, pagesize: 10 });
  });

  it('should throw error for failed paginated request', async () => {
    const requestFn = vi.fn().mockResolvedValue({
      success: false,
      code: 500,
      message: 'Server Error',
      data: null,
    });

    await expect(paginatedRequest(requestFn)).rejects.toThrow('Server Error');
  });

  it('should pass params to request function', async () => {
    const requestFn = vi.fn().mockResolvedValue({
      success: true,
      code: 200,
      message: 'OK',
      data: { items: [], total: 0, page: 1, pagesize: 20 },
    });

    await paginatedRequest(requestFn, { page: 2, pagesize: 20, search: 'test' });
    expect(requestFn).toHaveBeenCalledWith({
      page: 2,
      pagesize: 20,
      search: 'test',
    });
  });

  it('should use default params when none provided', async () => {
    const requestFn = vi.fn().mockResolvedValue({
      success: true,
      code: 200,
      message: 'OK',
      data: { items: [], total: 0, page: 1, pagesize: 10 },
    });

    await paginatedRequest(requestFn);
    expect(requestFn).toHaveBeenCalledWith({});
  });
});
