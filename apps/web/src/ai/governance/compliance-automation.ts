export type Regulation = 'GDPR' | 'SOX' | 'HIPAA' | 'PCI';
export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface ComplianceRule {
  id: string;
  name: string;
  regulation: Regulation;
  check_type:
    | 'data_access'
    | 'data_encryption'
    | 'audit_logging'
    | 'user_consent'
    | 'data_retention'
    | 'network_security'
    | 'authentication'
    | 'authorization';
  severity: Severity;
  action: string;
  description: string;
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

export interface ComplianceCheck {
  id: string;
  rule_id: string;
  rule_name: string;
  regulation: Regulation;
  passed: boolean;
  evidence: string;
  timestamp: number;
  entity: string;
  severity: Severity;
  details?: Record<string, unknown>;
}

export interface ComplianceReport {
  generated_at: number;
  summary: {
    total_rules: number;
    passed_checks: number;
    failed_checks: number;
    pass_rate: number;
    regulationsCoverage: Regulation[];
  };
  checks: ComplianceCheck[];
  recommendations: string[];
}
