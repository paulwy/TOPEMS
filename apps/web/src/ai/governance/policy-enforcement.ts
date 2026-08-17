import i18n from '@/i18n';

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

interface PolicyEvaluationContext {
  user?: { role: string; clearance: number; has_consent: boolean; id: string };
  data?: { classification: string; type: string };
  action?: { type: string };
  transaction?: { approver: string; requester: string; amount: number };
  project?: { budget_remaining: number };
  output?: { harm_score: number; bias_score: number; contains_pii: boolean };
}

const DEFAULT_POLICIES: Policy[] = [
  {
    id: 'pol-data-access',
    name: i18n.t('ai.policy-enforcement.k0'),
    scope: 'global',
    scope_target: 'all',
    enforcement_mode: 'enforce',
    status: 'active',
    description: i18n.t('ai.policy-enforcement.k1'),
    created_at: Date.now() - 86400000 * 30,
    updated_at: Date.now() - 86400000 * 5,
    version: 3,
    tags: ['security', 'data-access', 'gdpr'],
    rules: [
      {
        id: 'rule-admin',
        name: i18n.t('ai.policy-enforcement.k2'),
        condition: 'user.role == "admin"',
        action: 'allow',
        description: i18n.t('ai.policy-enforcement.k3'),
        priority: 1,
      },
      {
        id: 'rule-confidential',
        name: i18n.t('ai.policy-enforcement.k4'),
        condition: 'data.classification == "confidential" && user.clearance < 3',
        action: 'deny',
        description: i18n.t('ai.policy-enforcement.k5'),
        priority: 2,
      },
      {
        id: 'rule-consent',
        name: i18n.t('ai.policy-enforcement.k6'),
        condition: 'data.type == "personal" && !user.has_consent',
        action: 'deny',
        description: i18n.t('ai.policy-enforcement.k7'),
        priority: 3,
      },
      {
        id: 'rule-approve',
        name: i18n.t('ai.policy-enforcement.k8'),
        condition: 'action.type == "bulk_export" && user.role != "manager"',
        action: 'require_approval',
        description: i18n.t('ai.policy-enforcement.k9'),
        priority: 4,
      },
    ],
  },
  {
    id: 'pol-financial-controls',
    name: i18n.t('ai.policy-enforcement.k10'),
    scope: 'module',
    scope_target: 'finance',
    enforcement_mode: 'enforce',
    status: 'active',
    description: i18n.t('ai.policy-enforcement.k11'),
    created_at: Date.now() - 86400000 * 60,
    updated_at: Date.now() - 86400000 * 10,
    version: 5,
    tags: ['finance', 'sox', 'compliance'],
    rules: [
      {
        id: 'rule-segregation',
        name: i18n.t('ai.policy-enforcement.k12'),
        condition: 'transaction.approver == transaction.requester',
        action: 'deny',
        description: i18n.t('ai.policy-enforcement.k13'),
        priority: 1,
      },
      {
        id: 'rule-threshold',
        name: i18n.t('ai.policy-enforcement.k14'),
        condition: 'transaction.amount > 100000 && user.role != "director"',
        action: 'require_approval',
        description: i18n.t('ai.policy-enforcement.10_15'),
        priority: 2,
      },
      {
        id: 'rule-budget',
        name: i18n.t('ai.policy-enforcement.k16'),
        condition: 'project.budget_remaining < transaction.amount',
        action: 'deny',
        description: i18n.t('ai.policy-enforcement.k17'),
        priority: 3,
      },
    ],
  },
  {
    id: 'pol-ai-governance',
    name: i18n.t('ai.policy-enforcement.ai_0'),
    scope: 'module',
    scope_target: 'ai',
    enforcement_mode: 'advisory',
    status: 'active',
    description: i18n.t('ai.policy-enforcement.ai_1'),
    created_at: Date.now() - 86400000 * 15,
    updated_at: Date.now() - 86400000 * 2,
    version: 1,
    tags: ['ai', 'governance', 'ethics'],
    rules: [
      {
        id: 'rule-toxic',
        name: i18n.t('ai.policy-enforcement.k18'),
        condition: 'output.harm_score > 0.8',
        action: 'deny',
        description: i18n.t('ai.policy-enforcement.ai_19'),
        priority: 1,
      },
      {
        id: 'rule-bias',
        name: i18n.t('ai.policy-enforcement.k20'),
        condition: 'output.bias_score > 0.6',
        action: 'warn',
        description: i18n.t('ai.policy-enforcement.k21'),
        priority: 2,
      },
      {
        id: 'rule-pii',
        name: i18n.t('ai.policy-enforcement.pii_2'),
        condition: 'output.contains_pii == true',
        action: 'deny',
        description: i18n.t('ai.policy-enforcement.k22'),
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

  evaluatePolicy(
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
    const policiesToCheck = policy_id
      ? this.policies.filter((p) => p.id === policy_id && p.status === 'active')
      : this.policies.filter((p) => p.status === 'active');

    const decisions: PolicyDecision[] = [];

    for (const policy of policiesToCheck) {
      for (const rule of policy.rules.sort((a, b) => a.priority - b.priority)) {
        const matched = this.evaluateCondition(rule.condition, context);

        if (matched) {
          const decision: PolicyDecision = {
            id: `decision-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            policy_id: policy.id,
            policy_name: policy.name,
            rule_id: rule.id,
            rule_name: rule.name,
            action: rule.action,
            allowed: rule.action === 'allow' || rule.action === 'warn',
            reason: this.generateReason(rule, context),
            evidence: this.generateEvidence(rule, context),
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
      const defaultDecision: PolicyDecision = {
        id: `decision-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        policy_id: 'default',
        policy_name: i18n.t('ai.policy-enforcement.k23'),
        rule_id: 'default-allow',
        rule_name: i18n.t('ai.policy-enforcement.k24'),
        action: 'allow',
        allowed: true,
        reason: i18n.t('ai.policy-enforcement.k25'),
        evidence: i18n.t('ai.policy-enforcement.k26'),
        context: JSON.parse(JSON.stringify(context)),
        decided_at: Date.now(),
        user_id: context.user?.id,
        simulation: false,
      };
      decisions.push(defaultDecision);
      this.audit_log.push(defaultDecision);
    }

    return decisions;
  }

  enforcePolicy(context: {
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
    const decisions = this.evaluatePolicy(context);

    const blocking = decisions.find((d) => d.action === 'deny');
    if (blocking) {
      return { allowed: false, decisions, blocking_decision: blocking };
    }

    return { allowed: true, decisions };
  }

  getPolicies(filter?: { status?: PolicyStatus; scope?: Policy['scope'] }): Policy[] {
    let result = [...this.policies];
    if (filter?.status) {
      result = result.filter((p) => p.status === filter.status);
    }
    if (filter?.scope) {
      result = result.filter((p) => p.scope === filter.scope);
    }
    return result.sort((a, b) => b.updated_at - a.updated_at);
  }

  createPolicy(policy: Omit<Policy, 'id' | 'created_at' | 'updated_at' | 'version'>): Policy {
    const now = Date.now();
    const newPolicy: Policy = {
      ...policy,
      id: `pol-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: now,
      updated_at: now,
      version: 1,
    };
    this.policies.push(newPolicy);
    return newPolicy;
  }

  updatePolicy(policy_id: string, updates: Partial<Policy>): Policy | null {
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

  getAuditLog(filter?: {
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

  simulatePolicy(
    context: Record<string, unknown>,
    policy_id: string
  ): {
    decisions: PolicyDecision[];
    impact_summary: string;
    affectedRules: string[];
  } {
    const policy = this.policies.find((p) => p.id === policy_id);
    if (!policy) {
      return {
        decisions: [],
        impact_summary: i18n.t('ai.policy-enforcement.k27'),
        affectedRules: [],
      };
    }

    const mockContext = {
      user: (context.user as PolicyEvaluationContext['user']) || {
        role: 'user',
        clearance: 1,
        has_consent: true,
        id: 'sim-user',
      },
      data: (context.data as PolicyEvaluationContext['data']) || {
        classification: 'public',
        type: 'text',
      },
      action: (context.action as PolicyEvaluationContext['action']) || { type: 'read' },
      transaction: (context.transaction as PolicyEvaluationContext['transaction']) || {
        approver: 'other',
        requester: 'user',
        amount: 0,
      },
      project: (context.project as PolicyEvaluationContext['project']) || {
        budget_remaining: 999999,
      },
      output: (context.output as PolicyEvaluationContext['output']) || {
        harm_score: 0.1,
        bias_score: 0.1,
        contains_pii: false,
      },
    };

    const decisions = this.evaluatePolicy(mockContext, policy_id);

    for (const d of decisions) {
      d.simulation = true;
      d.decided_at = Date.now();
      d.id = `sim-${d.id}`;
    }

    const allowed = decisions.every((d) => d.allowed);
    const affectedRules = decisions.map((d) => d.rule_name);

    return {
      decisions,
      impact_summary: allowed
        ? `${i18n.t('ai.policy-enforcement.k3')}${policy.name}${i18n.t('ai.policy-enforcement.k4')}`
        : `${i18n.t('ai.policy-enforcement.k5')}${policy.name}${i18n.t('ai.policy-enforcement.k6')}`,
      affectedRules,
    };
  }

  private evaluateCondition(condition: string, context: Record<string, unknown>): boolean {
    const parts = condition.split('&&').map((s) => s.trim());

    for (const part of parts) {
      if (!this.evaluateSingleCondition(part, context)) {
        return false;
      }
    }

    return true;
  }

  private evaluateSingleCondition(condition: string, context: Record<string, unknown>): boolean {
    const match = condition.match(/(\w+(?:\.\w+)*)\s*(==|!=|>=|<=|>|<)\s*["']?([^"']*)["']?/);

    if (!match) return false;

    const [, path, operator, rawValue] = match;
    const actualValue = this.resolvePath(context, path);
    const expectedValue = this.parseValue(rawValue.trim());

    // Type coercion for comparison: convert both to numbers if either is numeric
    const isNumeric = (v: unknown): v is number => typeof v === 'number';
    const isStringNumeric = (v: unknown): boolean =>
      typeof v === 'string' && !isNaN(Number(v)) && v.trim() !== '';

    let a: unknown = actualValue;
    let b: unknown = expectedValue;

    // Coerce numeric strings to numbers for comparison operators
    if (operator !== '==' && operator !== '!=') {
      if (isStringNumeric(a)) a = Number(a);
      if (isStringNumeric(b)) b = Number(b);
    }

    switch (operator) {
      case '==':
        return a === b;
      case '!=':
        return a !== b;
      case '>':
        return (a as number) > (b as number);
      case '<':
        return (a as number) < (b as number);
      case '>=':
        return (a as number) >= (b as number);
      case '<=':
        return (a as number) <= (b as number);
      default:
        return false;
    }
  }

  private resolvePath(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split('.');
    let current: unknown = obj;
    for (const key of keys) {
      if (current == null) return undefined;
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  }

  private parseValue(raw: string): boolean | number | string | null {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    if (raw === 'null') return null;
    if (!isNaN(Number(raw))) return Number(raw);
    return raw;
  }

  private generateReason(rule: PolicyRule, _context: Record<string, unknown>): string {
    const actionLabels: Record<PolicyRule['action'], string> = {
      allow: i18n.t('ai.policy-enforcement.k28'),
      deny: i18n.t('ai.policy-enforcement.k29'),
      warn: i18n.t('ai.policy-enforcement.k30'),
      require_approval: i18n.t('ai.policy-enforcement.k31'),
    };
    return `${i18n.t('ai.policy-enforcement.k7')}${rule.name}${i18n.t('ai.policy-enforcement.k8')}${rule.condition}${i18n.t('ai.policy-enforcement.k9')}${actionLabels[rule.action]}。`;
  }

  private generateEvidence(rule: PolicyRule, context: Record<string, unknown>): string {
    const relevantContext: Record<string, unknown> = {};
    if (context.user) relevantContext.user = context.user;
    if (context.data) relevantContext.data = context.data;
    if (context.action) relevantContext.action = context.action;
    if (context.transaction) relevantContext.transaction = context.transaction;
    if (context.project) relevantContext.project = context.project;
    if (context.output) relevantContext.output = context.output;

    return `${i18n.t('ai.policy-enforcement.id_10')}${rule.id}${i18n.t('ai.policy-enforcement.k11')}${rule.priority}${i18n.t('ai.policy-enforcement.k12')}${JSON.stringify(relevantContext)}`;
  }
}

export const policyEnforcer = new PolicyEnforcer();
