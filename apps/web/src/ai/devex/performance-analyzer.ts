import i18n from '@/i18n';
export interface PerfSnapshot {
  timestamp: number;
  fps: number;
  memory: number;
  cpu: number;
  renderTime: number;
  scriptTime: number;
  paintTime: number;
}

export type PerfIssueType = 'MemoryLeak' | 'LayoutThrash' | 'LongTask' | 'ExcessiveRenders';

export interface PerfIssue {
  id: string;
  type: PerfIssueType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  description: string;
  suggestion: string;
  timestamp: number;
}

export interface PerformanceBudget {
  maxFpsDrop: number;
  maxMemoryUsage: number;
  maxCpuUsage: number;
  maxRenderTime: number;
  maxScriptTime: number;
  maxPaintTime: number;
}

export interface TrendPoint {
  timestamp: number;
  fps: number;
  memory: number;
  cpu: number;
}

export type BudgetCategory = 'fps' | 'memory' | 'cpu' | 'render' | 'script' | 'paint';

export interface BudgetUsage {
  category: BudgetCategory;
  current: number;
  limit: number;
  percentage: number;
  status: 'pass' | 'warn' | 'fail';
}

const DEFAULT_BUDGET: PerformanceBudget = {
  maxFpsDrop: 10,
  maxMemoryUsage: 50 * 1024 * 1024,
  maxCpuUsage: 80,
  maxRenderTime: 16,
  maxScriptTime: 50,
  maxPaintTime: 10,
};

const MAX_SNAPSHOTS = 120;

function generateId(): string {
  return `perf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export class PerformanceAnalyzerV59 {
  private static instance: PerformanceAnalyzerV59;

  private snapshots: PerfSnapshot[] = [];
  private issues: PerfIssue[] = [];
  private budget: PerformanceBudget = { ...DEFAULT_BUDGET };
  private isProfiling = false;
  private profilingInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private lastSnapshot: PerfSnapshot | null = null;
  private frameCount = 0;
  private lastFrameTime = 0;
  private fpsFrames: number[] = [];
  private rafId: number | null = null;

  private constructor() {}

  static getInstance(): PerformanceAnalyzerV59 {
    if (!PerformanceAnalyzerV59.instance) {
      PerformanceAnalyzerV59.instance = new PerformanceAnalyzerV59();
    }
    return PerformanceAnalyzerV59.instance;
  }

  startProfiling(intervalMs = 1000): void {
    if (this.isProfiling) return;
    this.isProfiling = true;

    this.profilingInterval = setInterval(() => {
      this.takeSnapshot();
    }, intervalMs);

    this.measureFps();
    this.emit('profiling:started', null);
  }

  stopProfiling(): void {
    this.isProfiling = false;

    if (this.profilingInterval) {
      clearInterval(this.profilingInterval);
      this.profilingInterval = null;
    }

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.emit('profiling:stopped', null);
  }

  isActive(): boolean {
    return this.isProfiling;
  }

  private measureFps(): void {
    if (!this.isProfiling) return;

    const tick = (now: number) => {
      if (!this.isProfiling) return;

      this.frameCount++;
      if (this.lastFrameTime > 0) {
        const delta = now - this.lastFrameTime;
        this.fpsFrames.push(1000 / delta);
        if (this.fpsFrames.length > 60) {
          this.fpsFrames = this.fpsFrames.slice(-60);
        }
      }
      this.lastFrameTime = now;

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  takeSnapshot(): PerfSnapshot {
    const memory = this.getMemoryUsage();
    const cpu = this.getCpuUsage();
    const fps = this.getCurrentFps();

    const snapshot: PerfSnapshot = {
      timestamp: Date.now(),
      fps,
      memory,
      cpu,
      renderTime: this.measureRenderTime(),
      scriptTime: this.measureScriptTime(),
      paintTime: this.measurePaintTime(),
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > MAX_SNAPSHOTS) {
      this.snapshots = this.snapshots.slice(-MAX_SNAPSHOTS);
    }

    this.lastSnapshot = snapshot;
    this.emit('snapshot:taken', snapshot);

    this.detectIssues(snapshot);

    return snapshot;
  }

  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const perf = performance as Performance & { memory?: { usedJSHeapSize: number } };
      return perf.memory?.usedJSHeapSize || 0;
    }
    return 0;
  }

  private getCpuUsage(): number {
    if (typeof performance !== 'undefined' && 'cpu' in performance) {
      const perf = performance as Performance & { cpu?: { usage?: number } };
      return perf.cpu?.usage || 0;
    }
    return 0;
  }

  private getCurrentFps(): number {
    if (this.fpsFrames.length === 0) return 60;
    const recent = this.fpsFrames.slice(-10);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    return Math.round(avg);
  }

  private measureRenderTime(): number {
    const start = performance.now();
    const el = document.createElement('div');
    el.style.width = '1px';
    el.style.height = '1px';
    document.body.appendChild(el);
    const time = performance.now() - start;
    document.body.removeChild(el);
    return time;
  }

  private measureScriptTime(): number {
    const start = performance.now();
    let sum = 0;
    for (let i = 0; i < 1000; i++) {
      sum += Math.sqrt(i);
    }
    return performance.now() - start;
  }

  private measurePaintTime(): number {
    const start = performance.now();
    document.body.style.transform = 'translateZ(0)';
    requestAnimationFrame(() => {
      document.body.style.transform = '';
    });
    return performance.now() - start;
  }

  private detectIssues(snapshot: PerfSnapshot): void {
    if (this.lastSnapshot) {
      const memoryGrowth = snapshot.memory - this.lastSnapshot.memory;
      if (memoryGrowth > 10 * 1024 * 1024) {
        this.addIssue({
          type: 'MemoryLeak',
          severity: memoryGrowth > 50 * 1024 * 1024 ? 'critical' : 'high',
          location: 'heap',
          description: `${i18n.t('ai.performance-analyzer.k0')}${(memoryGrowth / 1024 / 1024).toFixed(1)}${i18n.t('ai.performance-analyzer.mb_1')}`,
          suggestion: i18n.t('ai.performance-analyzer.k0'),
        });
      }

      const fpsDrop = this.lastSnapshot.fps - snapshot.fps;
      if (fpsDrop > this.budget.maxFpsDrop) {
        this.addIssue({
          type: 'LongTask',
          severity: 'medium',
          location: 'main-thread',
          description: `${i18n.t('ai.performance-analyzer.fps_2')}${fpsDrop.toFixed(0)}${i18n.t('ai.performance-analyzer.k3')}`,
          suggestion: i18n.t('ai.performance-analyzer.k1'),
        });
      }
    }

    if (snapshot.cpu > this.budget.maxCpuUsage) {
      this.addIssue({
        type: 'ExcessiveRenders',
        severity: snapshot.cpu > 95 ? 'critical' : 'high',
        location: 'cpu',
        description: `${i18n.t('ai.performance-analyzer.cpu_4')}${snapshot.cpu.toFixed(1)}${i18n.t('ai.performance-analyzer.k5')}${this.budget.maxCpuUsage}%`,
        suggestion: i18n.t('ai.performance-analyzer.k2'),
      });
    }

    if (snapshot.renderTime > this.budget.maxRenderTime) {
      this.addIssue({
        type: 'LayoutThrash',
        severity: 'medium',
        location: 'render',
        description: `${i18n.t('ai.performance-analyzer.k6')}${snapshot.renderTime.toFixed(1)}${i18n.t('ai.performance-analyzer.ms_7')}${this.budget.maxRenderTime}ms`,
        suggestion: i18n.t('ai.performance-analyzer.k3'),
      });
    }

    if (snapshot.scriptTime > this.budget.maxScriptTime) {
      this.addIssue({
        type: 'LongTask',
        severity: 'medium',
        location: 'script',
        description: `${i18n.t('ai.performance-analyzer.k8')}${snapshot.scriptTime.toFixed(1)}${i18n.t('ai.performance-analyzer.ms_9')}`,
        suggestion: i18n.t('ai.performance-analyzer.k4'),
      });
    }
  }

  private addIssue(issue: Omit<PerfIssue, 'id' | 'timestamp'>): void {
    const fullIssue: PerfIssue = {
      ...issue,
      id: generateId(),
      timestamp: Date.now(),
    };

    this.issues.push(fullIssue);
    if (this.issues.length > 200) {
      this.issues = this.issues.slice(-200);
    }

    this.emit('issue:detected', fullIssue);
  }

  analyzePerformance(): {
    score: number;
    fps: { current: number; avg: number; min: number; max: number };
    memory: { current: number; trend: 'stable' | 'increasing' | 'decreasing' };
    cpu: { current: number; avg: number };
    issues: PerfIssue[];
  } {
    const recent = this.snapshots.slice(-30);
    const fpsValues = recent.map((s) => s.fps);
    const memoryValues = recent.map((s) => s.memory);
    const cpuValues = recent.map((s) => s.cpu);

    const currentFps = this.lastSnapshot?.fps || 0;
    const avgFps =
      fpsValues.length > 0 ? fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length : 0;
    const minFps = fpsValues.length > 0 ? Math.min(...fpsValues) : 0;
    const maxFps = fpsValues.length > 0 ? Math.max(...fpsValues) : 0;

    const currentMemory = this.lastSnapshot?.memory || 0;
    let memoryTrend: 'stable' | 'increasing' | 'decreasing' = 'stable';
    if (memoryValues.length >= 5) {
      const recent5 = memoryValues.slice(-5);
      const first = recent5[0];
      const last = recent5[recent5.length - 1];
      const diff = last - first;
      const threshold = 5 * 1024 * 1024;
      if (diff > threshold) memoryTrend = 'increasing';
      else if (diff < -threshold) memoryTrend = 'decreasing';
    }

    const currentCpu = this.lastSnapshot?.cpu || 0;
    const avgCpu =
      cpuValues.length > 0 ? cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length : 0;

    let score = 100;
    if (avgFps < 55) score -= 20;
    if (avgFps < 30) score -= 20;
    if (avgCpu > 70) score -= 15;
    if (avgCpu > 90) score -= 15;
    if (memoryTrend === 'increasing') score -= 10;
    if (this.issues.some((i) => i.severity === 'critical')) score -= 15;
    if (this.issues.filter((i) => i.severity === 'high').length > 2) score -= 10;
    score = Math.max(0, Math.min(100, score));

    return {
      score,
      fps: { current: currentFps, avg: avgFps, min: minFps, max: maxFps },
      memory: { current: currentMemory, trend: memoryTrend },
      cpu: { current: currentCpu, avg: avgCpu },
      issues: [...this.issues],
    };
  }

  getIssues(type?: PerfIssueType, severity?: PerfIssue['severity']): PerfIssue[] {
    let result = [...this.issues];
    if (type) result = result.filter((i) => i.type === type);
    if (severity) result = result.filter((i) => i.severity === severity);
    result.sort((a, b) => b.timestamp - a.timestamp);
    return result;
  }

  clearIssues(): void {
    this.issues = [];
    this.emit('issues:cleared', null);
  }

  getBudgetUsage(): BudgetUsage[] {
    const results: BudgetUsage[] = [];
    const snapshot = this.lastSnapshot;

    if (!snapshot) return results;

    const fpsDrops = this.budget.maxFpsDrop;
    const fpsUsage = Math.max(0, 60 - snapshot.fps);
    results.push({
      category: 'fps',
      current: snapshot.fps,
      limit: 60 - fpsDrops,
      percentage: (fpsUsage / fpsDrops) * 100,
      status:
        snapshot.fps >= 60 - fpsDrops
          ? 'pass'
          : snapshot.fps >= 60 - fpsDrops * 2
            ? 'warn'
            : 'fail',
    });

    results.push({
      category: 'memory',
      current: snapshot.memory,
      limit: this.budget.maxMemoryUsage,
      percentage: (snapshot.memory / this.budget.maxMemoryUsage) * 100,
      status: this.getStatus(snapshot.memory, this.budget.maxMemoryUsage),
    });

    results.push({
      category: 'cpu',
      current: snapshot.cpu,
      limit: this.budget.maxCpuUsage,
      percentage: (snapshot.cpu / this.budget.maxCpuUsage) * 100,
      status: this.getStatus(snapshot.cpu, this.budget.maxCpuUsage),
    });

    results.push({
      category: 'render',
      current: snapshot.renderTime,
      limit: this.budget.maxRenderTime,
      percentage: (snapshot.renderTime / this.budget.maxRenderTime) * 100,
      status: this.getStatus(snapshot.renderTime, this.budget.maxRenderTime),
    });

    results.push({
      category: 'script',
      current: snapshot.scriptTime,
      limit: this.budget.maxScriptTime,
      percentage: (snapshot.scriptTime / this.budget.maxScriptTime) * 100,
      status: this.getStatus(snapshot.scriptTime, this.budget.maxScriptTime),
    });

    results.push({
      category: 'paint',
      current: snapshot.paintTime,
      limit: this.budget.maxPaintTime,
      percentage: (snapshot.paintTime / this.budget.maxPaintTime) * 100,
      status: this.getStatus(snapshot.paintTime, this.budget.maxPaintTime),
    });

    return results;
  }

  private getStatus(current: number, limit: number): 'pass' | 'warn' | 'fail' {
    const ratio = current / limit;
    if (ratio <= 0.8) return 'pass';
    if (ratio <= 1) return 'warn';
    return 'fail';
  }

  getTrend(durationMs = 30000): TrendPoint[] {
    const cutoff = Date.now() - durationMs;
    return this.snapshots
      .filter((s) => s.timestamp >= cutoff)
      .map((s) => ({
        timestamp: s.timestamp,
        fps: s.fps,
        memory: s.memory,
        cpu: s.cpu,
      }));
  }

  optimizeSuggestions(): Array<{
    category: BudgetCategory;
    suggestion: string;
    priority: 'low' | 'medium' | 'high';
  }> {
    const suggestions: Array<{
      category: BudgetCategory;
      suggestion: string;
      priority: 'low' | 'medium' | 'high';
    }> = [];
    const budgetUsage = this.getBudgetUsage();

    for (const usage of budgetUsage) {
      if (usage.status === 'fail') {
        suggestions.push({
          category: usage.category,
          suggestion: this.getSuggestionForCategory(usage.category, usage.current, usage.limit),
          priority: 'high',
        });
      } else if (usage.status === 'warn') {
        suggestions.push({
          category: usage.category,
          suggestion: this.getSuggestionForCategory(usage.category, usage.current, usage.limit),
          priority: 'medium',
        });
      }
    }

    const criticalIssues = this.getIssues(undefined, 'critical');
    for (const issue of criticalIssues) {
      if (!suggestions.some((s) => s.suggestion === issue.suggestion)) {
        suggestions.push({
          category: this.mapIssueTypeToBudgetCategory(issue.type),
          suggestion: issue.suggestion,
          priority: 'high',
        });
      }
    }

    return suggestions;
  }

  private getSuggestionForCategory(
    category: BudgetCategory,
    current: number,
    limit: number
  ): string {
    const overage = current - limit;
    const overagePct = limit > 0 ? ((overage / limit) * 100).toFixed(1) : '0';

    const suggestions: Record<BudgetCategory, string> = {
      fps: `${i18n.t('ai.performance-analyzer.fps_10')}${overagePct}${i18n.t('ai.performance-analyzer.k11')}`,
      memory: `${i18n.t('ai.performance-analyzer.k12')}${overagePct}${i18n.t('ai.performance-analyzer.k13')}`,
      cpu: `${i18n.t('ai.performance-analyzer.cpu_14')}${overagePct}${i18n.t('ai.performance-analyzer.k15')}`,
      render: `${i18n.t('ai.performance-analyzer.k16')}${overagePct}${i18n.t('ai.performance-analyzer.k17')}`,
      script: `${i18n.t('ai.performance-analyzer.k18')}${overagePct}${i18n.t('ai.performance-analyzer.webworker_19')}`,
      paint: `${i18n.t('ai.performance-analyzer.k20')}${overagePct}${i18n.t('ai.performance-analyzer.cssdom_21')}`,
    };

    return suggestions[category];
  }

  private mapIssueTypeToBudgetCategory(type: PerfIssueType): BudgetCategory {
    const map: Record<PerfIssueType, BudgetCategory> = {
      MemoryLeak: 'memory',
      LayoutThrash: 'render',
      LongTask: 'script',
      ExcessiveRenders: 'cpu',
    };
    return map[type];
  }

  setBudget(budget: Partial<PerformanceBudget>): void {
    this.budget = { ...this.budget, ...budget };
    this.emit('budget:updated', this.budget);
  }

  getBudget(): PerformanceBudget {
    return { ...this.budget };
  }

  getSnapshots(): PerfSnapshot[] {
    return [...this.snapshots];
  }

  getLatestSnapshot(): PerfSnapshot | null {
    return this.lastSnapshot;
  }

  clearSnapshots(): void {
    this.snapshots = [];
    this.lastSnapshot = null;
    this.fpsFrames = [];
    this.emit('snapshots:cleared', null);
  }

  on<T = unknown>(event: string, callback: (data: T) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as (data: unknown) => void);
    return () => this.off(event, callback);
  }

  off<T = unknown>(event: string, callback: (data: T) => void): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback as (data: unknown) => void);
    }
  }

  private emit(event: string, data: unknown): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(data);
        } catch {
          // ignore
        }
      });
    }
  }

  destroy(): void {
    this.stopProfiling();
    this.snapshots = [];
    this.issues = [];
    this.lastSnapshot = null;
    this.fpsFrames = [];
    this.listeners.clear();
  }
}

export const performanceAnalyzerV59 = PerformanceAnalyzerV59.getInstance();
