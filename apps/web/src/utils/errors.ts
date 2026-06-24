import createLogger from './logger';

const logger = createLogger('ErrorHandler');

export enum ErrorCode {
  UNKNOWN = 'UNKNOWN_ERROR',
  NETWORK = 'NETWORK_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION = 'VALIDATION_ERROR',
  SERVER = 'SERVER_ERROR',
  TIMEOUT = 'TIMEOUT_ERROR',
}

export interface AppError {
  code: ErrorCode | number | string;
  message: string;
  details?: unknown;
  originalError?: unknown;
}

export class AppException extends Error {
  code: ErrorCode;
  details?: unknown;
  originalError?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown, originalError?: unknown) {
    super(message);
    this.name = 'AppException';
    this.code = code;
    this.details = details;
    this.originalError = originalError;
  }
}

export const handleApiError = (error: unknown): AppError => {
  logger.error('API error:', error);

  if (error instanceof AppException) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      originalError: error.originalError,
    };
  }

  const axiosError = error as {
    response?: { status: number; data?: { message?: string } };
  };

  if (axiosError.response) {
    const { status } = axiosError.response;
    const message = axiosError.response.data?.message || 'Unknown error';

    switch (status) {
      case 401:
        return {
          code: ErrorCode.UNAUTHORIZED,
          message: '未授权访问，请重新登录',
        };
      case 403:
        return { code: ErrorCode.FORBIDDEN, message: '无权限访问此资源' };
      case 404:
        return { code: ErrorCode.NOT_FOUND, message: '资源未找到' };
      case 400:
        return { code: ErrorCode.VALIDATION, message: message };
      case 500:
        return { code: ErrorCode.SERVER, message: '服务器内部错误' };
      default:
        return { code: ErrorCode.UNKNOWN, message };
    }
  }

  const networkError = error as { code?: string };
  if (networkError?.code === 'ECONNABORTED') {
    return { code: ErrorCode.TIMEOUT, message: '请求超时，请稍后重试' };
  }

  if (networkError?.code === 'ERR_NETWORK' || networkError?.code === 'ENOTFOUND') {
    return { code: ErrorCode.NETWORK, message: '网络连接失败，请检查网络设置' };
  }

  return {
    code: ErrorCode.UNKNOWN,
    message: '发生未知错误，请稍后重试',
    originalError: error,
  };
};

export const getErrorMessage = (error: AppError | unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as { message: string }).message;
  }
  return '发生未知错误';
};

/**
 * 从未知错误中提取消息（兼容 axios 错误响应）
 * 优先使用服务端返回的 message 字段，否则使用 Error.message，最后使用兜底值
 */
export const extractErrorMessage = (error: unknown, fallback = '操作失败'): string => {
  if (!error) return fallback;
  const err = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return err.response?.data?.message || err.message || fallback;
};

export const logError = (context: string, error: unknown): void => {
  logger.error(`[${context}]`, error);
};

export const safeExecute = async <T>(
  fn: () => Promise<T>,
  errorHandler?: (error: AppError) => void
): Promise<T | null> => {
  try {
    return await fn();
  } catch (error: unknown) {
    const appError = handleApiError(error);
    if (errorHandler) {
      errorHandler(appError);
    } else {
      logger.error('Unhandled error:', appError);
    }
    return null;
  }
};
