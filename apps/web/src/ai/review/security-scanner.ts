import i18n from '@/i18n';

export type SecurityCategory = 'XSS' | 'Injection' | 'CSRF' | 'Auth' | 'Encryption' | 'Exposure';
export type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low';

export interface SecurityFinding {
  id: string;
  category: SecurityCategory;
  severity: SecuritySeverity;
  file: string;
  line: number;
  description: string;
  remediation: string;
}

export interface ScanResult {
  findings: SecurityFinding[];
  risk_score: number;
  high_risk_count: number;
  scanned_at: number;
  passed: boolean;
}

export interface ScanRule {
  id: string;
  category: SecurityCategory;
  severity: SecuritySeverity;
  pattern: RegExp;
  description: string;
  remediation: string;
  owaspId: string;
}
