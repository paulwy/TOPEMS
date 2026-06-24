/**
 * 统一超时配置
 * 使用方法：import { TIMEOUT, API_TIMEOUT } from "@/constants/timeouts";
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

// ========== WebSocket 配置 ==========
export const WS_TIMEOUT = {
  HEARTBEAT: 30000, // 心跳间隔 30 秒
  RECONNECT_DELAY: 5000, // 重连延迟 5 秒
  MAX_RECONNECT_ATTEMPTS: 10, // 最大重连次数
  TIMEOUT: 30000, // 连接超时 30 秒
} as const;

// ========== 防抖和节流 ==========
export const DEBOUNCE_THROTTLE = {
  SEARCH: 300, // 搜索防抖 300ms
  RESIZE: 150, // 窗口 resize 节流 150ms
  SCROLL: 100, // 滚动节流 100ms
  CLICK: 200, // 快速点击防护 200ms
} as const;

// ========== 缓存时间 ==========
export const CACHE_TIME = {
  MINUTE: 60000, // 1 分钟
  MINUTE_5: 300000, // 5 分钟
  MINUTE_10: 600000, // 10 分钟
  MINUTE_30: 1800000, // 30 分钟
  HOUR: 3600000, // 1 小时
  DAY: 86400000, // 1 天
  WEEK: 604800000, // 1 周
} as const;

// ========== 会话相关 ==========
export const SESSION = {
  TOKEN_REFRESH_INTERVAL: 600000, // Token 刷新间隔 10 分钟
  SESSION_CHECK_INTERVAL: 300000, // 会话检查间隔 5 分钟
  WARNING_BEFORE_EXPIRE: 60000, // 过期前 1 分钟警告
  DEFAULT_TIMEOUT: 1800000, // 默认会话超时 30 分钟
} as const;

// ========== 通知显示时间 ==========
export const TOAST = {
  SHORT: 3000, // 短提示 3 秒
  NORMAL: 5000, // 正常提示 5 秒
  LONG: 8000, // 长提示 8 秒
  PERMANENT: 0, // 永久显示
} as const;

// ========== 辅助函数 ==========

/**
 * 获取环境变量的超时配置
 */
export function getTimeoutFromEnv(envKey: string, defaultValue: number): number {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const envValue = import.meta.env[envKey];
    if (envValue) {
      const parsed = parseInt(envValue, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return defaultValue;
}

/**
 * 创建带超时的 Promise
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(errorMessage || `操作超时 (${timeoutMs}ms)`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}
