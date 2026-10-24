export type BiasType = 'Gender' | 'Race' | 'Age' | 'Socioeconomic';

export type BiasSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

interface BiasReport {
  id: string;
  modelId: string;
  biasType: BiasType;
  severity: BiasSeverity;
  affectedGroups: string[];
  findings: string[];
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface BiasMetric {
  metric: string;
  group: string;
  value: number;
  threshold: number;
  deviation: number;
  severity: BiasSeverity;
}

interface BiasRule {
  id: string;
  name: string;
  biasType: BiasType;
  description: string;
  threshold: number;
  severity: BiasSeverity;
  enabled: boolean;
}
