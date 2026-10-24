/**
 * UI状态管理Hooks
 * 提供常用的UI状态管理功能
 */

/**
 * 排序状态管理
 */
export type SortOrder = 'asc' | 'desc' | undefined;

/**
 * 消息提示状态管理
 */
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}
