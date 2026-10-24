export type PerfCategory = 'Rendering' | 'Scripting' | 'Network' | 'Storage';

export interface PerfFinding {
  id: string;
  category: PerfCategory;
  impact: 'high' | 'medium' | 'low';
  file: string;
  description: string;
  recommendation: string;
}

export interface AuditMetrics {
  fcp: number;
  lcp: number;
  tti: number;
  cls: number;
}

export interface LighthouseScores {
  performance: number;
  accessibility: number;
  best_practices: number;
  seo: number;
}
