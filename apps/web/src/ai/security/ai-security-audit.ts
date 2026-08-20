import i18n from '@/i18n';

export type AuditType = 'InputValidation' | 'OutputFilter' | 'PromptInjection' | 'DataLeakage';

export type AuditSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface SecurityAudit {
  id: string;
  modelId: string;
  type: AuditType;
  severity: AuditSeverity;
  finding: string;
  remediation: string;
  ruleId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface AuditResult {
  auditId: string;
  passed: boolean;
  score: number;
  findings: SecurityAudit[];
  recommendations: string[];
  timestamp: number;
  modelId: string;
  duration_ms: number;
}

export interface AuditRule {
  id: string;
  name: string;
  type: AuditType;
  description: string;
  pattern: string;
  severity: AuditSeverity;
  enabled: boolean;
  remediation: string;
}

const DEFAULT_RULES: AuditRule[] = [
  {
    id: 'rule-input-validation',
    name: i18n.t('ai.ai-security-audit.k0'),
    type: 'InputValidation',
    description: i18n.t('ai.ai-security-audit.k1'),
    pattern: 'input_validation',
    severity: 'high',
    enabled: true,
    remediation: i18n.t('ai.ai-security-audit.k2'),
  },
  {
    id: 'rule-output-filter',
    name: i18n.t('ai.ai-security-audit.k3'),
    type: 'OutputFilter',
    description: i18n.t('ai.ai-security-audit.k4'),
    pattern: 'output_filter',
    severity: 'medium',
    enabled: true,
    remediation: i18n.t('ai.ai-security-audit.k5'),
  },
  {
    id: 'rule-prompt-injection',
    name: i18n.t('ai.ai-security-audit.k6'),
    type: 'PromptInjection',
    description: i18n.t('ai.ai-security-audit.k7'),
    pattern: 'prompt_injection',
    severity: 'critical',
    enabled: true,
    remediation: i18n.t('ai.ai-security-audit.k8'),
  },
  {
    id: 'rule-data-leakage',
    name: i18n.t('ai.ai-security-audit.k9'),
    type: 'DataLeakage',
    description: i18n.t('ai.ai-security-audit.k10'),
    pattern: 'data_leakage',
    severity: 'critical',
    enabled: true,
    remediation: i18n.t('ai.ai-security-audit.k11'),
  },
];

