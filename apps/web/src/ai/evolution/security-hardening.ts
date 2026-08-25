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
