/**
 * Phase 7-3 — 全局错误处理工具
 *
 * 统一分类和处理 API 错误，提供用户友好的错误消息。
 */

type ErrorCategory = 'network' | 'auth' | 'permission' | 'business' | 'server' | 'unknown';

export interface AppError {
  category: ErrorCategory;
  message: string;
  detail?: string;
  code?: number | string;
  originalError?: unknown;
}
