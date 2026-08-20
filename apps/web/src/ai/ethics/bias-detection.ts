import i18n from '@/i18n';

export type BiasType = 'Gender' | 'Race' | 'Age' | 'Socioeconomic';

export type BiasSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface BiasReport {
  id: string;
  modelId: string;
  biasType: BiasType;
  severity: BiasSeverity;
  affectedGroups: string[];
  findings: string[];
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface BiasMetric {
  metric: string;
  group: string;
  value: number;
  threshold: number;
  deviation: number;
  severity: BiasSeverity;
}

export interface BiasRule {
  id: string;
  name: string;
  biasType: BiasType;
  description: string;
  threshold: number;
  severity: BiasSeverity;
  enabled: boolean;
}

const DEFAULT_RULES: BiasRule[] = [
  {
    id: 'rule-gender-parity',
    name: i18n.t('ai.bias-detection.k0'),
    biasType: 'Gender',
    description: i18n.t('ai.bias-detection.k1'),
    threshold: 0.1,
    severity: 'high',
    enabled: true,
  },
  {
    id: 'rule-race-parity',
    name: i18n.t('ai.bias-detection.k2'),
    biasType: 'Race',
    description: i18n.t('ai.bias-detection.k3'),
    threshold: 0.1,
    severity: 'high',
    enabled: true,
  },
  {
    id: 'rule-age-parity',
    name: i18n.t('ai.bias-detection.k4'),
    biasType: 'Age',
    description: i18n.t('ai.bias-detection.k5'),
    threshold: 0.15,
    severity: 'medium',
    enabled: true,
  },
  {
    id: 'rule-socioeconomic-parity',
    name: i18n.t('ai.bias-detection.k6'),
    biasType: 'Socioeconomic',
    description: i18n.t('ai.bias-detection.k7'),
    threshold: 0.15,
    severity: 'medium',
    enabled: true,
  },
];
