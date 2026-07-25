export type EnforcementMode = 'enforce' | 'audit' | 'advisory';
export type PolicyStatus = 'active' | 'draft' | 'archived';

export interface PolicyRule {
  id: string;
  name: string;
  condition: string;
  action: 'allow' | 'deny' | 'warn' | 'require_approval';
  description: string;
  priority: number;
  metadata?: Record<string, unknown>;
}

export interface Policy {
  id: string;
  name: string;
  scope: 'global' | 'module' | 'entity' | 'user';
  scope_target: string;
  rules: PolicyRule[];
  enforcement_mode: EnforcementMode;
  status: PolicyStatus;
  description: string;
  created_at: number;
  updated_at: number;
  version: number;
  tags: string[];
}

export interface PolicyDecision {
  id: string;
  policy_id: string;
  policy_name: string;
  rule_id: string;
  rule_name: string;
  action: 'allow' | 'deny' | 'warn' | 'require_approval';
  allowed: boolean;
  reason: string;
  evidence: string;
  context: Record<string, unknown>;
  decided_at: number;
  user_id?: string;
  simulation?: boolean;
}

const DEFAULT_POLICIES: Policy[] = [
  {
    id: 'pol-data-access',
    name: '数据访问权限策略',
    scope: 'global',
    scope_target: 'all',
    enforcement_mode: 'enforce',
    status: 'active',
    description: '控制敏感数据的访问权限，基于角色和上下文进行动态决策',
    created_at: Date.now() - 86400000 * 30,
    updated_at: Date.now() - 86400000 * 5,
    version: 3,
    tags: ['security', 'data-access', 'gdpr'],
    rules: [
      {
        id: 'rule-admin',
        name: '管理员全权限',
        condition: 'user.role == "admin"',
        action: 'allow',
        description: '管理员拥有对所有数据的访问权限',
        priority: 1,
      },
      {
        id: 'rule-confidential',
        name: '机密数据限制',
        condition: 'data.classification == "confidential" && user.clearance < 3',
        action: 'deny',
        description: '非授权人员禁止访问机密数据',
        priority: 2,
      },
      {
        id: 'rule-consent',
        name: '用户同意检查',
        condition: 'data.type == "personal" && !user.has_consent',
        action: 'deny',
        description: '未经用户同意不得处理个人数据',
        priority: 3,
      },
      {
        id: 'rule-approve',
        name: '敏感操作审批',
        condition: 'action.type == "bulk_export" && user.role != "manager"',
        action: 'require_approval',
        description: '批量导出需要经理审批',
        priority: 4,
      },
    ],
  },
  {
    id: 'pol-financial-controls',
    name: '财务控制策略',
    scope: 'module',
    scope_target: 'finance',
    enforcement_mode: 'enforce',
    status: 'active',
    description: '财务操作的职责分离和审批流程控制',
    created_at: Date.now() - 86400000 * 60,
    updated_at: Date.now() - 86400000 * 10,
    version: 5,
    tags: ['finance', 'sox', 'compliance'],
    rules: [
      {
        id: 'rule-segregation',
        name: '职责分离',
        condition: 'transaction.approver == transaction.requester',
        action: 'deny',
        description: '交易审批人和申请人不能是同一人',
        priority: 1,
      },
      {
        id: 'rule-threshold',
        name: '大额交易审批',
        condition: 'transaction.amount > 100000 && user.role != "director"',
        action: 'require_approval',
        description: '超过10万元的交易需要总监审批',
        priority: 2,
      },
      {
        id: 'rule-budget',
        name: '预算检查',
        condition: 'project.budget_remaining < transaction.amount',
        action: 'deny',
        description: '超出预算的支出将被拒绝',
        priority: 3,
      },
    ],
  },
  {
    id: 'pol-ai-governance',
    name: 'AI 治理策略',
    scope: 'module',
    scope_target: 'ai',
    enforcement_mode: 'advisory',
    status: 'active',
    description: 'AI 模型使用和输出的合规治理策略',
    created_at: Date.now() - 86400000 * 15,
    updated_at: Date.now() - 86400000 * 2,
    version: 1,
    tags: ['ai', 'governance', 'ethics'],
    rules: [
      {
        id: 'rule-toxic',
        name: '有害内容过滤',
        condition: 'output.harm_score > 0.8',
        action: 'deny',
        description: '拒绝高有害评分的 AI 输出',
        priority: 1,
      },
      {
        id: 'rule-bias',
        name: '偏见检测',
        condition: 'output.bias_score > 0.6',
        action: 'warn',
        description: '对有偏见的输出发出警告',
        priority: 2,
      },
      {
        id: 'rule-pii',
        name: 'PII 泄露防护',
        condition: 'output.contains_pii == true',
        action: 'deny',
        description: '禁止输出包含个人身份信息的内容',
        priority: 3,
      },
    ],
  },
];

export class PolicyEnforcer {
  private policies: Policy[];
  private audit_log: PolicyDecision[];

  constructor() {
    this.policies = [...DEFAULT_POLICIES];
    this.audit_log = [];
  }

  evaluate_policy(
    context: {
      user?: { role: string; clearance: number; has_consent: boolean; id: string };
      data?: { classification: string; type: string };
      action?: { type: string };
      transaction?: { approver: string; requester: string; amount: number };
      project?: { budget_remaining: number };
      output?: { harm_score: number; bias_score: number; contains_pii: boolean };
    },
    policy_id?: string
  ): PolicyDecision[] {
    const policies_to_check = policy_id
      ? this.policies.filter((p) => p.id === policy_id && p.status === 'active')
      : this.policies.filter((p) => p.status === 'active');

    const decisions: PolicyDecision[] = [];

    for (const policy of policies_to_check) {
      for (const rule of policy.rules.sort((a, b) => a.priority - b.priority)) {
        const matched = this.evaluate_condition(rule.condition, context);

        if (matched) {
          const decision: PolicyDecision = {
            id: `decision-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            policy_id: policy.id,
            policy_name: policy.name,
            rule_id: rule.id,
            rule_name: rule.name,
            action: rule.action,
            allowed: rule.action === 'allow' || rule.action === 'warn',
            reason: this.generate_reason(rule, context),
            evidence: this.generate_evidence(rule, context),
            context: JSON.parse(JSON.stringify(context)),
            decided_at: Date.now(),
            user_id: context.user?.id,
            simulation: false,
          };
          decisions.push(decision);
          this.audit_log.push(decision);
        }
      }
    }

    if (decisions.length === 0) {
      const default_decision: PolicyDecision = {
        id: `decision-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        policy_id: 'default',
        policy_name: '默认策略',
        rule_id: 'default-allow',
        rule_name: '默认允许',
        action: 'allow',
        allowed: true,
        reason: '没有匹配的策略规则，默认允许操作',
        evidence: '所有活动策略的规则均未匹配当前上下文',
        context: JSON.parse(JSON.stringify(context)),
        decided_at: Date.now(),
        user_id: context.user?.id,
        simulation: false,
      };
      decisions.push(default_decision);
      this.audit_log.push(default_decision);
    }

    return decisions;
  }

  enforce_policy(context: {
    user?: { role: string; clearance: number; has_consent: boolean; id: string };
    data?: { classification: string; type: string };
    action?: { type: string };
    transaction?: { approver: string; requester: string; amount: number };
    project?: { budget_remaining: number };
    output?: { harm_score: number; bias_score: number; contains_pii: boolean };
  }): {
    allowed: boolean;
    decisions: PolicyDecision[];
    blocking_decision?: PolicyDecision;
  } {
    const decisions = this.evaluate_policy(context);

    const blocking = decisions.find((d) => d.action === 'deny');
    if (blocking) {
      return { allowed: false, decisions, blocking_decision: blocking };
    }

    return { allowed: true, decisions };
  }

  get_policies(filter?: { status?: PolicyStatus; scope?: Policy['scope'] }): Policy[] {
    let result = [...this.policies];
    if (filter?.status) {
      result = result.filter((p) => p.status === filter.status);
    }
    if (filter?.scope) {
      result = result.filter((p) => p.scope === filter.scope);
    }
    return result.sort((a, b) => b.updated_at - a.updated_at);
  }

  create_policy(policy: Omit<Policy, 'id' | 'created_at' | 'updated_at' | 'version'>): Policy {
    const now = Date.now();
    const new_policy: Policy = {
      ...policy,
      id: `pol-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: now,
      updated_at: now,
      version: 1,
    };
    this.policies.push(new_policy);
    return new_policy;
  }

  update_policy(policy_id: string, updates: Partial<Policy>): Policy | null {
    const idx = this.policies.findIndex((p) => p.id === policy_id);
    if (idx === -1) return null;

    this.policies[idx] = {
      ...this.policies[idx],
      ...updates,
      updated_at: Date.now(),
      version: this.policies[idx].version + 1,
    };
    return this.policies[idx];
  }

  get_audit_log(filter?: {
    policy_id?: string;
    action?: PolicyDecision['action'];
    allowed?: boolean;
    limit?: number;
  }): PolicyDecision[] {
    let result = [...this.audit_log];

    if (filter?.policy_id) {
      result = result.filter((d) => d.policy_id === filter.policy_id);
    }
    if (filter?.action) {
      result = result.filter((d) => d.action === filter.action);
    }
    if (filter?.allowed !== undefined) {
      result = result.filter((d) => d.allowed === filter.allowed);
    }

    result = result.sort((a, b) => b.decided_at - a.decided_at);

    if (filter?.limit) {
      result = result.slice(0, filter.limit);
    }

    return result;
  }

  simulate_policy(
    context: Record<string, unknown>,
    policy_id: string
  ): {
    decisions: PolicyDecision[];
    impact_summary: string;
    affected_rules: string[];
  } {
    const policy = this.policies.find((p) => p.id === policy_id);
    if (!policy) {
      return {
        decisions: [],
        impact_summary: '策略不存在',
        affected_rules: [],
      };
    }

    const mock_context = {
      user: (context.user as any) || {
        role: 'user',
        clearance: 1,
        has_consent: true,
        id: 'sim-user',
      },
      data: (context.data as any) || { classification: 'public', type: 'text' },
      action: (context.action as any) || { type: 'read' },
      transaction: (context.transaction as any) || {
        approver: 'other',
        requester: 'user',
        amount: 0,
      },
      project: (context.project as any) || { budget_remaining: 999999 },
      output: (context.output as any) || { harm_score: 0.1, bias_score: 0.1, contains_pii: false },
    };

    const decisions = this.evaluate_policy(mock_context, policy_id);

    for (const d of decisions) {
      d.simulation = true;
      d.decided_at = Date.now();
      d.id = `sim-${d.id}`;
    }

    const allowed = decisions.every((d) => d.allowed);
    const affected_rules = decisions.map((d) => d.rule_name);

    return {
      decisions,
      impact_summary: allowed
        ? `策略模拟通过：${policy.name} 允许该操作`
        : `策略模拟拒绝：${policy.name} 将阻止该操作`,
      affected_rules,
    };
  }

  private evaluate_condition(condition: string, context: Record<string, any>): boolean {
    const parts = condition.split('&&').map((s) => s.trim());

    for (const part of parts) {
      if (!this.evaluate_single_condition(part, context)) {
        return false;
      }
    }

    return true;
  }

  private evaluate_single_condition(condition: string, context: Record<string, any>): boolean {
    const match = condition.match(/(\w+(?:\.\w+)*)\s*(==|!=|>=|<=|>|<)\s*["']?([^"']*)["']?/);

    if (!match) return false;

    const [, path, operator, raw_value] = match;
    const actual_value = this.resolve_path(context, path);
    const expected_value = this.parse_value(raw_value.trim());

    switch (operator) {
      case '==':
        return actual_value == expected_value;
      case '!=':
        return actual_value != expected_value;
      case '>':
        return actual_value > expected_value;
      case '<':
        return actual_value < expected_value;
      case '>=':
        return actual_value >= expected_value;
      case '<=':
        return actual_value <= expected_value;
      default:
        return false;
    }
  }

  private resolve_path(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current == null) return undefined;
      current = current[key];
    }
    return current;
  }

  private parse_value(raw: string): any {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    if (raw === 'null') return null;
    if (!isNaN(Number(raw))) return Number(raw);
    return raw;
  }

  private generate_reason(rule: PolicyRule, context: Record<string, any>): string {
    const action_labels: Record<PolicyRule['action'], string> = {
      allow: '允许',
      deny: '拒绝',
      warn: '警告',
      require_approval: '需要审批',
    };
    return `规则 "${rule.name}" 匹配条件：${rule.condition}。执行操作：${action_labels[rule.action]}。`;
  }

  private generate_evidence(rule: PolicyRule, context: Record<string, any>): string {
    const relevant_context: Record<string, unknown> = {};
    if (context.user) relevant_context.user = context.user;
    if (context.data) relevant_context.data = context.data;
    if (context.action) relevant_context.action = context.action;
    if (context.transaction) relevant_context.transaction = context.transaction;
    if (context.project) relevant_context.project = context.project;
    if (context.output) relevant_context.output = context.output;

    return `规则 ID: ${rule.id}，优先级: ${rule.priority}，匹配上下文: ${JSON.stringify(relevant_context)}`;
  }
}

export const policyEnforcer = new PolicyEnforcer();
