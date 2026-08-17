import i18n from '@/i18n';
/**
 * Phase 7-3 — 全局错误处理工具
 *
 * 统一分类和处理 API 错误，提供用户友好的错误消息。
 */

export type ErrorCategory = 'network' | 'auth' | 'permission' | 'business' | 'server' | 'unknown';

export interface AppError {
  category: ErrorCategory;
  message: string;
  detail?: string;
  code?: number | string;
  originalError?: unknown;
}

/**
 * 分类 API 错误
 */
interface ErrorLike {
  code?: string;
  message?: string;
  response?: {
    status?: number;
    data?: {
      message?: string;
      errors?: unknown[];
      details?: unknown[];
    };
  };
  request?: unknown;
}

function isErrorLike(error: unknown): error is ErrorLike {
  return typeof error === 'object' && error !== null;
}

export function classifyError(error: unknown): AppError {
  if (!error) {
    return { category: 'unknown', message: i18n.t('shared.error_handler.k0') };
  }

  if (!isErrorLike(error)) {
    return { category: 'unknown', message: String(error), originalError: error };
  }

  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
    return {
      category: 'network',
      message: i18n.t('shared.error_handler.k1'),
      originalError: error,
    };
  }

  if (error.code === 'ECONNABORTED') {
    return {
      category: 'network',
      message: i18n.t('shared.error_handler.k2'),
      originalError: error,
    };
  }

  if (error.response) {
    const { status, data } = error.response;
    switch (status) {
      case 401:
        return {
          category: 'auth',
          message: i18n.t('shared.error_handler.k3'),
          code: status,
          originalError: error,
        };
      case 403:
        return {
          category: 'permission',
          message: i18n.t('shared.error_handler.k4'),
          code: status,
          originalError: error,
        };
      case 404:
        return {
          category: 'business',
          message: data?.message || i18n.t('shared.error_handler.k5'),
          code: status,
          originalError: error,
        };
      case 422:
        return {
          category: 'business',
          message: data?.message || i18n.t('shared.error_handler.k6'),
          detail: JSON.stringify(data?.errors || data?.details || []),
          code: status,
          originalError: error,
        };
      case 500:
        return {
          category: 'server',
          message: i18n.t('shared.error_handler.k7'),
          code: status,
          originalError: error,
        };
      case 502:
      case 503:
        return {
          category: 'server',
          message: i18n.t('shared.error_handler.k8'),
          code: status,
          originalError: error,
        };
      default:
        return {
          category: 'unknown',
          message: data?.message || `${i18n.t('shared.error_handler.k0')}${status})`,
          code: status,
          originalError: error,
        };
    }
  }

  if (error.request) {
    return {
      category: 'network',
      message: i18n.t('shared.error_handler.k9'),
      originalError: error,
    };
  }

  if (error instanceof Error) {
    return {
      category: 'unknown',
      message: error.message || i18n.t('shared.error_handler.k10'),
      originalError: error,
    };
  }

  return { category: 'unknown', message: i18n.t('shared.error_handler.k11'), originalError: error };
}

/**
 * 获取用户友好的错误消息
 */
export function getUserFriendlyError(error: unknown): string {
  return classifyError(error).message;
}
