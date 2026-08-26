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
