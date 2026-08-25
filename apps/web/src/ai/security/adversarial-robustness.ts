import i18n from '@/i18n';

export type AttackType = 'PromptInjection' | 'ModelPoisoning' | 'DataExfiltration' | 'SideChannel';

export type AttackSeverity = 'critical' | 'high' | 'medium' | 'low';

export type TestStatus = 'completed' | 'running' | 'failed' | 'pending';

export interface AttackVector {
  id: string;
  type: AttackType;
  severity: AttackSeverity;
  vector: string;
  mitigation: string;
  description?: string;
  examples?: string[];
}

export interface RobustnessTest {
  id: string;
  modelId: string;
  attackVector: AttackVector;
  success_rate: number;
  defense_rate: number;
  status: TestStatus;
  details?: {
    test_cases: number;
    passed_cases: number;
    failed_cases: number;
    mitigations_applied: string[];
    timestamp: number;
    duration_ms: number;
  };
}

export interface Defense {
  id: string;
  name: string;
  type: AttackType;
  description: string;
  enabled: boolean;
  effectiveness: number;
  configuration: Record<string, unknown>;
}

const DEFAULT_ATTACK_VECTORS: AttackVector[] = [
  {
    id: 'av-prompt-injection',
    type: 'PromptInjection',
    severity: 'critical',
    vector: i18n.t('ai.adversarial-robustness.k0'),
    mitigation: i18n.t('ai.adversarial-robustness.k1'),
    description: i18n.t('ai.adversarial-robustness.k2'),
    examples: [
      i18n.t('ai.adversarial-robustness.k3'),
      i18n.t('ai.adversarial-robustness.system_0'),
    ],
  },
  {
    id: 'av-model-poisoning',
    type: 'ModelPoisoning',
    severity: 'critical',
    vector: i18n.t('ai.adversarial-robustness.k4'),
    mitigation: i18n.t('ai.adversarial-robustness.k5'),
    description: i18n.t('ai.adversarial-robustness.k6'),
    examples: [i18n.t('ai.adversarial-robustness.k8'), i18n.t('ai.adversarial-robustness.k7')],
  },
  {
    id: 'av-data-exfiltration',
    type: 'DataExfiltration',
    severity: 'high',
    vector: i18n.t('ai.adversarial-robustness.k9'),
    mitigation: i18n.t('ai.adversarial-robustness.k10'),
    description: i18n.t('ai.adversarial-robustness.k11'),
    examples: [i18n.t('ai.adversarial-robustness.k13'), i18n.t('ai.adversarial-robustness.k12')],
  },
  {
    id: 'av-side-channel',
    type: 'SideChannel',
    severity: 'medium',
    vector: i18n.t('ai.adversarial-robustness.k14'),
    mitigation: i18n.t('ai.adversarial-robustness.k15'),
    description: i18n.t('ai.adversarial-robustness.k16'),
    examples: [i18n.t('ai.adversarial-robustness.k18'), i18n.t('ai.adversarial-robustness.k17')],
  },
];

const DEFAULT_DEFENSES: Defense[] = [
  {
    id: 'def-input-sanitization',
    name: i18n.t('ai.adversarial-robustness.k19'),
    type: 'PromptInjection',
    description: i18n.t('ai.adversarial-robustness.k20'),
    enabled: true,
    effectiveness: 0.85,
    configuration: {
      max_input_length: 4096,
      block_patterns: ['ignore previous', 'disregard', 'system prompt'],
      sanitize_html: true,
    },
  },
  {
    id: 'def-output-filter',
    name: i18n.t('ai.adversarial-robustness.k21'),
    type: 'DataExfiltration',
    description: i18n.t('ai.adversarial-robustness.k22'),
    enabled: true,
    effectiveness: 0.8,
    configuration: {
      block_pii: true,
      block_secrets: true,
      max_output_length: 8192,
    },
  },
  {
    id: 'def-dp-noise',
    name: i18n.t('ai.adversarial-robustness.k23'),
    type: 'DataExfiltration',
    description: i18n.t('ai.adversarial-robustness.k24'),
    enabled: false,
    effectiveness: 0.6,
    configuration: {
      epsilon: 1.0,
      delta: 1e-5,
      noise_type: 'gaussian',
    },
  },
  {
    id: 'def-behavior-guard',
    name: i18n.t('ai.adversarial-robustness.k25'),
    type: 'ModelPoisoning',
    description: i18n.t('ai.adversarial-robustness.k26'),
    enabled: true,
    effectiveness: 0.75,
    configuration: {
      anomaly_threshold: 2.0,
      auto_block: true,
      alert_on_anomaly: true,
    },
  },
];
