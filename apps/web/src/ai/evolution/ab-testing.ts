// V58.0 平台 AI 演进 - A/B 测试

export type ExperimentStatus = 'Draft' | 'Running' | 'Paused' | 'Completed';

export interface Variant {
  id: string;
  name: string;
  modelVersion: string;
  weight: number;
  metrics: Record<string, number>;
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: Variant[];
  status: ExperimentStatus;
  traffic_split: number;
  startDate: number;
  endDate: number;
}

export interface ExperimentResult {
  experimentId: string;
  variant: Variant;
  visitors: number;
  conversions: number;
  conversionRate: number;
  confidence: number;
}

export interface SignificanceResult {
  isSignificant: boolean;
  confidenceLevel: number;
  pValue: number;
  winner: string | null;
  relativeLift: number;
}
