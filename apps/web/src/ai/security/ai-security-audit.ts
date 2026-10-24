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
