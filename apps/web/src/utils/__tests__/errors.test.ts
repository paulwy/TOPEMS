import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  handleApiError,
  getErrorMessage,
  extractErrorMessage,
  AppExceptionError,
  ErrorCode,
} from '@/utils/errors';

// Mock the logger
vi.mock('@/utils/logger', () => ({
  default: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('handleApiError', () => {
  it('should handle AppExceptionError', () => {
    const error = new AppExceptionError('Test error', {
      code: ErrorCode.VALIDATION,
      details: { field: 'name' },
    });
    const result = handleApiError(error);
    expect(result.code).toBe(ErrorCode.VALIDATION);
    expect(result.message).toBe('Test error');
    expect(result.details).toEqual({ field: 'name' });
  });

  it('should handle axios 401 error', () => {
    const error = {
      response: { status: 401, data: { message: 'Unauthorized' } },
    };
    const result = handleApiError(error);
    expect(result.code).toBe(ErrorCode.UNAUTHORIZED);
  });

  it('should handle axios 403 error', () => {
    const error = {
      response: { status: 403, data: { message: 'Forbidden' } },
    };
    const result = handleApiError(error);
    expect(result.code).toBe(ErrorCode.FORBIDDEN);
  });

  it('should handle axios 404 error', () => {
    const error = {
      response: { status: 404, data: { message: 'Not Found' } },
    };
    const result = handleApiError(error);
    expect(result.code).toBe(ErrorCode.NOT_FOUND);
  });

  it('should handle axios 400 error', () => {
    const error = {
      response: { status: 400, data: { message: 'Bad input' } },
    };
    const result = handleApiError(error);
    expect(result.code).toBe(ErrorCode.VALIDATION);
    expect(result.message).toBe('Bad input');
  });

  it('should handle axios 500 error', () => {
    const error = {
      response: { status: 500, data: { message: 'Internal Error' } },
    };
    const result = handleApiError(error);
    expect(result.code).toBe(ErrorCode.SERVER);
  });

  it('should handle timeout error (ECONNABORTED)', () => {
    const error = { code: 'ECONNABORTED' };
    const result = handleApiError(error);
    expect(result.code).toBe(ErrorCode.TIMEOUT);
  });

  it('should handle network error (ERR_NETWORK)', () => {
    const error = { code: 'ERR_NETWORK' };
    const result = handleApiError(error);
    expect(result.code).toBe(ErrorCode.NETWORK);
  });

  it('should handle unknown error', () => {
    const result = handleApiError('some string error');
    expect(result.code).toBe(ErrorCode.UNKNOWN);
    expect(result.message).toContain('未知');
  });

  it('should handle axios error without data.message', () => {
    const error = {
      response: { status: 500 },
    };
    const result = handleApiError(error);
    expect(result.code).toBe(ErrorCode.SERVER);
    // When no data.message, the default for 500 is '服务器内部错误'
    expect(result.message).toBe('服务器内部错误');
  });
});

describe('getErrorMessage', () => {
  it('should extract message from AppError', () => {
    expect(getErrorMessage({ code: 400, message: 'Bad Request' })).toBe('Bad Request');
  });

  it('should return fallback for null', () => {
    expect(getErrorMessage(null)).toBe('发生未知错误');
  });

  it('should return fallback for non-object', () => {
    expect(getErrorMessage(42)).toBe('发生未知错误');
  });

  it('should return fallback for object without message', () => {
    expect(getErrorMessage({ code: 400 })).toBe('发生未知错误');
  });
});

describe('extractErrorMessage', () => {
  it('should extract from axios response data', () => {
    const error = {
      response: { data: { message: 'Server says no' } },
    };
    expect(extractErrorMessage(error)).toBe('Server says no');
  });

  it('should extract from error.message', () => {
    expect(extractErrorMessage(new Error('Network failure'))).toBe('Network failure');
  });

  it('should return fallback for null', () => {
    expect(extractErrorMessage(null)).toBe('操作失败');
  });

  it('should use custom fallback', () => {
    expect(extractErrorMessage(null, 'Custom fallback')).toBe('Custom fallback');
  });

  it('should return fallback for error without response or message', () => {
    expect(extractErrorMessage({})).toBe('操作失败');
  });
});

describe('AppExceptionError', () => {
  it('should create error with correct properties', () => {
    const error = new AppExceptionError('Test', {
      code: ErrorCode.NOT_FOUND,
      details: { id: 123 },
      originalError: new Error('original'),
    });
    expect(error.name).toBe('AppExceptionError');
    expect(error.message).toBe('Test');
    expect(error.code).toBe(ErrorCode.NOT_FOUND);
    expect(error.details).toEqual({ id: 123 });
    expect(error.originalError).toBeInstanceOf(Error);
  });
});
