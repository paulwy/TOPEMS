/**
 * V45.0 Track F: 微前端终极形态 — 运行时动态加载器
 *
 * DynamicModuleLoader 提供运行时模块动态加载能力：
 * - 运行时模块注册（registerModule / unregisterModule）
 * - 动态 import() 加载远程模块
 * - 并发控制（限制同时加载的模块数）
 * - 加载缓存（避免重复加载）
 * - 超时处理 + 重试机制
 * - 预加载 / 卸载 / 重载
 *
 * @example
 * // 注册模块加载器
 * dynamicLoader.registerModule('crm', () => import('@/modules/crm'));
 * // 加载模块
 * const mod = await dynamicLoader.loadModule('crm');
 * // 预加载
 * dynamicLoader.preloadModule('crm');
 * // 卸载
 * dynamicLoader.unloadModule('crm');
 */

// ==================== 类型定义 ====================

/** 模块加载状态 */
export enum ModuleLoadStatus {
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  FAILED = 'failed',
}

/** 动态加载器配置 */
export interface DynamicLoaderConfig {
  /** 最大并发加载数 */
  max_concurrent_loads: number;
  /** 单次加载超时时间（毫秒） */
  timeout_ms: number;
  /** 加载失败重试次数 */
  retry_count: number;
  /** 重试间隔（毫秒） */
  retry_delay_ms: number;
  /** 是否启用加载缓存 */
  cache_enabled: boolean;
}

/** 运行时模块描述 */
export interface RuntimeModule {
  /** 模块 ID */
  id: string;
  /** 模块名称 */
  name: string;
  /** 模块远程 URL（可选，用于动态 import） */
  url?: string;
  /** 加载函数（动态 import 或自定义 loader） */
  loaderFn: () => Promise<unknown>;
  /** 已加载的模块实例 */
  instance?: unknown;
  /** 当前加载状态 */
  status: ModuleLoadStatus;
  /** 加载完成时间戳 */
  loaded_at?: number;
  /** 加载耗时（毫秒） */
  load_duration?: number;
  /** 加载错误信息 */
  error?: Error;
  /** 重试次数 */
  retry_count: number;
}

/** 模块加载回调 */
export type ModuleLoadCallback = (module: RuntimeModule) => void;

// ==================== DynamicModuleLoader ====================

/**
 * 动态模块加载器
 *
 * 负责运行时模块的注册、加载、卸载、缓存与并发控制。
 */
export class DynamicModuleLoader {
  /** 已注册的模块表: id -> RuntimeModule */
  private readonly modules = new Map<string, RuntimeModule>();
  /** 加载缓存: id -> 加载完成的 Promise（避免重复加载） */
  private readonly loadingPromises = new Map<string, Promise<any>>();
  /** 当前正在加载的数量 */
  private currentLoading = 0;
  /** 等待队列（当并发达到上限时排队） */
  private readonly waitQueue: Array<() => void> = [];
  /** 状态变更监听器 */
  private readonly listeners = new Set<ModuleLoadCallback>();
  /** 加载器配置 */
  private config: DynamicLoaderConfig;

  constructor(config?: Partial<DynamicLoaderConfig>) {
    this.config = {
      max_concurrent_loads: 4,
      timeout_ms: 30000,
      retry_count: 3,
      retry_delay_ms: 1000,
      cache_enabled: true,
      ...config,
    };
  }

  // -------------------- 运行时注册 --------------------

  /**
   * 运行时注册模块
   * @param id 模块 ID
   * @param loader 加载函数
   * @param name 模块名称（可选，默认使用 id）
   * @param url 模块远程 URL（可选）
   */
  registerModule(
    id: string,
    loader: () => Promise<any>,
    name?: string,
    url?: string
  ): RuntimeModule {
    if (this.modules.has(id)) {
      console.warn(`[DynamicLoader] 模块 ${id} 已注册，将覆盖旧注册`);
    }
    const mod: RuntimeModule = {
      id,
      name: name || id,
      url,
      loaderFn: loader,
      status: ModuleLoadStatus.UNLOADED,
      retry_count: 0,
    };
    this.modules.set(id, mod);
    this.notifyListeners(mod);
    return mod;
  }

  /**
   * 注销模块（同时卸载已加载的实例）
   */
  unregisterModule(id: string): boolean {
    const mod = this.modules.get(id);
    if (!mod) return false;
    if (mod.status === ModuleLoadStatus.LOADED) {
      this.unloadModule(id);
    }
    this.loadingPromises.delete(id);
    this.modules.delete(id);
    return true;
  }

  // -------------------- 加载方法 --------------------

  /**
   * 加载模块（带并发控制 + 超时 + 重试 + 缓存）
   */
  async loadModule(id: string): Promise<any> {
    const mod = this.modules.get(id);
    if (!mod) {
      throw new Error(`[DynamicLoader] 模块 ${id} 未注册，请先调用 registerModule`);
    }

    // 缓存命中：已加载则直接返回
    if (this.config.cache_enabled && mod.status === ModuleLoadStatus.LOADED && mod.instance) {
      return mod.instance;
    }

    // 缓存命中：正在加载则复用 Promise
    if (this.config.cache_enabled && this.loadingPromises.has(id)) {
      return this.loadingPromises.get(id)!;
    }

    const promise = this.doLoadWithConcurrency(id);
    if (this.config.cache_enabled) {
      this.loadingPromises.set(id, promise);
    }
    try {
      const instance = await promise;
      return instance;
    } finally {
      if (this.config.cache_enabled) {
        this.loadingPromises.delete(id);
      }
    }
  }

  /**
   * 从字符串 URL 动态加载模块（基于 import()）
   */
  async loadModuleFromString(id: string, url: string, name?: string): Promise<any> {
    if (!this.modules.has(id)) {
      this.registerModule(id, () => this.dynamicImport(url), name || id, url);
    }
    return this.loadModule(id);
  }

  /**
   * 预加载模块（不返回实例，仅提前加载到缓存）
   */
  async preloadModule(id: string): Promise<void> {
    try {
      await this.loadModule(id);
    } catch (err) {
      console.warn(`[DynamicLoader] 预加载模块 ${id} 失败:`, err);
    }
  }

  /**
   * 卸载模块（清理实例，保留注册）
   */
  unloadModule(id: string): boolean {
    const mod = this.modules.get(id);
    if (!mod) return false;

    mod.instance = undefined;
    mod.status = ModuleLoadStatus.UNLOADED;
    mod.loaded_at = undefined;
    mod.load_duration = undefined;
    mod.error = undefined;
    mod.retry_count = 0;
    this.loadingPromises.delete(id);
    this.notifyListeners(mod);
    return true;
  }

  /**
   * 重新加载模块（先卸载再加载）
   */
  async reloadModule(id: string): Promise<any> {
    this.unloadModule(id);
    // 临时禁用缓存以强制重新加载
    const wasCached = this.config.cache_enabled;
    this.config.cache_enabled = false;
    try {
      return await this.loadModule(id);
    } finally {
      this.config.cache_enabled = wasCached;
    }
  }

  // -------------------- 查询方法 --------------------

  /** 获取所有已加载的模块 */
  getLoadedModules(): RuntimeModule[] {
    return Array.from(this.modules.values()).filter((m) => m.status === ModuleLoadStatus.LOADED);
  }

  /** 获取所有已注册的模块 */
  getRegisteredModules(): RuntimeModule[] {
    return Array.from(this.modules.values());
  }

  /** 获取模块加载状态 */
  getLoadStatus(id: string): ModuleLoadStatus | null {
    return this.modules.get(id)?.status ?? null;
  }

  /** 获取模块详情 */
  getModule(id: string): RuntimeModule | undefined {
    return this.modules.get(id);
  }

  // -------------------- 缓存管理 --------------------

  /** 清空所有加载缓存（不卸载已加载实例） */
  clearCache(): void {
    this.loadingPromises.clear();
  }

  /** 更新加载器配置 */
  updateConfig(config: Partial<DynamicLoaderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /** 获取当前配置 */
  getConfig(): DynamicLoaderConfig {
    return { ...this.config };
  }

  // -------------------- 事件订阅 --------------------

  /** 订阅模块状态变更 */
  onStatusChange(callback: ModuleLoadCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // -------------------- 内部实现 --------------------

  /** 动态 import 远程模块 */
  private async dynamicImport(url: string): Promise<any> {
    // 使用 new Function 避免打包工具静态分析
    const dynamicImport = new Function('url', 'return import(url)') as (u: string) => Promise<any>;
    return dynamicImport(url);
  }

  /** 并发控制：获取加载许可 */
  private async acquireSlot(): Promise<void> {
    if (this.currentLoading < this.config.max_concurrent_loads) {
      this.currentLoading++;
      return;
    }
    // 排队等待
    await new Promise<void>((resolve) => {
      this.waitQueue.push(() => {
        this.currentLoading++;
        resolve();
      });
    });
  }

  /** 释放加载许可 */
  private releaseSlot(): void {
    this.currentLoading--;
    const next = this.waitQueue.shift();
    if (next) {
      next();
    }
  }

  /** 带并发控制的加载流程 */
  private async doLoadWithConcurrency(id: string): Promise<any> {
    await this.acquireSlot();
    try {
      return await this.doLoadWithRetry(id);
    } finally {
      this.releaseSlot();
    }
  }

  /** 带重试的加载流程 */
  private async doLoadWithRetry(id: string): Promise<any> {
    const mod = this.modules.get(id)!;
    mod.status = ModuleLoadStatus.LOADING;
    mod.error = undefined;
    mod.retry_count = 0;
    this.notifyListeners(mod);

    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retry_count; attempt++) {
      try {
        const instance = await this.doLoadWithTimeout(id);
        mod.instance = instance;
        mod.status = ModuleLoadStatus.LOADED;
        mod.loaded_at = Date.now();
        mod.load_duration = mod.loaded_at - startTime;
        mod.retry_count = attempt;
        this.notifyListeners(mod);
        return instance;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        mod.retry_count = attempt;
        if (attempt < this.config.retry_count) {
          console.warn(
            `[DynamicLoader] 模块 ${id} 加载失败（第 ${attempt + 1} 次），${this.config.retry_delay_ms}ms 后重试...`,
            lastError.message
          );
          await this.delay(this.config.retry_delay_ms);
        }
      }
    }

    mod.status = ModuleLoadStatus.FAILED;
    mod.error = lastError ?? new Error('未知加载错误');
    mod.load_duration = Date.now() - startTime;
    this.notifyListeners(mod);
    throw mod.error;
  }

  /** 带超时的加载流程 */
  private async doLoadWithTimeout(id: string): Promise<any> {
    const mod = this.modules.get(id)!;
    const timeoutMs = this.config.timeout_ms;

    return new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`[DynamicLoader] 模块 ${id} 加载超时（${timeoutMs}ms）`));
      }, timeoutMs);

      mod
        .loaderFn()
        .then((instance) => {
          clearTimeout(timer);
          resolve(instance);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  /** 延迟工具 */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** 通知监听器 */
  private notifyListeners(mod: RuntimeModule): void {
    this.listeners.forEach((l) => {
      try {
        l(mod);
      } catch {
        // ignore
      }
    });
  }

  /** 获取当前并发加载数 */
  get currentLoads(): number {
    return this.currentLoading;
  }

  /** 获取等待队列长度 */
  get pendingCount(): number {
    return this.waitQueue.length;
  }

  /** 获取已注册模块总数 */
  get size(): number {
    return this.modules.size;
  }
}

// ==================== 单例导出 ====================

export const dynamicLoader = new DynamicModuleLoader();

export default dynamicLoader;
