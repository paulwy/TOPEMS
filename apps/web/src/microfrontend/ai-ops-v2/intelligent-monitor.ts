/**
 * V50.0 微前端 AI 运维 - 智能监控模块
 * 提供实时监控、趋势分析、预警预测能力
 */

export interface MonitorMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags: Record<string, string>;
  moduleId?: string;
}

export interface MonitorThreshold {
  metricName: string;
  warning: number;
  critical: number;
  enabled: boolean;
  description?: string;
}

export interface MonitorAlert {
  id: string;
  metricName: string;
  metricValue: number;
  threshold: MonitorThreshold;
  level: 'info' | 'warning' | 'critical';
  status: 'active' | 'resolved' | 'acknowledged';
  timestamp: number;
  resolvedAt?: number;
  acknowledgedBy?: string;
  message: string;
  moduleId?: string;
}

export interface MonitorTrend {
  metricName: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  changeRate: number;
  confidence: number;
  forecast: number[];
  forecastConfidence: number[];
  period: number;
}

export interface MonitorDashboard {
  totalMetrics: number;
  activeAlerts: number;
  criticalAlerts: number;
  healthyModules: number;
  unhealthyModules: number;
  uptime: number;
  lastUpdated: number;
}

export interface IntelligentMonitorConfig {
  collectionInterval: number;
  aggregationWindow: number;
  retentionPeriod: number;
  predictionEnabled: boolean;
  predictionHorizon: number;
  autoBaseline: boolean;
  alertingEnabled: boolean;
  maxAlerts: number;
}

const DEFAULT_CONFIG: IntelligentMonitorConfig = {
  collectionInterval: 60000,
  aggregationWindow: 300000,
  retentionPeriod: 3600000,
  predictionEnabled: true,
  predictionHorizon: 3600000,
  autoBaseline: true,
  alertingEnabled: true,
  maxAlerts: 1000,
};

export class IntelligentMonitor {
  private config: IntelligentMonitorConfig;
  private metrics: Map<string, MonitorMetric[]> = new Map();
  private thresholds: Map<string, MonitorThreshold> = new Map();
  private alerts: MonitorAlert[] = [];
  private trends: Map<string, MonitorTrend> = new Map();
  private collectionTimers: Map<string, NodeJS.Timeout> = new Map();
  private alertListeners: Set<(alert: MonitorAlert) => void> = new Set();
  private metricListeners: Set<(metric: MonitorMetric) => void> = new Set();

  constructor(config: Partial<IntelligentMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  collectMetric(metric: Omit<MonitorMetric, 'id' | 'timestamp'>): MonitorMetric {
    const fullMetric: MonitorMetric = {
      ...metric,
      id: `metric-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      timestamp: Date.now(),
    };

    const key = this.getMetricKey(metric.name, metric.moduleId);
    const history = this.metrics.get(key) || [];
    history.push(fullMetric);

    // 保留最近的数据点
    const maxDataPoints = Math.ceil(this.config.retentionPeriod / this.config.collectionInterval);
    if (history.length > maxDataPoints) {
      history.shift();
    }

    this.metrics.set(key, history);

    // 检查阈值
    if (this.config.alertingEnabled) {
      this.checkThreshold(fullMetric);
    }

    // 通知监听器
    this.metricListeners.forEach((listener) => listener(fullMetric));

    return fullMetric;
  }

  collectBatch(metrics: Array<Omit<MonitorMetric, 'id' | 'timestamp'>>): MonitorMetric[] {
    return metrics.map((m) => this.collectMetric(m));
  }

  setThreshold(threshold: MonitorThreshold): void {
    this.thresholds.set(threshold.metricName, threshold);
  }

  removeThreshold(metricName: string): boolean {
    return this.thresholds.delete(metricName);
  }

  getThreshold(metricName: string): MonitorThreshold | undefined {
    return this.thresholds.get(metricName);
  }

  getAllThresholds(): MonitorThreshold[] {
    return Array.from(this.thresholds.values());
  }

  getMetricHistory(
    metricName: string,
    options?: {
      moduleId?: string;
      since?: number;
      until?: number;
      limit?: number;
    }
  ): MonitorMetric[] {
    const key = this.getMetricKey(metricName, options?.moduleId);
    let history = this.metrics.get(key) || [];

    if (options?.since) {
      history = history.filter((m) => m.timestamp >= options.since!);
    }
    if (options?.until) {
      history = history.filter((m) => m.timestamp <= options.until!);
    }
    if (options?.limit) {
      history = history.slice(-options.limit);
    }

    return history;
  }

  analyzeTrend(metricName: string, moduleId?: string): MonitorTrend {
    const key = this.getMetricKey(metricName, moduleId);
    const history = this.metrics.get(key) || [];

    if (history.length < 3) {
      return {
        metricName,
        direction: 'stable',
        changeRate: 0,
        confidence: 0,
        forecast: [],
        forecastConfidence: [],
        period: 0,
      };
    }

    // 简单线性回归计算趋势
    const values = history.map((m) => m.value);
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const meanY = sumY / n;

    const direction = slope > 0.01 ? 'increasing' : slope < -0.01 ? 'decreasing' : 'stable';
    const changeRate = slope;

    // 计算预测值
    const forecast: number[] = [];
    const forecastConfidence: number[] = [];
    if (this.config.predictionEnabled) {
      for (let i = 1; i <= 5; i++) {
        const predictedValue = meanY + slope * (n + i - 1);
        forecast.push(predictedValue);
        forecastConfidence.push(Math.max(0, 1 - i * 0.1)); // 置信度递减
      }
    }

    // 计算 R² 作为置信度
    const predictions = values.map((_, i) => meanY + slope * i);
    const ssRes = values.reduce((sum, y, i) => sum + Math.pow(y - predictions[i], 2), 0);
    const ssTot = values.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
    const confidence = ssTot > 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 0;

    const trend: MonitorTrend = {
      metricName,
      direction,
      changeRate,
      confidence,
      forecast,
      forecastConfidence,
      period: history.length * this.config.collectionInterval,
    };

    this.trends.set(key, trend);
    return trend;
  }

  getActiveAlerts(options?: {
    moduleId?: string;
    level?: MonitorAlert['level'];
    limit?: number;
  }): MonitorAlert[] {
    let activeAlerts = this.alerts.filter((a) => a.status === 'active');

    if (options?.moduleId) {
      activeAlerts = activeAlerts.filter((a) => a.moduleId === options.moduleId);
    }
    if (options?.level) {
      activeAlerts = activeAlerts.filter((a) => a.level === options.level);
    }

    activeAlerts.sort((a, b) => b.timestamp - a.timestamp);

    if (options?.limit) {
      activeAlerts = activeAlerts.slice(0, options.limit);
    }

    return activeAlerts;
  }

  acknowledgeAlert(id: string, acknowledgedBy?: string): boolean {
    const alert = this.alerts.find((a) => a.id === id);
    if (alert && alert.status === 'active') {
      alert.status = 'acknowledged';
      alert.acknowledgedBy = acknowledgedBy;
      return true;
    }
    return false;
  }

  resolveAlert(id: string): boolean {
    const alert = this.alerts.find((a) => a.id === id);
    if (alert && alert.status !== 'resolved') {
      alert.status = 'resolved';
      alert.resolvedAt = Date.now();
      return true;
    }
    return false;
  }

  getDashboard(moduleId?: string): MonitorDashboard {
    let totalMetrics = 0;
    const healthyModules = new Set<string>();
    const unhealthyModules = new Set<string>();

    this.metrics.forEach((history, key) => {
      totalMetrics += history.length;
      const parts = key.split(':');
      if (parts[1]) {
        const hasAlert = this.alerts.some(
          (a) => a.moduleId === parts[1] && a.status === 'active' && a.level === 'critical'
        );
        if (hasAlert) {
          unhealthyModules.add(parts[1]);
        } else {
          healthyModules.add(parts[1]);
        }
      }
    });

    const activeAlerts = this.alerts.filter((a) => a.status === 'active');
    const criticalAlerts = activeAlerts.filter((a) => a.level === 'critical');

    return {
      totalMetrics,
      activeAlerts: activeAlerts.length,
      criticalAlerts: criticalAlerts.length,
      healthyModules: healthyModules.size - unhealthyModules.size,
      unhealthyModules: unhealthyModules.size,
      uptime: this.calculateUptime(),
      lastUpdated: Date.now(),
    };
  }

  subscribeToAlerts(callback: (alert: MonitorAlert) => void): () => void {
    this.alertListeners.add(callback);
    return () => this.alertListeners.delete(callback);
  }

  subscribeToMetrics(callback: (metric: MonitorMetric) => void): () => void {
    this.metricListeners.add(callback);
    return () => this.metricListeners.delete(callback);
  }

  getConfig(): IntelligentMonitorConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<IntelligentMonitorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  clear(): void {
    this.metrics.clear();
    this.alerts = [];
    this.trends.clear();
    this.collectionTimers.forEach((timer) => clearInterval(timer));
    this.collectionTimers.clear();
  }

  private getMetricKey(metricName: string, moduleId?: string): string {
    return moduleId ? `${moduleId}:${metricName}` : metricName;
  }

  private checkThreshold(metric: MonitorMetric): void {
    const threshold = this.thresholds.get(metric.name);
    if (!threshold || !threshold.enabled) return;

    let level: MonitorAlert['level'] | null = null;

    if (metric.value >= threshold.critical) {
      level = 'critical';
    } else if (metric.value >= threshold.warning) {
      level = 'warning';
    }

    if (level) {
      const alert: MonitorAlert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        metricName: metric.name,
        metricValue: metric.value,
        threshold,
        level,
        status: 'active',
        timestamp: Date.now(),
        message: `${metric.name} ${level === 'critical' ? '严重' : '警告'}: ${metric.value}${metric.unit}`,
        moduleId: metric.moduleId,
      };

      this.alerts.unshift(alert);
      if (this.alerts.length > this.config.maxAlerts) {
        this.alerts.pop();
      }

      this.alertListeners.forEach((listener) => listener(alert));
    }
  }

  private calculateUptime(): number {
    // 简化实现：返回运行时长（毫秒）
    return Date.now() - (this as any).startTime || 0;
  }
}

export const intelligentMonitor = new IntelligentMonitor();
export default intelligentMonitor;
