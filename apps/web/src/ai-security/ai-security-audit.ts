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
    name: '输入验证审计',
    type: 'InputValidation',
    description: '检测模型输入是否经过适当验证',
    pattern: 'input_validation',
    severity: 'high',
    enabled: true,
    remediation: '实施严格的输入验证和清理机制',
  },
  {
    id: 'rule-output-filter',
    name: '输出过滤审计',
    type: 'OutputFilter',
    description: '检测模型输出是否包含不当内容',
    pattern: 'output_filter',
    severity: 'medium',
    enabled: true,
    remediation: '添加输出内容过滤层，审查生成内容',
  },
  {
    id: 'rule-prompt-injection',
    name: '提示注入防护',
    type: 'PromptInjection',
    description: '检测是否存在提示注入攻击向量',
    pattern: 'prompt_injection',
    severity: 'critical',
    enabled: true,
    remediation: '实施输入/输出边界隔离，使用系统提示保护',
  },
  {
    id: 'rule-data-leakage',
    name: '数据泄漏检测',
    type: 'DataLeakage',
    description: '检测模型是否可能泄漏敏感信息',
    pattern: 'data_leakage',
    severity: 'critical',
    enabled: true,
    remediation: '对训练数据进行脱敏，添加输出检查层',
  },
];

export class AISecurityAuditor {
  private static instance: AISecurityAuditor | null = null;
  private audits: Map<string, AuditResult> = new Map();
  private rules: Map<string, AuditRule> = new Map();
  private findings: Map<string, SecurityAudit[]> = new Map();
  private modelAudits: Map<string, string[]> = new Map();

  private constructor() {
    DEFAULT_RULES.forEach((rule) => this.rules.set(rule.id, { ...rule }));
  }

  static getInstance(): AISecurityAuditor {
    if (!AISecurityAuditor.instance) {
      AISecurityAuditor.instance = new AISecurityAuditor();
    }
    return AISecurityAuditor.instance;
  }

  runAudit(
    modelId: string,
    options?: {
      types?: AuditType[];
      severity?: AuditSeverity;
    }
  ): AuditResult {
    const startTime = Date.now();
    const activeRules = Array.from(this.rules.values()).filter((r) => r.enabled);
    const findings: SecurityAudit[] = [];

    const types = options?.types ?? [
      'InputValidation',
      'OutputFilter',
      'PromptInjection',
      'DataLeakage',
    ];
    const minSeverity = options?.severity ?? 'low';
    const severityOrder: AuditSeverity[] = ['info', 'low', 'medium', 'high', 'critical'];

    for (const rule of activeRules) {
      if (!types.includes(rule.type)) continue;
      if (severityOrder.indexOf(rule.severity) < severityOrder.indexOf(minSeverity)) continue;

      const finding: SecurityAudit = {
        id: `${rule.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        modelId,
        type: rule.type,
        severity: rule.severity,
        finding: this.generateFinding(rule, modelId),
        remediation: rule.remediation,
        ruleId: rule.id,
        timestamp: Date.now(),
      };
      findings.push(finding);
    }

    const score = this.calculateScore(findings);
    const passed = score >= 0.8;

    const result: AuditResult = {
      auditId: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      passed,
      score,
      findings,
      recommendations: this.generateRecommendations(findings),
      timestamp: Date.now(),
      modelId,
      duration_ms: Date.now() - startTime,
    };

    this.audits.set(result.auditId, result);
    this.findings.set(result.auditId, findings);

    const modelAuditList = this.modelAudits.get(modelId) ?? [];
    modelAuditList.push(result.auditId);
    this.modelAudits.set(modelId, modelAuditList);

    return result;
  }

  getAuditResult(auditId: string): AuditResult | null {
    return this.audits.get(auditId) ?? null;
  }

  listAudits(limit?: number): AuditResult[] {
    const results = Array.from(this.audits.values()).sort((a, b) => b.timestamp - a.timestamp);
    return limit ? results.slice(0, limit) : results;
  }

  getModelAudits(modelId: string): AuditResult[] {
    const auditIds = this.modelAudits.get(modelId) ?? [];
    return auditIds
      .map((id) => this.audits.get(id))
      .filter((r): r is AuditResult => r !== undefined)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  createAuditRule(rule: Omit<AuditRule, 'id'>): AuditRule {
    const newRule: AuditRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    this.rules.set(newRule.id, newRule);
    return newRule;
  }

  deleteAuditRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  getAuditSummary(): {
    total_audits: number;
    passed_audits: number;
    failed_audits: number;
    avg_score: number;
    byType: Record<AuditType, number>;
    bySeverity: Record<AuditSeverity, number>;
    topFindings: Array<{ type: AuditType; count: number }>;
  } {
    const audits = Array.from(this.audits.values());
    const total = audits.length;
    const passed = audits.filter((a) => a.passed).length;
    const failed = total - passed;
    const avgScore = total > 0 ? audits.reduce((sum, a) => sum + a.score, 0) / total : 0;

    const byType: Record<AuditType, number> = {
      InputValidation: 0,
      OutputFilter: 0,
      PromptInjection: 0,
      DataLeakage: 0,
    };
    const bySeverity: Record<AuditSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    for (const audit of audits) {
      for (const finding of audit.findings) {
        byType[finding.type]++;
        bySeverity[finding.severity]++;
      }
    }

    const typeCounts = new Map<AuditType, number>();
    for (const audit of audits) {
      for (const finding of audit.findings) {
        typeCounts.set(finding.type, (typeCounts.get(finding.type) ?? 0) + 1);
      }
    }
    const topFindings = Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total_audits: total,
      passed_audits: passed,
      failed_audits: failed,
      avg_score: Math.round(avgScore * 100) / 100,
      byType,
      bySeverity,
      topFindings,
    };
  }

  listRules(): AuditRule[] {
    return Array.from(this.rules.values());
  }

  private generateFinding(rule: AuditRule, modelId: string): string {
    const templates: Record<AuditType, string> = {
      InputValidation: `模型 ${modelId} 输入验证审计发现：${rule.description}。建议检查输入预处理层是否完整覆盖所有输入字段。`,
      OutputFilter: `模型 ${modelId} 输出过滤审计发现：${rule.description}。建议审查输出内容的安全性和合规性。`,
      PromptInjection: `模型 ${modelId} 提示注入审计发现：${rule.description}。检测到潜在的注入攻击面，需立即加固。`,
      DataLeakage: `模型 ${modelId} 数据泄漏审计发现：${rule.description}。存在敏感信息泄漏风险，需要数据脱敏处理。`,
    };
    return templates[rule.type];
  }

  private calculateScore(findings: SecurityAudit[]): number {
    if (findings.length === 0) return 1.0;
    const severityWeights: Record<AuditSeverity, number> = {
      critical: 0.4,
      high: 0.3,
      medium: 0.15,
      low: 0.05,
      info: 0.0,
    };
    const totalWeight = findings.reduce((sum, f) => sum + severityWeights[f.severity], 0);
    const maxWeight = findings.length * 0.4;
    return Math.max(0, 1 - totalWeight / Math.max(maxWeight, 1));
  }

  private generateRecommendations(findings: SecurityAudit[]): string[] {
    const recs = new Set<string>();
    for (const finding of findings) {
      recs.add(finding.remediation);
    }
    if (findings.length === 0) {
      recs.add('继续保持当前安全措施，定期进行审计复查');
    }
    return Array.from(recs);
  }
}

export const aiSecurityAuditor = AISecurityAuditor.getInstance();
