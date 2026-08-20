import i18n from '@/i18n';
// V58.0 平台 AI 演进 - 安全加固

export type SecurityCheckType =
  'InputValidation' | 'Sanitization' | 'RateLimit' | 'Encryption' | 'Audit';

export type SecuritySeverity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';

export type SecurityStatus = 'Passed' | 'Failed' | 'Warning' | 'Skipped';

export interface SecurityCheckV58 {
  id: string;
  type: SecurityCheckType;
  severity: SecuritySeverity;
  status: SecurityStatus;
  description: string;
  recommendation: string;
  checkedAt: number;
}

export type ThreatSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export type ThreatLikelihood = 'VeryLikely' | 'Likely' | 'Unlikely' | 'Rare';
export type ThreatImpact = 'VeryHigh' | 'High' | 'Medium' | 'Low';

export interface ThreatModel {
  id: string;
  threat_type: string;
  severity: ThreatSeverity;
  likelihood: ThreatLikelihood;
  impact: ThreatImpact;
  mitigation: string;
  status: 'Identified' | 'Mitigated' | 'Resolved';
}

export interface SecurityReport {
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  score: number;
  checks: SecurityCheckV58[];
  generatedAt: number;
}

type Listener = () => void;

const generateId = () => `sec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const CHECK_TEMPLATES: Omit<SecurityCheckV58, 'id' | 'checkedAt' | 'status'>[] = [
  {
    type: 'InputValidation',
    severity: 'Critical',
    description: i18n.t('ai.security-hardening.k0'),
    recommendation: i18n.t('ai.security-hardening.k1'),
  },
  {
    type: 'InputValidation',
    severity: 'High',
    description: i18n.t('ai.security-hardening.k2'),
    recommendation: i18n.t('ai.security-hardening.k0'),
  },
  {
    type: 'Sanitization',
    severity: 'High',
    description: i18n.t('ai.security-hardening.k1'),
    recommendation: i18n.t('ai.security-hardening.k2'),
  },
  {
    type: 'Sanitization',
    severity: 'Critical',
    description: i18n.t('ai.security-hardening.k3'),
    recommendation: i18n.t('ai.security-hardening.k4'),
  },
  {
    type: 'RateLimit',
    severity: 'Medium',
    description: i18n.t('ai.security-hardening.k3'),
    recommendation: i18n.t('ai.security-hardening.k5'),
  },
  {
    type: 'RateLimit',
    severity: 'High',
    description: i18n.t('ai.security-hardening.k4'),
    recommendation: i18n.t('ai.security-hardening.k6'),
  },
  {
    type: 'Encryption',
    severity: 'High',
    description: i18n.t('ai.security-hardening.k7'),
    recommendation: i18n.t('ai.security-hardening.k5'),
  },
  {
    type: 'Encryption',
    severity: 'High',
    description: i18n.t('ai.security-hardening.k8'),
    recommendation: i18n.t('ai.security-hardening.k9'),
  },
  {
    type: 'Audit',
    severity: 'Medium',
    description: i18n.t('ai.security-hardening.k10'),
    recommendation: i18n.t('ai.security-hardening.k11'),
  },
  {
    type: 'Audit',
    severity: 'High',
    description: i18n.t('ai.security-hardening.k12'),
    recommendation: i18n.t('ai.security-hardening.k13'),
  },
];

const DEFAULT_THREATS: Omit<ThreatModel, 'id'>[] = [
  {
    threat_type: 'Prompt Injection',
    severity: 'Critical',
    likelihood: 'VeryLikely',
    impact: 'VeryHigh',
    mitigation: i18n.t('ai.security-hardening.k6'),
    status: 'Identified',
  },
  {
    threat_type: 'Data Exfiltration',
    severity: 'Critical',
    likelihood: 'Likely',
    impact: 'VeryHigh',
    mitigation: i18n.t('ai.security-hardening.k7'),
    status: 'Mitigated',
  },
  {
    threat_type: 'Model Poisoning',
    severity: 'High',
    likelihood: 'Unlikely',
    impact: 'VeryHigh',
    mitigation: i18n.t('ai.security-hardening.k8'),
    status: 'Identified',
  },
  {
    threat_type: 'Adversarial Attack',
    severity: 'High',
    likelihood: 'Likely',
    impact: 'High',
    mitigation: i18n.t('ai.security-hardening.k9'),
    status: 'Mitigated',
  },
  {
    threat_type: 'API Abuse',
    severity: 'Medium',
    likelihood: 'VeryLikely',
    impact: 'Medium',
    mitigation: i18n.t('ai.security-hardening.k10'),
    status: 'Mitigated',
  },
  {
    threat_type: 'Sensitive Data Leakage',
    severity: 'High',
    likelihood: 'Likely',
    impact: 'High',
    mitigation: i18n.t('ai.security-hardening.k11'),
    status: 'Mitigated',
  },
  {
    threat_type: 'Rogue Model Access',
    severity: 'High',
    likelihood: 'Unlikely',
    impact: 'High',
    mitigation: i18n.t('ai.security-hardening.k12'),
    status: 'Identified',
  },
];

