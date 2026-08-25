/**
 * 本地存储工具函数
 * 提供类型安全的localStorage和sessionStorage操作
 *
 * NOTE: 当前未被任何组件直接导入（通过 utils/index.ts 的 export * 导出）。
 * session.ts 使用了独立的 localStorage 调用，未使用本文件的 Storage 类。
 * 保留作为基础设施工具，可在需要高级存储功能（过期时间、命名空间等）时使用。
 */

/**
 * 存储配置
 */
/**
 * 默认序列化函数
 */
/**
 * 默认反序列化函数
 */
/**
 * 创建存储键名
 */
/**
 * 检查值是否过期
 */
/**
 * localStorage操作类
 */
/**
 * sessionStorage操作类
 */
// 导出类用于自定义配置

// 常用键名常量
export const STORAGE_KEYS = {
  USER_INFO: 'user_info',
  USER_PERMISSIONS: 'user_permissions',
  THEME: 'theme',
  LANGUAGE: 'language',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  TABLE_COLUMNS: 'table_columns',
  FORM_DRAFT: 'form_draft',
  LAST_LOGIN: 'last_login',
  REMEMBER_ME: 'remember_me',
} as const;
