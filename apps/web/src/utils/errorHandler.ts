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
  originalError?: any;
}

/**
 * 分类 API 错误
 */
export function classifyError(error: any): AppError {
  if (!error) {
    return { category: 'unknown', message: '未知错误' };
  }

  // 网络错误
  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
    return { category: 'network', message: '网络连接失败，请检查网络设置', originalError: error };
  }

  // 超时
  if (error.code === 'ECONNABORTED') {
    return { category: 'network', message: '请求超时，请稍后重试', originalError: error };
  }

  // Axios 响应错误
  if (error.response) {
    const { status, data } = error.response;
    switch (status) {
      case 401:
        return {
          category: 'auth',
          message: '登录已过期，请重新登录',
          code: status,
          originalError: error,
        };
      case 403:
        return {
          category: 'permission',
          message: '没有权限执行此操作',
          code: status,
          originalError: error,
        };
      case 404:
        return {
          category: 'business',
          message: data?.message || '请求的资源不存在',
          code: status,
          originalError: error,
        };
      case 422:
        return {
          category: 'business',
          message: data?.message || '请求数据验证失败',
          detail: JSON.stringify(data?.errors || data?.details || []),
          code: status,
          originalError: error,
        };
      case 500:
        return {
          category: 'server',
          message: '服务器内部错误，请联系管理员',
          code: status,
          originalError: error,
        };
      case 502:
      case 503:
        return {
          category: 'server',
          message: '服务暂时不可用，请稍后重试',
          code: status,
          originalError: error,
        };
      default:
        return {
          category: 'unknown',
          message: data?.message || `请求失败 (${status})`,
          code: status,
          originalError: error,
        };
    }
  }

  // 请求配置错误
  if (error.request) {
    return { category: 'network', message: '服务器未响应，请检查网络连接', originalError: error };
  }

  // JavaScript 错误
  return { category: 'unknown', message: error.message || '操作失败', originalError: error };
}

/**
 * 获取用户友好的错误消息
 */
export function getUserFriendlyError(error: any): string {
  return classifyError(error).message;
}
