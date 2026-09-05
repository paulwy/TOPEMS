import i18n from '@/i18n';
/**
 * V48.0 Track Serverless: 无服务器架构 — 按需加载引擎
 *
 * OnDemandLoader 单例提供基于使用模式、用户行为、智能预测的按需模块加载能力：
 * - 智能预加载：基于访问频率 + 最近使用时间预测下一步需要的模块
 * - 懒加载：首次访问时才加载，支持超时 + 重试
 * - 条件加载：根据用户角色 / 设备能力 / 网络条件选择性加载
 * - 优先级调度：高优先级模块优先加载，低优先级延后
 * - 预加载队列：可取消、可延迟、可优先级排序的加载队列
 * - 加载策略：立即 / 空闲时 / 可见时 / 悬停时 / 导航后
 *
 * @example
 * // 注册可按需加载的模块
 * loader.register('dashboard', () => import('./pages/dashboard'), {
 *   priority: 'high',
 *   preloadStrategy: 'idle',
 *   conditions: { roles: ['admin', 'manager'] },
 * });
 *
 * // 按需加载
 * const mod = await loader.load('dashboard');
 *
 * // 智能预加载（基于访问历史）
 * loader.smartPreload('/orders');
 */

// ==================== 类型定义 ====================

export type LoadPriority = 'critical' | 'high' | 'medium' | 'low';

export type PreloadStrategy =
  'immediate' | 'idle' | 'visible' | 'hover' | 'post-navigation' | 'manual';

export type LoadStatus = 'pending' | 'loading' | 'loaded' | 'failed' | 'cancelled';

export interface LoadCondition {
  roles?: string[];
  minDeviceMemory?: number;
  minCores?: number;
  networkTypes?: Array<'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'ethernet'>;
  requiresAuth?: boolean;
  custom?: () => boolean;
}

export interface OnDemandModule {
  id: string;
  name: string;
  loaderFn: () => Promise<unknown>;
  priority: LoadPriority;
  preloadStrategy: PreloadStrategy;
  conditions: LoadCondition;
  status: LoadStatus;
  instance?: unknown;
  loadTime?: number;
  loadError?: Error;
  retryCount: number;
  loadCount: number;
  lastAccessedAt: number;
  accessCount: number;
  avgLoadTime: number;
  totalLoadTime: number;
}

export interface LoadRequest {
  id: string;
  priority: LoadPriority;
  timeoutMs: number;
  retryCount: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface LoadResult {
  id: string;
  status: LoadStatus;
  instance?: unknown;
  loadTime: number;
  fromPreload: boolean;
  error?: Error;
}

export interface AccessRecord {
  path: string;
  moduleId: string;
  timestamp: number;
  duration: number;
}

export interface LoadPredictionResult {
  nextLikelyModules: string[];
  confidence: number;
  reasoning: string;
}

export interface LoaderStats {
  totalRequests: number;
  successfulLoads: number;
  failedLoads: number;
  cancelledLoads: number;
  preloadHits: number;
  avgLoadTime: number;
  p50LoadTime: number;
  p95LoadTime: number;
  p99LoadTime: number;
  activeLoads: number;
  queuedLoads: number;
  loadedModules: number;
  totalModules: number;
}

export interface LoaderConfig {
  maxConcurrentLoads: number;
  defaultTimeoutMs: number;
  defaultRetryCount: number;
  idlePreloadDelay: number;
  smartPredictionWindow: number;
  maxHistoryRecords: number;
  prefetchOnHover: boolean;
  prefetchOnVisible: boolean;
  enableSmartPrediction: boolean;
  enableObservability: boolean;
}

export type OnDemandCallback = (result: LoadResult) => void;

// ==================== OnDemandLoader（单例） ====================

class OnDemandLoaderImpl {
  private readonly modules = new Map<string, OnDemandModule>();
  private readonly loadPromises = new Map<string, Promise<unknown>>();
  private readonly preloadQueue: LoadRequest[] = [];
  private readonly history: AccessRecord[] = [];
  private readonly listeners = new Set<OnDemandCallback>();
  private currentLoads = 0;
  private totalRequests = 0;
  private successfulLoads = 0;
  private failedLoads = 0;
  private cancelledLoads = 0;
  private preloadHits = 0;
  private readonly loadTimes: number[] = [];
  private config: LoaderConfig;
  private isInitialized = false;

  private static readonly PRIORITY_WEIGHT: Record<LoadPriority, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  private static readonly DEFAULT_CONFIG: LoaderConfig = {
    maxConcurrentLoads: 6,
    defaultTimeoutMs: 15000,
    defaultRetryCount: 2,
    idlePreloadDelay: 3000,
    smartPredictionWindow: 300000,
    maxHistoryRecords: 500,
    prefetchOnHover: true,
    prefetchOnVisible: true,
    enableSmartPrediction: true,
    enableObservability: true,
  };

  constructor(config?: Partial<LoaderConfig>) {
    this.config = { ...OnDemandLoaderImpl.DEFAULT_CONFIG, ...config };
  }

  // -------------------- 模块注册 --------------------

  register(
    id: string,
    loaderFn: () => Promise<unknown>,
    options?: Partial<
      Omit<
        OnDemandModule,
        | 'id'
        | 'loaderFn'
        | 'status'
        | 'retryCount'
        | 'loadCount'
        | 'lastAccessedAt'
        | 'accessCount'
        | 'avgLoadTime'
        | 'totalLoadTime'
      >
    >
  ): OnDemandModule {
    const mod: OnDemandModule = {
      id,
      name: options?.name || id,
      loaderFn,
      priority: options?.priority || 'medium',
      preloadStrategy: options?.preloadStrategy || 'manual',
      conditions: options?.conditions || {},
      status: 'pending',
      retryCount: 0,
      loadCount: 0,
      lastAccessedAt: 0,
      accessCount: 0,
      avgLoadTime: 0,
      totalLoadTime: 0,
    };

    this.modules.set(id, mod);
    this.applyAutoPreload(mod);
    return mod;
  }

  unregister(id: string): boolean {
    const existed = this.modules.has(id);
    if (existed) {
      this.modules.delete(id);
      this.loadPromises.delete(id);
      this.cancelPending(id);
    }
    return existed;
  }

  getModule(id: string): OnDemandModule | undefined {
    return this.modules.get(id);
  }

  listModules(status?: LoadStatus): OnDemandModule[] {
    const all = Array.from(this.modules.values());
    if (status) return all.filter((m) => m.status === status);
    return all;
  }

  // -------------------- 加载方法 --------------------

  async load(id: string): Promise<LoadResult> {
    const mod = this.modules.get(id);
    if (!mod) {
      return {
        id,
        status: 'failed',
        loadTime: 0,
        fromPreload: false,
        error: new Error(
          `${i18n.t('microfrontend.on-demand-loader.ondemandloader_0')}${id}${i18n.t('microfrontend.on-demand-loader.k1')}`
        ),
      };
    }

    if (!this.checkConditions(mod.conditions)) {
      return {
        id,
        status: 'failed',
        loadTime: 0,
        fromPreload: false,
        error: new Error(
          `${i18n.t('microfrontend.on-demand-loader.ondemandloader_2')}${id}${i18n.t('microfrontend.on-demand-loader.k3')}`
        ),
      };
    }

    this.totalRequests++;

    // 已加载：直接返回
    if (mod.status === 'loaded' && mod.instance) {
      this.trackAccess(id);
      this.successfulLoads++;
      const result: LoadResult = {
        id,
        status: 'loaded',
        instance: mod.instance,
        loadTime: 0,
        fromPreload: true,
      };
      this.notify(result);
      return result;
    }

    // 正在加载：复用 Promise
    if (this.loadPromises.has(id)) {
      try {
        const instance = await this.loadPromises.get(id)!;
        this.preloadHits++;
        this.successfulLoads++;
        return { id, status: 'loaded', instance, loadTime: 0, fromPreload: true };
      } catch (err) {
        this.loadPromises.delete(id);
      }
    }

    // 新加载
    const promise = this.executeLoad(mod);
    this.loadPromises.set(id, promise);

    try {
      const instance = await promise;
      return {
        id,
        status: 'loaded',
        instance,
        loadTime: mod.lastAccessedAt > 0 ? mod.avgLoadTime : 0,
        fromPreload: false,
      };
    } catch (err) {
      return {
        id,
        status: 'failed',
        loadTime: 0,
        fromPreload: false,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    } finally {
      this.loadPromises.delete(id);
    }
  }

  async loadBatch(ids: string[]): Promise<LoadResult[]> {
    return Promise.all(ids.map((id) => this.load(id)));
  }

  // -------------------- 预加载 --------------------

  preload(id: string, priority?: LoadPriority): Promise<void> {
    const mod = this.modules.get(id);
    if (!mod)
      return Promise.reject(
        new Error(
          `${i18n.t('microfrontend.on-demand-loader.k4')}${id}${i18n.t('microfrontend.on-demand-loader.k5')}`
        )
      );

    const req: LoadRequest = {
      id,
      priority: priority || mod.priority,
      timeoutMs: this.config.defaultTimeoutMs,
      retryCount: this.config.defaultRetryCount,
      createdAt: Date.now(),
    };

    this.enqueue(req);
    return this.processQueue();
  }

  preloadBatch(ids: string[], priority?: LoadPriority): Promise<void[]> {
    return Promise.all(ids.map((id) => this.preload(id, priority)));
  }

  async smartPreload(currentPath: string): Promise<string[]> {
    const prediction = this.predictNextModules(currentPath);
    const candidates = prediction.nextLikelyModules.slice(0, 5);
    const preloadTasks = candidates
      .filter((id) => this.modules.has(id) && this.modules.get(id)!.status !== 'loaded')
      .map((id) => this.preload(id, 'high'));

    await Promise.all(preloadTasks);
    return candidates;
  }

  // -------------------- 加载控制 --------------------

  cancelPending(id: string): boolean {
    const idx = this.preloadQueue.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.preloadQueue.splice(idx, 1);
      this.cancelledLoads++;
      return true;
    }
    return false;
  }

  cancelAllPending(): number {
    const count = this.preloadQueue.length;
    this.preloadQueue.length = 0;
    this.cancelledLoads += count;
    return count;
  }

  unload(id: string): boolean {
    const mod = this.modules.get(id);
    if (!mod) return false;
    mod.instance = undefined;
    mod.status = 'pending';
    mod.loadTime = undefined;
    mod.loadError = undefined;
    mod.retryCount = 0;
    this.loadPromises.delete(id);
    return true;
  }

  unloadAll(): number {
    let count = 0;
    this.modules.forEach((mod) => {
      if ((mod.status === 'loaded' || mod.status === 'failed') && this.unload(mod.id)) count++;
    });
    return count;
  }

  // -------------------- 访问历史 --------------------

  recordAccess(path: string, moduleId: string, duration = 0): void {
    const record: AccessRecord = {
      path,
      moduleId,
      timestamp: Date.now(),
      duration,
    };

    this.history.push(record);
    if (this.history.length > this.config.maxHistoryRecords) {
      this.history.splice(0, this.history.length - this.config.maxHistoryRecords);
    }
  }

  getHistory(moduleId?: string): AccessRecord[] {
    if (moduleId) {
      return this.history.filter((h) => h.moduleId === moduleId);
    }
    return [...this.history];
  }

  clearHistory(): void {
    this.history.length = 0;
  }

  // -------------------- 智能预测 --------------------

  predictNextModules(currentPath: string): LoadPredictionResult {
    if (!this.config.enableSmartPrediction) {
      return {
        nextLikelyModules: [],
        confidence: 0,
        reasoning: i18n.t('microfrontend.on-demand-loader.k0'),
      };
    }

    const recent = this.history.slice(-50);
    if (recent.length < 3) {
      return {
        nextLikelyModules: [],
        confidence: 0,
        reasoning: i18n.t('microfrontend.on-demand-loader.k1'),
      };
    }

    const transitions = this.buildTransitionMatrix(recent);

    const currentPattern = this.classifyPath(currentPath);
    const candidates = transitions.get(currentPattern) || [];

    if (candidates.length === 0) {
      const fallback = this.fallbackPrediction();
      return {
        nextLikelyModules: fallback,
        confidence: 0.3,
        reasoning: i18n.t('microfrontend.on-demand-loader.k2'),
      };
    }

    const maxScore = candidates[0].score;
    return {
      nextLikelyModules: candidates.slice(0, 5).map((c) => c.moduleId),
      confidence: Math.min(maxScore * 0.5, 1),
      reasoning: `${i18n.t('microfrontend.on-demand-loader.k6')}${currentPattern}${i18n.t('microfrontend.on-demand-loader.k7')}${candidates.length}${i18n.t('microfrontend.on-demand-loader.k8')}`,
    };
  }

  // -------------------- 统计与监控 --------------------

  getStats(): LoaderStats {
    const times = [...this.loadTimes].sort((a, b) => a - b);
    const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const pct = (p: number) => {
      if (!times.length) return 0;
      return times[Math.min(Math.floor((p / 100) * times.length), times.length - 1)];
    };

    let loaded = 0;
    this.modules.forEach((m) => {
      if (m.status === 'loaded') loaded++;
    });

    return {
      totalRequests: this.totalRequests,
      successfulLoads: this.successfulLoads,
      failedLoads: this.failedLoads,
      cancelledLoads: this.cancelledLoads,
      preloadHits: this.preloadHits,
      avgLoadTime: Math.round(avg),
      p50LoadTime: pct(50),
      p95LoadTime: pct(95),
      p99LoadTime: pct(99),
      activeLoads: this.currentLoads,
      queuedLoads: this.preloadQueue.length,
      loadedModules: loaded,
      totalModules: this.modules.size,
    };
  }

  resetStats(): void {
    this.totalRequests = 0;
    this.successfulLoads = 0;
    this.failedLoads = 0;
    this.cancelledLoads = 0;
    this.preloadHits = 0;
    this.loadTimes.length = 0;
  }

  // -------------------- 配置管理 --------------------

  updateConfig(config: Partial<LoaderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): LoaderConfig {
    return { ...this.config };
  }

  // -------------------- 事件订阅 --------------------

  onLoad(callback: OnDemandCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // -------------------- 初始化 --------------------

  initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.startIdlePreloader();
  }

  // -------------------- 内部实现 --------------------

  private async executeLoad(mod: OnDemandModule): Promise<unknown> {
    mod.status = 'loading';
    const startTime = Date.now();

    await this.acquireSlot();

    try {
      const instance = await this.doLoadWithRetry(mod);
      const loadTime = Date.now() - startTime;
      mod.instance = instance;
      mod.status = 'loaded';
      mod.loadTime = loadTime;
      mod.lastAccessedAt = Date.now();
      mod.loadCount++;
      mod.totalLoadTime += loadTime;
      mod.avgLoadTime = Math.round(mod.totalLoadTime / mod.loadCount);

      this.successfulLoads++;
      this.loadTimes.push(loadTime);
      this.notify({ id: mod.id, status: 'loaded', instance, loadTime, fromPreload: false });
      return instance;
    } catch (err) {
      mod.status = 'failed';
      mod.loadError = err instanceof Error ? err : new Error(String(err));
      this.failedLoads++;
      throw err;
    } finally {
      this.releaseSlot();
    }
  }

  private async doLoadWithRetry(mod: OnDemandModule): Promise<unknown> {
    let lastError: Error | null = null;
    const retryCount = this.config.defaultRetryCount;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        return await this.doLoadWithTimeout(mod);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        mod.retryCount = attempt;
        if (attempt < retryCount) {
          await this.delay(500 * (attempt + 1));
        }
      }
    }

    throw (
      lastError ??
      new Error(
        `${i18n.t('microfrontend.on-demand-loader.ondemandloader_9')}${mod.id}${i18n.t('microfrontend.on-demand-loader.k10')}`
      )
    );
  }

  private async doLoadWithTimeout(mod: OnDemandModule): Promise<unknown> {
    const timeoutMs = this.config.defaultTimeoutMs;
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new Error(
            `${i18n.t('microfrontend.on-demand-loader.ondemandloader_11')}${mod.id}${i18n.t('microfrontend.on-demand-loader.k12')}${timeoutMs}ms）`
          )
        );
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

  private checkConditions(conditions: LoadCondition): boolean {
    if (
      conditions.roles &&
      conditions.roles.length > 0 &&
      typeof window !== 'undefined' &&
      (window as unknown as { __userRoles?: string[] }).__userRoles
    ) {
      const userRoles: string[] =
        (window as unknown as { __userRoles?: string[] }).__userRoles ?? [];
      if (!conditions.roles.some((r) => userRoles.includes(r))) {
        return false;
      }
    }

    if (
      conditions.minDeviceMemory &&
      typeof performance !== 'undefined' &&
      (performance as unknown as { memory?: { jsHeapSizeLimit: number } }).memory
    ) {
      const mem = (performance as unknown as { memory?: { jsHeapSizeLimit: number } }).memory!;
      if (mem.jsHeapSizeLimit < conditions.minDeviceMemory * 1024 * 1024) {
        return false;
      }
    }

    if (
      conditions.minCores &&
      typeof navigator !== 'undefined' &&
      navigator.hardwareConcurrency &&
      navigator.hardwareConcurrency < conditions.minCores
    ) {
      return false;
    }

    if (
      conditions.networkTypes &&
      typeof navigator !== 'undefined' &&
      (navigator as unknown as { connection?: { effectiveType?: string; downlink?: number } })
        .connection
    ) {
      const conn = (
        navigator as unknown as { connection?: { effectiveType?: string; downlink?: number } }
      ).connection!;
      if (
        conn.effectiveType &&
        !conditions.networkTypes.includes(
          conn.effectiveType as (typeof conditions.networkTypes)[number]
        )
      ) {
        return false;
      }
    }

    if (conditions.custom) {
      try {
        if (!conditions.custom()) return false;
      } catch {
        return false;
      }
    }

    return true;
  }

  private applyAutoPreload(mod: OnDemandModule): void {
    switch (mod.preloadStrategy) {
      case 'immediate':
        this.preload(mod.id, mod.priority).catch(() => {});
        break;
      case 'idle':
        this.scheduleIdlePreload(mod.id);
        break;
      case 'visible':
        this.setupVisiblePreload(mod.id);
        break;
      case 'hover':
        this.setupHoverPreload(mod.id);
        break;
      case 'post-navigation':
        this.setupPostNavigationPreload(mod.id);
        break;
    }
  }

  private scheduleIdlePreload(id: string): void {
    const preloadFn = () => {
      this.preload(id, 'medium').catch(() => {});
    };

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(preloadFn, { timeout: this.config.idlePreloadDelay });
    } else {
      setTimeout(preloadFn, this.config.idlePreloadDelay);
    }
  }

  private setupVisiblePreload(id: string): void {
    if (typeof document === 'undefined' || typeof globalThis.IntersectionObserver !== 'function')
      return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.preload(id, 'low').catch(() => {});
          observer.disconnect();
        }
      });
    });

    const el = document.querySelector(`[data-module="${id}"]`);
    if (el) observer.observe(el);
  }

  private setupHoverPreload(id: string): void {
    if (typeof document === 'undefined') return;

    const el = document.querySelector(`[data-module="${id}"]`);
    if (!el || !this.config.prefetchOnHover) return;

    const handler = () => {
      this.preload(id, 'low').catch(() => {});
      el.removeEventListener('mouseenter', handler);
    };
    el.addEventListener('mouseenter', handler);
  }

  private setupPostNavigationPreload(id: string): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.preload(id, 'medium').catch(() => {});
      }, 2000);
    });
  }

  private startIdlePreloader(): void {
    const checkAndPreload = () => {
      const pending = this.modules.size - this.countLoaded();
      if (pending > 0 && this.currentLoads < this.config.maxConcurrentLoads) {
        const candidates = Array.from(this.modules.values())
          .filter((m) => m.status === 'pending')
          .sort(
            (a, b) =>
              OnDemandLoaderImpl.PRIORITY_WEIGHT[b.priority] -
              OnDemandLoaderImpl.PRIORITY_WEIGHT[a.priority]
          )
          .slice(0, this.config.maxConcurrentLoads - this.currentLoads);

        candidates.forEach((c) => this.preload(c.id, c.priority).catch(() => {}));
      }
    };

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(checkAndPreload);
    } else {
      setTimeout(checkAndPreload, this.config.idlePreloadDelay);
    }
  }

  private countLoaded(): number {
    let count = 0;
    this.modules.forEach((m) => {
      if (m.status === 'loaded') count++;
    });
    return count;
  }

  private enqueue(req: LoadRequest): void {
    this.preloadQueue.push(req);
    this.preloadQueue.sort(
      (a, b) =>
        OnDemandLoaderImpl.PRIORITY_WEIGHT[b.priority] -
        OnDemandLoaderImpl.PRIORITY_WEIGHT[a.priority]
    );
  }

  private async processQueue(): Promise<void> {
    while (this.preloadQueue.length > 0 && this.currentLoads < this.config.maxConcurrentLoads) {
      const req = this.preloadQueue.shift()!;
      const mod = this.modules.get(req.id);
      if (!mod || mod.status === 'loaded') continue;

      this.executeLoad(mod).catch(() => {});
    }
  }

  private async acquireSlot(): Promise<void> {
    if (this.currentLoads < this.config.maxConcurrentLoads) {
      this.currentLoads++;
      return;
    }
    await new Promise<void>((resolve) => {
      const check = () => {
        if (this.currentLoads < this.config.maxConcurrentLoads) {
          this.currentLoads++;
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  private releaseSlot(): void {
    this.currentLoads--;
    this.processQueue();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private trackAccess(id: string): void {
    const mod = this.modules.get(id);
    if (mod) {
      mod.lastAccessedAt = Date.now();
      mod.accessCount++;
    }
  }

  private buildTransitionMatrix(
    records: AccessRecord[]
  ): Map<string, Array<{ moduleId: string; score: number }>> {
    const matrix = new Map<string, Map<string, number>>();

    for (let i = 0; i < records.length - 1; i++) {
      const current = this.classifyPath(records[i].path);
      const next = records[i + 1];

      if (!matrix.has(current)) {
        matrix.set(current, new Map());
      }
      const inner = matrix.get(current)!;
      inner.set(next.moduleId, (inner.get(next.moduleId) || 0) + 1);
    }

    const result = new Map<string, Array<{ moduleId: string; score: number }>>();
    matrix.forEach((inner, path) => {
      const entries = Array.from(inner.entries())
        .map(([moduleId, count]) => ({
          moduleId,
          score: count / Math.max(...Array.from(inner.values())),
        }))
        .sort((a, b) => b.score - a.score);
      result.set(path, entries);
    });

    return result;
  }

  private classifyPath(path: string): string {
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return 'root';
    if (segments.length === 1) return `/${segments[0]}`;
    return `/${segments.slice(0, 2).join('/')}`;
  }

  private fallbackPrediction(): string[] {
    const moduleAccess = new Map<string, number>();
    this.history.forEach((h) => {
      moduleAccess.set(h.moduleId, (moduleAccess.get(h.moduleId) || 0) + 1);
    });

    return Array.from(moduleAccess.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);
  }

  private notify(result: LoadResult): void {
    this.listeners.forEach((l) => {
      try {
        l(result);
      } catch {
        // ignore
      }
    });
  }

  get currentLoadCount(): number {
    return this.currentLoads;
  }

  get queueSize(): number {
    return this.preloadQueue.length;
  }

  get moduleCount(): number {
    return this.modules.size;
  }
}

// ==================== 单例导出 ====================

export const onDemandLoader = new OnDemandLoaderImpl();
export { OnDemandLoaderImpl as OnDemandLoader };

export default onDemandLoader;
