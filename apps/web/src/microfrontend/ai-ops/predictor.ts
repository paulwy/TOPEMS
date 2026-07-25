export interface PredictionResult {
  metricName: string;
  moduleId?: string;
  predictedValues: number[];
  timestamps: number[];
  method: 'linearRegression' | 'exponentialSmoothing' | 'seasonal';
  steps: number;
  confidence: number;
  rSquared?: number;
}

export interface PredictionWithConfidence {
  value: number;
  lowerBound: number;
  upperBound: number;
  confidenceLevel: number;
}

export interface PredictedAnomaly {
  id: string;
  metricName: string;
  moduleId?: string;
  predictedValue: number;
  predictedAt: number;
  expectedTime: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  baseline: number;
  deviation: number;
  deviationPercent: number;
  confidence: number;
  description?: string;
  acknowledged: boolean;
}

export interface PredictorConfig {
  defaultSteps: number;
  defaultConfidenceLevel: number;
  exponentialSmoothingAlpha: number;
  minTrainingPoints: number;
  anomalyThreshold: number;
  maxHistorySize: number;
  seasonalityPeriod: number;
}

const DEFAULT_CONFIG: PredictorConfig = {
  defaultSteps: 10,
  defaultConfidenceLevel: 0.95,
  exponentialSmoothingAlpha: 0.3,
  minTrainingPoints: 5,
  anomalyThreshold: 2,
  maxHistorySize: 500,
  seasonalityPeriod: 24,
};

export class SimplePredictor {
  static linearRegression(values: number[]): {
    slope: number;
    intercept: number;
    rSquared: number;
    predict: (x: number) => number;
  } {
    const n = values.length;
    if (n < 2) {
      return {
        slope: 0,
        intercept: values[0] || 0,
        rSquared: 0,
        predict: () => values[0] || 0,
      };
    }

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = values[i];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const ssTotal = sumY2 - (sumY * sumY) / n;
    const ssResidual = values.reduce((sum, y, i) => {
      const predicted = slope * i + intercept;
      return sum + (y - predicted) ** 2;
    }, 0);
    const rSquared = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;

    return {
      slope,
      intercept,
      rSquared,
      predict: (x: number) => slope * x + intercept,
    };
  }

  static exponentialSmoothing(
    values: number[],
    alpha: number,
    steps: number
  ): { predictions: number[]; smoothedValues: number[] } {
    if (values.length === 0) {
      return { predictions: Array(steps).fill(0), smoothedValues: [] };
    }

    const smoothedValues: number[] = [values[0]];
    for (let i = 1; i < values.length; i++) {
      smoothedValues.push(alpha * values[i] + (1 - alpha) * smoothedValues[i - 1]);
    }

    const lastSmoothed = smoothedValues[smoothedValues.length - 1];
    const predictions: number[] = [];

    if (values.length < 2) {
      for (let i = 0; i < steps; i++) {
        predictions.push(lastSmoothed);
      }
    } else {
      const trend = alpha * (values[values.length - 1] - values[values.length - 2]);
      let current = lastSmoothed;
      for (let i = 0; i < steps; i++) {
        current = current + trend;
        predictions.push(current);
      }
    }

    return { predictions, smoothedValues };
  }

  static detectSeasonality(
    values: number[],
    period: number
  ): { hasSeasonality: boolean; strength: number; seasonalPattern: number[] } {
    if (values.length < period * 2) {
      return { hasSeasonality: false, strength: 0, seasonalPattern: [] };
    }

    const seasonalPattern: number[] = new Array(period).fill(0);
    const counts: number[] = new Array(period).fill(0);

    for (let i = 0; i < values.length; i++) {
      const idx = i % period;
      seasonalPattern[idx] += values[i];
      counts[idx]++;
    }

    for (let i = 0; i < period; i++) {
      seasonalPattern[i] = counts[i] > 0 ? seasonalPattern[i] / counts[i] : 0;
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;

    let seasonalVariance = 0;
    for (let i = 0; i < values.length; i++) {
      const seasonalValue = seasonalPattern[i % period];
      seasonalVariance += (seasonalValue - mean) ** 2;
    }
    seasonalVariance /= values.length;

    const strength = variance === 0 ? 0 : seasonalVariance / variance;

    return {
      hasSeasonality: strength > 0.3,
      strength,
      seasonalPattern,
    };
  }

  static detectTrend(values: number[]): {
    hasTrend: boolean;
    direction: 'up' | 'down' | 'none';
    slope: number;
    strength: number;
  } {
    if (values.length < 3) {
      return { hasTrend: false, direction: 'none', slope: 0, strength: 0 };
    }

    const regression = this.linearRegression(values);
    const strength = Math.abs(regression.rSquared);

    return {
      hasTrend: strength > 0.5,
      direction: regression.slope > 0 ? 'up' : regression.slope < 0 ? 'down' : 'none',
      slope: regression.slope,
      strength,
    };
  }

  static calculateConfidenceInterval(
    predictedValue: number,
    residuals: number[],
    confidenceLevel: number
  ): { lowerBound: number; upperBound: number } {
    if (residuals.length < 2) {
      return { lowerBound: predictedValue * 0.9, upperBound: predictedValue * 1.1 };
    }

    const mean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
    const stdDev = Math.sqrt(
      residuals.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (residuals.length - 1)
    );

    const zScore = this.confidenceLevelToZScore(confidenceLevel);
    const marginOfError = zScore * stdDev;

    return {
      lowerBound: predictedValue - marginOfError,
      upperBound: predictedValue + marginOfError,
    };
  }

  private static confidenceLevelToZScore(confidenceLevel: number): number {
    const table: Record<number, number> = {
      0.9: 1.645,
      0.95: 1.96,
      0.98: 2.326,
      0.99: 2.576,
    };
    return table[confidenceLevel] || 1.96;
  }
}

export class MetricPredictor {
  private config: PredictorConfig;
  private metricData: Map<string, { values: number[]; timestamps: number[] }> = new Map();
  private predictedAnomalies: PredictedAnomaly[] = [];
  private listeners: Set<(anomaly: PredictedAnomaly) => void> = new Set();

  constructor(config: Partial<PredictorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private getKey(metricName: string, moduleId?: string): string {
    return moduleId ? `${moduleId}:${metricName}` : metricName;
  }

  train(metricName: string, values: number[], timestamps?: number[], moduleId?: string): void {
    const key = this.getKey(metricName, moduleId);
    const windowSize = this.config.maxHistorySize;
    const windowedValues = values.slice(-windowSize);
    const windowedTimestamps = timestamps
      ? timestamps.slice(-windowSize)
      : windowedValues.map((_, i) => Date.now() - (windowedValues.length - 1 - i) * 60000);

    this.metricData.set(key, { values: windowedValues, timestamps: windowedTimestamps });
  }

  predict(
    metricName: string,
    steps?: number,
    method?: 'linearRegression' | 'exponentialSmoothing',
    moduleId?: string
  ): PredictionResult | null {
    const key = this.getKey(metricName, moduleId);
    const data = this.metricData.get(key);
    const numSteps = steps || this.config.defaultSteps;

    if (!data || data.values.length < this.config.minTrainingPoints) {
      return null;
    }

    const values = data.values;
    const predictionMethod = method || this.autoSelectMethod(values);

    let predictedValues: number[] = [];
    let confidence = 0.7;
    let rSquared: number | undefined;

    switch (predictionMethod) {
      case 'linearRegression': {
        const regression = SimplePredictor.linearRegression(values);
        rSquared = regression.rSquared;
        confidence = Math.max(0.5, Math.min(0.99, Math.abs(regression.rSquared)));
        for (let i = 0; i < numSteps; i++) {
          predictedValues.push(regression.predict(values.length + i));
        }
        break;
      }
      case 'exponentialSmoothing': {
        const result = SimplePredictor.exponentialSmoothing(
          values,
          this.config.exponentialSmoothingAlpha,
          numSteps
        );
        predictedValues = result.predictions;
        const residuals = values.map((v, i) => v - result.smoothedValues[i]);
        const mae = residuals.reduce((sum, r) => sum + Math.abs(r), 0) / values.length;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        confidence = mean === 0 ? 0.7 : Math.max(0.5, Math.min(0.95, 1 - mae / mean));
        break;
      }
    }

    const lastTimestamp = data.timestamps[data.timestamps.length - 1];
    const interval =
      values.length > 1 ? (lastTimestamp - data.timestamps[0]) / (values.length - 1) : 60000;
    const timestamps = predictedValues.map((_, i) => lastTimestamp + (i + 1) * interval);

    return {
      metricName,
      moduleId,
      predictedValues,
      timestamps,
      method: predictionMethod,
      steps: numSteps,
      confidence,
      rSquared,
    };
  }

  predictWithConfidence(
    metricName: string,
    steps?: number,
    confidenceLevel?: number,
    moduleId?: string
  ): { predictions: PredictionWithConfidence[]; result: PredictionResult } | null {
    const result = this.predict(metricName, steps, undefined, moduleId);
    if (!result) return null;

    const key = this.getKey(metricName, moduleId);
    const data = this.metricData.get(key);
    const level = confidenceLevel || this.config.defaultConfidenceLevel;

    let residuals: number[] = [];
    if (data && data.values.length > 1) {
      const regression = SimplePredictor.linearRegression(data.values);
      residuals = data.values.map((v, i) => v - regression.predict(i));
    }

    const predictions: PredictionWithConfidence[] = result.predictedValues.map((value) => {
      const interval = SimplePredictor.calculateConfidenceInterval(value, residuals, level);
      return {
        value,
        lowerBound: interval.lowerBound,
        upperBound: interval.upperBound,
        confidenceLevel: level,
      };
    });

    return { predictions, result };
  }

  predictAnomaly(
    metricName: string,
    steps?: number,
    threshold?: number,
    moduleId?: string
  ): PredictedAnomaly[] {
    const key = this.getKey(metricName, moduleId);
    const data = this.metricData.get(key);

    if (!data || data.values.length < this.config.minTrainingPoints) {
      return [];
    }

    const prediction = this.predict(metricName, steps, undefined, moduleId);
    if (!prediction) return [];

    const mean = data.values.reduce((a, b) => a + b, 0) / data.values.length;
    const stdDev = this.calculateStdDev(data.values);
    const anomalyThreshold = threshold || this.config.anomalyThreshold;

    const anomalies: PredictedAnomaly[] = [];

    for (let i = 0; i < prediction.predictedValues.length; i++) {
      const predictedValue = prediction.predictedValues[i];
      const zScore = stdDev === 0 ? 0 : Math.abs(predictedValue - mean) / stdDev;

      if (zScore >= anomalyThreshold) {
        const deviation = predictedValue - mean;
        const deviationPercent = mean !== 0 ? (deviation / mean) * 100 : 0;
        const probability = Math.min(0.99, zScore / 5);

        let severity: PredictedAnomaly['severity'] = 'low';
        if (zScore >= 5) severity = 'critical';
        else if (zScore >= 4) severity = 'high';
        else if (zScore >= 3) severity = 'medium';

        const anomaly: PredictedAnomaly = {
          id: `pred-anomaly-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          metricName,
          moduleId,
          predictedValue,
          predictedAt: Date.now(),
          expectedTime: prediction.timestamps[i],
          severity,
          probability,
          baseline: mean,
          deviation,
          deviationPercent,
          confidence: prediction.confidence,
          description: `预测到 ${metricName} 将在 ${new Date(prediction.timestamps[i]).toLocaleString()} 异常: ${predictedValue.toFixed(2)}, 偏离 ${deviationPercent.toFixed(1)}%`,
          acknowledged: false,
        };

        anomalies.push(anomaly);
        this.addPredictedAnomaly(anomaly);
      }
    }

    return anomalies;
  }

  getMetricHistory(
    metricName: string,
    moduleId?: string
  ): { values: number[]; timestamps: number[] } | null {
    const key = this.getKey(metricName, moduleId);
    const data = this.metricData.get(key);
    return data ? { values: [...data.values], timestamps: [...data.timestamps] } : null;
  }

  getPredictedAnomalies(options?: {
    moduleId?: string;
    metricName?: string;
    severity?: PredictedAnomaly['severity'];
    limit?: number;
    acknowledged?: boolean;
  }): PredictedAnomaly[] {
    let anomalies = [...this.predictedAnomalies];

    if (options?.moduleId) {
      anomalies = anomalies.filter((a) => a.moduleId === options.moduleId);
    }
    if (options?.metricName) {
      anomalies = anomalies.filter((a) => a.metricName === options.metricName);
    }
    if (options?.severity) {
      anomalies = anomalies.filter((a) => a.severity === options.severity);
    }
    if (options?.acknowledged !== undefined) {
      anomalies = anomalies.filter((a) => a.acknowledged === options.acknowledged);
    }

    anomalies.sort((a, b) => b.expectedTime - a.expectedTime);

    if (options?.limit) {
      anomalies = anomalies.slice(0, options.limit);
    }

    return anomalies;
  }

  acknowledgePredictedAnomaly(id: string): boolean {
    const anomaly = this.predictedAnomalies.find((a) => a.id === id);
    if (anomaly) {
      anomaly.acknowledged = true;
      return true;
    }
    return false;
  }

  subscribe(callback: (anomaly: PredictedAnomaly) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getConfig(): PredictorConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<PredictorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  clear(): void {
    this.metricData.clear();
    this.predictedAnomalies = [];
  }

  private autoSelectMethod(values: number[]): 'linearRegression' | 'exponentialSmoothing' {
    const trend = SimplePredictor.detectTrend(values);
    return trend.hasTrend ? 'linearRegression' : 'exponentialSmoothing';
  }

  private calculateStdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
  }

  private addPredictedAnomaly(anomaly: PredictedAnomaly): void {
    this.predictedAnomalies.unshift(anomaly);
    if (this.predictedAnomalies.length > this.config.maxHistorySize) {
      this.predictedAnomalies.pop();
    }
    this.listeners.forEach((listener) => listener(anomaly));
  }
}

export const metricPredictor = new MetricPredictor();
export default metricPredictor;
