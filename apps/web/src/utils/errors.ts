import createLogger from './logger';
import i18n from '@/i18n';

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

export class AppExceptionError extends Error {
  code: ErrorCode;
  details?: unknown;
  originalError?: unknown;
  public cause?: unknown;

  constructor(
    message: string,
    options: { code: ErrorCode; details?: unknown; originalError?: unknown; cause?: unknown }
  ) {
    super(message, options);
    this.cause = options.cause;
    this.name = 'AppExceptionError';
    this.code = options.code;
    this.details = options.details;
    this.originalError = options.originalError;
  }
}

export const handleApiError = (error: unknown): AppError => {
  logger.error('API error:', error);

  if (error instanceof AppExceptionError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      originalError: error.originalError,
    };
  }

  const axiosError = error as {
    response?: { status: number; data?: unknown };
  };

  if (axiosError.response) {
    const { status } = axiosError.response;
    // 422 兼容多种响应体形状：纯文本（axum 反序列化错误）、{ message } / { error } / { detail } / { errors:[{msg}] }
    const data = axiosError.response.data as
      | string
      | {
          message?: string;
          error?: string;
          detail?: string;
          errors?: Array<{ msg?: string; message?: string }>;
        }
      | undefined;
    let message: string;
    if (typeof data === 'string') {
      message = data.trim() || 'Unknown error';
    } else {
      message =
        data?.message ||
        data?.error ||
        data?.detail ||
        data?.errors?.[0]?.msg ||
        data?.errors?.[0]?.message ||
        'Unknown error';
    }

    switch (status) {
      case 401:
        return {
          code: ErrorCode.UNAUTHORIZED,
          message: i18n.t('shared.errors.k0'),
        };
      case 403:
        return { code: ErrorCode.FORBIDDEN, message: i18n.t('shared.errors.k1') };
      case 404:
        return { code: ErrorCode.NOT_FOUND, message: i18n.t('shared.errors.k2') };
      case 400:
      case 422:
        // 422 = 请求体校验/反序列化失败（空串 UUID、缺必填字段等），直接展示后端明细，不静默吞掉
        return { code: ErrorCode.VALIDATION, message };
      case 500:
        return { code: ErrorCode.SERVER, message: i18n.t('shared.errors.k3') };
      default:
        return { code: ErrorCode.UNKNOWN, message };
    }
  }

  const networkError = error as { code?: string };
  if (networkError?.code === 'ECONNABORTED') {
    return { code: ErrorCode.TIMEOUT, message: i18n.t('shared.errors.k4') };
  }

  if (networkError?.code === 'ERR_NETWORK' || networkError?.code === 'ENOTFOUND') {
    return { code: ErrorCode.NETWORK, message: i18n.t('shared.errors.k5') };
  }

  return {
    code: ErrorCode.UNKNOWN,
    message: i18n.t('shared.errors.k6'),
    originalError: error,
  };
};

export const getErrorMessage = (error: AppError | unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as { message: string }).message;
  }
  return i18n.t('shared.errors.k7');
};

/**
 * 从未知错误中提取消息（兼容 axios 错误响应）
 * 优先使用服务端返回的 message 字段，否则使用 Error.message，最后使用兜底值
 */
export const extractErrorMessage = (
  error: unknown,
  fallback = i18n.t('shared.errors.k8')
): string => {
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
