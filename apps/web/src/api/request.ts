import type { ApiResponse } from './client';
import { handleApiError, type AppError, AppExceptionError } from '../utils/errors';
import createLogger from '../utils/logger';

const logger = createLogger('request');

export interface RequestOptions {
  skipErrorHandler?: boolean;
  skipSuccessToast?: boolean;
  skipErrorToast?: boolean;
}

/**
 * 统一处理 API 响应
 */
export function handleResponse<T>(response: ApiResponse<T>, options?: RequestOptions): T {
  if (!response.success) {
    const error: AppError = {
      code: response.code,
      message: response.message,
      details: response.data,
    };

    if (!options?.skipErrorHandler) {
      logger.error('API Error:', error);
      if (!options?.skipErrorToast) {
        throw error;
      }
    }

    throw error;
  }

  return response.data as T;
}

/**
 * 处理 API 错误
 */
export function handleRequestError(error: unknown): AppError {
  const appError = handleApiError(error);
  logger.error('Request Error:', appError);
  return appError;
}

/**
 * 安全的 API 请求包装器
 */
export async function safeRequest<T>(
  requestFn: () => Promise<ApiResponse<T>>,
  options?: RequestOptions
): Promise<T | null> {
  try {
    const response = await requestFn();
    return handleResponse(response, options);
  } catch (error: unknown) {
    const appError = handleRequestError(error);
    if (!options?.skipErrorHandler) {
      throw appError;
    }
    return null;
  }
}

export interface PaginatedRequestParams {
  page?: number;
  page_size?: number;
  search?: string;
  [key: string]: unknown;
}

/**
 * 分页请求帮助函数
 */
export async function paginatedRequest<T>(
  requestFn: (
    _params: PaginatedRequestParams
  ) => Promise<ApiResponse<{ items: T[]; total: number; page: number; page_size: number }>>,
  params: PaginatedRequestParams = {}
): Promise<{ items: T[]; total: number; page: number; page_size: number }> {
  const response = await requestFn(params);

  if (!response.success) {
    const error = new Error(response.message) as Error & { code?: string | number };
    error.code = response.code;
    throw error;
  }

  return response.data as unknown as {
    items: T[];
    total: number;
    page: number;
    page_size: number;
  };
}
