export type CoreWebVitalName = 'LCP' | 'FID' | 'CLS' | 'INP' | 'FCP' | 'TTFB';

export interface CoreWebVital {
  name: CoreWebVitalName;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url: string;
}

export interface ModuleLoadMetric {
  moduleId: string;
  moduleName: string;
  loadStart: number;
  loadEnd: number;
  duration: number;
  chunkSize: number;
  isLazy: boolean;
  preloadStrategy: 'eager' | 'lazy' | 'prefetch' | 'idle';
  cacheHit: boolean;
  renderTime?: number;
}

export interface RenderMetric {
  componentName: string;
  renderCount: number;
  totalRenderTime: number;
  avgRenderTime: number;
  maxRenderTime: number;
  lastRenderTime: number;
  propsChanged: string[];
  stateChanged: string[];
}

export interface MemoryMetric {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  external: number;
  listenerCount: number;
  timestamp: number;
}

export interface BundleAnalysis {
  moduleId: string;
  totalSize: number;
  gzipSize: number;
  brotliSize: number;
  chunks: Array<{
    id: string;
    size: number;
    initial: boolean;
  }>;
  dependencies: string[];
  treeShakable: boolean;
  codeSplittingScore: number;
}

export interface LazyLoadEffectiveness {
  moduleId: string;
  wasLazy: boolean;
  loadTime: number;
  usageCount: number;
  firstUseDelay: number;
  totalSavings: number;
  effectivenessScore: number;
}

export interface PerformanceBudget {
  lcp: number;
  fid: number;
  cls: number;
  inp: number;
  fcp: number;
  ttfb: number;
  maxBundleSize: number;
  maxModuleLoadTime: number;
  maxRenderTime: number;
  maxMemoryUsage: number;
  budgetName: string;
}

export type BudgetCheckStatus = 'pass' | 'warn' | 'fail';

export interface BudgetCheckResult {
  metric: string;
  value: number;
  threshold: number;
  status: BudgetCheckStatus;
  message: string;
}

export interface PerformanceReport {
  id: string;
  generatedAt: number;
  summary: {
    overallScore: number;
    ratings: Record<string, 'good' | 'needs-improvement' | 'poor'>;
    passedChecks: number;
    totalChecks: number;
  };
  moduleLoads: ModuleLoadMetric[];
  renderMetrics: RenderMetric[];
  memorySnapshots: MemoryMetric[];
  bundleAnalyses: BundleAnalysis[];
  lazyEffectiveness: LazyLoadEffectiveness[];
  coreWebVitals: CoreWebVital[];
  budgetResults: BudgetCheckResult[];
  recommendations: string[];
}

const DEFAULT_BUDGET: PerformanceBudget = {
  lcp: 2500,
  fid: 100,
  cls: 0.1,
  inp: 200,
  fcp: 1800,
  ttfb: 600,
  maxBundleSize: 300 * 1024,
  maxModuleLoadTime: 3000,
  maxRenderTime: 16,
  maxMemoryUsage: 50 * 1024 * 1024,
  budgetName: 'default',
};

const WEIGHTS = {
  lcp: 0.25,
  fid: 0.15,
  cls: 0.15,
  inp: 0.2,
  fcp: 0.1,
  ttfb: 0.15,
};

const MAX_MEMORY_SNAPSHOTS = 60;
const MAX_RENDER_METRICS = 200;
const MAX_MODULE_LOADS = 500;

function generateReportId(): string {
  return `perf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getRating(name: CoreWebVitalName, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<CoreWebVitalName, [number, number]> = {
    LCP: [2500, 4000],
    FID: [100, 300],
    CLS: [0.1, 0.25],
    INP: [200, 500],
    FCP: [1800, 3000],
    TTFB: [600, 1800],
  };
  const [good, poor] = thresholds[name];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

export class PerformanceAnalyzer {
  private static instance: PerformanceAnalyzer;

  private moduleLoads: Map<string, ModuleLoadMetric> = new Map();
  private renderMetrics: Map<string, RenderMetric> = new Map();
  private memorySnapshots: MemoryMetric[] = [];
  private coreWebVitals: Map<CoreWebVitalName, CoreWebVital> = new Map();
  private bundleAnalyses: Map<string, BundleAnalysis> = new Map();
  private lazyEffectiveness: Map<string, LazyLoadEffectiveness> = new Map();
  private budget: PerformanceBudget = { ...DEFAULT_BUDGET };
  private observers: PerformanceObserver[] = [];
  private listeners: Set<(report: PerformanceReport) => void> = new Set();
  private isTracking = false;

  private constructor() {}

  static getInstance(): PerformanceAnalyzer {
    if (!PerformanceAnalyzer.instance) {
      PerformanceAnalyzer.instance = new PerformanceAnalyzer();
    }
    return PerformanceAnalyzer.instance;
  }

  // ==================== Tracking Control ====================

  startTracking(): void {
    if (this.isTracking) return;
    this.isTracking = true;

    this.observeCoreWebVitals();
    this.trackMemoryUsage();

    this.emit('tracking:started', null);
  }

  stopTracking(): void {
    this.isTracking = false;
    this.observers.forEach((obs) => {
      try {
        obs.disconnect();
      } catch {
        // ignore
      }
    });
    this.observers = [];
    this.emit('tracking:stopped', null);
  }

  isActive(): boolean {
    return this.isTracking;
  }

  // ==================== Module Load Timing ====================

  recordModuleLoad(metric: ModuleLoadMetric): void {
    this.moduleLoads.set(metric.moduleId, metric);
    if (this.moduleLoads.size > MAX_MODULE_LOADS) {
      const firstKey = this.moduleLoads.keys().next().value;
      if (firstKey) this.moduleLoads.delete(firstKey);
    }
    this.emit('module:loaded', metric);
  }

  getModuleLoads(): ModuleLoadMetric[] {
    return Array.from(this.moduleLoads.values());
  }

  getModuleLoadTime(moduleId: string): ModuleLoadMetric | undefined {
    return this.moduleLoads.get(moduleId);
  }

  analyzeModuleLoads(): Array<{
    moduleId: string;
    status: 'fast' | 'normal' | 'slow';
    duration: number;
    recommendation?: string;
  }> {
    return Array.from(this.moduleLoads.values()).map((m) => {
      const status = m.duration < 500 ? 'fast' : m.duration < 1500 ? 'normal' : 'slow';
      let recommendation: string | undefined;
      if (status === 'slow') {
        if (m.isLazy) {
          recommendation = '考虑增加预加载策略或减少模块体积';
        } else {
          recommendation = '考虑使用懒加载或代码分割';
        }
      }
      return { moduleId: m.moduleId, status, duration: m.duration, recommendation };
    });
  }

  // ==================== Render Performance Tracking ====================

  recordRender(
    componentName: string,
    renderTime: number,
    propsChanged: string[] = [],
    stateChanged: string[] = []
  ): void {
    const existing = this.renderMetrics.get(componentName);
    if (existing) {
      existing.renderCount++;
      existing.totalRenderTime += renderTime;
      existing.avgRenderTime = existing.totalRenderTime / existing.renderCount;
      existing.maxRenderTime = Math.max(existing.maxRenderTime, renderTime);
      existing.lastRenderTime = performance.now();
      existing.propsChanged = propsChanged;
      existing.stateChanged = stateChanged;
    } else {
      this.renderMetrics.set(componentName, {
        componentName,
        renderCount: 1,
        totalRenderTime: renderTime,
        avgRenderTime: renderTime,
        maxRenderTime: renderTime,
        lastRenderTime: performance.now(),
        propsChanged,
        stateChanged,
      });
    }

    if (this.renderMetrics.size > MAX_RENDER_METRICS) {
      const firstKey = this.renderMetrics.keys().next().value;
      if (firstKey) this.renderMetrics.delete(firstKey);
    }
  }

  getRenderMetrics(): RenderMetric[] {
    return Array.from(this.renderMetrics.values());
  }

  getSlowComponents(threshold = 16): RenderMetric[] {
    return Array.from(this.renderMetrics.values())
      .filter((m) => m.avgRenderTime > threshold)
      .sort((a, b) => b.avgRenderTime - a.avgRenderTime);
  }

  // ==================== Memory Usage Monitoring ====================

  private trackMemoryUsage(): void {
    const takeSnapshot = () => {
      if (typeof performance !== 'undefined' && 'memory' in performance) {
        const memory = (
          performance as Performance & {
            memory: {
              usedJSHeapSize: number;
              totalJSHeapSize: number;
              jsHeapSizeLimit: number;
            };
          }
        ).memory;
        const snapshot: MemoryMetric = {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          external: 0,
          listenerCount: this.renderMetrics.size,
          timestamp: Date.now(),
        };
        this.memorySnapshots.push(snapshot);
        if (this.memorySnapshots.length > MAX_MEMORY_SNAPSHOTS) {
          this.memorySnapshots = this.memorySnapshots.slice(-MAX_MEMORY_SNAPSHOTS);
        }
        this.emit('memory:snapshot', snapshot);
      }
    };

    takeSnapshot();
    const interval = setInterval(takeSnapshot, 5000);
    this.observers.push({
      disconnect: () => clearInterval(interval),
      takeRecords: () => [],
      observe: () => {},
    } as unknown as PerformanceObserver);
  }

  getMemorySnapshots(): MemoryMetric[] {
    return [...this.memorySnapshots];
  }

  getCurrentMemory(): MemoryMetric | null {
    return this.memorySnapshots.length > 0
      ? this.memorySnapshots[this.memorySnapshots.length - 1]
      : null;
  }

  // ==================== Bundle Size Analysis ====================

  recordBundleAnalysis(analysis: BundleAnalysis): void {
    this.bundleAnalyses.set(analysis.moduleId, analysis);
    this.emit('bundle:analyzed', analysis);
  }

  getBundleAnalyses(): BundleAnalysis[] {
    return Array.from(this.bundleAnalyses.values());
  }

  analyzeBundleSizes(): Array<{
    moduleId: string;
    totalSize: number;
    status: 'good' | 'warning' | 'critical';
  }> {
    return Array.from(this.bundleAnalyses.values()).map((b) => {
      const sizeKB = b.totalSize / 1024;
      const status: 'good' | 'warning' | 'critical' =
        sizeKB < 100 ? 'good' : sizeKB < 300 ? 'warning' : 'critical';
      return { moduleId: b.moduleId, totalSize: b.totalSize, status };
    });
  }

  // ==================== Code Splitting Verification ====================

  verifyCodeSplitting(moduleId: string): {
    valid: boolean;
    chunks: number;
    initialChunkSize: number;
    lazyChunkSize: number;
    score: number;
  } {
    const analysis = this.bundleAnalyses.get(moduleId);
    if (!analysis) {
      return { valid: false, chunks: 0, initialChunkSize: 0, lazyChunkSize: 0, score: 0 };
    }

    const initialChunks = analysis.chunks.filter((c) => c.initial);
    const lazyChunks = analysis.chunks.filter((c) => !c.initial);
    const initialSize = initialChunks.reduce((sum, c) => sum + c.size, 0);
    const lazySize = lazyChunks.reduce((sum, c) => sum + c.size, 0);
    const ratio = analysis.totalSize > 0 ? lazySize / analysis.totalSize : 0;

    return {
      valid: analysis.chunks.length > 1,
      chunks: analysis.chunks.length,
      initialChunkSize: initialSize,
      lazyChunkSize: lazySize,
      score: Math.round(ratio * 100),
    };
  }

  // ==================== Lazy Loading Effectiveness ====================

  recordLazyEffectiveness(effectiveness: LazyLoadEffectiveness): void {
    this.lazyEffectiveness.set(effectiveness.moduleId, effectiveness);
    this.emit('lazy:analyzed', effectiveness);
  }

  getLazyEffectiveness(): LazyLoadEffectiveness[] {
    return Array.from(this.lazyEffectiveness.values());
  }

  analyzeLazyEffectiveness(): Array<{
    moduleId: string;
    wasLazy: boolean;
    score: number;
    recommendation?: string;
  }> {
    return Array.from(this.lazyEffectiveness.values()).map((e) => {
      let recommendation: string | undefined;
      if (!e.wasLazy && e.usageCount < 3) {
        recommendation = '低频使用模块，建议改为懒加载';
      } else if (e.wasLazy && e.firstUseDelay > 3000) {
        recommendation = '首次使用延迟过高，考虑预加载策略';
      } else if (e.effectivenessScore < 50) {
        recommendation = '懒加载效果不佳，评估是否需要合并模块';
      }
      return {
        moduleId: e.moduleId,
        wasLazy: e.wasLazy,
        score: e.effectivenessScore,
        recommendation,
      };
    });
  }

  // ==================== Core Web Vitals ====================

  private observeCoreWebVitals(): void {
    const vitalsConfig: Array<{ name: CoreWebVitalName; metricName: string }> = [
      { name: 'LCP', metricName: 'largest-contentful-paint' },
      { name: 'FID', metricName: 'first-input' },
      { name: 'CLS', metricName: 'cumulative-layout-shift' },
      { name: 'INP', metricName: 'interaction-to-next-paint' },
      { name: 'FCP', metricName: 'first-contentful-paint' },
      { name: 'TTFB', metricName: 'navigation' },
    ];

    for (const { name, metricName } of vitalsConfig) {
      try {
        if (typeof PerformanceObserver !== 'undefined') {
          const supported = PerformanceObserver.supportedEntryTypes;
          if (supported && supported.includes(metricName)) {
            const observer = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              for (const entry of entries) {
                let value = 0;
                if (name === 'LCP')
                  value = (
                    entry as PerformanceEntry & {
                      renderTime?: number;
                      loadTime?: number;
                      startTime: number;
                    }
                  ).startTime;
                else if (name === 'FID')
                  value = (entry as PerformanceEventTiming).processingStart - entry.startTime;
                else if (name === 'CLS')
                  value = (entry as PerformanceEntry & { value?: number }).value || 0;
                else if (name === 'INP') value = (entry as PerformanceEventTiming).duration;
                else if (name === 'FCP') value = entry.startTime;
                else if (name === 'TTFB')
                  value =
                    (entry as PerformanceNavigationTiming).responseStart -
                    (entry as PerformanceNavigationTiming).requestStart;

                const vital: CoreWebVital = {
                  name,
                  value,
                  rating: getRating(name, value),
                  timestamp: Date.now(),
                  url: window.location.href,
                };
                this.coreWebVitals.set(name, vital);
                this.emit('vital:updated', vital);
              }
            });
            observer.observe({ type: metricName, buffered: true } as PerformanceObserverInit);
            this.observers.push(observer);
          }
        }
      } catch {
        // unsupported
      }
    }
  }

  getCoreWebVitals(): CoreWebVital[] {
    return Array.from(this.coreWebVitals.values());
  }

  getCoreWebVital(name: CoreWebVitalName): CoreWebVital | undefined {
    return this.coreWebVitals.get(name);
  }

  // ==================== Performance Budget ====================

  setBudget(budget: Partial<PerformanceBudget>): void {
    this.budget = { ...this.budget, ...budget };
    this.emit('budget:updated', this.budget);
  }

  getBudget(): PerformanceBudget {
    return { ...this.budget };
  }

  checkBudget(): BudgetCheckResult[] {
    const results: BudgetCheckResult[] = [];

    const lcp = this.coreWebVitals.get('LCP');
    if (lcp) {
      results.push(this.checkMetric('LCP', lcp.value, this.budget.lcp, 'LCP 时间'));
    }

    const fid = this.coreWebVitals.get('FID');
    if (fid) {
      results.push(this.checkMetric('FID', fid.value, this.budget.fid, 'FID 时间'));
    }

    const cls = this.coreWebVitals.get('CLS');
    if (cls) {
      results.push(this.checkMetric('CLS', cls.value, this.budget.cls, 'CLS 值'));
    }

    const inp = this.coreWebVitals.get('INP');
    if (inp) {
      results.push(this.checkMetric('INP', inp.value, this.budget.inp, 'INP 时间'));
    }

    const fcp = this.coreWebVitals.get('FCP');
    if (fcp) {
      results.push(this.checkMetric('FCP', fcp.value, this.budget.fcp, 'FCP 时间'));
    }

    const ttfb = this.coreWebVitals.get('TTFB');
    if (ttfb) {
      results.push(this.checkMetric('TTFB', ttfb.value, this.budget.ttfb, 'TTFB 时间'));
    }

    for (const [, metric] of this.moduleLoads) {
      results.push(
        this.checkMetric(
          `load_${metric.moduleId}`,
          metric.duration,
          this.budget.maxModuleLoadTime,
          `模块 ${metric.moduleId} 加载时间`
        )
      );
    }

    const currentMemory = this.getCurrentMemory();
    if (currentMemory) {
      results.push(
        this.checkMetric(
          'memory',
          currentMemory.usedJSHeapSize,
          this.budget.maxMemoryUsage,
          '内存使用'
        )
      );
    }

    for (const [, bundle] of this.bundleAnalyses) {
      results.push(
        this.checkMetric(
          `bundle_${bundle.moduleId}`,
          bundle.totalSize,
          this.budget.maxBundleSize,
          `模块 ${bundle.moduleId} Bundle 大小`
        )
      );
    }

    return results;
  }

  private checkMetric(
    name: string,
    value: number,
    threshold: number,
    label: string
  ): BudgetCheckResult {
    let status: BudgetCheckStatus;
    let message: string;
    const ratio = threshold > 0 ? value / threshold : 1;

    if (ratio <= 0.8) {
      status = 'pass';
      message = `${label}: ${(value / 1024).toFixed(1)}KB (预算 ${(threshold / 1024).toFixed(1)}KB) ✅`;
    } else if (ratio <= 1) {
      status = 'warn';
      message = `${label}: ${(value / 1024).toFixed(1)}KB (预算 ${(threshold / 1024).toFixed(1)}KB) ⚠️`;
    } else {
      status = 'fail';
      message = `${label}: ${(value / 1024).toFixed(1)}KB 超出预算 ${((value - threshold) / 1024).toFixed(1)}KB ❌`;
    }

    return { metric: name, value, threshold, status, message };
  }

  // ==================== Report Generation ====================

  generateReport(): PerformanceReport {
    const budgetResults = this.checkBudget();
    const ratings: Record<string, 'good' | 'needs-improvement' | 'poor'> = {};

    for (const [name, vital] of this.coreWebVitals) {
      ratings[name] = vital.rating;
    }

    const passedChecks = budgetResults.filter((r) => r.status === 'pass').length;
    const totalChecks = budgetResults.length;
    const overallScore = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

    const recommendations = this.generateRecommendations(budgetResults, ratings);

    return {
      id: generateReportId(),
      generatedAt: Date.now(),
      summary: {
        overallScore,
        ratings,
        passedChecks,
        totalChecks,
      },
      moduleLoads: this.getModuleLoads(),
      renderMetrics: this.getRenderMetrics(),
      memorySnapshots: this.getMemorySnapshots(),
      bundleAnalyses: this.getBundleAnalyses(),
      lazyEffectiveness: this.getLazyEffectiveness(),
      coreWebVitals: this.getCoreWebVitals(),
      budgetResults,
      recommendations,
    };
  }

  private generateRecommendations(
    budgetResults: BudgetCheckResult[],
    ratings: Record<string, 'good' | 'needs-improvement' | 'poor'>
  ): string[] {
    const recommendations: string[] = [];

    const failedChecks = budgetResults.filter((r) => r.status === 'fail');
    const warnedChecks = budgetResults.filter((r) => r.status === 'warn');

    if (ratings['LCP'] === 'poor' || ratings['LCP'] === 'needs-improvement') {
      recommendations.push('LCP 指标需要改善: 考虑优化首屏内容、使用骨架屏或预加载关键资源');
    }
    if (ratings['INP'] === 'poor' || ratings['INP'] === 'needs-improvement') {
      recommendations.push('INP 指标需要改善: 减少主线程阻塞、使用 Web Worker 处理密集计算');
    }
    if (ratings['CLS'] === 'poor' || ratings['CLS'] === 'needs-improvement') {
      recommendations.push('CLS 指标需要改善: 为图像/广告预留空间、避免动态内容插入');
    }
    if (ratings['FID'] === 'poor' || ratings['FID'] === 'needs-improvement') {
      recommendations.push('FID 指标需要改善: 减少 JS 执行时间、优化关键渲染路径');
    }

    const slowModules = this.analyzeModuleLoads().filter((m) => m.status === 'slow');
    if (slowModules.length > 0) {
      recommendations.push(
        `发现 ${slowModules.length} 个慢速加载模块，考虑优化或懒加载: ${slowModules.map((m) => m.moduleId).join(', ')}`
      );
    }

    const slowComponents = this.getSlowComponents();
    if (slowComponents.length > 0) {
      recommendations.push(
        `发现 ${slowComponents.length} 个渲染性能不佳的组件，考虑 React.memo 或 useMemo 优化`
      );
    }

    const lazyIssues = this.analyzeLazyEffectiveness().filter((e) => e.recommendation);
    if (lazyIssues.length > 0) {
      recommendations.push(
        `懒加载优化建议: ${lazyIssues.map((i) => `${i.moduleId}: ${i.recommendation}`).join('; ')}`
      );
    }

    const criticalBundles = this.analyzeBundleSizes().filter((b) => b.status === 'critical');
    if (criticalBundles.length > 0) {
      recommendations.push(
        `发现 ${criticalBundles.length} 个超大 Bundle，考虑进一步拆分: ${criticalBundles.map((b) => b.moduleId).join(', ')}`
      );
    }

    if (failedChecks.length > 0) {
      recommendations.push(`${failedChecks.length} 项预算检查未通过，需要重点关注`);
    }
    if (warnedChecks.length > 0) {
      recommendations.push(`${warnedChecks.length} 项预算检查接近阈值，建议提前优化`);
    }

    return recommendations;
  }

  onReport(callback: (report: PerformanceReport) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private emit(event: string, data: unknown): void {
    if (event === 'report:generated') {
      this.listeners.forEach((cb) => {
        try {
          cb(data as PerformanceReport);
        } catch {
          // ignore
        }
      });
    }
  }

  clear(): void {
    this.moduleLoads.clear();
    this.renderMetrics.clear();
    this.memorySnapshots = [];
    this.coreWebVitals.clear();
    this.bundleAnalyses.clear();
    this.lazyEffectiveness.clear();
  }

  destroy(): void {
    this.stopTracking();
    this.clear();
    this.listeners.clear();
  }
}

export const performanceAnalyzer = PerformanceAnalyzer.getInstance();
