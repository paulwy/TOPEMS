export type FairnessType = 'Demographic' | 'Equalized' | 'Calibrated';

type AuditStatus = 'passed' | 'failed' | 'warning';

interface FairnessConfig {
  id: string;
  modelId: string;
  fairnessType: FairnessType;
  thresholds: Record<string, number>;
  protectedAttributes: string[];
  enabled: boolean;
  updatedAt: number;
}

interface FairnessResult {
  id: string;
  modelId: string;
  fairnessScore: number;
  parityDifference: number;
  equalizedOdds: number;
  calibrationScore: number;
  passed: boolean;
  details: Record<string, unknown>;
  timestamp: number;
  duration_ms: number;
}

interface FairnessTrend {
  timestamp: number;
  score: number;
  parityDifference: number;
  calibrationScore: number;
}

interface FairnessBenchmark {
  modelId: string;
  industryAverage: number;
  topQuartile: number;
  yourScore: number;
  percentile: number;
  ranking: string;
}
