export interface ModuleLoadMetrics {
  moduleName: string;
  componentName: string;
  remoteEntryLoadTime: number;
  moduleLoadTime: number;
  firstRenderTime: number;
  totalTime: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

interface PerformanceMark {
  name: string;
  startTime: number;
}

class MicroFrontendPerformance {
  private metrics: Map<string, ModuleLoadMetrics> = new Map();
  private marks: Map<string, PerformanceMark> = new Map();
  private listeners: Set<(metrics: ModuleLoadMetrics) => void> = new Set();

  startMark(name: string): void {
    this.marks.set(name, {
      name,
      startTime: performance.now(),
    });
  }

  endMark(name: string): number {
    const mark = this.marks.get(name);
    if (!mark) return 0;
    const duration = performance.now() - mark.startTime;
    this.marks.delete(name);
    return duration;
  }

  recordModuleLoad(
    moduleName: string,
    componentName: string,
    data: Partial<ModuleLoadMetrics>
  ): void {
    const key = `${moduleName}/${componentName}`;
    const existing = this.metrics.get(key);
    const metrics: ModuleLoadMetrics = {
      moduleName,
      componentName,
      remoteEntryLoadTime: data.remoteEntryLoadTime || 0,
      moduleLoadTime: data.moduleLoadTime || 0,
      firstRenderTime: data.firstRenderTime || 0,
      totalTime: data.totalTime || 0,
      timestamp: Date.now(),
      success: data.success ?? true,
      error: data.error,
      ...existing,
    };
    this.metrics.set(key, metrics);
    this.listeners.forEach((listener) => listener(metrics));
  }

  getModuleMetrics(moduleName: string, componentName: string): ModuleLoadMetrics | undefined {
    return this.metrics.get(`${moduleName}/${componentName}`);
  }

  getAllMetrics(): ModuleLoadMetrics[] {
    return Array.from(this.metrics.values());
  }

  getAverageLoadTime(moduleName?: string): { avg: number; count: number } {
    const metrics = moduleName
      ? this.getAllMetrics().filter((m) => m.moduleName === moduleName)
      : this.getAllMetrics();
    if (metrics.length === 0) return { avg: 0, count: 0 };
    const total = metrics.reduce((sum, m) => sum + m.totalTime, 0);
    return { avg: total / metrics.length, count: metrics.length };
  }

  subscribe(callback: (metrics: ModuleLoadMetrics) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  reportToConsole(): void {
    const allMetrics = this.getAllMetrics();
    if (allMetrics.length === 0) return;

    const tableData = allMetrics.map((m) => ({
      Module: m.moduleName,
      Component: m.componentName,
      'Entry Load (ms)': m.remoteEntryLoadTime.toFixed(2),
      'Module Load (ms)': m.moduleLoadTime.toFixed(2),
      'First Render (ms)': m.firstRenderTime.toFixed(2),
      'Total (ms)': m.totalTime.toFixed(2),
      Success: m.success ? '✓' : '✗',
    }));

    console.info('[MicroFrontend Performance]', tableData);
  }

  clear(): void {
    this.metrics.clear();
    this.marks.clear();
  }
}

export const microFrontendPerf = new MicroFrontendPerformance();

export default microFrontendPerf;
