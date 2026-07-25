export interface ResourceLoadDetail {
  name: string;
  duration: number;
  size?: number;
  type: 'remoteEntry' | 'chunk' | 'css' | 'other';
}

export interface ModulePerformanceMetrics {
  moduleId: string;
  componentName?: string;
  whiteScreenTime: number;
  fcp: number;
  tti: number;
  remoteEntryLoadTime: number;
  chunkLoadTime: number;
  firstScreenRenderTime: number;
  totalLoadTime: number;
  resources: ResourceLoadDetail[];
  timestamp: number;
  success: boolean;
  error?: string;
}

interface PerformanceNavigation {
  startTime: number;
}

class ModulePerformanceMetricsTracker {
  private metrics: Map<string, ModulePerformanceMetrics> = new Map();
  private navigationMarks: Map<string, PerformanceNavigation> = new Map();
  private listeners: Set<(metrics: ModulePerformanceMetrics) => void> = new Set();

  recordNavigationStart(moduleId: string): void {
    this.navigationMarks.set(moduleId, {
      startTime: performance.now(),
    });
  }

  recordModulePerformance(moduleId: string, metrics: Partial<ModulePerformanceMetrics>): void {
    const existing = this.metrics.get(moduleId);
    const nav = this.navigationMarks.get(moduleId);

    const whiteScreenTime =
      metrics.whiteScreenTime ?? (nav ? performance.now() - nav.startTime : 0);

    const newMetrics: ModulePerformanceMetrics = {
      moduleId,
      componentName: metrics.componentName || existing?.componentName,
      whiteScreenTime,
      fcp: metrics.fcp ?? existing?.fcp ?? 0,
      tti: metrics.tti ?? existing?.tti ?? 0,
      remoteEntryLoadTime: metrics.remoteEntryLoadTime ?? existing?.remoteEntryLoadTime ?? 0,
      chunkLoadTime: metrics.chunkLoadTime ?? existing?.chunkLoadTime ?? 0,
      firstScreenRenderTime: metrics.firstScreenRenderTime ?? existing?.firstScreenRenderTime ?? 0,
      totalLoadTime: metrics.totalLoadTime ?? existing?.totalLoadTime ?? 0,
      resources: metrics.resources || existing?.resources || [],
      timestamp: Date.now(),
      success: metrics.success ?? existing?.success ?? true,
      error: metrics.error ?? existing?.error,
      ...existing,
    };

    this.metrics.set(moduleId, newMetrics);
    this.listeners.forEach((listener) => listener(newMetrics));
  }

  getModulePerformance(moduleId: string): ModulePerformanceMetrics | undefined {
    return this.metrics.get(moduleId);
  }

  getAllModulePerformance(): ModulePerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  getSlowModules(thresholdMs: number): ModulePerformanceMetrics[] {
    return this.getAllModulePerformance().filter((m) => m.totalLoadTime > thresholdMs);
  }

  clearModulePerformance(moduleId?: string): void {
    if (moduleId) {
      this.metrics.delete(moduleId);
      this.navigationMarks.delete(moduleId);
    } else {
      this.metrics.clear();
      this.navigationMarks.clear();
    }
  }

  observeFCP(moduleId: string): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          const fcp = entries[0].startTime;
          this.recordModulePerformance(moduleId, { fcp });
          observer.disconnect();
        }
      });
      observer.observe({ type: 'paint', buffered: true });
    } catch {
      // ignore
    }
  }

  observeTTI(moduleId: string): void {
    if (typeof window === 'undefined') return;

    const checkTTI = () => {
      if (document.readyState === 'complete') {
        const tti = performance.now();
        this.recordModulePerformance(moduleId, { tti });
      } else {
        window.addEventListener(
          'load',
          () => {
            setTimeout(() => {
              this.recordModulePerformance(moduleId, { tti: performance.now() });
            }, 100);
          },
          { once: true }
        );
      }
    };

    if (document.readyState === 'complete') {
      this.recordModulePerformance(moduleId, { tti: performance.now() });
    } else {
      window.addEventListener('load', checkTTI, { once: true });
    }
  }

  collectResourceTiming(moduleId: string, moduleUrlPattern?: RegExp): void {
    if (typeof window === 'undefined' || !('performance' in window)) return;

    try {
      const resources = performance.getEntriesByType('resource');
      const moduleResources: ResourceLoadDetail[] = [];

      resources.forEach((entry) => {
        const res = entry as PerformanceResourceTiming;
        const url = res.name;
        let type: ResourceLoadDetail['type'] = 'other';

        if (url.includes('remoteEntry') || moduleUrlPattern?.test(url)) {
          type = 'remoteEntry';
        } else if (url.endsWith('.css')) {
          type = 'css';
        } else if (url.includes('.chunk.') || url.match(/\d+\.js$/)) {
          type = 'chunk';
        }

        if (moduleUrlPattern?.test(url) || url.includes(moduleId)) {
          moduleResources.push({
            name: url.split('/').pop() || url,
            duration: res.duration,
            size: res.transferSize,
            type,
          });
        }
      });

      const remoteEntryTime = moduleResources
        .filter((r) => r.type === 'remoteEntry')
        .reduce((sum, r) => sum + r.duration, 0);
      const chunkTime = moduleResources
        .filter((r) => r.type === 'chunk')
        .reduce((sum, r) => sum + r.duration, 0);

      this.recordModulePerformance(moduleId, {
        resources: moduleResources,
        remoteEntryLoadTime: remoteEntryTime,
        chunkLoadTime: chunkTime,
      });
    } catch {
      // ignore
    }
  }

  subscribe(callback: (metrics: ModulePerformanceMetrics) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}

export const modulePerformanceMetrics = new ModulePerformanceMetricsTracker();

export default modulePerformanceMetrics;
