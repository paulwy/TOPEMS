import i18n from '@/i18n';

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

export interface RobustnessTest {
  id: string;
  modelId: string;
  attackVector: AttackVector;
  success_rate: number;
  defense_rate: number;
  status: TestStatus;
  details?: {
    test_cases: number;
    passed_cases: number;
    failed_cases: number;
    mitigations_applied: string[];
    timestamp: number;
    duration_ms: number;
  };
}

export interface Defense {
  id: string;
  name: string;
  type: AttackType;
  description: string;
  enabled: boolean;
  effectiveness: number;
  configuration: Record<string, unknown>;
}
