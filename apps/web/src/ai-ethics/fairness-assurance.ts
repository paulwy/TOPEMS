export type FairnessType = 'Demographic' | 'Equalized' | 'Calibrated';

export type AuditStatus = 'passed' | 'failed' | 'warning';

export interface FairnessConfig {
  id: string;
  modelId: string;
  fairnessType: FairnessType;
  thresholds: Record<string, number>;
  protectedAttributes: string[];
  enabled: boolean;
  updatedAt: number;
}

export interface FairnessResult {
  id: string;
  modelId: string;
  fairnessScore: number;
  parityDifference: number;
  equalizedOdds: number;
  calibrationScore: number;
  passed: boolean;
  details: Record<string, unknown>;
  timestamp: number;
  duration_ms: number;
}

export interface FairnessTrend {
  timestamp: number;
  score: number;
  parityDifference: number;
  calibrationScore: number;
}

export interface FairnessBenchmark {
  modelId: string;
  industryAverage: number;
  topQuartile: number;
  yourScore: number;
  percentile: number;
  ranking: string;
}

const DEFAULT_CONFIGS: Omit<FairnessConfig, 'id' | 'updatedAt'>[] = [
  {
    modelId: 'default-model',
    fairnessType: 'Demographic',
    thresholds: { demographic_parity_diff: 0.1, equalized_odds_diff: 0.1, calibration_diff: 0.05 },
    protectedAttributes: ['gender', 'race', 'age'],
    enabled: true,
  },
  {
    modelId: 'default-model',
    fairnessType: 'Equalized',
    thresholds: { true_positive_rate_diff: 0.1, false_positive_rate_diff: 0.1 },
    protectedAttributes: ['gender', 'race', 'age', 'socioeconomic'],
    enabled: true,
  },
  {
    modelId: 'default-model',
    fairnessType: 'Calibrated',
    thresholds: { calibration_diff: 0.05, coverage_diff: 0.1 },
    protectedAttributes: ['gender', 'race', 'age'],
    enabled: true,
  },
];

export class FairnessAssurance {
  private static instance: FairnessAssurance | null = null;
  private configs: Map<string, FairnessConfig> = new Map();
  private results: Map<string, FairnessResult> = new Map();
  private trends: Map<string, FairnessTrend[]> = new Map();
  private modelConfigs: Map<string, string[]> = new Map();

  private constructor() {
    DEFAULT_CONFIGS.forEach((config) => {
      const id = `cfg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const fairnessConfig: FairnessConfig = {
        ...config,
        id,
        updatedAt: Date.now(),
      };
      this.configs.set(id, fairnessConfig);
      const modelList = this.modelConfigs.get(config.modelId) ?? [];
      modelList.push(id);
      this.modelConfigs.set(config.modelId, modelList);
    });
  }

  static getInstance(): FairnessAssurance {
    if (!FairnessAssurance.instance) {
      FairnessAssurance.instance = new FairnessAssurance();
    }
    return FairnessAssurance.instance;
  }

  compute_fairness(modelId: string, options?: { fairnessType?: FairnessType }): FairnessResult {
    const startTime = Date.now();
    const type = options?.fairnessType;
    const configs = this.get_configs_for_model(modelId, type);

    let totalScore = 0;
    let totalParity = 0;
    let totalCalibration = 0;
    const details: Record<string, unknown> = {};

    for (const config of configs) {
      if (!config.enabled) continue;

      const { fairnessScore, parityDifference, calibrationScore } = this.compute_metrics(config);

      totalScore += fairnessScore;
      totalParity += parityDifference;
      totalCalibration += calibrationScore;

      details[config.fairnessType] = {
        fairnessScore,
        parityDifference,
        calibrationScore,
        thresholds: config.thresholds,
        protectedAttributes: config.protectedAttributes,
      };
    }

    const count = Math.max(configs.filter((c) => c.enabled).length, 1);
    const fairnessScore = Math.round((totalScore / count) * 10000) / 10000;
    const parityDifference = Math.round((totalParity / count) * 10000) / 10000;
    const calibrationScore = Math.round((totalCalibration / count) * 10000) / 10000;
    const equalizedOdds = Math.round(((parityDifference + calibrationScore) / 2) * 10000) / 10000;

    const passed = fairnessScore >= 0.8 && parityDifference <= 0.1 && calibrationScore >= 0.7;

    const result: FairnessResult = {
      id: `fair-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      modelId,
      fairnessScore,
      parityDifference,
      equalizedOdds,
      calibrationScore,
      passed,
      details,
      timestamp: Date.now(),
      duration_ms: Date.now() - startTime,
    };

    this.results.set(result.id, result);

    const trend = this.trends.get(modelId) ?? [];
    trend.push({
      timestamp: result.timestamp,
      score: fairnessScore,
      parityDifference,
      calibrationScore,
    });
    if (trend.length > 50) trend.shift();
    this.trends.set(modelId, trend);

    return result;
  }

  get_fairness_config(configId: string): FairnessConfig | null {
    return this.configs.get(configId) ?? null;
  }

  update_config(
    configId: string,
    updates: Partial<Omit<FairnessConfig, 'id' | 'updatedAt'>>
  ): FairnessConfig | null {
    const config = this.configs.get(configId);
    if (!config) return null;
    const updated: FairnessConfig = {
      ...config,
      ...updates,
      updatedAt: Date.now(),
    };
    this.configs.set(configId, updated);
    return updated;
  }

  get_fairness_result(resultId: string): FairnessResult | null {
    return this.results.get(resultId) ?? null;
  }

  get_fairness_trends(modelId: string): FairnessTrend[] {
    return this.trends.get(modelId) ?? [];
  }

  run_fairness_audit(modelId: string): {
    status: AuditStatus;
    results: FairnessResult[];
    summary: {
      total_checks: number;
      passed: number;
      failed: number;
      avg_score: number;
    };
  } {
    const configs = this.get_configs_for_model(modelId);
    const results: FairnessResult[] = [];

    for (const config of configs) {
      const result = this.compute_fairness(modelId, { fairnessType: config.fairnessType });
      results.push(result);
    }

    const passed = results.filter((r) => r.passed).length;
    const failed = results.length - passed;
    const avgScore =
      results.length > 0
        ? Math.round(
            (results.reduce((sum, r) => sum + r.fairnessScore, 0) / results.length) * 100
          ) / 100
        : 0;

    const status: AuditStatus = failed === 0 ? 'passed' : failed <= 1 ? 'warning' : 'failed';

    return {
      status,
      results,
      summary: {
        total_checks: results.length,
        passed,
        failed,
        avg_score: avgScore,
      },
    };
  }

  get_fairness_benchmark(modelId: string): FairnessBenchmark {
    const trend = this.trends.get(modelId) ?? [];
    const yourScore = trend.length > 0 ? trend[trend.length - 1].score : 0.75;

    const industryAverage = 0.78;
    const topQuartile = 0.92;
    const percentile = Math.max(1, Math.min(99, Math.round(yourScore * 100)));
    let ranking = '低于行业平均';
    if (yourScore >= topQuartile) ranking = '顶尖 25%';
    else if (yourScore >= industryAverage) ranking = '高于行业平均';
    else if (yourScore >= 0.6) ranking = '接近行业平均';

    return {
      modelId,
      industryAverage,
      topQuartile,
      yourScore,
      percentile,
      ranking,
    };
  }

  list_results(modelId?: string, limit?: number): FairnessResult[] {
    const all = Array.from(this.results.values());
    const filtered = modelId ? all.filter((r) => r.modelId === modelId) : all;
    const sorted = filtered.sort((a, b) => b.timestamp - a.timestamp);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  private get_configs_for_model(modelId: string, type?: FairnessType): FairnessConfig[] {
    const configIds = this.modelConfigs.get(modelId) ?? [];
    let configs = configIds
      .map((id) => this.configs.get(id))
      .filter((c): c is FairnessConfig => c !== undefined);
    if (type) configs = configs.filter((c) => c.fairnessType === type);
    return configs;
  }

  private compute_metrics(config: FairnessConfig): {
    fairnessScore: number;
    parityDifference: number;
    calibrationScore: number;
  } {
    const attrs = config.protectedAttributes;
    let totalParity = 0;
    let totalCalibration = 0;

    for (const _attr of attrs) {
      const parityNoise = Math.random() * 0.2;
      const calibNoise = Math.random() * 0.15;
      totalParity += parityNoise;
      totalCalibration += 1 - calibNoise;
    }

    const parityDifference = attrs.length > 0 ? totalParity / attrs.length : 0;
    const calibrationScore = attrs.length > 0 ? totalCalibration / attrs.length : 0.8;

    const parityThreshold = config.thresholds.demographic_parity_diff ?? 0.1;
    const calibThreshold = config.thresholds.calibration_diff ?? 0.05;

    const parityScore = Math.max(0, 1 - parityDifference / Math.max(parityThreshold * 2, 0.01));
    const calibScore = Math.max(0, Math.min(1, calibrationScore));

    const fairnessScore = Math.round((parityScore * 0.5 + calibScore * 0.5) * 10000) / 10000;

    return {
      fairnessScore,
      parityDifference: Math.round(parityDifference * 10000) / 10000,
      calibrationScore: Math.round(calibrationScore * 10000) / 10000,
    };
  }
}

export const fairnessAssurance = FairnessAssurance.getInstance();
