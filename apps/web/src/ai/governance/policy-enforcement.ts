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
