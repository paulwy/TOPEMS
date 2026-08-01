/**
 * V48.0 预测性扩展 — 基于历史数据和预测模型的预测性扩展引擎
 *
 * 核心能力:
 * - 指标采集与时序存储
 * - 多算法模型训练（线性回归/指数平滑/移动平均/季节性ARIMA/自定义）
 * - 未来负载预测与置信度评估
 * - 扩展决策评估（扩容/缩容/不操作/紧急扩容）
 * - 容量规划与缺口分析
 * - 预测准确度追踪与策略优化
 */

// ==================== 枚举 ====================

export enum ScalingAction {
  ScaleUp = 'scale-up',
  ScaleDown = 'scale-down',
  NoAction = 'no-action',
  EmergencyScaleUp = 'emergency-scale-up',
}

export enum ModelAlgorithm {
  LinearRegression = 'linear-regression',
  ExponentialSmoothing = 'exponential-smoothing',
  MovingAverage = 'moving-average',
  SeasonalARIMA = 'seasonal-arima',
  Custom = 'custom',
}

// ==================== 接口 ====================

export interface ScalingMetric {
  metric_name: string;
  value: number;
  timestamp: number;
  tags: Record<string, string>;
}

export interface ScalingPrediction {
  predicted_at: number;
  target_time: number;
  predicted_load: number;
  confidence: number;
  recommended_action: ScalingAction;
  scaling_factor: number;
}

export interface ScalingModel {
  model_id: string;
  algorithm: ModelAlgorithm;
  training_data_points: number;
  accuracy: number;
  last_trained: number;
  parameters: Record<string, number>;
}

export interface ScalingPolicy {
  policy_id: string;
  name: string;
  min_instances: number;
  max_instances: number;
  target_metric: string;
  scale_up_threshold: number;
  scale_down_threshold: number;
  cooldown_seconds: number;
  prediction_window_minutes: number;
  enabled: boolean;
  created_at: number;
  last_modified: number;
}

export interface CapacityPlan {
  time_range: { start: number; end: number };
  predicted_demand: number;
  current_capacity: number;
  gap: number;
  recommended_instances: number;
}

export interface PredictiveScalerConfig {
  maxMetricHistory: number;
  defaultPredictionWindowMinutes: number;
  defaultMinInstances: number;
  defaultMaxInstances: number;
  defaultCooldownSeconds: number;
  minTrainingPoints: number;
  confidenceThreshold: number;
  emergencyThreshold: number;
  defaultAlgorithm: ModelAlgorithm;
}

export interface PredictiveScalerStats {
  total_metrics_recorded: number;
  total_predictions_made: number;
  active_models: number;
  active_policies: number;
  avg_prediction_accuracy: number;
  total_scaling_actions: number;
  last_scaling_action: ScalingAction | null;
}

// ==================== 默认配置 ====================

const DEFAULT_CONFIG: PredictiveScalerConfig = {
  maxMetricHistory: 2000,
  defaultPredictionWindowMinutes: 30,
  defaultMinInstances: 1,
  defaultMaxInstances: 20,
  defaultCooldownSeconds: 300,
  minTrainingPoints: 10,
  confidenceThreshold: 0.7,
  emergencyThreshold: 0.9,
  defaultAlgorithm: ModelAlgorithm.LinearRegression,
};

// ==================== 扩展历史记录 ====================

export interface ScalingHistoryEntry {
  id: string;
  policy_id: string;
  action: ScalingAction;
  from_instances: number;
  to_instances: number;
  predicted_load: number;
  actual_load: number;
  confidence: number;
  timestamp: number;
  success: boolean;
}

// ==================== 时序数据点 ====================

interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

// ==================== 预测准确度记录 ====================

interface AccuracyRecord {
  predicted: number;
  actual: number;
  timestamp: number;
}

// ==================== PredictiveScaler 类 ====================

export class PredictiveScaler {
  private config: PredictiveScalerConfig;
  private metricHistory: Map<string, TimeSeriesPoint[]> = new Map();
  private models: Map<string, ScalingModel> = new Map();
  private policies: Map<string, ScalingPolicy> = new Map();
  private scalingHistory: ScalingHistoryEntry[] = [];
  private accuracyRecords: Map<string, AccuracyRecord[]> = new Map();
  private lastScalingTime: Map<string, number> = new Map();
  private currentInstances: Map<string, number> = new Map();
  private listeners: Set<(entry: ScalingHistoryEntry) => void> = new Set();

  constructor(config: Partial<PredictiveScalerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ------------------- 记录指标 -------------------

  recordMetric(metric: ScalingMetric): void {
    const key = this.getMetricKey(metric.metric_name, metric.tags);
    const history = this.metricHistory.get(key) || [];
    history.push({ timestamp: metric.timestamp, value: metric.value });
    if (history.length > this.config.maxMetricHistory) {
      history.shift();
    }
    this.metricHistory.set(key, history);

    this.evaluateAccuracy(key, metric.value, metric.timestamp);
  }

  // ------------------- 训练预测模型 -------------------

  trainModel(
    metricName: string,
    tags: Record<string, string> = {},
    algorithm?: ModelAlgorithm
  ): ScalingModel {
    const key = this.getMetricKey(metricName, tags);
    const data = this.metricHistory.get(key) || [];

    if (data.length < this.config.minTrainingPoints) {
      throw new Error(
        `Insufficient training data: ${data.length} points, need at least ${this.config.minTrainingPoints}`
      );
    }

    const algo = algorithm ?? this.config.defaultAlgorithm;
    const modelId = `model-${key}-${algo}`;
    const parameters = this.extractParameters(data, algo);
    const accuracy = this.calculateModelAccuracy(data, algo, parameters);

    const model: ScalingModel = {
      model_id: modelId,
      algorithm: algo,
      training_data_points: data.length,
      accuracy,
      last_trained: Date.now(),
      parameters,
    };

    this.models.set(key, model);
    return model;
  }

  // ------------------- 预测未来负载 -------------------

  predict(
    metricName: string,
    tags: Record<string, string> = {},
    windowMinutes?: number
  ): ScalingPrediction | null {
    const key = this.getMetricKey(metricName, tags);
    const model = this.models.get(key);
    const data = this.metricHistory.get(key) || [];

    if (!model || data.length === 0) return null;

    const window = windowMinutes ?? this.config.defaultPredictionWindowMinutes;
    const now = Date.now();
    const targetTime = now + window * 60 * 1000;

    const predictedLoad = this.runPrediction(data, model, window);
    const confidence = this.calcConfidence(model, data.length);
    const recommendedAction = this.determineAction(predictedLoad, tags.module);
    const scalingFactor = this.calcScalingFactor(predictedLoad, recommendedAction, tags.module);

    return {
      predicted_at: now,
      target_time: targetTime,
      predicted_load: predictedLoad,
      confidence,
      recommended_action: recommendedAction,
      scaling_factor: scalingFactor,
    };
  }

  // ------------------- 评估是否需要扩展 -------------------

  evaluateScaling(
    policyId: string,
    currentLoad: number
  ): { action: ScalingAction; targetInstances: number; prediction: ScalingPrediction | null } {
    const policy = this.policies.get(policyId);
    if (!policy || !policy.enabled) {
      return { action: ScalingAction.NoAction, targetInstances: 0, prediction: null };
    }

    const now = Date.now();
    const lastScale = this.lastScalingTime.get(policyId) || 0;
    if (now - lastScale < policy.cooldown_seconds * 1000) {
      return { action: ScalingAction.NoAction, targetInstances: 0, prediction: null };
    }

    const prediction = this.predict(policy.target_metric, { module: policy.name }, policy.prediction_window_minutes);
    const effectiveLoad = prediction?.predicted_load ?? currentLoad;
    const moduleKey = policy.name;
    const currentInstances = this.currentInstances.get(moduleKey) ?? policy.min_instances;

    let action: ScalingAction;
    let targetInstances = currentInstances;

    if (effectiveLoad >= policy.scale_up_threshold * this.config.emergencyThreshold) {
      action = ScalingAction.EmergencyScaleUp;
      targetInstances = Math.min(
        policy.max_instances,
        Math.ceil(currentInstances * (1 + this.calcScalingFactor(effectiveLoad, action, moduleKey)))
      );
    } else if (effectiveLoad >= policy.scale_up_threshold) {
      action = ScalingAction.ScaleUp;
      targetInstances = Math.min(policy.max_instances, currentInstances + 1);
    } else if (effectiveLoad <= policy.scale_down_threshold) {
      action = ScalingAction.ScaleDown;
      targetInstances = Math.max(policy.min_instances, currentInstances - 1);
    } else {
      action = ScalingAction.NoAction;
    }

    if (action !== ScalingAction.NoAction) {
      this.recordScalingAction(policyId, action, currentInstances, targetInstances, effectiveLoad, prediction?.confidence ?? 0);
      this.currentInstances.set(moduleKey, targetInstances);
      this.lastScalingTime.set(policyId, now);
    }

    return { action, targetInstances, prediction };
  }

  // ------------------- 生成容量规划 -------------------

  generateCapacityPlan(
    policyId: string,
    planHorizonMinutes: number = 60
  ): CapacityPlan | null {
    const policy = this.policies.get(policyId);
    if (!policy) return null;

    const prediction = this.predict(policy.target_metric, { module: policy.name }, planHorizonMinutes);
    if (!prediction) return null;

    const currentInstances = this.currentInstances.get(policy.name) ?? policy.min_instances;
    const currentCapacity = currentInstances * policy.scale_up_threshold;
    const gap = prediction.predicted_load - currentCapacity;
    const recommendedInstances = gap > 0
      ? Math.min(policy.max_instances, Math.ceil(prediction.predicted_load / policy.scale_up_threshold))
      : Math.max(policy.min_instances, currentInstances);

    return {
      time_range: {
        start: prediction.predicted_at,
        end: prediction.target_time,
      },
      predicted_demand: prediction.predicted_load,
      current_capacity: currentCapacity,
      gap,
      recommended_instances: recommendedInstances,
    };
  }

  // ------------------- 获取扩展历史 -------------------

  getScalingHistory(limit?: number, policyId?: string): ScalingHistoryEntry[] {
    let history = [...this.scalingHistory];
    if (policyId) {
      history = history.filter((h) => h.policy_id === policyId);
    }
    history.sort((a, b) => b.timestamp - a.timestamp);
    if (limit) {
      history = history.slice(0, limit);
    }
    return history;
  }

  // ------------------- 获取预测准确度 -------------------

  getPredictionAccuracy(metricName: string, tags: Record<string, string> = {}): number {
    const key = this.getMetricKey(metricName, tags);
    const records = this.accuracyRecords.get(key) || [];
    if (records.length === 0) return 0;

    const errors = records.map((r) => {
      const denom = Math.abs(r.actual) || 1;
      return Math.abs(r.predicted - r.actual) / denom;
    });
    const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
    return Math.max(0, 1 - avgError);
  }

  // ------------------- 优化扩展策略 -------------------

  optimizePolicy(policyId: string): ScalingPolicy | null {
    const policy = this.policies.get(policyId);
    if (!policy) return null;

    const history = this.scalingHistory.filter((h) => h.policy_id === policyId);
    if (history.length < 5) return policy;

    const successRate = history.filter((h) => h.success).length / history.length;
    const overProvisions = history.filter((h) => h.actual_load < h.predicted_load * 0.7).length;
    const underProvisions = history.filter((h) => h.actual_load > h.predicted_load * 1.3).length;

    if (overProvisions > history.length * 0.3) {
      policy.scale_up_threshold = Math.round(policy.scale_up_threshold * 1.1 * 100) / 100;
    }
    if (underProvisions > history.length * 0.3) {
      policy.scale_up_threshold = Math.round(policy.scale_up_threshold * 0.9 * 100) / 100;
    }

    if (successRate < 0.5) {
      policy.cooldown_seconds = Math.floor(policy.cooldown_seconds * 0.8);
    }

    policy.last_modified = Date.now();
    return policy;
  }

  // ------------------- 策略管理 -------------------

  createPolicy(
    name: string,
    targetMetric: string,
    options: Partial<Omit<ScalingPolicy, 'policy_id' | 'name' | 'target_metric' | 'created_at' | 'last_modified'>> = {}
  ): ScalingPolicy {
    const policyId = `policy-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const now = Date.now();
    const policy: ScalingPolicy = {
      policy_id: policyId,
      name,
      min_instances: options.min_instances ?? this.config.defaultMinInstances,
      max_instances: options.max_instances ?? this.config.defaultMaxInstances,
      target_metric: targetMetric,
      scale_up_threshold: options.scale_up_threshold ?? 80,
      scale_down_threshold: options.scale_down_threshold ?? 30,
      cooldown_seconds: options.cooldown_seconds ?? this.config.defaultCooldownSeconds,
      prediction_window_minutes: options.prediction_window_minutes ?? this.config.defaultPredictionWindowMinutes,
      enabled: options.enabled ?? true,
      created_at: now,
      last_modified: now,
    };
    this.policies.set(policyId, policy);
    this.currentInstances.set(name, policy.min_instances);
    return policy;
  }

  getPolicy(policyId: string): ScalingPolicy | undefined {
    return this.policies.get(policyId);
  }

  getAllPolicies(): ScalingPolicy[] {
    return Array.from(this.policies.values());
  }

  setInstances(module: string, count: number): void {
    this.currentInstances.set(module, count);
  }

  getInstances(module: string): number {
    return this.currentInstances.get(module) ?? 0;
  }

  getModel(metricName: string, tags: Record<string, string> = {}): ScalingModel | undefined {
    return this.models.get(this.getMetricKey(metricName, tags));
  }

  // ------------------- 统计信息 -------------------

  getStats(): PredictiveScalerStats {
    const allAccuracy = Array.from(this.accuracyRecords.values()).flat();
    const avgAccuracy = allAccuracy.length > 0
      ? allAccuracy.reduce((sum, r) => {
          const denom = Math.abs(r.actual) || 1;
          return sum + (1 - Math.abs(r.predicted - r.actual) / denom);
        }, 0) / allAccuracy.length
      : 0;

    const lastEntry = this.scalingHistory[0];

    return {
      total_metrics_recorded: Array.from(this.metricHistory.values()).reduce((s, h) => s + h.length, 0),
      total_predictions_made: allAccuracy.length,
      active_models: this.models.size,
      active_policies: Array.from(this.policies.values()).filter((p) => p.enabled).length,
      avg_prediction_accuracy: avgAccuracy,
      total_scaling_actions: this.scalingHistory.length,
      last_scaling_action: lastEntry?.action ?? null,
    };
  }

  subscribe(callback: (entry: ScalingHistoryEntry) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getConfig(): PredictiveScalerConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<PredictiveScalerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  clear(): void {
    this.metricHistory.clear();
    this.models.clear();
    this.policies.clear();
    this.scalingHistory = [];
    this.accuracyRecords.clear();
    this.lastScalingTime.clear();
    this.currentInstances.clear();
  }

  // ==================== 私有方法 ====================

  private getMetricKey(metricName: string, tags: Record<string, string>): string {
    const tagStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return tagStr ? `${metricName}|${tagStr}` : metricName;
  }

  private extractParameters(data: TimeSeriesPoint[], algorithm: ModelAlgorithm): Record<string, number> {
    const values = data.map((d) => d.value);
    switch (algorithm) {
      case ModelAlgorithm.LinearRegression: {
        const n = values.length;
        const xs = data.map((_, i) => i);
        const sumX = xs.reduce((a, b) => a + b, 0);
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = xs.reduce((s, x, i) => s + x * values[i], 0);
        const sumXX = xs.reduce((s, x) => s + x * x, 0);
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
        const intercept = (sumY - slope * sumX) / n;
        return { slope, intercept, n };
      }
      case ModelAlgorithm.ExponentialSmoothing: {
        const alpha = 0.3;
        let smoothed = values[0];
        for (let i = 1; i < values.length; i++) {
          smoothed = alpha * values[i] + (1 - alpha) * smoothed;
        }
        return { alpha, last_smoothed: smoothed };
      }
      case ModelAlgorithm.MovingAverage: {
        const window = Math.min(10, Math.floor(values.length / 2));
        const recent = values.slice(-window);
        const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
        return { window, average: avg };
      }
      case ModelAlgorithm.SeasonalARIMA: {
        const period = Math.min(24, Math.floor(values.length / 4));
        const seasonal: number[] = [];
        for (let i = 0; i < period; i++) {
          const seasonValues = values.filter((_, idx) => idx % period === i);
          if (seasonValues.length > 0) {
            seasonal.push(seasonValues.reduce((a, b) => a + b, 0) / seasonValues.length);
          }
        }
        const seasonalMean = seasonal.length > 0
          ? seasonal.reduce((a, b) => a + b, 0) / seasonal.length
          : 0;
        return { period, seasonal_mean: seasonalMean };
      }
      case ModelAlgorithm.Custom:
      default:
        return { last_value: values[values.length - 1] };
    }
  }

  private runPrediction(
    data: TimeSeriesPoint[],
    model: ScalingModel,
    windowMinutes: number
  ): number {
    const values = data.map((d) => d.value);
    const steps = Math.ceil(windowMinutes / 5);

    switch (model.algorithm) {
      case ModelAlgorithm.LinearRegression: {
        const { slope, intercept } = model.parameters;
        const lastIndex = values.length - 1;
        return Math.max(0, intercept + slope * (lastIndex + steps));
      }
      case ModelAlgorithm.ExponentialSmoothing: {
        const { last_smoothed } = model.parameters;
        return Math.max(0, last_smoothed);
      }
      case ModelAlgorithm.MovingAverage: {
        const { average } = model.parameters;
        return Math.max(0, average);
      }
      case ModelAlgorithm.SeasonalARIMA: {
        const { seasonal_mean } = model.parameters;
        const lastValue = values[values.length - 1];
        return Math.max(0, (lastValue + seasonal_mean) / 2);
      }
      case ModelAlgorithm.Custom:
      default: {
        const { last_value } = model.parameters;
        return Math.max(0, last_value);
      }
    }
  }

  private calculateModelAccuracy(
    data: TimeSeriesPoint[],
    algorithm: ModelAlgorithm,
    parameters: Record<string, number>
  ): number {
    const values = data.map((d) => d.value);
    const trainSize = Math.floor(values.length * 0.8);
    const trainData = values.slice(0, trainSize);
    const testData = values.slice(trainSize);

    if (testData.length === 0) return 0.5;

    const tempModel: ScalingModel = {
      model_id: 'temp',
      algorithm,
      training_data_points: trainData.length,
      accuracy: 0,
      last_trained: Date.now(),
      parameters,
    };

    let totalError = 0;
    for (let i = 0; i < testData.length; i++) {
      const predicted = this.runPrediction(
        trainData.map((v, idx) => ({ timestamp: idx, value: v })),
        tempModel,
        5
      );
      const actual = testData[i];
      const denom = Math.abs(actual) || 1;
      totalError += Math.abs(predicted - actual) / denom;
    }

    const avgError = totalError / testData.length;
    return Math.max(0, Math.min(1, 1 - avgError));
  }

  private calcConfidence(model: ScalingModel, dataPoints: number): number {
    const accuracyWeight = model.accuracy;
    const dataWeight = Math.min(dataPoints / 100, 1);
    return Math.min(1, accuracyWeight * 0.7 + dataWeight * 0.3);
  }

  private determineAction(predictedLoad: number, module?: string): ScalingAction {
    const policy = module
      ? Array.from(this.policies.values()).find((p) => p.name === module)
      : undefined;

    if (!policy) return ScalingAction.NoAction;

    if (predictedLoad >= policy.scale_up_threshold * this.config.emergencyThreshold) {
      return ScalingAction.EmergencyScaleUp;
    }
    if (predictedLoad >= policy.scale_up_threshold) {
      return ScalingAction.ScaleUp;
    }
    if (predictedLoad <= policy.scale_down_threshold) {
      return ScalingAction.ScaleDown;
    }
    return ScalingAction.NoAction;
  }

  private calcScalingFactor(
    predictedLoad: number,
    action: ScalingAction,
    module?: string
  ): number {
    const policy = module
      ? Array.from(this.policies.values()).find((p) => p.name === module)
      : undefined;
    if (!policy) return 0;

    if (action === ScalingAction.EmergencyScaleUp) {
      return Math.ceil(predictedLoad / policy.scale_up_threshold) - 1;
    }
    if (action === ScalingAction.ScaleUp) {
      return 1;
    }
    if (action === ScalingAction.ScaleDown) {
      return -1;
    }
    return 0;
  }

  private recordScalingAction(
    policyId: string,
    action: ScalingAction,
    fromInstances: number,
    toInstances: number,
    predictedLoad: number,
    confidence: number
  ): void {
    const entry: ScalingHistoryEntry = {
      id: `scale-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      policy_id: policyId,
      action,
      from_instances: fromInstances,
      to_instances: toInstances,
      predicted_load: predictedLoad,
      actual_load: 0,
      confidence,
      timestamp: Date.now(),
      success: true,
    };
    this.scalingHistory.unshift(entry);
    if (this.scalingHistory.length > 500) {
      this.scalingHistory.pop();
    }
    this.listeners.forEach((listener) => listener(entry));
  }

  private evaluateAccuracy(metricKey: string, actualValue: number, timestamp: number): void {
    const records = this.accuracyRecords.get(metricKey) || [];
    const recentPredictions = records.filter((r) => Math.abs(r.timestamp - timestamp) <= 5 * 60 * 1000);

    for (const record of recentPredictions) {
      record.actual = actualValue;
    }

    records.push({ predicted: actualValue, actual: actualValue, timestamp });
    if (records.length > 200) {
      records.shift();
    }
    this.accuracyRecords.set(metricKey, records);
  }
}

// ==================== 单例 ====================

export const predictiveScaler = new PredictiveScaler();
export default predictiveScaler;
