import i18n from '@/i18n';

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

const SCRIPTING_PATTERNS: Array<{
  pattern: RegExp;
  category: PerfCategory;
  impact: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}> = [
  {
    pattern: /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*\},\s*\[\s*\]\s*\)/gs,
    category: 'Scripting',
    impact: 'medium',
    description: i18n.t('ai.performance-auditor.k0'),
    recommendation: i18n.t('ai.performance-auditor.k0'),
  },
  {
    pattern: /\.map\([^)]*\)\.filter\([^)]*\)\.reduce\([^)]*\)/g,
    category: 'Scripting',
    impact: 'low',
    description: i18n.t('ai.performance-auditor.k1'),
    recommendation: i18n.t('ai.performance-auditor.for_2'),
  },
  {
    pattern: /JSON\.parse\s*\(/g,
    category: 'Scripting',
    impact: 'low',
    description: i18n.t('ai.performance-auditor.jsonparse_1'),
    recommendation: i18n.t('ai.performance-auditor.k3'),
  },
  {
    pattern: /new\s+Date\s*\(\s*\)/g,
    category: 'Scripting',
    impact: 'low',
    description: i18n.t('ai.performance-auditor.date_4'),
    recommendation: i18n.t('ai.performance-auditor.k2'),
  },
];

const RENDERING_PATTERNS: Array<{
  pattern: RegExp;
  category: PerfCategory;
  impact: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}> = [
  {
    pattern: /style\s*=\s*\{\s*\w+\s*:\s*\{[^}]*\}\s*\}/g,
    category: 'Rendering',
    impact: 'medium',
    description: i18n.t('ai.performance-auditor.k5'),
    recommendation: i18n.t('ai.performance-auditor.k6'),
  },
  {
    pattern: /<([A-Z]\w+)[^>]*>\s*<\/\1>/g,
    category: 'Rendering',
    impact: 'low',
    description: i18n.t('ai.performance-auditor.k7'),
    recommendation: i18n.t('ai.performance-auditor.k8'),
  },
  {
    pattern: /\.sort\([^)]*\)/g,
    category: 'Rendering',
    impact: 'low',
    description: i18n.t('ai.performance-auditor.k9'),
    recommendation: i18n.t('ai.performance-auditor.usememo_10'),
  },
];

const NETWORK_PATTERNS: Array<{
  pattern: RegExp;
  category: PerfCategory;
  impact: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}> = [
  {
    pattern: /useEffect\s*\([^)]*=>[^}]*fetch\s*\(/gs,
    category: 'Network',
    impact: 'medium',
    description: i18n.t('ai.performance-auditor.k11'),
    recommendation: i18n.t('ai.performance-auditor.k12'),
  },
  {
    pattern: /fetch\s*\([^)]*\)\s*\.then\s*\([^)]*=>[^)]*=>/g,
    category: 'Network',
    impact: 'low',
    description: i18n.t('ai.performance-auditor.promise_13'),
    recommendation: i18n.t('ai.performance-auditor.k3'),
  },
];

const STORAGE_PATTERNS: Array<{
  pattern: RegExp;
  category: PerfCategory;
  impact: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}> = [
  {
    pattern: /localStorage\.(getItem|setItem)\s*\(/g,
    category: 'Storage',
    impact: 'medium',
    description: i18n.t('ai.performance-auditor.k14'),
    recommendation: i18n.t('ai.performance-auditor.k15'),
  },
  {
    pattern: /sessionStorage\.(getItem|setItem)\s*\(/g,
    category: 'Storage',
    impact: 'low',
    description: i18n.t('ai.performance-auditor.k16'),
    recommendation: i18n.t('ai.performance-auditor.k17'),
  },
];

const ALL_PATTERNS = [
  ...SCRIPTING_PATTERNS,
  ...RENDERING_PATTERNS,
  ...NETWORK_PATTERNS,
  ...STORAGE_PATTERNS,
];

