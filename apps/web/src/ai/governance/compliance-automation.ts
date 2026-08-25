import i18n from '@/i18n';

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

const DEFAULT_RULES: ComplianceRule[] = [
  {
    id: 'gdpr-data-access',
    name: i18n.t('ai.compliance-automation.gdpr_0'),
    regulation: 'GDPR',
    check_type: 'data_access',
    severity: 'high',
    action: i18n.t('ai.compliance-automation.k0'),
    description: i18n.t('ai.compliance-automation.k1'),
    enabled: true,
  },
  {
    id: 'gdpr-encryption',
    name: i18n.t('ai.compliance-automation.gdpr_1'),
    regulation: 'GDPR',
    check_type: 'data_encryption',
    severity: 'high',
    action: i18n.t('ai.compliance-automation.tls_2'),
    description: i18n.t('ai.compliance-automation.k3'),
    enabled: true,
  },
  {
    id: 'gdpr-consent',
    name: i18n.t('ai.compliance-automation.gdpr_2'),
    regulation: 'GDPR',
    check_type: 'user_consent',
    severity: 'medium',
    action: i18n.t('ai.compliance-automation.k4'),
    description: i18n.t('ai.compliance-automation.k5'),
    enabled: true,
  },
  {
    id: 'gdpr-retention',
    name: i18n.t('ai.compliance-automation.gdpr_3'),
    regulation: 'GDPR',
    check_type: 'data_retention',
    severity: 'medium',
    action: i18n.t('ai.compliance-automation.k6'),
    description: i18n.t('ai.compliance-automation.k7'),
    enabled: true,
  },
  {
    id: 'sox-audit',
    name: i18n.t('ai.compliance-automation.sox_4'),
    regulation: 'SOX',
    check_type: 'audit_logging',
    severity: 'critical',
    action: i18n.t('ai.compliance-automation.k8'),
    description: i18n.t('ai.compliance-automation.k9'),
    enabled: true,
  },
  {
    id: 'sox-access',
    name: i18n.t('ai.compliance-automation.sox_5'),
    regulation: 'SOX',
    check_type: 'authorization',
    severity: 'high',
    action: i18n.t('ai.compliance-automation.k10'),
    description: i18n.t('ai.compliance-automation.k11'),
    enabled: true,
  },
  {
    id: 'hipaa-phi',
    name: i18n.t('ai.compliance-automation.hipaaphi_6'),
    regulation: 'HIPAA',
    check_type: 'data_access',
    severity: 'critical',
    action: i18n.t('ai.compliance-automation.k12'),
    description: i18n.t('ai.compliance-automation.k13'),
    enabled: true,
  },
  {
    id: 'hipaa-baa',
    name: i18n.t('ai.compliance-automation.k7'),
    regulation: 'HIPAA',
    check_type: 'authorization',
    severity: 'high',
    action: i18n.t('ai.compliance-automation.baa_14'),
    description: i18n.t('ai.compliance-automation.k15'),
    enabled: true,
  },
  {
    id: 'pci-encryption',
    name: i18n.t('ai.compliance-automation.pcidss_8'),
    regulation: 'PCI',
    check_type: 'data_encryption',
    severity: 'critical',
    action: i18n.t('ai.compliance-automation.k16'),
    description: i18n.t('ai.compliance-automation.k17'),
    enabled: true,
  },
  {
    id: 'pci-network',
    name: i18n.t('ai.compliance-automation.pcidss_9'),
    regulation: 'PCI',
    check_type: 'network_security',
    severity: 'high',
    action: i18n.t('ai.compliance-automation.k18'),
    description: i18n.t('ai.compliance-automation.k19'),
    enabled: true,
  },
  {
    id: 'pci-auth',
    name: i18n.t('ai.compliance-automation.pcidss_10'),
    regulation: 'PCI',
    check_type: 'authentication',
    severity: 'high',
    action: i18n.t('ai.compliance-automation.k20'),
    description: i18n.t('ai.compliance-automation.k21'),
    enabled: true,
  },
  {
    id: 'pci-audit',
    name: i18n.t('ai.compliance-automation.pcidss_11'),
    regulation: 'PCI',
    check_type: 'audit_logging',
    severity: 'high',
    action: i18n.t('ai.compliance-automation.k22'),
    description: i18n.t('ai.compliance-automation.k23'),
    enabled: true,
  },
];
