import i18n from '@/i18n';

export type RiskCategory = 'Security' | 'Compliance' | 'Performance' | 'Financial';
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export interface RiskIndicator {
  id: string;
  name: string;
  category: RiskCategory;
  threshold: number;
  current_value: number;
  severity: RiskLevel;
  unit: string;
  description: string;
  direction: 'above' | 'below';
  metadata?: Record<string, unknown>;
}

export interface RiskAlert {
  id: string;
  indicator_id: string;
  indicator_name: string;
  category: RiskCategory;
  severity: RiskLevel;
  message: string;
  created_at: number;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: number;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: number;
  evidence: string;
  channel: 'email' | 'sms' | 'webhook' | 'in_app';
  assignee?: string;
  tags: string[];
}

export interface RiskScore {
  overall: number;
  by_category: Record<RiskCategory, number>;
  bySeverity: Record<RiskLevel, number>;
  trend: 'improving' | 'stable' | 'deteriorating';
  components: Array<{
    indicator_id: string;
    score: number;
    weight: number;
    contribution: number;
  }>;
}

export type AlertSubscriber = (alert: RiskAlert) => void;

const DEFAULT_INDICATORS: RiskIndicator[] = [
  {
    id: 'sec-failed-logins',
    name: i18n.t('ai.risk-alerting.k0'),
    category: 'Security',
    threshold: 10,
    current_value: 3,
    severity: 'high',
    unit: '%',
    description: i18n.t('ai.risk-alerting.k1'),
    direction: 'above',
  },
  {
    id: 'sec-unusual-access',
    name: i18n.t('ai.risk-alerting.k2'),
    category: 'Security',
    threshold: 5,
    current_value: 1,
    severity: 'critical',
    unit: i18n.t('ai.risk-alerting.k3'),
    description: i18n.t('ai.risk-alerting.k4'),
    direction: 'above',
  },
  {
    id: 'comp-pending-items',
    name: i18n.t('ai.risk-alerting.k5'),
    category: 'Compliance',
    threshold: 20,
    current_value: 12,
    severity: 'medium',
    unit: i18n.t('ai.risk-alerting.k6'),
    description: i18n.t('ai.risk-alerting.k7'),
    direction: 'above',
  },
  {
    id: 'comp-regulation-gaps',
    name: i18n.t('ai.risk-alerting.k8'),
    category: 'Compliance',
    threshold: 3,
    current_value: 2,
    severity: 'high',
    unit: i18n.t('ai.risk-alerting.k9'),
    description: i18n.t('ai.risk-alerting.k10'),
    direction: 'above',
  },
  {
    id: 'perf-api-latency',
    name: i18n.t('ai.risk-alerting.api_0'),
    category: 'Performance',
    threshold: 500,
    current_value: 280,
    severity: 'medium',
    unit: 'ms',
    description: i18n.t('ai.risk-alerting.api_1'),
    direction: 'above',
  },
  {
    id: 'perf-error-rate',
    name: i18n.t('ai.risk-alerting.k11'),
    category: 'Performance',
    threshold: 1,
    current_value: 0.2,
    severity: 'high',
    unit: '%',
    description: i18n.t('ai.risk-alerting.k12'),
    direction: 'above',
  },
  {
    id: 'perf-resource-usage',
    name: i18n.t('ai.risk-alerting.k13'),
    category: 'Performance',
    threshold: 85,
    current_value: 62,
    severity: 'high',
    unit: '%',
    description: i18n.t('ai.risk-alerting.k14'),
    direction: 'above',
  },
  {
    id: 'fin-budget-utilization',
    name: i18n.t('ai.risk-alerting.k15'),
    category: 'Financial',
    threshold: 90,
    current_value: 68,
    severity: 'medium',
    unit: '%',
    description: i18n.t('ai.risk-alerting.k16'),
    direction: 'above',
  },
  {
    id: 'fin-revenue-decline',
    name: i18n.t('ai.risk-alerting.k17'),
    category: 'Financial',
    threshold: 10,
    current_value: 3,
    severity: 'high',
    unit: '%',
    description: i18n.t('ai.risk-alerting.k18'),
    direction: 'above',
  },
  {
    id: 'fin-cost-overrun',
    name: i18n.t('ai.risk-alerting.k19'),
    category: 'Financial',
    threshold: 15,
    current_value: 5,
    severity: 'medium',
    unit: '%',
    description: i18n.t('ai.risk-alerting.k20'),
    direction: 'above',
  },
];
