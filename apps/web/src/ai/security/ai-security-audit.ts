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
