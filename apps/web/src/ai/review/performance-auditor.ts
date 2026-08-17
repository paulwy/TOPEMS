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

export class PerformanceAuditor {
  auditComponent(code: string, componentName: string = 'component'): PerfFinding[] {
    const findings: PerfFinding[] = [];

    for (const { pattern, category, impact, description, recommendation } of ALL_PATTERNS) {
      const matches = code.match(new RegExp(pattern.source, pattern.flags));
      if (matches) {
        for (let i = 0; i < matches.length; i++) {
          findings.push({
            id: `${componentName}-${pattern.source.slice(0, 20)}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            category,
            impact,
            file: componentName,
            description,
            recommendation,
          });
        }
      }
    }

    return findings;
  }

  auditPage(
    pageCode: string,
    componentCodes: Array<{ name: string; code: string }> = []
  ): AuditResult {
    const findings: PerfFinding[] = [];

    const pageFindings = this.auditComponent(pageCode, 'page');
    findings.push(...pageFindings);

    for (const comp of componentCodes) {
      const compFindings = this.auditComponent(comp.code, comp.name);
      findings.push(...compFindings);
    }

    return this.buildResult(findings);
  }

  auditBundle(bundleInfo: BundleInfo[]): AuditResult {
    const findings: PerfFinding[] = [];
    const totalSize = bundleInfo.reduce((sum, b) => sum + b.size, 0);
    const totalGzip = bundleInfo.reduce((sum, b) => sum + b.gzipped_size, 0);

    for (const bundle of bundleInfo) {
      if (bundle.size > 500 * 1024) {
        findings.push({
          id: `bundle-large-${bundle.name}-${Date.now()}`,
          category: 'Network',
          impact: 'high',
          file: bundle.name,
          description: `Bundle ${bundle.name}${i18n.t('ai.performance-auditor.k4')}${(bundle.size / 1024).toFixed(1)}${i18n.t('ai.performance-auditor.kb500kb_5')}`,
          recommendation: i18n.t('ai.performance-auditor.k18'),
        });
      }

      if (bundle.gzipped_size > 100 * 1024) {
        findings.push({
          id: `bundle-gzip-${bundle.name}-${Date.now()}`,
          category: 'Network',
          impact: 'medium',
          file: bundle.name,
          description: `Bundle ${bundle.name}${i18n.t('ai.performance-auditor.gzip_6')}${(bundle.gzipped_size / 1024).toFixed(1)}${i18n.t('ai.performance-auditor.kb_7')}`,
          recommendation: i18n.t('ai.performance-auditor.k19'),
        });
      }
    }

    if (totalSize > 2 * 1024 * 1024) {
      findings.push({
        id: `bundle-total-${Date.now()}`,
        category: 'Network',
        impact: 'high',
        file: 'bundle',
        description: `${i18n.t('ai.performance-auditor.bundle_8')}${(totalSize / 1024 / 1024).toFixed(2)}${i18n.t('ai.performance-auditor.mb2mb_9')}`,
        recommendation: i18n.t('ai.performance-auditor.k20'),
      });
    }

    if (totalGzip > 500 * 1024) {
      findings.push({
        id: `bundle-gzip-total-${Date.now()}`,
        category: 'Network',
        impact: 'medium',
        file: 'bundle',
        description: `${i18n.t('ai.performance-auditor.gzip_10')}${(totalGzip / 1024).toFixed(1)}${i18n.t('ai.performance-auditor.kb500kb_11')}`,
        recommendation: i18n.t('ai.performance-auditor.brotli_21'),
      });
    }

    const lighthouseScores = this.estimateLighthouseScores(bundleInfo);
    const metrics = this.estimateMetrics(bundleInfo);

    return {
      findings,
      lighthouse_scores: lighthouseScores,
      metrics,
      optimized: findings.filter((f) => f.impact === 'high').length === 0,
      audited_at: Date.now(),
    };
  }

  getLighthouseScores(): LighthouseScores {
    return {
      performance: 85,
      accessibility: 95,
      best_practices: 90,
      seo: 92,
    };
  }

  getBundleAnalysis(bundles: BundleInfo[]): Array<{
    name: string;
    size_kb: number;
    gzipped_kb: number;
    percentage: number;
  }> {
    const totalSize = bundles.reduce((sum, b) => sum + b.size, 0);
    return bundles.map((b) => ({
      name: b.name,
      size_kb: Number((b.size / 1024).toFixed(1)),
      gzipped_kb: Number((b.gzipped_size / 1024).toFixed(1)),
      percentage: totalSize > 0 ? Number(((b.size / totalSize) * 100).toFixed(1)) : 0,
    }));
  }

  getPerformanceSuggestions(findings: PerfFinding[]): string[] {
    const suggestions: string[] = [];

    const byCategory = findings.reduce<Record<string, PerfFinding[]>>((acc, f) => {
      if (!acc[f.category]) acc[f.category] = [];
      acc[f.category].push(f);
      return acc;
    }, {});

    if (byCategory['Rendering']?.length) {
      suggestions.push(i18n.t('ai.performance-auditor.k12'));
    }
    if (byCategory['Scripting']?.length) {
      suggestions.push(i18n.t('ai.performance-auditor.k22'));
    }
    if (byCategory['Network']?.length) {
      suggestions.push(i18n.t('ai.performance-auditor.k23'));
    }
    if (byCategory['Storage']?.length) {
      suggestions.push(i18n.t('ai.performance-auditor.k24'));
    }

    const highImpactCount = findings.filter((f) => f.impact === 'high').length;
    if (highImpactCount > 0) {
      suggestions.push(
        `${i18n.t('ai.performance-auditor.k13')}${highImpactCount}${i18n.t('ai.performance-auditor.k14')}`
      );
    }

    return suggestions;
  }

  private buildResult(findings: PerfFinding[]): AuditResult {
    return {
      findings,
      lighthouse_scores: this.estimateLighthouseScoresFromFindings(findings),
      metrics: this.estimateMetricsFromFindings(findings),
      optimized: findings.filter((f) => f.impact === 'high').length === 0,
      audited_at: Date.now(),
    };
  }

  private estimateLighthouseScores(bundles: BundleInfo[]): LighthouseScores {
    const totalSize = bundles.reduce((sum, b) => sum + b.size, 0);
    let performance = 95;

    if (totalSize > 2 * 1024 * 1024) {
      performance -= 30;
    } else if (totalSize > 1 * 1024 * 1024) {
      performance -= 15;
    } else if (totalSize > 500 * 1024) {
      performance -= 5;
    }

    return {
      performance: Math.max(30, performance),
      accessibility: 95,
      best_practices: 90,
      seo: 92,
    };
  }

  private estimateLighthouseScoresFromFindings(findings: PerfFinding[]): LighthouseScores {
    const highCount = findings.filter((f) => f.impact === 'high').length;
    const mediumCount = findings.filter((f) => f.impact === 'medium').length;

    const performance = 95 - highCount * 5 - mediumCount * 2;
    return {
      performance: Math.max(30, performance),
      accessibility: 95,
      best_practices: 90,
      seo: 92,
    };
  }

  private estimateMetrics(bundles: BundleInfo[]): AuditMetrics {
    const totalSize = bundles.reduce((sum, b) => sum + b.gzipped_size, 0);
    const baseSize = totalSize / 1024;

    return {
      fcp: Math.round(500 + baseSize * 2),
      lcp: Math.round(1500 + baseSize * 3),
      tti: Math.round(2000 + baseSize * 4),
      cls: Number((baseSize > 500 ? 0.15 : 0.05).toFixed(2)),
    };
  }

  private estimateMetricsFromFindings(findings: PerfFinding[]): AuditMetrics {
    const highCount = findings.filter((f) => f.impact === 'high').length;
    const mediumCount = findings.filter((f) => f.impact === 'medium').length;

    return {
      fcp: Math.round(500 + highCount * 200 + mediumCount * 100),
      lcp: Math.round(1500 + highCount * 300 + mediumCount * 150),
      tti: Math.round(2000 + highCount * 400 + mediumCount * 200),
      cls: Number((highCount > 2 ? 0.15 : 0.05).toFixed(2)),
    };
  }
}

export const performanceAuditor = new PerformanceAuditor();
