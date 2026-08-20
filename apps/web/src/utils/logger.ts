/**
 * 统一日志系统
 * 用于替代 console.log/error/warn
 * 使用方法：import logger from "@/utils/logger";
 */

/* eslint-disable no-console -- Logger is the designated console wrapper */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  level?: LogLevel;
  enableTimestamp?: boolean;
  enableConsole?: boolean;
  prefix?: string;
  context?: Record<string, unknown>;
}

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  group: (label: string, fn: () => void) => void;
  table: (data: unknown) => void;
  time: (label: string) => void;
  timeEnd: (label: string) => void;
  child: (childOptions: LoggerOptions) => Logger;
  setLevel: (newLevel: LogLevel) => void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * 创建日志记录器
 */
function createLogger(name: string, options: LoggerOptions = {}): Logger {
  const {
    level = 'info',
    enableTimestamp = true,
    enableConsole = true,
    prefix = '',
    context = {},
  } = options;

  let minLevel = LOG_LEVELS[level];

  function formatMessage(level: LogLevel, ...args: unknown[]): string {
    const parts: string[] = [];

    if (enableTimestamp) {
      const timestamp = new Date().toISOString();
      parts.push(`[${timestamp}]`);
    }

    parts.push(`[${level.toUpperCase()}]`);

    if (prefix) {
      parts.push(`[${prefix}]`);
    }

    if (name) {
      parts.push(`[${name}]`);
    }

    return parts.join(' ');
  }

  function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= minLevel;
  }

  const logger = {
    debug: (...args: unknown[]) => {
      if (shouldLog('debug') && enableConsole) {
        console.debug(formatMessage('debug'), ...args);
      }
    },

    info: (...args: unknown[]) => {
      if (shouldLog('info') && enableConsole) {
        console.info(formatMessage('info'), ...args);
      }
    },

    warn: (...args: unknown[]) => {
      if (shouldLog('warn') && enableConsole) {
        console.warn(formatMessage('warn'), ...args);
      }
    },

    error: (...args: unknown[]) => {
      if (shouldLog('error') && enableConsole) {
        console.error(formatMessage('error'), ...args);
      }
    },

    /**
     * 记录分组
     */
    group: (label: string, fn: () => void) => {
      if (enableConsole) {
        console.group(label);
        fn();
        console.groupEnd();
      }
    },

    /**
     * 记录表格
     */
    table: (data: unknown) => {
      if (enableConsole && shouldLog('debug')) {
        console.table(data);
      }
    },

    /**
     * 记录时间
     */
    time: (label: string) => {
      if (enableConsole && shouldLog('debug')) {
        console.time(label);
      }
    },

    /**
     * 结束时间记录
     */
    timeEnd: (label: string) => {
      if (enableConsole && shouldLog('debug')) {
        console.timeEnd(label);
      }
    },

    /**
     * 创建子日志记录器
     */
    child: (childOptions: LoggerOptions) => {
      return createLogger(name, {
        ...options,
        ...childOptions,
        context: { ...context, ...childOptions.context },
      });
    },

    /**
     * 设置日志级别
     */
    setLevel: (newLevel: LogLevel) => {
      minLevel = LOG_LEVELS[newLevel];
    },
  };

  return logger;
}

// 导出日志记录器工厂函数（同时支持默认导出和命名导出）
export { createLogger };
export default createLogger;

/**
 * 安全获取 import.meta.env.PROD / DEV
 * 避免在非标准模块加载环境下抛出 import.meta SyntaxError
 */
function safeEnvFlag(flag: 'PROD' | 'DEV', fallback: boolean): boolean {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const value = (import.meta.env as unknown as Record<string, unknown>)[flag];
      return typeof value === 'boolean' ? value : String(value) === 'true';
    }
  } catch {
    // ignore
  }
  return fallback;
}

const IS_PROD = safeEnvFlag('PROD', false);

// 导出预设的日志记录器
export const logger = createLogger('App', {
  level: IS_PROD ? 'error' : 'debug',
  enableTimestamp: true,
});

export const apiLogger = createLogger('API', {
  level: IS_PROD ? 'warn' : 'debug',
  prefix: 'API',
});

export const authLogger = createLogger('Auth', {
  level: IS_PROD ? 'error' : 'info',
  prefix: 'AUTH',
});

const errorLogger = createLogger('Error', {
  level: 'error',
  prefix: 'ERROR',
});
