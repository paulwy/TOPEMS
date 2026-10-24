export type AttackType = 'PromptInjection' | 'ModelPoisoning' | 'DataExfiltration' | 'SideChannel';

export type AttackSeverity = 'critical' | 'high' | 'medium' | 'low';

export type TestStatus = 'completed' | 'running' | 'failed' | 'pending';

export interface AttackVector {
  id: string;
  type: AttackType;
  severity: AttackSeverity;
  vector: string;
  mitigation: string;
  description?: string;
  examples?: string[];
}
