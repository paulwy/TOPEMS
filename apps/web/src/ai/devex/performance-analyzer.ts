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

