/**
 * V39.0 Track F: Module Federation 版本管理 + 热更新
 *
 * 功能:
 * - 版本清单: 记录每个远程模块的当前版本
 * - 版本检查: 定期 fetch remoteEntry.js 解析版本头
 * - 版本不匹配告警: 检测到新版本时通知用户刷新
 * - 版本回滚: 通过 localStorage 记录上一版本，支持快速回滚
 * - 热更新策略: silent(静默) / prompt(提示) / force(强制)
 */

import { REMOTE_MODULES, type RemoteModuleConfig } from './config';
import { logger } from '@/utils/logger';
import i18n from '@/i18n';

// ==================== 类型定义 ====================

/** 模块版本信息 */
export interface ModuleVersionInfo {
  /** 模块 ID（federation name） */
  moduleId: string;
  /** 当前版本号 */
  current: string;
  /** 上一版本号（用于回滚） */
  previous: string | null;
  /** 远程入口 URL */
  entry: string;
  /** 版本检测时间戳 */
  checkedAt: number;
  /** 版本更新时间戳 */
  updatedAt: number;
}

/** 版本更新事件 */
export interface VersionUpdateEvent {
  moduleId: string;
  oldVersion: string;
  newVersion: string;
  /** 更新策略 */
  strategy: UpdateStrategy;
  /** 远程入口 URL */
  entry: string;
  /** 是否关键模块 */
  critical: boolean;
}

/** 热更新策略 */
export type UpdateStrategy = 'silent' | 'prompt' | 'force';

/** 版本检查结果 */
export interface VersionCheckResult {
  moduleId: string;
  hasUpdate: boolean;
  currentVersion: string;
  remoteVersion: string;
  error?: string;
}

/** 版本更新回调 */
export type VersionUpdateCallback = (event: VersionUpdateEvent) => void;

// ==================== 常量 ====================

const STORAGE_KEY = 'topems_mf_version_manifest';
const CHECK_INTERVAL_DEFAULT = 5 * 60 * 1000; // 5 分钟
const FETCH_TIMEOUT = 10000; // 10 秒

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
    logger.warn(i18n.t('microfrontend.version-manager.k0'), err);
  }
}

/**
 * 从远程 entry 文件解析版本号
 *
 * 策略优先级:
 * 1. HTTP 响应头 X-Module-Version
 * 2. HTTP 响应头 ETag（作为版本指纹）
 * 3. 文件内容中的 // @version x.x.x 注释
 * 4. 内容 hash 前缀（前 16 字符的简单 hash）
 */
function parseVersionFromResponse(response: Response, content: string): string {
  // 1. 优先从自定义头读取
  const headerVersion = response.headers.get('X-Module-Version');
  if (headerVersion) return headerVersion;

  // 2. 从 ETag 读取（去除引号）
  const etag = response.headers.get('ETag');
  if (etag) return etag.replace(/["']/g, '');

  // 3. 从文件内容注释读取
  const versionMatch = content.match(/\/\/\s*@version\s+(\S+)/);
  if (versionMatch?.[1]) return versionMatch[1];

  // 4. 从内容 hash 生成版本指纹
  let hash = 0;
  const sample = content.slice(0, 2048);
  for (let i = 0; i < sample.length; i++) {
    const char = sample.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `hash_${Math.abs(hash).toString(36)}`;
}

/** 比较版本号是否不同（简单字符串比较，兼容语义化版本和 hash） */
function isVersionDifferent(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a !== b;
}

/** 获取模块的更新策略 */
function getUpdateStrategy(config: RemoteModuleConfig): UpdateStrategy {
  return config.updateStrategy ?? (config.isCore ? 'force' : 'silent');
}

// ==================== 版本管理器 ====================

class VersionManager {
  /** 版本清单（内存缓存） */
  private manifest: Map<string, ModuleVersionInfo> = new Map();
  /** 版本更新回调列表 */
  private listeners: Set<VersionUpdateCallback> = new Set();
  /** 定时检查器 */
  private checkTimer: ReturnType<typeof setInterval> | null = null;
  /** 正在检查中的模块（防重入） */
  private checking: Set<string> = new Set();
  /** 是否已初始化 */
  private initialized = false;

  /**
   * 初始化版本管理器
   *
   * 从 localStorage 恢复历史版本清单，并为所有远程模块建立初始记录。
   */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // 从 localStorage 恢复
    const stored = readStorage<Record<string, ModuleVersionInfo>>(STORAGE_KEY, {});
    Object.values(stored).forEach((info) => {
      this.manifest.set(info.moduleId, info);
    });

    // 为所有配置中的模块建立初始记录（若不存在）
    REMOTE_MODULES.forEach((config) => {
      if (!this.manifest.has(config.name)) {
        const info: ModuleVersionInfo = {
          moduleId: config.name,
          current: config.version || 'unknown',
          previous: null,
          entry: config.entry,
          checkedAt: 0,
          updatedAt: 0,
        };
        this.manifest.set(config.name, info);
      } else {
        // 更新 entry（可能从环境变量变化）
        const existing = this.manifest.get(config.name)!;
        existing.entry = config.entry;
        if (config.version && existing.current === 'unknown') {
          existing.current = config.version;
        }
      }
    });

    this.persist();
    logger.info(i18n.t('microfrontend.version-manager.k1'), this.manifest.size, i18n.t('microfrontend.version-manager.k0'));
  }

  /**
   * 检查所有远程模块版本
   *
   * 遍历所有已注册的远程模块，fetch 其 entry URL 解析版本号，
   * 与当前版本对比，若不同则触发版本更新事件。
   *
   * @returns 每个模块的检查结果
   */
  async checkRemoteVersions(): Promise<VersionCheckResult[]> {
    this.init();

    const results: VersionCheckResult[] = [];
    const configs = REMOTE_MODULES;

    await Promise.allSettled(
      configs.map(async (config) => {
        const result = await this.checkSingleModule(config);
        results.push(result);
      })
    );

    return results;
  }

  /**
   * 检查单个远程模块版本
   */
  private async checkSingleModule(config: RemoteModuleConfig): Promise<VersionCheckResult> {
    const moduleId = config.name;

    // 防重入
    if (this.checking.has(moduleId)) {
      return {
        moduleId,
        hasUpdate: false,
        currentVersion: this.getModuleVersion(moduleId),
        remoteVersion: this.getModuleVersion(moduleId),
      };
    }

    this.checking.add(moduleId);

    const currentVersion = this.getModuleVersion(moduleId);

    try {
      const remoteVersion = await this.fetchRemoteVersion(config.entry);

      const hasUpdate = isVersionDifferent(currentVersion, remoteVersion);

      if (hasUpdate && currentVersion !== 'unknown') {
        // 检测到新版本，触发更新事件
        const strategy = getUpdateStrategy(config);
        this.handleVersionUpdate(config, currentVersion, remoteVersion, strategy);
      } else if (currentVersion === 'unknown') {
        // 首次记录版本
        this.updateVersionRecord(moduleId, remoteVersion, config.entry);
      }

      // 更新检查时间戳
      const info = this.manifest.get(moduleId);
      if (info) {
        info.checkedAt = Date.now();
      }

      return {
        moduleId,
        hasUpdate,
        currentVersion,
        remoteVersion,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.warn(`${i18n.t('microfrontend.version-manager.versionmanager_2')}${moduleId}${i18n.t('microfrontend.version-manager.k3')}`, errorMsg);
      return {
        moduleId,
        hasUpdate: false,
        currentVersion,
        remoteVersion: currentVersion,
        error: errorMsg,
      };
    } finally {
      this.checking.delete(moduleId);
    }
  }

  /**
   * fetch 远程 entry 并解析版本号
   */
  private async fetchRemoteVersion(entryUrl: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    try {
      const response = await fetch(entryUrl, {
        method: 'GET',
        cache: 'no-cache',
        signal: controller.signal,
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // 只读取前 4KB 用于版本解析，避免下载整个文件
      const reader = response.body?.getReader();
      let content = '';
      if (reader) {
        const { value } = await reader.read();
        if (value) {
          content = new TextDecoder().decode(value).slice(0, 4096);
        }
        reader.cancel();
      } else {
        // 不支持 stream 时 fallback 到 text
        const text = await response.text();
        content = text.slice(0, 4096);
      }

      return parseVersionFromResponse(response, content);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(i18n.t('microfrontend.version-manager.k1'));
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 处理版本更新事件
   *
   * 根据更新策略执行不同行为:
   * - silent: 静默更新，后台预加载新版本
   * - prompt: 提示用户刷新（通过回调通知 UI 层）
   * - force: 关键模块强制刷新页面
   */
  private handleVersionUpdate(
    config: RemoteModuleConfig,
    oldVersion: string,
    newVersion: string,
    strategy: UpdateStrategy
  ): void {
    const event: VersionUpdateEvent = {
      moduleId: config.name,
      oldVersion,
      newVersion,
      strategy,
      entry: config.entry,
      critical: config.critical ?? false,
    };

    logger.info(
      `${i18n.t('microfrontend.version-manager.versionmanager_4')}${config.name}${i18n.t('microfrontend.version-manager.k5')}${oldVersion} → ${newVersion}${i18n.t('microfrontend.version-manager.k6')}${strategy})`
    );

    // 更新版本记录
    this.updateVersionRecord(config.name, newVersion, config.entry, oldVersion);

    // 根据策略处理
    switch (strategy) {
      case 'silent':
        // 静默更新：仅记录版本，下次加载时自动使用新版本
        this.applySilentUpdate(config.name);
        break;

      case 'prompt':
        // 提示更新：通知 UI 层展示刷新提示
        this.notifyListeners(event);
        break;

      case 'force':
        // 强制更新：关键模块直接刷新页面
        this.notifyListeners(event);
        this.forceReload(config.name);
        break;
    }
  }

  /**
   * 静默更新：预加载新版本 entry
   */
  private applySilentUpdate(moduleId: string): void {
    // 预加载新的 entry（通过 prefetch link）
    const info = this.manifest.get(moduleId);
    if (!info) return;

    try {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = info.entry;
      link.as = 'script';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
      logger.info(`${i18n.t('microfrontend.version-manager.k7')}${moduleId}${i18n.t('microfrontend.version-manager.entry_8')}`);
    } catch {
      // 预加载失败不阻塞
    }
  }

  /**
   * 强制刷新页面
   *
   * 对于关键模块（如 core），直接刷新整个页面以确保用户使用最新版本。
   */
  private forceReload(moduleId: string): void {
    logger.warn(`${i18n.t('microfrontend.version-manager.k9')}${moduleId}${i18n.t('microfrontend.version-manager.k10')}`);
    // 给当前请求一点时间完成，然后刷新
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }

  /**
   * 更新版本记录（保存到内存和 localStorage）
   */
  private updateVersionRecord(
    moduleId: string,
    newVersion: string,
    entry: string,
    oldVersion?: string
  ): void {
    const existing = this.manifest.get(moduleId);
    const previousVersion = oldVersion ?? existing?.current ?? null;

    const info: ModuleVersionInfo = {
      moduleId,
      current: newVersion,
      previous: previousVersion,
      entry,
      checkedAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.manifest.set(moduleId, info);
    this.persist();
  }

  /**
   * 持久化版本清单到 localStorage
   */
  private persist(): void {
    const data: Record<string, ModuleVersionInfo> = {};
    this.manifest.forEach((info, key) => {
      data[key] = info;
    });
    writeStorage(STORAGE_KEY, data);
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(event: VersionUpdateEvent): void {
    this.listeners.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        logger.error(i18n.t('microfrontend.version-manager.k11'), err);
      }
    });
  }

  // ==================== 公开 API ====================

  /**
   * 注册版本更新回调
   *
   * 当检测到远程模块有新版本时（prompt 和 force 策略），回调会被触发。
   *
   * @example
   * const unsubscribe = versionManager.onVersionUpdate((event) => {
   *   showUpdateNotification(event.moduleId, event.newVersion);
   * });
   */
  onVersionUpdate(callback: VersionUpdateCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * 获取模块当前版本
   *
   * @param moduleId 模块 ID（federation name）
   * @returns 版本号字符串，未找到返回 'unknown'
   */
  getModuleVersion(moduleId: string): string {
    const info = this.manifest.get(moduleId);
    return info?.current ?? 'unknown';
  }

  /**
   * 获取模块的完整版本信息
   */
  getModuleVersionInfo(moduleId: string): ModuleVersionInfo | undefined {
    return this.manifest.get(moduleId);
  }

  /**
   * 获取所有模块的版本清单
   */
  getVersionManifest(): ModuleVersionInfo[] {
    return Array.from(this.manifest.values());
  }

  /**
   * 回滚模块到上一版本
   *
   * 通过 localStorage 中记录的 previous 版本号回滚。
   * 实际操作是刷新页面，使浏览器重新加载 entry（此时 CDN 应已切回旧版本）。
   *
   * @param moduleId 要回滚的模块 ID
   * @returns 是否回滚成功
   */
  rollbackModule(moduleId: string): boolean {
    const info = this.manifest.get(moduleId);
    if (!info || !info.previous) {
      logger.warn(`[VersionManager] ${moduleId}${i18n.t('microfrontend.version-manager.k12')}`);
      return false;
    }

    logger.info(`${i18n.t('microfrontend.version-manager.versionmanager_13')}${moduleId}: ${info.current} → ${info.previous}`);

    // 交换 current 和 previous
    const rolledBackVersion = info.previous;
    info.previous = info.current;
    info.current = rolledBackVersion;
    info.updatedAt = Date.now();

    this.manifest.set(moduleId, info);
    this.persist();

    // 刷新页面使回滚生效
    setTimeout(() => {
      window.location.reload();
    }, 300);

    return true;
  }

  /**
   * 检查是否有可用更新
   *
   * 轻量级检查，仅返回是否有更新，不触发更新事件。
   * 适用于 UI 层展示"有新版本"徽标。
   *
   * @returns 更新检查结果数组
   */
  async checkForUpdates(): Promise<VersionCheckResult[]> {
    return this.checkRemoteVersions();
  }

  /**
   * 应用更新到指定模块
   *
   * 重新加载远程 entry 使新版本生效。
   *
   * @param moduleId 要更新的模块 ID
   * @returns 是否成功应用
   */
  async applyUpdate(moduleId: string): Promise<boolean> {
    const config = REMOTE_MODULES.find((m) => m.name === moduleId);
    if (!config) {
      logger.warn(`${i18n.t('microfrontend.version-manager.k14')}${moduleId}`);
      return false;
    }

    try {
      // 重新 fetch 获取最新版本
      const remoteVersion = await this.fetchRemoteVersion(config.entry);
      const currentVersion = this.getModuleVersion(moduleId);

      if (!isVersionDifferent(currentVersion, remoteVersion)) {
        logger.info(`[VersionManager] ${moduleId}${i18n.t('microfrontend.version-manager.k15')}`);
        return true;
      }

      // 更新版本记录
      this.updateVersionRecord(moduleId, remoteVersion, config.entry, currentVersion);

      // 根据策略应用更新
      const strategy = getUpdateStrategy(config);
      const event: VersionUpdateEvent = {
        moduleId,
        oldVersion: currentVersion,
        newVersion: remoteVersion,
        strategy,
        entry: config.entry,
        critical: config.critical ?? false,
      };

      switch (strategy) {
        case 'silent':
          this.applySilentUpdate(moduleId);
          this.notifyListeners(event);
          break;

        case 'prompt':
          this.notifyListeners(event);
          break;

        case 'force':
          this.notifyListeners(event);
          this.forceReload(moduleId);
          break;
      }

      return true;
    } catch (err) {
      logger.error(`${i18n.t('microfrontend.version-manager.versionmanager_16')}${moduleId}${i18n.t('microfrontend.version-manager.k17')}`, err);
      return false;
    }
  }

  /**
   * 启动定时版本检查
   *
   * @param intervalMs 检查间隔（毫秒），默认 5 分钟
   */
  startAutoCheck(intervalMs: number = CHECK_INTERVAL_DEFAULT): void {
    if (this.checkTimer) {
      this.stopAutoCheck();
    }

    // 首次延迟 30 秒检查，避免与首屏加载竞争
    setTimeout(() => {
      this.checkRemoteVersions().catch((err) => {
        logger.warn(i18n.t('microfrontend.version-manager.k18'), err);
      });
    }, 30000);

    // 定时检查
    this.checkTimer = setInterval(() => {
      this.checkRemoteVersions().catch((err) => {
        logger.warn(i18n.t('microfrontend.version-manager.k19'), err);
      });
    }, intervalMs);

    logger.info(`${i18n.t('microfrontend.version-manager.k20')}${intervalMs / 1000}s`);
  }

  /**
   * 停止定时版本检查
   */
  stopAutoCheck(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
      logger.info(i18n.t('microfrontend.version-manager.k21'));
    }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.stopAutoCheck();
    this.listeners.clear();
    this.manifest.clear();
    this.initialized = false;
  }
}

// ==================== 导出单例 ====================

export const versionManager = new VersionManager();

export default versionManager;
