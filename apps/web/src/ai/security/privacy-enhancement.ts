import i18n from '@/i18n';

export type NoiseStrategy = 'gaussian' | 'laplace' | 'exponential' | 'none';

export interface PrivacyConfig {
  id: string;
  modelId: string;
  differential_privacy_enabled: boolean;
  epsilon: number;
  delta: number;
  noise_strategy: NoiseStrategy;
  max_grad_norm?: number;
  l2_norm_clip?: number;
  description?: string;
  created_at: number;
  updated_at: number;
}

export interface PrivacyReport {
  configId: string;
  privacy_score: number;
  reidentification_risk: number;
  data_leakage_risk: number;
  recommendations: string[];
  breakdown: {
    differential_privacy: number;
    data_anonymization: number;
    access_control: number;
    audit_compliance: number;
  };
  generated_at: number;
}

export interface PrivacyTestResult {
  id: string;
  configId: string;
  modelId: string;
  test_type: 'membership_inference' | 'attribute_inference' | 'data_extraction';
  success_rate: number;
  privacy_preserved: number;
  details: Record<string, unknown>;
  timestamp: number;
  passed: boolean;
}

const DEFAULT_CONFIG: PrivacyConfig = {
  id: 'config-default',
  modelId: 'default-model',
  differential_privacy_enabled: true,
  epsilon: 1.0,
  delta: 1e-5,
  noise_strategy: 'gaussian',
  max_grad_norm: 1.0,
  l2_norm_clip: 1.0,
  description: i18n.t('ai.privacy-enhancement.k0'),
  created_at: Date.now(),
  updated_at: Date.now(),
};

const PRIVACY_TEMPLATES: Record<string, Partial<PrivacyConfig>> = {
  strict: {
    epsilon: 0.1,
    delta: 1e-6,
    noise_strategy: 'gaussian',
    description: i18n.t('ai.privacy-enhancement.k1'),
  },
  balanced: {
    epsilon: 1.0,
    delta: 1e-5,
    noise_strategy: 'gaussian',
    description: i18n.t('ai.privacy-enhancement.k2'),
  },
  relaxed: {
    epsilon: 10.0,
    delta: 1e-4,
    noise_strategy: 'laplace',
    description: i18n.t('ai.privacy-enhancement.k3'),
  },
};

export class PrivacyEnhancer {
  private static instance: PrivacyEnhancer | null = null;
  private configs: Map<string, PrivacyConfig> = new Map();
  private modelConfigs: Map<string, string> = new Map();
  private reports: Map<string, PrivacyReport> = new Map();
  private testResults: Map<string, PrivacyTestResult[]> = new Map();

  private constructor() {
    this.configs.set(DEFAULT_CONFIG.id, { ...DEFAULT_CONFIG });
  }

  static getInstance(): PrivacyEnhancer {
    if (!PrivacyEnhancer.instance) {
      PrivacyEnhancer.instance = new PrivacyEnhancer();
    }
    return PrivacyEnhancer.instance;
  }

  assessPrivacy(modelId: string, configId?: string): PrivacyReport {
    let config: PrivacyConfig | undefined;
    if (configId) {
      config = this.configs.get(configId);
    } else {
      const modelConfigId = this.modelConfigs.get(modelId) ?? DEFAULT_CONFIG.id;
      config = this.configs.get(modelConfigId);
    }
    if (!config) {
      config = this.configs.get(DEFAULT_CONFIG.id)!;
    }
    const cfg: PrivacyConfig = config;

    const dpScore = this.evaluateDifferentialPrivacy(cfg);
    const anonScore = this.evaluateAnonymization(cfg);
    const accessScore = this.evaluateAccessControl(cfg);
    const auditScore = this.evaluateAuditCompliance(cfg);

    const overallScore = (dpScore + anonScore + accessScore + auditScore) / 4;

    const reidentificationRisk = this.calculateReidentificationRisk(cfg, dpScore);
    const dataLeakageRisk = this.calculateDataLeakageRisk(cfg, overallScore);

    const report: PrivacyReport = {
      configId: cfg.id,
      privacy_score: Math.round(overallScore * 10000) / 10000,
      reidentification_risk: Math.round(reidentificationRisk * 10000) / 10000,
      data_leakage_risk: Math.round(dataLeakageRisk * 10000) / 10000,
      recommendations: this.generatePrivacyRecommendations(cfg, dpScore, anonScore, accessScore),
      breakdown: {
        differential_privacy: Math.round(dpScore * 10000) / 10000,
        data_anonymization: Math.round(anonScore * 10000) / 10000,
        access_control: Math.round(accessScore * 10000) / 10000,
        audit_compliance: Math.round(auditScore * 10000) / 10000,
      },
      generated_at: Date.now(),
    };

    this.reports.set(config.id, report);
    return report;
  }

  getPrivacyConfig(configId: string): PrivacyConfig | null {
    return this.configs.get(configId) ?? null;
  }

  updateConfig(configId: string, updates: Partial<PrivacyConfig>): PrivacyConfig {
    const existing = this.configs.get(configId);
    if (!existing) {
      throw new Error(`Privacy config not found: ${configId}`);
    }
    const updated: PrivacyConfig = {
      ...existing,
      ...updates,
      id: existing.id,
      updated_at: Date.now(),
    };
    this.configs.set(configId, updated);
    return updated;
  }

  getPrivacyReport(configId: string): PrivacyReport | null {
    return this.reports.get(configId) ?? null;
  }

  runPrivacyTest(
    configId: string,
    testType: 'membership_inference' | 'attribute_inference' | 'data_extraction'
  ): PrivacyTestResult {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error(`Privacy config not found: ${configId}`);
    }

    const baseSuccessRates: Record<string, number> = {
      membership_inference: 0.15,
      attribute_inference: 0.1,
      data_extraction: 0.05,
    };

    const dpReduction = config.differential_privacy_enabled
      ? Math.min(config.epsilon / (config.epsilon + 1), 0.9)
      : 0;

    const baseRate = baseSuccessRates[testType];
    const adjustedRate = baseRate * (1 - dpReduction);

    const result: PrivacyTestResult = {
      id: `priv-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      configId,
      modelId: config.modelId,
      test_type: testType,
      success_rate: Math.round(adjustedRate * 10000) / 10000,
      privacy_preserved: Math.round((1 - adjustedRate) * 10000) / 10000,
      details: {
        epsilon: config.epsilon,
        delta: config.delta,
        noise_strategy: config.noise_strategy,
        dp_enabled: config.differential_privacy_enabled,
      },
      timestamp: Date.now(),
      passed: adjustedRate < 0.3,
    };

    const results = this.testResults.get(configId) ?? [];
    results.push(result);
    this.testResults.set(configId, results);

    return result;
  }

  getDataLeakageRisk(configId: string): {
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    risk_score: number;
    factors: Array<{ factor: string; contribution: number }>;
  } {
    const config = this.configs.get(configId);
    if (!config) {
      return {
        risk_level: 'high',
        risk_score: 0.8,
        factors: [{ factor: i18n.t('ai.privacy-enhancement.k4'), contribution: 0.5 }],
      };
    }

    const factors: Array<{ factor: string; contribution: number }> = [];

    let riskScore = 0;

    if (!config.differential_privacy_enabled) {
      factors.push({ factor: i18n.t('ai.privacy-enhancement.k5'), contribution: 0.35 });
      riskScore += 0.35;
    } else {
      factors.push({ factor: i18n.t('ai.privacy-enhancement.k6'), contribution: -0.2 });
      riskScore += -0.2;
    }

    if (config.epsilon > 5.0) {
      factors.push({
        factor: `${i18n.t('ai.privacy-enhancement.epsilon_0')}${config.epsilon})`,
        contribution: 0.25,
      });
      riskScore += 0.25;
    } else if (config.epsilon <= 1.0) {
      factors.push({
        factor: `${i18n.t('ai.privacy-enhancement.epsilon_1')}${config.epsilon})`,
        contribution: -0.15,
      });
      riskScore += -0.15;
    }

    if (config.noise_strategy === 'none') {
      factors.push({ factor: i18n.t('ai.privacy-enhancement.k7'), contribution: 0.2 });
      riskScore += 0.2;
    } else {
      factors.push({
        factor: `${i18n.t('ai.privacy-enhancement.k2')}${config.noise_strategy}`,
        contribution: -0.1,
      });
      riskScore += -0.1;
    }

    riskScore = Math.max(0, Math.min(1, 0.5 + riskScore));

    const riskLevel =
      riskScore < 0.25
        ? 'low'
        : riskScore < 0.5
          ? 'medium'
          : riskScore < 0.75
            ? 'high'
            : 'critical';

    return {
      risk_level: riskLevel,
      risk_score: Math.round(riskScore * 10000) / 10000,
      factors,
    };
  }

  getRecommendations(configId: string): string[] {
    const config = this.configs.get(configId);
    if (!config) return [i18n.t('ai.privacy-enhancement.k8')];

    const recs: string[] = [];

    if (!config.differential_privacy_enabled) {
      recs.push(i18n.t('ai.privacy-enhancement.k9'));
    }

    if (config.epsilon > 1.0) {
      recs.push(i18n.t('ai.privacy-enhancement.k3'));
    }

    if (config.noise_strategy === 'none') {
      recs.push(i18n.t('ai.privacy-enhancement.k10'));
    }

    if (recs.length === 0) {
      recs.push(i18n.t('ai.privacy-enhancement.k11'));
    }

    return recs;
  }

  createConfig(config: Omit<PrivacyConfig, 'id' | 'created_at' | 'updated_at'>): PrivacyConfig {
    const newConfig: PrivacyConfig = {
      ...config,
      id: `config-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    this.configs.set(newConfig.id, newConfig);
    this.modelConfigs.set(newConfig.modelId, newConfig.id);
    return newConfig;
  }

  createFromTemplate(modelId: string, template: keyof typeof PRIVACY_TEMPLATES): PrivacyConfig {
    const templateConfig = PRIVACY_TEMPLATES[template];
    return this.createConfig({
      ...DEFAULT_CONFIG,
      ...templateConfig,
      modelId,
    });
  }

  listConfigs(): PrivacyConfig[] {
    return Array.from(this.configs.values());
  }

  listTestResults(configId: string): PrivacyTestResult[] {
    return this.testResults.get(configId) ?? [];
  }

  private evaluateDifferentialPrivacy(config: PrivacyConfig): number {
    if (!config.differential_privacy_enabled) return 0.3;
    const epsilonScore = Math.max(0, 1 - config.epsilon / 10);
    const deltaScore = Math.max(0, 1 - Math.abs(Math.log10(config.delta)) / 10);
    const noiseScore = config.noise_strategy === 'none' ? 0.2 : 0.8;
    return epsilonScore * 0.4 + deltaScore * 0.3 + noiseScore * 0.3;
  }

  private evaluateAnonymization(_config: PrivacyConfig): number {
    return 0.65;
  }

  private evaluateAccessControl(_config: PrivacyConfig): number {
    return 0.7;
  }

  private evaluateAuditCompliance(_config: PrivacyConfig): number {
    return 0.75;
  }

  private calculateReidentificationRisk(config: PrivacyConfig, dpScore: number): number {
    const baseRisk = 0.5;
    const dpReduction = dpScore * 0.6;
    const noiseReduction = config.noise_strategy !== 'none' ? 0.15 : 0;
    return Math.max(0, baseRisk - dpReduction - noiseReduction);
  }

  private calculateDataLeakageRisk(config: PrivacyConfig, overallScore: number): number {
    const baseRisk = 1 - overallScore;
    const dpFactor = config.differential_privacy_enabled ? 0.7 : 1.0;
    return Math.min(1, baseRisk * dpFactor);
  }

  private generatePrivacyRecommendations(
    config: PrivacyConfig,
    dpScore: number,
    anonScore: number,
    accessScore: number
  ): string[] {
    const recs: string[] = [];

    if (dpScore < 0.6) {
      recs.push(i18n.t('ai.privacy-enhancement.k12'));
    }
    if (anonScore < 0.6) {
      recs.push(i18n.t('ai.privacy-enhancement.k13'));
    }
    if (accessScore < 0.6) {
      recs.push(i18n.t('ai.privacy-enhancement.k14'));
    }
    if (!config.differential_privacy_enabled) {
      recs.push(i18n.t('ai.privacy-enhancement.k15'));
    }

    if (recs.length === 0) {
      recs.push(i18n.t('ai.privacy-enhancement.k16'));
    }

    return recs;
  }
}

export const privacyEnhancer = PrivacyEnhancer.getInstance();
