/**
 * V39.0 Track F: 灰度发布管理
 *
 * 功能:
 * - 灰度策略: 基于用户ID哈希 / 角色 / 百分比
 * - 多版本共存: 不同用户看到不同版本的模块
 * - 灰度配置: 从服务端获取灰度配置（可降级到本地 localStorage）
 * - 灰度回滚: 快速回滚到稳定版本
 *
 * API:
 * - getCanaryConfig(moduleId): 获取灰度配置
 * - shouldUseCanary(moduleId, userId): 判断用户是否应该使用灰度版本
 * - enableCanary(moduleId, percentage): 启用灰度
 * - disableCanary(moduleId): 禁用灰度
 * - getCanaryEntry(moduleId, userId): 获取用户应该使用的入口 URL
 */

import { REMOTE_MODULES } from './config';
import { logger } from '@/utils/logger';

// ==================== 类型定义 ====================

/** 灰度配置 */
export interface CanaryConfig {
  /** 模块 ID */
  moduleId: string;
  /** 是否启用灰度 */
  enabled: boolean;
  /** 灰度百分比 (0-100)，100 表示所有用户走灰度 */
  percentage: number;
  /** 灰度白名单用户 ID（始终走灰度） */
  allowedUserIds: string[];
  /** 灰度白名单角色（匹配角色的用户始终走灰度） */
  allowedRoles: string[];
  /** 灰度版本入口 URL */
  canaryEntry: string;
  /** 稳定版本入口 URL */
  stableEntry: string;
  /** 灰度版本标签 */
  canaryVersion: string;
  /** 稳定版本标签 */
  stableVersion: string;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
}

/** 灰度判断上下文 */
export interface CanaryContext {
  /** 用户 ID */
  userId: string;
  /** 用户角色列表 */
  roles: string[];
}

/** 灰度配置变更回调 */
export type CanaryConfigCallback = (moduleId: string, config: CanaryConfig) => void;

// ==================== 常量 ====================

const STORAGE_KEY = 'topems_mf_canary_configs';
const SERVER_CONFIG_URL = '/api/canary/config';
const FETCH_TIMEOUT = 5000; // 5 秒

// ==================== 工具函数 ====================

/** 从 localStorage 安全读取 */
function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** 向 localStorage 安全写入 */
function writeStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    logger.warn('[CanaryRelease] localStorage 写入失败', err);
  }
}

/**
 * 用户 ID 哈希函数
 *
 * 将用户 ID 映射到 0-99 的稳定整数，
 * 同一用户每次得到的值相同，确保灰度路由一致性。
 *
 * 使用 FNV-1a 变体，简单且分布均匀。
 */
function hashUserId(userId: string): number {
  let hash = 2166136261;
  for (let i = 0; i < userId.length; i++) {
    hash ^= userId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // 映射到 0-99
  return Math.abs(hash) % 100;
}

/** 根据模块配置生成默认灰度配置 */
function createDefaultConfig(moduleId: string): CanaryConfig {
  const moduleConfig = REMOTE_MODULES.find((m) => m.name === moduleId);
  const stableEntry = moduleConfig?.entry || '';
  const canaryEntry = moduleConfig?.canaryEntry || stableEntry;

  return {
    moduleId,
    enabled: false,
    percentage: 0,
    allowedUserIds: [],
    allowedRoles: [],
    canaryEntry,
    stableEntry,
    canaryVersion: 'canary',
    stableVersion: 'stable',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ==================== 灰度发布管理器 ====================

class CanaryReleaseManager {
  /** 灰度配置缓存 */
  private configs: Map<string, CanaryConfig> = new Map();
  /** 配置变更监听器 */
  private listeners: Set<CanaryConfigCallback> = new Set();
  /** 是否已初始化 */
  private initialized = false;
  /** 服务端配置同步定时器 */
  private syncTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * 初始化灰度发布管理器
   *
   * 从 localStorage 恢复配置，并为所有远程模块建立默认灰度配置。
   */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // 从 localStorage 恢复
    const stored = readStorage<Record<string, CanaryConfig>>(STORAGE_KEY, {});
    Object.values(stored).forEach((config) => {
      this.configs.set(config.moduleId, config);
    });

    // 为所有配置中的模块建立默认灰度配置
    REMOTE_MODULES.forEach((module) => {
      if (!this.configs.has(module.name)) {
        this.configs.set(module.name, createDefaultConfig(module.name));
      } else {
        // 更新稳定入口（可能从环境变量变化）
        const existing = this.configs.get(module.name)!;
        existing.stableEntry = module.entry;
        // 如果模块配置了 canaryEntry，更新它
        if (module.canaryEntry) {
          existing.canaryEntry = module.canaryEntry;
        }
      }
    });

    this.persist();
    logger.info('[CanaryRelease] 初始化完成，已加载', this.configs.size, '个灰度配置');
  }

  /**
   * 从服务端同步灰度配置
   *
   * 生产环境通过服务端 API 管理灰度规则，实现集中化控制。
   * 本地 localStorage 作为降级方案，当服务端不可达时使用本地配置。
   */
  async syncFromServer(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

      const response = await fetch(SERVER_CONFIG_URL, {
        method: 'GET',
        signal: controller.signal,
        credentials: 'same-origin',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const serverConfigs = (await response.json()) as CanaryConfig[];
      if (!Array.isArray(serverConfigs)) return;

      serverConfigs.forEach((config) => {
        this.configs.set(config.moduleId, {
          ...config,
          updatedAt: Date.now(),
        });
      });

      this.persist();
      logger.info('[CanaryRelease] 从服务端同步灰度配置成功', serverConfigs.length, '条');
    } catch (err) {
      logger.warn('[CanaryRelease] 服务端配置同步失败，使用本地配置:', err);
    }
  }

  /**
   * 获取模块的灰度配置
   *
   * @param moduleId 模块 ID
   * @returns 灰度配置，不存在时返回默认配置
   */
  getCanaryConfig(moduleId: string): CanaryConfig {
    this.init();
    return this.configs.get(moduleId) || createDefaultConfig(moduleId);
  }

  /**
   * 判断用户是否应该使用灰度版本
   *
   * 判断优先级:
   * 1. 灰度未启用 → false
   * 2. 用户在白名单中 → true
   * 3. 用户角色匹配白名单角色 → true
   * 4. 用户哈希值 < 灰度百分比 → true
   * 5. 其他 → false
   *
   * @param moduleId 模块 ID
   * @param userId 用户 ID
   * @param roles 用户角色列表（可选）
   */
  shouldUseCanary(moduleId: string, userId: string, roles: string[] = []): boolean {
    const config = this.getCanaryConfig(moduleId);

    // 1. 灰度未启用
    if (!config.enabled) return false;

    // 2. 用户白名单
    if (config.allowedUserIds.includes(userId)) {
      return true;
    }

    // 3. 角色白名单
    if (roles.length > 0 && config.allowedRoles.length > 0) {
      const hasMatchingRole = roles.some((role) => config.allowedRoles.includes(role));
      if (hasMatchingRole) return true;
    }

    // 4. 百分比灰度
    const hash = hashUserId(userId);
    return hash < config.percentage;
  }

  /**
   * 获取用户应该使用的入口 URL
   *
   * 根据灰度判断结果返回对应的入口 URL（灰度版或稳定版）。
   * 支持多版本共存：不同用户路由到不同入口。
   *
   * @param moduleId 模块 ID
   * @param userId 用户 ID
   * @param roles 用户角色列表（可选）
   * @returns 入口 URL
   */
  getCanaryEntry(moduleId: string, userId: string, roles: string[] = []): string {
    const config = this.getCanaryConfig(moduleId);
    const useCanary = this.shouldUseCanary(moduleId, userId, roles);

    const entry = useCanary ? config.canaryEntry : config.stableEntry;

    logger.debug(
      `[CanaryRelease] ${moduleId} 用户 ${userId} → ${useCanary ? '灰度版' : '稳定版'} (${entry})`
    );

    return entry;
  }

  /**
   * 启用灰度发布
   *
   * @param moduleId 模块 ID
   * @param percentage 灰度百分比 (0-100)
   * @param options 额外灰度选项（白名单、角色、入口 URL）
   */
  enableCanary(
    moduleId: string,
    percentage: number,
    options?: {
      allowedUserIds?: string[];
      allowedRoles?: string[];
      canaryEntry?: string;
      canaryVersion?: string;
    }
  ): void {
    const config = this.getCanaryConfig(moduleId);

    config.enabled = true;
    config.percentage = Math.max(0, Math.min(100, percentage));
    config.allowedUserIds = options?.allowedUserIds ?? config.allowedUserIds;
    config.allowedRoles = options?.allowedRoles ?? config.allowedRoles;
    config.canaryEntry = options?.canaryEntry ?? config.canaryEntry;
    config.canaryVersion = options?.canaryVersion ?? config.canaryVersion;
    config.updatedAt = Date.now();

    this.configs.set(moduleId, config);
    this.persist();
    this.notifyListeners(moduleId, config);

    logger.info(`[CanaryRelease] 启用 ${moduleId} 灰度: ${config.percentage}%`, {
      canaryEntry: config.canaryEntry,
      canaryVersion: config.canaryVersion,
    });
  }

  /**
   * 禁用灰度发布（快速回滚到稳定版本）
   *
   * 禁用后所有用户将使用稳定版本入口。
   * 保留灰度配置（白名单、百分比等），以便后续重新启用。
   *
   * @param moduleId 模块 ID
   */
  disableCanary(moduleId: string): void {
    const config = this.getCanaryConfig(moduleId);

    config.enabled = false;
    config.percentage = 0;
    config.updatedAt = Date.now();

    this.configs.set(moduleId, config);
    this.persist();
    this.notifyListeners(moduleId, config);

    logger.info(`[CanaryRelease] 禁用 ${moduleId} 灰度，已回滚到稳定版本`);
  }

  /**
   * 回滚灰度到稳定版本（等同于 disableCanary）
   *
   * 提供语义化的快速回滚入口。
   *
   * @param moduleId 模块 ID
   */
  rollbackCanary(moduleId: string): void {
    this.disableCanary(moduleId);
  }

  /**
   * 获取所有灰度配置
   */
  getAllCanaryConfigs(): CanaryConfig[] {
    this.init();
    return Array.from(this.configs.values());
  }

  /**
   * 获取当前正在灰度的模块列表
   */
  getActiveCanaryModules(): CanaryConfig[] {
    return this.getAllCanaryConfigs().filter((c) => c.enabled);
  }

  /**
   * 注册配置变更回调
   *
   * 当灰度配置被修改（启用/禁用/调整百分比）时，回调会被触发。
   */
  onConfigChange(callback: CanaryConfigCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * 启动定时从服务端同步配置
   *
   * @param intervalMs 同步间隔（毫秒），默认 2 分钟
   */
  startServerSync(intervalMs: number = 2 * 60 * 1000): void {
    if (this.syncTimer) {
      this.stopServerSync();
    }

    // 首次延迟 10 秒同步
    setTimeout(() => {
      this.syncFromServer().catch(() => {});
    }, 10000);

    this.syncTimer = setInterval(() => {
      this.syncFromServer().catch(() => {});
    }, intervalMs);

    logger.info(`[CanaryRelease] 启动服务端配置同步，间隔 ${intervalMs / 1000}s`);
  }

  /**
   * 停止服务端配置同步
   */
  stopServerSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      logger.info('[CanaryRelease] 已停止服务端配置同步');
    }
  }

  /**
   * 持久化配置到 localStorage
   */
  private persist(): void {
    const data: Record<string, CanaryConfig> = {};
    this.configs.forEach((config, key) => {
      data[key] = config;
    });
    writeStorage(STORAGE_KEY, data);
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(moduleId: string, config: CanaryConfig): void {
    this.listeners.forEach((cb) => {
      try {
        cb(moduleId, config);
      } catch (err) {
        logger.error('[CanaryRelease] 配置变更回调执行失败', err);
      }
    });
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.stopServerSync();
    this.listeners.clear();
    this.configs.clear();
    this.initialized = false;
  }
}

// ==================== 导出单例 ====================

export const canaryRelease = new CanaryReleaseManager();

export default canaryRelease;
