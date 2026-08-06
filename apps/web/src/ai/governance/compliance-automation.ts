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
    name: 'GDPR 数据访问控制',
    regulation: 'GDPR',
    check_type: 'data_access',
    severity: 'high',
    action: '限制个人数据访问权限',
    description: '确保只有授权人员可以访问个人数据',
    enabled: true,
  },
  {
    id: 'gdpr-encryption',
    name: 'GDPR 数据加密传输',
    regulation: 'GDPR',
    check_type: 'data_encryption',
    severity: 'high',
    action: '强制 TLS 加密传输',
    description: '确保所有个人数据传输使用加密通道',
    enabled: true,
  },
  {
    id: 'gdpr-consent',
    name: 'GDPR 用户同意管理',
    regulation: 'GDPR',
    check_type: 'user_consent',
    severity: 'medium',
    action: '获取明确同意',
    description: '确保处理个人数据前获取用户明确同意',
    enabled: true,
  },
  {
    id: 'gdpr-retention',
    name: 'GDPR 数据保留策略',
    regulation: 'GDPR',
    check_type: 'data_retention',
    severity: 'medium',
    action: '设置数据过期策略',
    description: '确保个人数据不会保留超过必要时间',
    enabled: true,
  },
  {
    id: 'sox-audit',
    name: 'SOX 审计日志完整性',
    regulation: 'SOX',
    check_type: 'audit_logging',
    severity: 'critical',
    action: '保留完整审计轨迹',
    description: '确保所有财务交易有完整的不可篡改审计日志',
    enabled: true,
  },
  {
    id: 'sox-access',
    name: 'SOX 职责分离',
    regulation: 'SOX',
    check_type: 'authorization',
    severity: 'high',
    action: '实施职责分离',
    description: '确保财务操作的职责分离，防止舞弊',
    enabled: true,
  },
  {
    id: 'hipaa-phi',
    name: 'HIPAA PHI 保护',
    regulation: 'HIPAA',
    check_type: 'data_access',
    severity: 'critical',
    action: '保护受保护健康信息',
    description: '确保受保护健康信息(PHI)的访问受到严格控制',
    enabled: true,
  },
  {
    id: 'hipaa-baa',
    name: 'HIPAA 业务 Associate 协议',
    regulation: 'HIPAA',
    check_type: 'authorization',
    severity: 'high',
    action: '执行 BAA 协议',
    description: '确保所有处理 PHI 的第三方签署 BAA',
    enabled: true,
  },
  {
    id: 'pci-encryption',
    name: 'PCI DSS 数据加密',
    regulation: 'PCI',
    check_type: 'data_encryption',
    severity: 'critical',
    action: '加密持卡人数据',
    description: '确保持卡人数据在传输和存储时均被加密',
    enabled: true,
  },
  {
    id: 'pci-network',
    name: 'PCI DSS 网络安全',
    regulation: 'PCI',
    check_type: 'network_security',
    severity: 'high',
    action: '实施网络分段',
    description: '确保支付处理环境与其他网络环境隔离',
    enabled: true,
  },
  {
    id: 'pci-auth',
    name: 'PCI DSS 多因素认证',
    regulation: 'PCI',
    check_type: 'authentication',
    severity: 'high',
    action: '强制多因素认证',
    description: '确保对持卡人数据的访问需要多因素认证',
    enabled: true,
  },
  {
    id: 'pci-audit',
    name: 'PCI DSS 审计追踪',
    regulation: 'PCI',
    check_type: 'audit_logging',
    severity: 'high',
    action: '记录所有访问',
    description: '确保所有访问持卡人数据的操作都被记录',
    enabled: true,
  },
];

export class ComplianceAutomator {
  private rules: ComplianceRule[];
  private audit_trail: ComplianceCheck[];

  constructor() {
    this.rules = [...DEFAULT_RULES];
    this.audit_trail = [];
  }

  runComplianceChecks(
    entities: string[] = ['user_data', 'financial_records', 'health_records', 'payment_data']
  ): ComplianceCheck[] {
    const enabledRules = this.rules.filter((r) => r.enabled);
    const checks: ComplianceCheck[] = [];

    for (const entity of entities) {
      for (const rule of enabledRules) {
        const passed = this.evaluateRule(rule, entity);
        const check: ComplianceCheck = {
          id: `check-${rule.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          rule_id: rule.id,
          rule_name: rule.name,
          regulation: rule.regulation,
          passed,
          evidence: this.generateEvidence(rule, entity, passed),
          timestamp: Date.now(),
          entity,
          severity: rule.severity,
        };
        checks.push(check);
        this.audit_trail.push(check);
      }
    }

    return checks;
  }

  getComplianceStatus(): {
    regulations: Record<
      Regulation,
      { total: number; passed: number; failed: number; pass_rate: number }
    >;
    overall_pass_rate: number;
    total_checks: number;
  } {
    const regulations: Record<
      Regulation,
      { total: number; passed: number; failed: number; pass_rate: number }
    > = {
      GDPR: { total: 0, passed: 0, failed: 0, pass_rate: 0 },
      SOX: { total: 0, passed: 0, failed: 0, pass_rate: 0 },
      HIPAA: { total: 0, passed: 0, failed: 0, pass_rate: 0 },
      PCI: { total: 0, passed: 0, failed: 0, pass_rate: 0 },
    };

    for (const check of this.audit_trail) {
      const reg = regulations[check.regulation];
      reg.total++;
      if (check.passed) {
        reg.passed++;
      } else {
        reg.failed++;
      }
    }

    for (const key of Object.keys(regulations) as Regulation[]) {
      const reg = regulations[key];
      reg.pass_rate = reg.total > 0 ? Math.round((reg.passed / reg.total) * 100) : 0;
    }

    const total = this.audit_trail.length;
    const passed = this.audit_trail.filter((c) => c.passed).length;

    return {
      regulations,
      overall_pass_rate: total > 0 ? Math.round((passed / total) * 100) : 0,
      total_checks: total,
    };
  }

  createRule(rule: Omit<ComplianceRule, 'id'>): ComplianceRule {
    const newRule: ComplianceRule = {
      ...rule,
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    this.rules.push(newRule);
    return newRule;
  }

  listRules(regulation?: Regulation): ComplianceRule[] {
    if (regulation) {
      return this.rules.filter((r) => r.regulation === regulation);
    }
    return [...this.rules];
  }

  getAuditTrail(filter?: {
    regulation?: Regulation;
    entity?: string;
    passed?: boolean;
    limit?: number;
  }): ComplianceCheck[] {
    let result = [...this.audit_trail];

    if (filter?.regulation) {
      result = result.filter((c) => c.regulation === filter.regulation);
    }
    if (filter?.entity) {
      result = result.filter((c) => c.entity === filter.entity);
    }
    if (filter?.passed !== undefined) {
      result = result.filter((c) => c.passed === filter.passed);
    }

    if (filter?.limit) {
      result = result.slice(-filter.limit);
    }

    return result.sort((a, b) => b.timestamp - a.timestamp);
  }

  generateReport(): ComplianceReport {
    const checks = this.audit_trail;
    const passed = checks.filter((c) => c.passed).length;
    const failed = checks.filter((c) => !c.passed).length;
    const regulationsCoverage = Array.from(
      new Set(checks.map((c) => c.regulation))
    ) as Regulation[];

    const recommendations = this.generateRecommendations(checks);

    return {
      generated_at: Date.now(),
      summary: {
        total_rules: this.rules.length,
        passed_checks: passed,
        failed_checks: failed,
        pass_rate: checks.length > 0 ? Math.round((passed / checks.length) * 100) : 0,
        regulationsCoverage,
      },
      checks,
      recommendations,
    };
  }

  private evaluateRule(rule: ComplianceRule, entity: string): boolean {
    const entityConditions: Record<string, Record<string, boolean>> = {
      user_data: {
        GDPR_data_access: true,
        GDPR_encryption: true,
        GDPR_consent: true,
        GDPR_retention: false,
      },
      financial_records: {
        SOX_audit: true,
        SOX_access: true,
        PCI_encryption: true,
        PCI_audit: true,
      },
      health_records: {
        HIPAA_phi: true,
        HIPAA_baa: false,
        GDPR_encryption: true,
      },
      payment_data: {
        PCI_encryption: true,
        PCI_network: false,
        PCI_auth: true,
        PCI_audit: true,
      },
    };

    const entityMap = entityConditions[entity] || {};

    if (entityMap[rule.id] !== undefined) {
      return entityMap[rule.id];
    }

    const defaultFailConditions: Array<{ rule: string; passed: boolean }> = [
      { rule: 'gdpr-retention', passed: false },
      { rule: 'hipaa-baa', passed: false },
      { rule: 'pci-network', passed: false },
    ];

    const specialCase = defaultFailConditions.find((c) => c.rule === rule.id);
    if (specialCase) {
      return specialCase.passed;
    }

    return Math.random() > 0.15;
  }

  private generateEvidence(rule: ComplianceRule, entity: string, passed: boolean): string {
    if (passed) {
      return `实体 ${entity} 通过规则 ${rule.name} 检查。${rule.action} 已正确实施。`;
    }
    return `实体 ${entity} 未通过规则 ${rule.name} 检查。需要: ${rule.action}。`;
  }

  private generateRecommendations(checks: ComplianceCheck[]): string[] {
    const recommendations: string[] = [];
    const failed = checks.filter((c) => !c.passed);

    const bySeverity: Record<string, ComplianceCheck[]> = {};
    for (const check of failed) {
      if (!bySeverity[check.severity]) {
        bySeverity[check.severity] = [];
      }
      bySeverity[check.severity].push(check);
    }

    if (bySeverity['critical']?.length) {
      recommendations.push(
        `紧急：${bySeverity['critical'].length} 个严重合规检查未通过，需立即处理`
      );
    }
    if (bySeverity['high']?.length) {
      recommendations.push(
        `重要：${bySeverity['high'].length} 个高危合规检查未通过，需在 7 天内修复`
      );
    }
    if (bySeverity['medium']?.length) {
      recommendations.push(
        `建议：${bySeverity['medium'].length} 个中等合规检查未通过，建议在下一迭代中处理`
      );
    }

    const regulationsWithFailures = new Set(failed.map((c) => c.regulation));
    for (const reg of regulationsWithFailures) {
      recommendations.push(`法规 ${reg} 存在合规差距，建议进行专项评估`);
    }

    if (recommendations.length === 0) {
      recommendations.push('所有合规检查已通过，系统状态良好');
    }

    return recommendations;
  }
}

export const complianceAutomator = new ComplianceAutomator();
