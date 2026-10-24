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
