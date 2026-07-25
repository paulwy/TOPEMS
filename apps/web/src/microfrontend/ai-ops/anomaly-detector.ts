export interface MetricBaseline {
  metricName: string;
  moduleId?: string;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
  sampleCount: number;
  lastUpdated: number;
  windowSize: number;
}

export interface AnomalyResult {
  metricName: string;
  moduleId?: string;
  value: number;
  timestamp: number;
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  baseline: MetricBaseline;
  deviation: number;
  deviationPercent: number;
  detectionMethod: 'zScore' | 'iqr' | 'ewma' | 'threshold';
}

export interface AnomalyEvent {
  id: string;
  metricName: string;
  moduleId?: string;
  value: number;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  baseline: MetricBaseline;
  deviation: number;
  detectionMethod: string;
  acknowledged: boolean;
  resolved: boolean;
  resolvedAt?: number;
  description?: string;
}

export interface AnomalyDetectorConfig {
  defaultWindowSize: number;
  zScoreThreshold: number;
  ewmaAlpha: number;
  iqrMultiplier: number;
  minSamples: number;
  severityThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  maxHistorySize: number;
}

const DEFAULT_CONFIG: AnomalyDetectorConfig = {
  defaultWindowSize: 100,
  zScoreThreshold: 3,
  ewmaAlpha: 0.3,
  iqrMultiplier: 1.5,
  minSamples: 10,
  severityThresholds: {
    low: 2,
    medium: 3,
    high: 4,
    critical: 5,
  },
  maxHistorySize: 1000,
};

export class StatisticalAnalyzer {
  static zScore(values: number[], value: number): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = this.standardDeviation(values);
    if (stdDev === 0) return 0;
    return (value - mean) / stdDev;
  }

  static movingAverage(values: number[], windowSize: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const window = values.slice(start, i + 1);
      result.push(window.reduce((a, b) => a + b, 0) / window.length);
    }
    return result;
  }

  static ewma(values: number[], alpha: number): number[] {
    if (values.length === 0) return [];
    const result: number[] = [values[0]];
    for (let i = 1; i < values.length; i++) {
      result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
    }
    return result;
  }

  static standardDeviation(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
  }

  static percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  static detectOutliersIQR(
    values: number[],
    multiplier: number = 1.5
  ): { outliers: number[]; lowerBound: number; upperBound: number; q1: number; q3: number } {
    if (values.length < 4) {
      return { outliers: [], lowerBound: -Infinity, upperBound: Infinity, q1: 0, q3: 0 };
    }
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = this.percentile(sorted, 25);
    const q3 = this.percentile(sorted, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - multiplier * iqr;
    const upperBound = q3 + multiplier * iqr;
    const outliers = values.filter((v) => v < lowerBound || v > upperBound);
    return { outliers, lowerBound, upperBound, q1, q3 };
  }

  static calcBaseline(
    values: number[]
  ): Omit<MetricBaseline, 'metricName' | 'moduleId' | 'lastUpdated' | 'windowSize'> {
    if (values.length === 0) {
      return { mean: 0, stdDev: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0, sampleCount: 0 };
    }
    const sorted = [...values].sort((a, b) => a - b);
    return {
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      stdDev: this.standardDeviation(values),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
      sampleCount: values.length,
    };
  }
}

export class AnomalyDetector {
  private config: AnomalyDetectorConfig;
  private metricData: Map<string, number[]> = new Map();
  private baselines: Map<string, MetricBaseline> = new Map();
  private anomalyHistory: AnomalyEvent[] = [];
  private listeners: Set<(event: AnomalyEvent) => void> = new Set();

  constructor(config: Partial<AnomalyDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private getKey(metricName: string, moduleId?: string): string {
    return moduleId ? `${moduleId}:${metricName}` : metricName;
  }

  train(metricName: string, values: number[], moduleId?: string): void {
    const key = this.getKey(metricName, moduleId);
    const windowSize = this.config.defaultWindowSize;
    const windowedValues = values.slice(-windowSize);
    this.metricData.set(key, windowedValues);

    const baselineStats = StatisticalAnalyzer.calcBaseline(windowedValues);
    const baseline: MetricBaseline = {
      metricName,
      moduleId,
      ...baselineStats,
      lastUpdated: Date.now(),
      windowSize,
    };
    this.baselines.set(key, baseline);
  }

  detect(
    metricName: string,
    value: number,
    moduleId?: string,
    method: 'zScore' | 'iqr' | 'ewma' = 'zScore'
  ): AnomalyResult {
    const key = this.getKey(metricName, moduleId);
    const history = this.metricData.get(key) || [];

    const baseline = this.baselines.get(key) || {
      metricName,
      moduleId,
      mean: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      sampleCount: history.length,
      lastUpdated: Date.now(),
      windowSize: this.config.defaultWindowSize,
    };

    if (history.length < this.config.minSamples) {
      this.addToHistory(key, value);
      return {
        metricName,
        moduleId,
        value,
        timestamp: Date.now(),
        isAnomaly: false,
        severity: 'low',
        score: 0,
        baseline,
        deviation: 0,
        deviationPercent: 0,
        detectionMethod: method,
      };
    }

    let score = 0;
    let deviation = 0;

    switch (method) {
      case 'zScore':
        score = Math.abs(StatisticalAnalyzer.zScore(history, value));
        deviation = value - baseline.mean;
        break;
      case 'iqr':
        const iqrResult = StatisticalAnalyzer.detectOutliersIQR(history, this.config.iqrMultiplier);
        if (value < iqrResult.lowerBound || value > iqrResult.upperBound) {
          const iqr = iqrResult.q3 - iqrResult.q1;
          score =
            iqr > 0
              ? Math.abs(value - (value < iqrResult.q1 ? iqrResult.q1 : iqrResult.q3)) / iqr
              : 0;
        }
        deviation = value - baseline.p50;
        break;
      case 'ewma':
        const ewmaValues = StatisticalAnalyzer.ewma(history, this.config.ewmaAlpha);
        const lastEwma = ewmaValues[ewmaValues.length - 1];
        const ewmaStd = StatisticalAnalyzer.standardDeviation(ewmaValues);
        score = ewmaStd > 0 ? Math.abs(value - lastEwma) / ewmaStd : 0;
        deviation = value - lastEwma;
        break;
    }

    const deviationPercent = baseline.mean !== 0 ? (deviation / baseline.mean) * 100 : 0;
    const isAnomaly = score >= this.config.zScoreThreshold;
    const severity = this.getSeverity(score);

    const result: AnomalyResult = {
      metricName,
      moduleId,
      value,
      timestamp: Date.now(),
      isAnomaly,
      severity,
      score,
      baseline,
      deviation,
      deviationPercent,
      detectionMethod: method,
    };

    this.addToHistory(key, value);

    if (isAnomaly) {
      const event: AnomalyEvent = {
        id: `anomaly-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        metricName,
        moduleId,
        value,
        timestamp: Date.now(),
        severity,
        score,
        baseline,
        deviation,
        detectionMethod: method,
        acknowledged: false,
        resolved: false,
        description: `${metricName} 异常: ${value.toFixed(2)}, 偏离 ${deviationPercent.toFixed(1)}%`,
      };
      this.addAnomalyEvent(event);
    }

    return result;
  }

  detectBatch(
    metrics: {
      metricName: string;
      value: number;
      moduleId?: string;
      method?: 'zScore' | 'iqr' | 'ewma';
    }[]
  ): AnomalyResult[] {
    return metrics.map((m) => this.detect(m.metricName, m.value, m.moduleId, m.method || 'zScore'));
  }

  getBaseline(metricName: string, moduleId?: string): MetricBaseline | undefined {
    const key = this.getKey(metricName, moduleId);
    return this.baselines.get(key);
  }

  getAllBaselines(): MetricBaseline[] {
    return Array.from(this.baselines.values());
  }

  getAnomalyHistory(options?: {
    moduleId?: string;
    metricName?: string;
    severity?: AnomalyEvent['severity'];
    limit?: number;
    acknowledged?: boolean;
    resolved?: boolean;
  }): AnomalyEvent[] {
    let events = [...this.anomalyHistory];

    if (options?.moduleId) {
      events = events.filter((e) => e.moduleId === options.moduleId);
    }
    if (options?.metricName) {
      events = events.filter((e) => e.metricName === options.metricName);
    }
    if (options?.severity) {
      events = events.filter((e) => e.severity === options.severity);
    }
    if (options?.acknowledged !== undefined) {
      events = events.filter((e) => e.acknowledged === options.acknowledged);
    }
    if (options?.resolved !== undefined) {
      events = events.filter((e) => e.resolved === options.resolved);
    }

    events.sort((a, b) => b.timestamp - a.timestamp);

    if (options?.limit) {
      events = events.slice(0, options.limit);
    }

    return events;
  }

  acknowledgeAnomaly(id: string): boolean {
    const event = this.anomalyHistory.find((e) => e.id === id);
    if (event) {
      event.acknowledged = true;
      return true;
    }
    return false;
  }

  resolveAnomaly(id: string): boolean {
    const event = this.anomalyHistory.find((e) => e.id === id);
    if (event) {
      event.resolved = true;
      event.resolvedAt = Date.now();
      return true;
    }
    return false;
  }

  subscribe(callback: (event: AnomalyEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getConfig(): AnomalyDetectorConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<AnomalyDetectorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  clear(): void {
    this.metricData.clear();
    this.baselines.clear();
    this.anomalyHistory = [];
  }

  private addToHistory(key: string, value: number): void {
    const history = this.metricData.get(key) || [];
    history.push(value);
    if (history.length > this.config.defaultWindowSize) {
      history.shift();
    }
    this.metricData.set(key, history);
  }

  private addAnomalyEvent(event: AnomalyEvent): void {
    this.anomalyHistory.unshift(event);
    if (this.anomalyHistory.length > this.config.maxHistorySize) {
      this.anomalyHistory.pop();
    }
    this.listeners.forEach((listener) => listener(event));
  }

  private getSeverity(score: number): AnomalyEvent['severity'] {
    const { low, medium, high, critical } = this.config.severityThresholds;
    if (score >= critical) return 'critical';
    if (score >= high) return 'high';
    if (score >= medium) return 'medium';
    if (score >= low) return 'low';
    return 'low';
  }
}

export const anomalyDetector = new AnomalyDetector();
export default anomalyDetector;
