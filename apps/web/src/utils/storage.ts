/**
 * 本地存储工具函数
 * 提供类型安全的localStorage和sessionStorage操作
 *
 * NOTE: 当前未被任何组件直接导入（通过 utils/index.ts 的 export * 导出）。
 * session.ts 使用了独立的 localStorage 调用，未使用本文件的 Storage 类。
 * 保留作为基础设施工具，可在需要高级存储功能（过期时间、命名空间等）时使用。
 */

import { logger } from '@/utils/logger';

const PREFIX = 'topems_';

/**
 * 存储接口
 */
export interface StorageItem<T = any> {
  value: T;
  timestamp: number;
  expires?: number;
}

/**
 * 存储配置
 */
export interface StorageOptions {
  prefix?: string;
  expires?: number;
  serialize?: <T>(value: T) => string;
  deserialize?: <T>(value: string) => T;
}

/**
 * 默认序列化函数
 */
const defaultSerialize = <T>(value: T): string => {
  return JSON.stringify(value);
};

/**
 * 默认反序列化函数
 */
const defaultDeserialize = <T>(value: string): T => {
  try {
    return JSON.parse(value);
  } catch {
    return value as unknown as T;
  }
};

/**
 * 创建存储键名
 */
const createKey = (key: string, prefix: string = PREFIX): string => {
  return `${prefix}${key}`;
};

/**
 * 检查值是否过期
 */
const isExpired = (item: StorageItem): boolean => {
  if (!item.expires) return false;
  return Date.now() > item.timestamp + item.expires;
};

/**
 * localStorage操作类
 */
class LocalStorage {
  private prefix: string;
  private serialize: <T>(value: T) => string;
  private deserialize: <T>(value: string) => T;

  constructor(options: StorageOptions = {}) {
    this.prefix = options.prefix || PREFIX;
    this.serialize = options.serialize || defaultSerialize;
    this.deserialize = options.deserialize || defaultDeserialize;
  }

  /**
   * 设置值
   */
  set<T>(key: string, value: T, expires?: number): void {
    try {
      const item: StorageItem<T> = {
        value,
        timestamp: Date.now(),
        expires,
      };
      localStorage.setItem(createKey(key, this.prefix), this.serialize(item));
    } catch (error: unknown) {
      logger.error('LocalStorage set error:', error);
    }
  }

  /**
   * 获取值
   */
  get<T>(key: string, defaultValue?: T): T | undefined {
    try {
      const raw = localStorage.getItem(createKey(key, this.prefix));
      if (!raw) return defaultValue;

      const item = this.deserialize<StorageItem<T>>(raw);
      if (isExpired(item)) {
        this.remove(key);
        return defaultValue;
      }

      return item.value;
    } catch (error: unknown) {
      logger.error('LocalStorage get error:', error);
      return defaultValue;
    }
  }

  /**
   * 删除值
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(createKey(key, this.prefix));
    } catch (error: unknown) {
      logger.error('LocalStorage remove error:', error);
    }
  }

  /**
   * 清空所有值
   */
  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error: unknown) {
      logger.error('LocalStorage clear error:', error);
    }
  }

  /**
   * 检查键是否存在
   */
  has(key: string): boolean {
    return localStorage.getItem(createKey(key, this.prefix)) !== null;
  }

  /**
   * 获取所有键
   */
  keys(): string[] {
    try {
      const keys = Object.keys(localStorage);
      return keys
        .filter((key) => key.startsWith(this.prefix))
        .map((key) => key.replace(this.prefix, ''));
    } catch (error: unknown) {
      logger.error('LocalStorage keys error:', error);
      return [];
    }
  }

  /**
   * 读取值，若规范键不存在则尝试从旧版（无前缀）键迁移
   */
  getWithMigrate<T>(key: string, defaultValue?: T): T | undefined {
    try {
      // 先尝试从规范键读取
      const canonicalRaw = localStorage.getItem(createKey(key, this.prefix));
      if (canonicalRaw) {
        const item = this.deserialize<StorageItem<T>>(canonicalRaw);
        if (isExpired(item)) {
          this.remove(key);
        } else {
          return item.value;
        }
      }

      // 尝试从旧版（无前缀）键读取并迁移到规范键
      const legacyRaw = localStorage.getItem(key);
      if (legacyRaw !== null) {
        const value = this.deserialize<T>(legacyRaw);
        this.set(key, value);
        return value;
      }

      return defaultValue;
    } catch (error: unknown) {
      logger.error('LocalStorage getWithMigrate error:', error);
      return defaultValue;
    }
  }
}

/**
 * sessionStorage操作类
 */
class SessionStorage {
  private prefix: string;
  private serialize: <T>(value: T) => string;
  private deserialize: <T>(value: string) => T;

  constructor(options: StorageOptions = {}) {
    this.prefix = options.prefix || PREFIX;
    this.serialize = options.serialize || defaultSerialize;
    this.deserialize = options.deserialize || defaultDeserialize;
  }

  /**
   * 设置值
   */
  set<T>(key: string, value: T): void {
    try {
      const item: StorageItem<T> = {
        value,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(createKey(key, this.prefix), this.serialize(item));
    } catch (error: unknown) {
      logger.error('SessionStorage set error:', error);
    }
  }

  /**
   * 获取值
   */
  get<T>(key: string, defaultValue?: T): T | undefined {
    try {
      const raw = sessionStorage.getItem(createKey(key, this.prefix));
      if (!raw) return defaultValue;

      const item = this.deserialize<StorageItem<T>>(raw);
      return item.value;
    } catch (error: unknown) {
      logger.error('SessionStorage get error:', error);
      return defaultValue;
    }
  }

  /**
   * 删除值
   */
  remove(key: string): void {
    try {
      sessionStorage.removeItem(createKey(key, this.prefix));
    } catch (error: unknown) {
      logger.error('SessionStorage remove error:', error);
    }
  }

  /**
   * 清空所有值
   */
  clear(): void {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error: unknown) {
      logger.error('SessionStorage clear error:', error);
    }
  }
}

// 导出单例
const localStorage2 = new LocalStorage();
const sessionStorage2 = new SessionStorage();

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
