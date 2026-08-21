/**
 * Runtime constants — timing / numeric values consumed across the app.
 *
 * Migrated from the deleted `@topems/shared-constants` package. Only the
 * constants actually imported by application code were preserved; the rest
 * (color aliases, design-token re-exports, hardcoded Chinese labels) was
 * dead code and dropped to keep this module focused.
 *
 * Design-token-derived color constants already live in `designTokens`
 * exported from `./tokens`; do not duplicate them here.
 */

// ========== API 超时配置 ==========
export const API_TIMEOUT = {
  DEFAULT: 60000, // 默认 60 秒
  AI: 120000, // AI 请求 120 秒
  UPLOAD: 300000, // 文件上传 5 分钟
  DOWNLOAD: 600000, // 文件下载 10 分钟
} as const;

// ========== 插件超时配置 ==========
export const PLUGIN_TIMEOUT = {
  DEFAULT: 5000, // 默认 5 秒
  LONG: 30000, // 长操作 30 秒
  TASK: 60000, // 任务 60 秒
} as const;

// ========== 模块/插件加载超时 ==========
export const LOADER_TIMEOUT = {
  DEFAULT: 30000, // 默认加载超时 30 秒
  MODULE: 30000, // 模块加载超时
  PLUGIN: 30000, // 插件加载超时
} as const;

// ========== WebSocket 配置 ==========
export const WS_TIMEOUT = {
  HEARTBEAT: 30000, // 心跳间隔 30 秒
  RECONNECT_DELAY: 5000, // 重连延迟 5 秒
  MAX_RECONNECT_ATTEMPTS: 10, // 最大重连次数
  TIMEOUT: 30000, // 连接超时 30 秒
} as const;

// ========== 地球和地理常量 ==========
export const EARTH = {
  RADIUS_METERS: 6371000, // 地球半径（米）
  METERS_PER_KILOMETER: 1000,
  SQUARE_METERS_PER_HECTARE: 10000,
} as const;
