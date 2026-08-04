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
    description: 'useEffect 依赖数组为空但内部有副作用',
    recommendation: '添加正确的依赖项，或使用 useLayoutEffect',
  },
  {
    pattern: /\.map\([^)]*\)\.filter\([^)]*\)\.reduce\([^)]*\)/g,
    category: 'Scripting',
    impact: 'low',
    description: '链式数组操作可能影响大数据集性能',
    recommendation: '使用单次遍历或 for 循环处理大数据',
  },
  {
    pattern: /JSON\.parse\s*\(/g,
    category: 'Scripting',
    impact: 'low',
    description: 'JSON.parse 在热路径上影响性能',
    recommendation: '考虑缓存解析结果或使用更高效的数据格式',
  },
  {
    pattern: /new\s+Date\s*\(\s*\)/g,
    category: 'Scripting',
    impact: 'low',
    description: '频繁创建 Date 对象',
    recommendation: '使用 Date.now() 获取时间戳，或缓存日期计算',
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
    description: '每次渲染创建新的内联样式对象',
    recommendation: '使用 useMemo 缓存样式对象或使用 className',
  },
  {
    pattern: /<([A-Z]\w+)[^>]*>\s*<\/\1>/g,
    category: 'Rendering',
    impact: 'low',
    description: '空组件标签可能导致不必要的渲染',
    recommendation: '移除空组件或添加必要的内容',
  },
  {
    pattern: /\.sort\([^)]*\)/g,
    category: 'Rendering',
    impact: 'low',
    description: '每次渲染时进行数组排序',
    recommendation: '使用 useMemo 缓存排序结果',
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
    description: '在 useEffect 中直接调用 fetch',
    recommendation: '使用 React Query 或 SWR 等数据获取库',
  },
  {
    pattern: /fetch\s*\([^)]*\)\s*\.then\s*\([^)]*=>[^)]*=>/g,
    category: 'Network',
    impact: 'low',
    description: '嵌套 Promise 链',
    recommendation: '使用 async/await 或 Promise.all 并行请求',
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
    description: '同步 localStorage 操作阻塞主线程',
    recommendation: '使用异步 IndexedDB 或优化存储读取',
  },
  {
    pattern: /sessionStorage\.(getItem|setItem)\s*\(/g,
    category: 'Storage',
    impact: 'low',
    description: '频繁的 sessionStorage 操作',
    recommendation: '减少存储操作频率，使用内存缓存',
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
          description: `Bundle ${bundle.name} 大小 ${(bundle.size / 1024).toFixed(1)}KB 超过 500KB`,
          recommendation: '使用代码分割、懒加载或 Tree Shaking 减小包体积',
        });
      }

      if (bundle.gzipped_size > 100 * 1024) {
        findings.push({
          id: `bundle-gzip-${bundle.name}-${Date.now()}`,
          category: 'Network',
          impact: 'medium',
          file: bundle.name,
          description: `Bundle ${bundle.name} gzip 后 ${(bundle.gzipped_size / 1024).toFixed(1)}KB 仍较大`,
          recommendation: '考虑进一步优化或拆分',
        });
      }
    }

    if (totalSize > 2 * 1024 * 1024) {
      findings.push({
        id: `bundle-total-${Date.now()}`,
        category: 'Network',
        impact: 'high',
        file: 'bundle',
        description: `总 bundle 大小 ${(totalSize / 1024 / 1024).toFixed(2)}MB 超过 2MB`,
        recommendation: '实施激进的代码分割和懒加载策略',
      });
    }

    if (totalGzip > 500 * 1024) {
      findings.push({
        id: `bundle-gzip-total-${Date.now()}`,
        category: 'Network',
        impact: 'medium',
        file: 'bundle',
        description: `总 gzip 后大小 ${(totalGzip / 1024).toFixed(1)}KB 超过 500KB`,
        recommendation: '进一步压缩或使用 Brotli 压缩',
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
      suggestions.push('优化渲染性能：使用 React.memo、useMemo、useCallback 减少不必要的重渲染');
    }
    if (byCategory['Scripting']?.length) {
      suggestions.push(
        '优化脚本执行：避免在渲染期间进行昂贵计算，使用 Web Worker 处理 CPU 密集任务'
      );
    }
    if (byCategory['Network']?.length) {
      suggestions.push('优化网络请求：使用数据缓存、分页加载、预加载策略');
    }
    if (byCategory['Storage']?.length) {
      suggestions.push('优化存储访问：减少同步存储操作，使用内存缓存');
    }

    const highImpactCount = findings.filter((f) => f.impact === 'high').length;
    if (highImpactCount > 0) {
      suggestions.push(`存在 ${highImpactCount} 个高影响性能问题，建议优先修复`);
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
