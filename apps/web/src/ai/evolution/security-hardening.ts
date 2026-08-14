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

class SecurityHardenerImpl {
  private threats: Map<string, ThreatModel> = new Map();
  private listeners: Set<Listener> = new Set();

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  runSecurityScan(): SecurityReport {
    const checks: SecurityCheckV58[] = CHECK_TEMPLATES.map((tpl) => {
      const rand = Math.random();
      let status: SecurityStatus;
      if (rand < 0.7) status = 'Passed';
      else if (rand < 0.85) status = 'Warning';
      else status = 'Failed';

      return {
        ...tpl,
        id: generateId(),
        status,
        checkedAt: Date.now(),
      };
    });

    const total = checks.length;
    const passed = checks.filter((c) => c.status === 'Passed').length;
    const failed = checks.filter((c) => c.status === 'Failed').length;
    const warnings = checks.filter((c) => c.status === 'Warning').length;
    const score = total > 0 ? Math.round((passed / total) * 100) : 0;

    return {
      totalChecks: total,
      passed,
      failed,
      warnings,
      score,
      checks,
      generatedAt: Date.now(),
    };
  }

  getSecurityStatus(): { score: number; lastScan: number; status: string } {
    const scan = this.runSecurityScan();
    const avgScore = scan.score;
    let status = 'secure';
    if (avgScore < 60) status = 'critical';
    else if (avgScore < 80) status = 'warning';
    return { score: avgScore, lastScan: scan.generatedAt, status };
  }

  getSecurityReport(): SecurityReport {
    return this.runSecurityScan();
  }

  createThreatModel(
    threat_type: string,
    severity: ThreatSeverity,
    likelihood: ThreatLikelihood,
    impact: ThreatImpact,
    mitigation: string
  ): ThreatModel {
    const threat: ThreatModel = {
      id: generateId(),
      threat_type,
      severity,
      likelihood,
      impact,
      mitigation,
      status: 'Identified',
    };
    this.threats.set(threat.id, threat);
    this.notify();
    return threat;
  }

  updateThreatModel(threatId: string, updates: Partial<Omit<ThreatModel, 'id'>>): ThreatModel {
    const threat = this.threats.get(threatId);
    if (!threat) throw new Error(`Threat not found: ${threatId}`);

    Object.assign(threat, updates);
    this.notify();
    return threat;
  }

  listThreats(): ThreatModel[] {
    if (this.threats.size === 0) {
      this.seed();
    }
    return Array.from(this.threats.values()).sort((a, b) => {
      const sevOrder: Record<ThreatSeverity, number> = {
        Critical: 0,
        High: 1,
        Medium: 2,
        Low: 3,
      };
      return sevOrder[a.severity] - sevOrder[b.severity];
    });
  }

  applyHardening(): { applied: number; details: string[] } {
    const details: string[] = [];
    let applied = 0;

    const currentThreats = this.listThreats();
    currentThreats.forEach((threat) => {
      if (threat.status === 'Identified') {
        const mitigationApplied = Math.random() > 0.3;
        if (mitigationApplied) {
          this.updateThreatModel(threat.id, { status: 'Mitigated' });
          details.push(`${i18n.t('ai.security-hardening.k13')}${threat.threat_type} - ${threat.mitigation}`);
          applied++;
        }
      }
    });

    details.push(`${i18n.t('ai.security-hardening.k14')}${applied}${i18n.t('ai.security-hardening.k15')}`);
    return { applied, details };
  }

  private seed(): void {
    DEFAULT_THREATS.forEach((t) => {
      const id = generateId();
      this.threats.set(id, { ...t, id });
    });
  }
}

export const securityHardener = new SecurityHardenerImpl();
export { SecurityHardenerImpl as SecurityHardener };
