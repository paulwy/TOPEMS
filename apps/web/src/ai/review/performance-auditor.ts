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

export interface BundleInfo {
  name: string;
  size: number;
  gzipped_size: number;
  chunk: string;
}

export interface AuditResult {
  findings: PerfFinding[];
  lighthouse_scores: LighthouseScores;
  metrics: AuditMetrics;
  optimized: boolean;
  audited_at: number;
}
