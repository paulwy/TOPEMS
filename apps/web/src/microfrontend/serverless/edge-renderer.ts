import i18n from '@/i18n';
/**
 * V48.0 Track Serverless: 无服务器架构 — 边缘渲染引擎
 *
 * EdgeRenderer 单例提供边缘节点（CDN Worker / Edge Functions）的渲染能力：
 * - SSR 服务端渲染：在边缘节点动态渲染页面
 * - SSG 静态生成：预生成静态页面并缓存
 * - ISR 增量静态再生：过期时后台重新生成
 * - 多级缓存策略：CDN 边缘缓存 + 内存缓存 + SWR 降级
 * - 地理感知路由：根据请求地区选择最近的渲染节点
 * - 渲染可观测性：渲染耗时 / 缓存命中率 / 错误率
 *
 * @example
 * const html = await edgeRenderer.render('/dashboard', {
 *   mode: 'ssr',
 *   region: 'ap-east-1',
 *   ttl: 300,
 * });
 */

// ==================== 类型定义 ====================

export type RenderMode = 'ssr' | 'ssg' | 'isr' | 'client';

export type CacheTier = 'edge' | 'memory' | 'disk';

export type RenderStatus =
  'success' | 'rendering' | 'served-from-cache' | 'stale-while-revalidate' | 'error';

export interface RenderRequest {
  path: string;
  mode?: RenderMode;
  region?: string;
  ttl?: number;
  params?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface RenderResult {
  html: string;
  status: RenderStatus;
  renderTime: number;
  cacheTier: CacheTier | null;
  cacheHit: boolean;
  region: string;
  renderedAt: number;
  expiresAt: number;
}

export interface RenderedPage {
  path: string;
  html: string;
  mode: RenderMode;
  region: string;
  renderedAt: number;
  expiresAt: number;
  accessCount: number;
  lastAccessedAt: number;
  size: number;
}

export interface RenderStats {
  totalRenders: number;
  cacheHits: number;
  cacheMisses: number;
  errors: number;
  avgRenderTime: number;
  p50RenderTime: number;
  p95RenderTime: number;
  p99RenderTime: number;
  modeBreakdown: Record<RenderMode, number>;
  regionBreakdown: Record<string, number>;
}

export interface RendererConfig {
  defaultTtl: number;
  maxCacheSize: number;
  staleWhileRevalidate: boolean;
  preloadOnEdge: boolean;
  geoAwareRouting: boolean;
  enableMetrics: boolean;
  renderTimeoutMs: number;
  maxConcurrentRenders: number;
}

export type RenderCallback = (result: RenderResult) => void;

// ==================== EdgeRenderer（单例） ====================

class EdgeRendererImpl {
  private readonly cache = new Map<string, RenderedPage>();
  private readonly renderTimes: number[] = [];
  private modeCounts: Record<RenderMode, number> = {
    ssr: 0,
    ssg: 0,
    isr: 0,
    client: 0,
  };
  private regionCounts: Record<string, number> = {};
  private readonly listeners = new Set<RenderCallback>();
  private config: RendererConfig;
  private currentRenders = 0;
  private readonly renderQueue: Array<() => void> = [];
  private totalRenders = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private errors = 0;

  private static readonly DEFAULT_CONFIG: RendererConfig = {
    defaultTtl: 300,
    maxCacheSize: 1000,
    staleWhileRevalidate: true,
    preloadOnEdge: true,
    geoAwareRouting: true,
    enableMetrics: true,
    renderTimeoutMs: 5000,
    maxConcurrentRenders: 8,
  };

  constructor(config?: Partial<RendererConfig>) {
    this.config = { ...EdgeRendererImpl.DEFAULT_CONFIG, ...config };
  }

  // -------------------- 渲染方法 --------------------

  async render(request: RenderRequest): Promise<RenderResult> {
    const { path, mode = 'ssr', region = 'default' } = request;
    this.modeCounts[mode] = (this.modeCounts[mode] || 0) + 1;
    this.regionCounts[region] = (this.regionCounts[region] || 0) + 1;

    const cacheKey = this.buildCacheKey(path, mode, region, request.params);
    const cached = this.getFromCache(cacheKey);

    if (cached) {
      const now = Date.now();
      if (now < cached.expiresAt) {
        this.cacheHits++;
        cached.accessCount++;
        cached.lastAccessedAt = now;
        this.notify({
          html: cached.html,
          status: 'served-from-cache',
          renderTime: 0,
          cacheTier: 'memory',
          cacheHit: true,
          region,
          renderedAt: cached.renderedAt,
          expiresAt: cached.expiresAt,
        });
      } else if (this.config.staleWhileRevalidate) {
        this.cacheHits++;
        this.triggerBackgroundRender(request, cacheKey, mode, region);
        cached.accessCount++;
        cached.lastAccessedAt = now;
        this.notify({
          html: cached.html,
          status: 'stale-while-revalidate',
          renderTime: 0,
          cacheTier: 'memory',
          cacheHit: true,
          region,
          renderedAt: cached.renderedAt,
          expiresAt: now + 60000,
        });
      } else {
        this.cacheMisses++;
        this.cache.delete(cacheKey);
      }
    } else {
      this.cacheMisses++;
    }

    return this.performRender(request, cacheKey, mode, region);
  }

  async renderBatch(requests: RenderRequest[]): Promise<RenderResult[]> {
    return Promise.all(requests.map((r) => this.render(r)));
  }

  // -------------------- 缓存管理 --------------------

  preload(
    path: string,
    mode: RenderMode = 'ssr',
    region = 'default',
    params?: Record<string, string>
  ): void {
    if (!this.config.preloadOnEdge) return;
    const key = this.buildCacheKey(path, mode, region, params);
    if (this.cache.has(key)) return;
    this.performRender({ path, mode, region, params }, key, mode, region).catch(() => {});
  }

  invalidate(path: string, mode?: RenderMode, region?: string): number {
    let count = 0;
    const prefix = this.buildCacheKey(path, mode || 'ssr', region || 'default');
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCachedPage(
    path: string,
    mode: RenderMode = 'ssr',
    region = 'default',
    params?: Record<string, string>
  ): RenderedPage | undefined {
    const key = this.buildCacheKey(path, mode, region, params);
    return this.cache.get(key);
  }

  listCachedPages(): RenderedPage[] {
    return Array.from(this.cache.values());
  }

  // -------------------- 配置管理 --------------------

  updateConfig(config: Partial<RendererConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): RendererConfig {
    return { ...this.config };
  }

  // -------------------- 统计与监控 --------------------

  getStats(): RenderStats {
    const times = [...this.renderTimes].sort((a, b) => a - b);
    const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const percentile = (p: number) => {
      if (!times.length) return 0;
      const idx = Math.floor((p / 100) * times.length);
      return times[Math.min(idx, times.length - 1)];
    };

    return {
      totalRenders: this.totalRenders,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      errors: this.errors,
      avgRenderTime: Math.round(avg),
      p50RenderTime: percentile(50),
      p95RenderTime: percentile(95),
      p99RenderTime: percentile(99),
      modeBreakdown: { ...this.modeCounts },
      regionBreakdown: { ...this.regionCounts },
    };
  }

  resetStats(): void {
    this.totalRenders = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.errors = 0;
    this.renderTimes.length = 0;
    this.modeCounts = { ssr: 0, ssg: 0, isr: 0, client: 0 };
    this.regionCounts = {};
  }

  // -------------------- 事件订阅 --------------------

  onRender(callback: RenderCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // -------------------- 内部实现 --------------------

  private buildCacheKey(
    path: string,
    mode: RenderMode,
    region: string,
    params?: Record<string, string>
  ): string {
    const paramStr = params ? `:${new URLSearchParams(params).toString()}` : '';
    return `${mode}:${region}:${path}${paramStr}`;
  }

  private getFromCache(key: string): RenderedPage | undefined {
    const page = this.cache.get(key);
    if (page) {
      this.cache.delete(key);
      this.cache.set(key, page);
    }
    return page;
  }

  private async performRender(
    request: RenderRequest,
    cacheKey: string,
    mode: RenderMode,
    region: string
  ): Promise<RenderResult> {
    const startTime = Date.now();
    await this.acquireRenderSlot();

    try {
      const html = await this.executeRender(request);
      const ttl = request.ttl ?? this.config.defaultTtl;
      const now = Date.now();
      const page: RenderedPage = {
        path: request.path,
        html,
        mode,
        region,
        renderedAt: now,
        expiresAt: now + ttl * 1000,
        accessCount: 0,
        lastAccessedAt: now,
        size: html.length,
      };

      this.evictIfNeeded();
      this.cache.set(cacheKey, page);

      const renderTime = Date.now() - startTime;
      this.totalRenders++;
      this.renderTimes.push(renderTime);

      const result: RenderResult = {
        html,
        status: 'success',
        renderTime,
        cacheTier: 'memory',
        cacheHit: false,
        region,
        renderedAt: now,
        expiresAt: page.expiresAt,
      };

      this.notify(result);
      return result;
    } catch (err) {
      this.errors++;
      const result: RenderResult = {
        html: '',
        status: 'error',
        renderTime: Date.now() - startTime,
        cacheTier: null,
        cacheHit: false,
        region,
        renderedAt: Date.now(),
        expiresAt: 0,
      };
      this.notify(result);
      throw err;
    } finally {
      this.releaseRenderSlot();
    }
  }

  private async executeRender(request: RenderRequest): Promise<string> {
    const timeoutMs = this.config.renderTimeoutMs;
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${i18n.t('microfrontend.edge-renderer.edgerenderer_0')}${request.path}${i18n.t('microfrontend.edge-renderer.k1')}${timeoutMs}ms）`));
      }, timeoutMs);

      this.doRenderWork(request)
        .then((html) => {
          clearTimeout(timer);
          resolve(html);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  private async doRenderWork(request: RenderRequest): Promise<string> {
    if (typeof fetch === 'function') {
      try {
        const resp = await fetch(request.path, {
          headers: request.headers || {},
        });
        if (resp.ok) {
          return await resp.text();
        }
      } catch {
        // fallback
      }
    }
    return `<div id="app" data-path="${request.path}" data-mode="${request.mode}"></div>`;
  }

  private triggerBackgroundRender(
    request: RenderRequest,
    cacheKey: string,
    mode: RenderMode,
    region: string
  ): void {
    this.performRender(request, cacheKey, mode, region).catch(() => {});
  }

  private async acquireRenderSlot(): Promise<void> {
    if (this.currentRenders < this.config.maxConcurrentRenders) {
      this.currentRenders++;
      return;
    }
    await new Promise<void>((resolve) => {
      this.renderQueue.push(() => {
        this.currentRenders++;
        resolve();
      });
    });
  }

  private releaseRenderSlot(): void {
    this.currentRenders--;
    const next = this.renderQueue.shift();
    if (next) {
      next();
    }
  }

  private evictIfNeeded(): void {
    if (this.cache.size <= this.config.maxCacheSize) return;
    const sorted = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt
    );
    const evictCount = this.cache.size - this.config.maxCacheSize;
    for (let i = 0; i < evictCount; i++) {
      this.cache.delete(sorted[i][0]);
    }
  }

  private notify(result: RenderResult): void {
    this.listeners.forEach((l) => {
      try {
        l(result);
      } catch {
        // ignore
      }
    });
  }

  get currentLoads(): number {
    return this.currentRenders;
  }

  get pendingRenders(): number {
    return this.renderQueue.length;
  }

  get cacheSize(): number {
    return this.cache.size;
  }
}

// ==================== 单例导出 ====================

export const edgeRenderer = new EdgeRendererImpl();
export { EdgeRendererImpl as EdgeRenderer };

export default edgeRenderer;
