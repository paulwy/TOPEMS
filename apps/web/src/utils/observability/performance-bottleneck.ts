import { logger } from '../logger';
import i18n from '@/i18n';

export enum BottleneckType {
  RENDERING = 'rendering',
  NETWORK = 'network',
  JAVASCRIPT = 'javascript',
  MEMORY = 'memory',
  LAYOUT = 'layout',
  PAINT = 'paint',
}

export enum BottleneckSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export interface BottleneckInfo {
  type: BottleneckType;
  severity: BottleneckSeverity;
  description: string;
  metric: string;
  value: number;
  threshold: number;
  unit: string;
  suggestions: string[];
}

export interface WebVitalsMetrics {
  fp?: number;
  fcp?: number;
  lcp?: number;
  cls?: number;
  inp?: number;
  ttfb?: number;
  tbt?: number;
  si?: number;
}

export interface NetworkMetrics {
  totalRequests: number;
  totalTransferSize: number;
  slowRequests: Array<{
    url: string;
    duration: number;
    size: number;
  }>;
  cacheHitRate: number;
}

export interface MemoryMetrics {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
  documents?: number;
  nodes?: number;
  listeners?: number;
}

export interface LongTaskInfo {
  duration: number;
  startTime: number;
  name: string;
  attribution?: string;
}

export interface ComponentRenderInfo {
  componentName: string;
  renderCount: number;
  totalRenderTime: number;
  avgRenderTime: number;
  maxRenderTime: number;
}

export interface PerformanceReport {
  timestamp: number;
  url: string;
  webVitals: WebVitalsMetrics;
  network: NetworkMetrics;
  memory: MemoryMetrics;
  longTasks: LongTaskInfo[];
  bottlenecks: BottleneckInfo[];
  overallScore: number;
  summary: string;
}

export interface BottleneckConfig {
  enabled: boolean;
  thresholds: {
    fcp: number;
    lcp: number;
    cls: number;
    inp: number;
    ttfb: number;
    longTask: number;
    memoryUsage: number;
    networkRequest: number;
  };
  enableWebVitals: boolean;
  enableLongTaskDetection: boolean;
  enableMemoryMonitoring: boolean;
  enableNetworkAnalysis: boolean;
  enableComponentProfiling: boolean;
  autoDetectBottlenecks: boolean;
  reportInterval: number;
  onBottleneckDetected?: (bottleneck: BottleneckInfo) => void;
  onReportGenerated?: (report: PerformanceReport) => void;
}

const defaultConfig: BottleneckConfig = {
  enabled: true,
  thresholds: {
    fcp: 1800,
    lcp: 2500,
    cls: 0.1,
    inp: 200,
    ttfb: 800,
    longTask: 50,
    memoryUsage: 0.8,
    networkRequest: 3000,
  },
  enableWebVitals: true,
  enableLongTaskDetection: true,
  enableMemoryMonitoring: true,
  enableNetworkAnalysis: true,
  enableComponentProfiling: false,
  autoDetectBottlenecks: true,
  reportInterval: 30000,
};

export class PerformanceBottleneckDetector {
  private config: BottleneckConfig;
  private webVitals: WebVitalsMetrics = {};
  private longTasks: LongTaskInfo[] = [];
  private networkMetrics: NetworkMetrics = {
    totalRequests: 0,
    totalTransferSize: 0,
    slowRequests: [],
    cacheHitRate: 0,
  };
  private componentRenderMap: Map<string, ComponentRenderInfo> = new Map();
  private bottlenecks: BottleneckInfo[] = [];
  private observer: PerformanceObserver | null = null;
  private reportTimer: number | null = null;
  private initialized = false;

  constructor(config: Partial<BottleneckConfig> = {}) {
    this.config = {
      ...defaultConfig,
      ...config,
      thresholds: {
        ...defaultConfig.thresholds,
        ...config.thresholds,
      },
    };
  }

  init(): void {
    if (this.initialized || !this.config.enabled) return;

    if (this.config.enableWebVitals) {
      this.observeWebVitals();
    }

    if (this.config.enableLongTaskDetection) {
      this.observeLongTasks();
    }

    if (this.config.enableMemoryMonitoring) {
      this.startMemoryMonitoring();
    }

    if (this.config.enableNetworkAnalysis) {
      this.analyzeNetworkPerformance();
    }

    if (this.config.autoDetectBottlenecks) {
      this.startBottleneckDetection();
    }

    this.initialized = true;
    logger.info(i18n.t('shared.performance-bottleneck.k0'));
  }

  private observeWebVitals(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-paint') {
            this.webVitals.fp = entry.startTime;
          } else if (entry.name === 'first-contentful-paint') {
            this.webVitals.fcp = entry.startTime;
            this.checkWebVitalBottleneck('fcp', entry.startTime);
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
      logger.debug(i18n.t('shared.performance-bottleneck.k1'));
    }

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.webVitals.lcp = lastEntry.startTime;
          this.checkWebVitalBottleneck('lcp', lastEntry.startTime);
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      logger.debug(i18n.t('shared.performance-bottleneck.k2'));
    }

    try {
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          if (!(entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput) {
            clsValue += (entry as PerformanceEntry & { value: number }).value;
          }
        }
        this.webVitals.cls = clsValue;
        this.checkWebVitalBottleneck('cls', clsValue);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      logger.debug(i18n.t('shared.performance-bottleneck.k3'));
    }

    try {
      const inpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const longest = entries.reduce(
          (max, entry) => (entry.duration > max.duration ? entry : max),
          { duration: 0 } as PerformanceEntry
        );
        this.webVitals.inp = longest.duration;
        this.checkWebVitalBottleneck('inp', longest.duration);
      });
      inpObserver.observe({ entryTypes: ['event'] });
    } catch (e) {
      logger.debug(i18n.t('shared.performance-bottleneck.k4'));
    }

    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const nav = navEntries[0] as PerformanceNavigationTiming;
      this.webVitals.ttfb = nav.responseStart;
      this.checkWebVitalBottleneck('ttfb', nav.responseStart);
    }
  }

  private observeLongTasks(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const longTask: LongTaskInfo = {
            duration: entry.duration,
            startTime: entry.startTime,
            name: entry.name,
          };

          this.longTasks.push(longTask);

          if (this.longTasks.length > 100) {
            this.longTasks = this.longTasks.slice(-100);
          }

          if (entry.duration > this.config.thresholds.longTask) {
            this.addBottleneck({
              type: BottleneckType.JAVASCRIPT,
              severity: this.getSeverity(
                entry.duration,
                this.config.thresholds.longTask,
                this.config.thresholds.longTask * 3
              ),
              description: `${i18n.t('shared.performance-bottleneck.k5')}${entry.duration.toFixed(0)}ms`,
              metric: 'longTask',
              value: entry.duration,
              threshold: this.config.thresholds.longTask,
              unit: 'ms',
              suggestions: this.generateLongTaskSuggestions(entry.duration),
            });
          }
        }
      });

      this.observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      logger.debug(i18n.t('shared.performance-bottleneck.k6'));
    }
  }

  private startMemoryMonitoring(): void {
    if (typeof window === 'undefined') return;

    const monitorMemory = () => {
      const memory = this.getMemoryMetrics();
      const usageRatio =
        memory.usedJSHeapSize && memory.jsHeapSizeLimit
          ? memory.usedJSHeapSize / memory.jsHeapSizeLimit
          : 0;

      if (usageRatio > this.config.thresholds.memoryUsage) {
        this.addBottleneck({
          type: BottleneckType.MEMORY,
          severity: this.getSeverity(usageRatio, this.config.thresholds.memoryUsage, 0.95),
          description: `${i18n.t('shared.performance-bottleneck.k7')}${(usageRatio * 100).toFixed(1)}%`,
          metric: 'memoryUsage',
          value: usageRatio,
          threshold: this.config.thresholds.memoryUsage,
          unit: '%',
          suggestions: this.generateMemorySuggestions(),
        });
      }
    };

    setInterval(monitorMemory, 5000);
    monitorMemory();
  }

  private analyzeNetworkPerformance(): void {
    if (typeof performance === 'undefined') return;

    const analyzeResources = () => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      let slowCount = 0;
      let totalSize = 0;

      const slowRequests: NetworkMetrics['slowRequests'] = [];

      resources.forEach((resource) => {
        totalSize += resource.transferSize || 0;

        if (resource.duration > this.config.thresholds.networkRequest) {
          slowCount++;
          slowRequests.push({
            url: resource.name,
            duration: resource.duration,
            size: resource.transferSize || 0,
          });
        }
      });

      this.networkMetrics.totalRequests = resources.length;
      this.networkMetrics.totalTransferSize = totalSize;
      this.networkMetrics.slowRequests = slowRequests.slice(0, 10);

      if (slowCount > 0) {
        this.addBottleneck({
          type: BottleneckType.NETWORK,
          severity: slowCount > 5 ? BottleneckSeverity.HIGH : BottleneckSeverity.MEDIUM,
          description: `${i18n.t('shared.performance-bottleneck.k8')}${slowCount}${i18n.t('shared.performance-bottleneck.k9')}`,
          metric: 'slowRequests',
          value: slowCount,
          threshold: 3,
          unit: 'count',
          suggestions: this.generateNetworkSuggestions(slowRequests),
        });
      }
    };

    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const resourceObserver = new PerformanceObserver(analyzeResources);
        resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (e) {
        // fallback to timeout
      }
    }

    setTimeout(analyzeResources, 3000);
  }

  private startBottleneckDetection(): void {
    this.reportTimer = window.setInterval(() => {
      this.detectBottlenecks();
    }, this.config.reportInterval);
  }

  detectBottlenecks(): BottleneckInfo[] {
    const detected: BottleneckInfo[] = [];

    if (this.webVitals.fcp && this.webVitals.fcp > this.config.thresholds.fcp) {
      detected.push({
        type: BottleneckType.PAINT,
        severity: this.getSeverity(this.webVitals.fcp, this.config.thresholds.fcp, 3000),
        description: `${i18n.t('shared.performance-bottleneck.k10')}${this.webVitals.fcp.toFixed(0)}ms`,
        metric: 'fcp',
        value: this.webVitals.fcp,
        threshold: this.config.thresholds.fcp,
        unit: 'ms',
        suggestions: this.generateFCPSuggestions(),
      });
    }

    if (this.webVitals.lcp && this.webVitals.lcp > this.config.thresholds.lcp) {
      detected.push({
        type: BottleneckType.RENDERING,
        severity: this.getSeverity(this.webVitals.lcp, this.config.thresholds.lcp, 4000),
        description: `${i18n.t('shared.performance-bottleneck.k11')}${this.webVitals.lcp.toFixed(0)}ms`,
        metric: 'lcp',
        value: this.webVitals.lcp,
        threshold: this.config.thresholds.lcp,
        unit: 'ms',
        suggestions: this.generateLCPSuggestions(),
      });
    }

    if (this.webVitals.cls && this.webVitals.cls > this.config.thresholds.cls) {
      detected.push({
        type: BottleneckType.LAYOUT,
        severity: this.getSeverity(this.webVitals.cls, this.config.thresholds.cls, 0.25),
        description: `${i18n.t('shared.performance-bottleneck.k12')}${this.webVitals.cls.toFixed(3)}`,
        metric: 'cls',
        value: this.webVitals.cls,
        threshold: this.config.thresholds.cls,
        unit: '',
        suggestions: this.generateCLSSuggestions(),
      });
    }

    if (this.webVitals.inp && this.webVitals.inp > this.config.thresholds.inp) {
      detected.push({
        type: BottleneckType.JAVASCRIPT,
        severity: this.getSeverity(this.webVitals.inp, this.config.thresholds.inp, 500),
        description: `${i18n.t('shared.performance-bottleneck.k13')}${this.webVitals.inp.toFixed(0)}ms`,
        metric: 'inp',
        value: this.webVitals.inp,
        threshold: this.config.thresholds.inp,
        unit: 'ms',
        suggestions: this.generateINPSuggestions(),
      });
    }

    if (this.webVitals.ttfb && this.webVitals.ttfb > this.config.thresholds.ttfb) {
      detected.push({
        type: BottleneckType.NETWORK,
        severity: this.getSeverity(this.webVitals.ttfb, this.config.thresholds.ttfb, 1800),
        description: `${i18n.t('shared.performance-bottleneck.k14')}${this.webVitals.ttfb.toFixed(0)}ms`,
        metric: 'ttfb',
        value: this.webVitals.ttfb,
        threshold: this.config.thresholds.ttfb,
        unit: 'ms',
        suggestions: this.generateTTFBSuggestions(),
      });
    }

    return detected;
  }

  getWebVitals(): WebVitalsMetrics {
    return { ...this.webVitals };
  }

  getLongTasks(): LongTaskInfo[] {
    return [...this.longTasks];
  }

  getMemoryMetrics(): MemoryMetrics {
    const performanceAny = performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };

    return {
      usedJSHeapSize: performanceAny.memory?.usedJSHeapSize,
      totalJSHeapSize: performanceAny.memory?.totalJSHeapSize,
      jsHeapSizeLimit: performanceAny.memory?.jsHeapSizeLimit,
    };
  }

  getNetworkMetrics(): NetworkMetrics {
    return { ...this.networkMetrics };
  }

  getBottlenecks(): BottleneckInfo[] {
    return [...this.bottlenecks];
  }

  getComponentRenderStats(): ComponentRenderInfo[] {
    return Array.from(this.componentRenderMap.values());
  }

  recordComponentRender(componentName: string, renderTime: number): void {
    const existing = this.componentRenderMap.get(componentName);
    if (existing) {
      existing.renderCount++;
      existing.totalRenderTime += renderTime;
      existing.avgRenderTime = existing.totalRenderTime / existing.renderCount;
      existing.maxRenderTime = Math.max(existing.maxRenderTime, renderTime);
    } else {
      this.componentRenderMap.set(componentName, {
        componentName,
        renderCount: 1,
        totalRenderTime: renderTime,
        avgRenderTime: renderTime,
        maxRenderTime: renderTime,
      });
    }
  }

  generateReport(): PerformanceReport {
    const bottlenecks = this.detectBottlenecks();
    const overallScore = this.calculateOverallScore(bottlenecks);
    const summary = this.generateSummary(bottlenecks, overallScore);

    const report: PerformanceReport = {
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      webVitals: { ...this.webVitals },
      network: { ...this.networkMetrics },
      memory: this.getMemoryMetrics(),
      longTasks: [...this.longTasks],
      bottlenecks,
      overallScore,
      summary,
    };

    if (this.config.onReportGenerated) {
      this.config.onReportGenerated(report);
    }

    return report;
  }

  private calculateOverallScore(bottlenecks: BottleneckInfo[]): number {
    let score = 100;

    const severityPenalty: Record<BottleneckSeverity, number> = {
      [BottleneckSeverity.CRITICAL]: 20,
      [BottleneckSeverity.HIGH]: 10,
      [BottleneckSeverity.MEDIUM]: 5,
      [BottleneckSeverity.LOW]: 2,
    };

    bottlenecks.forEach((b) => {
      score -= severityPenalty[b.severity];
    });

    return Math.max(0, Math.min(100, score));
  }

  private generateSummary(bottlenecks: BottleneckInfo[], score: number): string {
    if (bottlenecks.length === 0) {
      return i18n.t('shared.performance-bottleneck.k0');
    }

    const critical = bottlenecks.filter((b) => b.severity === BottleneckSeverity.CRITICAL).length;
    const high = bottlenecks.filter((b) => b.severity === BottleneckSeverity.HIGH).length;
    const medium = bottlenecks.filter((b) => b.severity === BottleneckSeverity.MEDIUM).length;

    let rating = '';
    if (score >= 90) rating = i18n.t('shared.performance-bottleneck.k1');
    else if (score >= 80) rating = i18n.t('shared.performance-bottleneck.k2');
    else if (score >= 60) rating = i18n.t('shared.performance-bottleneck.k3');
    else rating = i18n.t('shared.performance-bottleneck.k4');

    return `${i18n.t('shared.performance-bottleneck.k15')}${score} (${rating}${i18n.t('shared.performance-bottleneck.k16')}${critical}${i18n.t('shared.performance-bottleneck.k17')}${high}${i18n.t('shared.performance-bottleneck.k18')}${medium}${i18n.t('shared.performance-bottleneck.k19')}`;
  }

  private checkWebVitalBottleneck(metric: string, value: number): void {
    const thresholds = this.config.thresholds;
    const thresholdMap: Record<string, keyof typeof thresholds> = {
      fcp: 'fcp',
      lcp: 'lcp',
      cls: 'cls',
      inp: 'inp',
      ttfb: 'ttfb',
    };

    const thresholdKey = thresholdMap[metric];
    if (!thresholdKey) return;

    const threshold = thresholds[thresholdKey] as number;
    if (value > threshold) {
      logger.debug(
        `[Performance] ${metric}${i18n.t('shared.performance-bottleneck.k20')}${value} > ${threshold}`
      );
    }
  }

  private addBottleneck(bottleneck: BottleneckInfo): void {
    const exists = this.bottlenecks.some(
      (b) => b.metric === bottleneck.metric && b.type === bottleneck.type
    );

    if (!exists) {
      this.bottlenecks.push(bottleneck);

      if (this.config.onBottleneckDetected) {
        this.config.onBottleneckDetected(bottleneck);
      }

      logger.warn(
        `${i18n.t('shared.performance-bottleneck.performance_21')}${bottleneck.severity}${i18n.t('shared.performance-bottleneck.k22')}${bottleneck.description}`
      );
    }
  }

  private getSeverity(
    value: number,
    threshold: number,
    criticalThreshold: number
  ): BottleneckSeverity {
    if (value >= criticalThreshold) {
      return BottleneckSeverity.CRITICAL;
    }
    if (value >= threshold * 1.5) {
      return BottleneckSeverity.HIGH;
    }
    if (value >= threshold) {
      return BottleneckSeverity.MEDIUM;
    }
    return BottleneckSeverity.LOW;
  }

  private generateLongTaskSuggestions(duration: number): string[] {
    const suggestions: string[] = [
      i18n.t('shared.performance-bottleneck.k5'),
      i18n.t('shared.performance-bottleneck.k6'),
      i18n.t('shared.performance-bottleneck.k23'),
    ];

    if (duration > 200) {
      suggestions.push(i18n.t('shared.performance-bottleneck.k7'));
      suggestions.push(i18n.t('shared.performance-bottleneck.k8'));
    }

    return suggestions;
  }

  private generateMemorySuggestions(): string[] {
    return [
      i18n.t('shared.performance-bottleneck.k9'),
      i18n.t('shared.performance-bottleneck.k10'),
      i18n.t('shared.performance-bottleneck.k11'),
      i18n.t('shared.performance-bottleneck.k12'),
      i18n.t('shared.performance-bottleneck.k13'),
      i18n.t('shared.performance-bottleneck.k14'),
    ];
  }

  private generateNetworkSuggestions(slowRequests: NetworkMetrics['slowRequests']): string[] {
    const suggestions: string[] = [
      i18n.t('shared.performance-bottleneck.k15'),
      i18n.t('shared.performance-bottleneck.k16'),
      i18n.t('shared.performance-bottleneck.gzipbrotli_17'),
      i18n.t('shared.performance-bottleneck.k18'),
    ];

    if (slowRequests.some((r) => r.duration > 5000)) {
      suggestions.push(i18n.t('shared.performance-bottleneck.cdn_19'));
      suggestions.push(i18n.t('shared.performance-bottleneck.k20'));
    }

    return suggestions;
  }

  private generateFCPSuggestions(): string[] {
    return [
      i18n.t('shared.performance-bottleneck.k21'),
      i18n.t('shared.performance-bottleneck.preload_22'),
      i18n.t('shared.performance-bottleneck.css_23'),
      i18n.t('shared.performance-bottleneck.javascript_24'),
      i18n.t('shared.performance-bottleneck.k25'),
      i18n.t('shared.performance-bottleneck.swapfoit_24'),
    ];
  }

  private generateLCPSuggestions(): string[] {
    return [
      i18n.t('shared.performance-bottleneck.k26'),
      '为 LCP 图片添加 fetchpriority="high"',
      i18n.t('shared.performance-bottleneck.k27'),
      i18n.t('shared.performance-bottleneck.k28'),
      i18n.t('shared.performance-bottleneck.cdn_29'),
      i18n.t('shared.performance-bottleneck.ttfb_30'),
      i18n.t('shared.performance-bottleneck.k31'),
    ];
  }

  private generateCLSSuggestions(): string[] {
    return [
      i18n.t('shared.performance-bottleneck.k32'),
      i18n.t('shared.performance-bottleneck.k33'),
      i18n.t('shared.performance-bottleneck.k34'),
      i18n.t('shared.performance-bottleneck.k35'),
      i18n.t('shared.performance-bottleneck.k36'),
      i18n.t('shared.performance-bottleneck.k37'),
    ];
  }

  private generateINPSuggestions(): string[] {
    return [
      i18n.t('shared.performance-bottleneck.k38'),
      i18n.t('shared.performance-bottleneck.k39'),
      i18n.t('shared.performance-bottleneck.k40'),
      i18n.t('shared.performance-bottleneck.k41'),
      i18n.t('shared.performance-bottleneck.dom_42'),
      i18n.t('shared.performance-bottleneck.k43'),
    ];
  }

  private generateTTFBSuggestions(): string[] {
    return [
      i18n.t('shared.performance-bottleneck.k44'),
      i18n.t('shared.performance-bottleneck.cdn_45'),
      i18n.t('shared.performance-bottleneck.k46'),
      i18n.t('shared.performance-bottleneck.k47'),
      i18n.t('shared.performance-bottleneck.k48'),
      i18n.t('shared.performance-bottleneck.k49'),
      i18n.t('shared.performance-bottleneck.k50'),
    ];
  }

  setConfig(config: Partial<BottleneckConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      thresholds: {
        ...this.config.thresholds,
        ...config.thresholds,
      },
    };
  }

  getConfig(): BottleneckConfig {
    return {
      ...this.config,
      thresholds: { ...this.config.thresholds },
    };
  }

  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.reportTimer !== null) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }

    this.webVitals = {};
    this.longTasks = [];
    this.bottlenecks = [];
    this.componentRenderMap.clear();
    this.initialized = false;
  }
}

const performanceBottleneckDetector = new PerformanceBottleneckDetector();
export default performanceBottleneckDetector;
