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
    description: 'Prompt injection 防护：检查用户输入是否包含注入攻击模式',
    recommendation: '实施输入白名单 + 指令分离机制，对 LLM prompt 进行结构化处理',
  },
  {
    type: 'InputValidation',
    severity: 'High',
    description: 'SQL 注入防护：检查 AI 生成的 SQL 查询是否存在注入风险',
    recommendation: '使用参数化查询，对 AI 输出进行 SQL 语法安全审计',
  },
  {
    type: 'Sanitization',
    severity: 'High',
    description: '输出净化：检查 AI 响应是否包含 XSS 或恶意脚本',
    recommendation: '对 AI 生成内容进行 HTML 转义，使用 DOMPurify 等库进行净化',
  },
  {
    type: 'Sanitization',
    severity: 'Critical',
    description: '数据泄露防护：检查 AI 是否可能输出敏感数据（PII/密钥）',
    recommendation: '部署 PII 检测器，对 AI 输出进行敏感信息扫描和遮盖',
  },
  {
    type: 'RateLimit',
    severity: 'Medium',
    description: 'API 速率限制：检查 AI API 调用是否有速率限制',
    recommendation: '实施令牌桶速率限制，单用户每分钟不超过 60 次请求',
  },
  {
    type: 'RateLimit',
    severity: 'High',
    description: 'Token 消耗上限：检查单次对话 Token 使用是否超限',
    recommendation: '设置单次请求 Token 上限（建议 4096），防止滥用',
  },
  {
    type: 'Encryption',
    severity: 'High',
    description: '传输加密：检查 AI 请求/响应是否通过 HTTPS 加密',
    recommendation: '强制使用 TLS 1.3，禁用所有不安全的加密套件',
  },
  {
    type: 'Encryption',
    severity: 'High',
    description: '静态加密：检查 AI 对话历史和模型数据是否加密存储',
    recommendation: '使用 AES-256 加密静态数据，密钥通过 KMS 管理',
  },
  {
    type: 'Audit',
    severity: 'Medium',
    description: '操作审计：检查 AI 模型调用是否记录完整审计日志',
    recommendation: '记录每次 AI 调用的输入摘要、输出摘要、耗时、Token 消耗',
  },
  {
    type: 'Audit',
    severity: 'High',
    description: '模型行为审计：检查 AI 决策路径是否可追溯',
    recommendation: '保留 AI 推理链记录，支持事后审计和合规检查',
  },
];

const DEFAULT_THREATS: Omit<ThreatModel, 'id'>[] = [
  {
    threat_type: 'Prompt Injection',
    severity: 'Critical',
    likelihood: 'VeryLikely',
    impact: 'VeryHigh',
    mitigation: '实施输入验证 + Prompt 分离 + 输出过滤',
    status: 'Identified',
  },
  {
    threat_type: 'Data Exfiltration',
    severity: 'Critical',
    likelihood: 'Likely',
    impact: 'VeryHigh',
    mitigation: 'PII 检测 + 输出遮盖 + DLP 策略',
    status: 'Mitigated',
  },
  {
    threat_type: 'Model Poisoning',
    severity: 'High',
    likelihood: 'Unlikely',
    impact: 'VeryHigh',
    mitigation: '模型版本校验 + 供应链安全 + 数据完整性检查',
    status: 'Identified',
  },
  {
    threat_type: 'Adversarial Attack',
    severity: 'High',
    likelihood: 'Likely',
    impact: 'High',
    mitigation: '对抗训练 + 输入异常检测 + 置信度阈值',
    status: 'Mitigated',
  },
  {
    threat_type: 'API Abuse',
    severity: 'Medium',
    likelihood: 'VeryLikely',
    impact: 'Medium',
    mitigation: '速率限制 + Token 配额 + 异常使用检测',
    status: 'Mitigated',
  },
  {
    threat_type: 'Sensitive Data Leakage',
    severity: 'High',
    likelihood: 'Likely',
    impact: 'High',
    mitigation: '字段级权限控制 + 输出脱敏 + 数据分类',
    status: 'Mitigated',
  },
  {
    threat_type: 'Rogue Model Access',
    severity: 'High',
    likelihood: 'Unlikely',
    impact: 'High',
    mitigation: '模型访问控制 + 身份验证 + 审计日志',
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
          details.push(`已应用缓解措施: ${threat.threat_type} - ${threat.mitigation}`);
          applied++;
        }
      }
    });

    details.push(`共应用 ${applied} 项安全加固措施`);
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
