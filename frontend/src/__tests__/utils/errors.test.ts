import { ErrorCode, AppException, handleApiError, getErrorMessage, logError, safeExecute } from '../../utils/errors';

vi.mock('../../utils/logger', () => ({
  default: () => ({
    error: vi.fn(),
  }),
}));

describe('ErrorCode Enum', () => {
  test('contains all expected error codes', () => {
    expect(ErrorCode.UNKNOWN).toBe('UNKNOWN_ERROR');
    expect(ErrorCode.NETWORK).toBe('NETWORK_ERROR');
    expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN');
    expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
    expect(ErrorCode.VALIDATION).toBe('VALIDATION_ERROR');
    expect(ErrorCode.SERVER).toBe('SERVER_ERROR');
    expect(ErrorCode.TIMEOUT).toBe('TIMEOUT_ERROR');
  });
});

describe('AppException', () => {
  test('creates exception with code and message', () => {
    const exception = new AppException(ErrorCode.UNAUTHORIZED, 'Test message');
    expect(exception.code).toBe(ErrorCode.UNAUTHORIZED);
    expect(exception.message).toBe('Test message');
    expect(exception.name).toBe('AppException');
  });

  test('creates exception with details and originalError', () => {
    const originalError = new Error('Original error');
    const exception = new AppException(
      ErrorCode.SERVER,
      'Server error',
      { detail: 'detail' },
      originalError
    );
    expect(exception.details).toEqual({ detail: 'detail' });
    expect(exception.originalError).toBe(originalError);
  });
});

describe('handleApiError', () => {
  test('handles AppException', () => {
    const exception = new AppException(ErrorCode.UNAUTHORIZED, 'Unauthorized');
    const result = handleApiError(exception);
    expect(result.code).toBe(ErrorCode.UNAUTHORIZED);
    expect(result.message).toBe('Unauthorized');
  });

  test('handles axios 401 error', () => {
    const axiosError = {
      response: {
        status: 401,
        data: { message: 'Unauthorized' },
      },
    };
    const result = handleApiError(axiosError);
    expect(result.code).toBe(ErrorCode.UNAUTHORIZED);
    expect(result.message).toBe('未授权访问，请重新登录');
  });

  test('handles axios 403 error', () => {
    const axiosError = {
      response: {
        status: 403,
        data: { message: 'Forbidden' },
      },
    };
    const result = handleApiError(axiosError);
    expect(result.code).toBe(ErrorCode.FORBIDDEN);
    expect(result.message).toBe('无权限访问此资源');
  });

  test('handles axios 404 error', () => {
    const axiosError = {
      response: {
        status: 404,
        data: { message: 'Not found' },
      },
    };
    const result = handleApiError(axiosError);
    expect(result.code).toBe(ErrorCode.NOT_FOUND);
    expect(result.message).toBe('资源未找到');
  });

  test('handles axios 400 validation error', () => {
    const axiosError = {
      response: {
        status: 400,
        data: { message: 'Validation failed' },
      },
    };
    const result = handleApiError(axiosError);
    expect(result.code).toBe(ErrorCode.VALIDATION);
    expect(result.message).toBe('Validation failed');
  });

  test('handles axios 500 error', () => {
    const axiosError = {
      response: {
        status: 500,
        data: { message: 'Server error' },
      },
    };
    const result = handleApiError(axiosError);
    expect(result.code).toBe(ErrorCode.SERVER);
    expect(result.message).toBe('服务器内部错误');
  });

  test('handles axios unknown status error', () => {
    const axiosError = {
      response: {
        status: 418,
        data: { message: 'I am a teapot' },
      },
    };
    const result = handleApiError(axiosError);
    expect(result.code).toBe(ErrorCode.UNKNOWN);
    expect(result.message).toBe('I am a teapot');
  });

  test('handles timeout error', () => {
    const timeoutError = { code: 'ECONNABORTED' };
    const result = handleApiError(timeoutError);
    expect(result.code).toBe(ErrorCode.TIMEOUT);
    expect(result.message).toBe('请求超时，请稍后重试');
  });

  test('handles network error', () => {
    const networkError = { code: 'ERR_NETWORK' };
    const result = handleApiError(networkError);
    expect(result.code).toBe(ErrorCode.NETWORK);
    expect(result.message).toBe('网络连接失败，请检查网络设置');
  });

  test('handles ENOTFOUND error', () => {
    const error = { code: 'ENOTFOUND' };
    const result = handleApiError(error);
    expect(result.code).toBe(ErrorCode.NETWORK);
    expect(result.message).toBe('网络连接失败，请检查网络设置');
  });

  test('handles unknown error', () => {
    const unknownError = new Error('Unknown error');
    const result = handleApiError(unknownError);
    expect(result.code).toBe(ErrorCode.UNKNOWN);
    expect(result.message).toBe('发生未知错误，请稍后重试');
    expect(result.originalError).toBe(unknownError);
  });
});

describe('getErrorMessage', () => {
  test('returns message from AppError', () => {
    const error = { code: ErrorCode.UNKNOWN, message: 'Test error' };
    expect(getErrorMessage(error)).toBe('Test error');
  });

  test('returns message from Error object', () => {
    const error = new Error('Error message');
    expect(getErrorMessage(error)).toBe('Error message');
  });

  test('returns default message for unknown error', () => {
    expect(getErrorMessage(null)).toBe('发生未知错误');
    expect(getErrorMessage(undefined)).toBe('发生未知错误');
    expect(getErrorMessage('string')).toBe('发生未知错误');
  });
});

describe('logError', () => {
  test('logs error with context', () => {
    const error = new Error('Test error');
    logError('TestContext', error);
  });
});

describe('safeExecute', () => {
  test('returns result from successful promise', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await safeExecute(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('returns null and calls errorHandler on error', async () => {
    const error = new Error('Test error');
    const fn = vi.fn().mockRejectedValue(error);
    const errorHandler = vi.fn();
    
    const result = await safeExecute(fn, errorHandler);
    
    expect(result).toBe(null);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(errorHandler).toHaveBeenCalledTimes(1);
    expect(errorHandler).toHaveBeenCalledWith(expect.objectContaining({
      code: ErrorCode.UNKNOWN,
    }));
  });

  test('returns null without errorHandler on error', async () => {
    const error = new Error('Test error');
    const fn = vi.fn().mockRejectedValue(error);
    
    const result = await safeExecute(fn);
    
    expect(result).toBe(null);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
