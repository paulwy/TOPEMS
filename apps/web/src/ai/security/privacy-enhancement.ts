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

