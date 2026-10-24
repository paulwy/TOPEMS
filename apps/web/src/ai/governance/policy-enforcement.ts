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
