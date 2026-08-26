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
