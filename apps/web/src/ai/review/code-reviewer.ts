import i18n from '@/i18n';

export type IssueType = 'bug' | 'style' | 'performance' | 'security' | 'maintainability';
export type IssueSeverity = 'error' | 'warning' | 'info';

export interface ReviewIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  file: string;
  line: number;
  message: string;
  suggestion: string;
}

export interface ReviewResult {
  issues: ReviewIssue[];
  summary: string;
  score: number;
  passed: boolean;
  reviewed_at: number;
}

export interface ReviewRule {
  id: string;
  name: string;
  type: IssueType;
  severity: IssueSeverity;
  pattern: RegExp;
  message: string;
  suggestion: string;
}

const DEFAULT_RULES: ReviewRule[] = [
  {
    id: 'console-log',
    name: i18n.t('ai.code-reviewer.consolelog_0'),
    type: 'maintainability',
    severity: 'warning',
    pattern: /console\.log\(/g,
    message: i18n.t('ai.code-reviewer.k1'),
    suggestion: i18n.t('ai.code-reviewer.k2'),
  },
  {
    id: 'any-type',
    name: i18n.t('ai.code-reviewer.any_0'),
    type: 'maintainability',
    severity: 'warning',
    pattern: /:\s*any\b/g,
    message: i18n.t('ai.code-reviewer.k1'),
    suggestion: i18n.t('ai.code-reviewer.k2'),
  },
  {
    id: 'hardcoded-string',
    name: i18n.t('ai.code-reviewer.k3'),
    type: 'maintainability',
    severity: 'info',
    pattern: /['"][^'"]{20,}['"]/g,
    message: i18n.t('ai.code-reviewer.k4'),
    suggestion: i18n.t('ai.code-reviewer.k5'),
  },
  {
    id: 'todo-comment',
    name: i18n.t('ai.code-reviewer.todofixme_3'),
    type: 'maintainability',
    severity: 'info',
    pattern: /(TODO|FIXME|HACK|XXX)/g,
    message: i18n.t('ai.code-reviewer.todofixme_6'),
    suggestion: i18n.t('ai.code-reviewer.k7'),
  },
  {
    id: 'nested-loops',
    name: i18n.t('ai.code-reviewer.k8'),
    type: 'performance',
    severity: 'warning',
    pattern: /for\s*\([^)]*\)\s*\{[^}]*for\s*\(/g,
    message: i18n.t('ai.code-reviewer.k9'),
    suggestion: i18n.t('ai.code-reviewer.mapset_10'),
  },
  {
    id: 'inline-style',
    name: i18n.t('ai.code-reviewer.k11'),
    type: 'style',
    severity: 'info',
    pattern: /style\s*=\s*\{/g,
    message: i18n.t('ai.code-reviewer.k12'),
    suggestion: i18n.t('ai.code-reviewer.k13'),
  },
  {
    id: 'dangerously-set-html',
    name: i18n.t('ai.code-reviewer.k4'),
    type: 'security',
    severity: 'error',
    pattern: /dangerouslySetInnerHTML/g,
    message: i18n.t('ai.code-reviewer.k14'),
    suggestion: i18n.t('ai.code-reviewer.k15'),
  },
  {
    id: 'eval-usage',
    name: i18n.t('ai.code-reviewer.eval_5'),
    type: 'security',
    severity: 'error',
    pattern: /\beval\s*\(/g,
    message: i18n.t('ai.code-reviewer.eval_16'),
    suggestion: i18n.t('ai.code-reviewer.eval_17'),
  },
  {
    id: 'var-declaration',
    name: i18n.t('ai.code-reviewer.var_6'),
    type: 'style',
    severity: 'info',
    pattern: /\bvar\s+\w+/g,
    message: i18n.t('ai.code-reviewer.constletvar_18'),
    suggestion: i18n.t('ai.code-reviewer.k19'),
  },
  {
    id: 'long-function',
    name: i18n.t('ai.code-reviewer.k20'),
    type: 'maintainability',
    severity: 'warning',
    pattern: /\/\/.*function|function\s+\w+/g,
    message: i18n.t('ai.code-reviewer.k21'),
    suggestion: i18n.t('ai.code-reviewer.k22'),
  },
  {
    id: 'mutable-state',
    name: i18n.t('ai.code-reviewer.k23'),
    type: 'bug',
    severity: 'error',
    pattern: /\.push\(|\.splice\(|\.pop\(|\.shift\(/g,
    message: i18n.t('ai.code-reviewer.k24'),
    suggestion: i18n.t('ai.code-reviewer.k25'),
  },
  {
    id: 'ignore-errors',
    name: i18n.t('ai.code-reviewer.k26'),
    type: 'bug',
    severity: 'warning',
    pattern: /catch\s*\(\s*\)\s*\{[\s]*\}/g,
    message: i18n.t('ai.code-reviewer.k27'),
    suggestion: i18n.t('ai.code-reviewer.k28'),
  },
];

export class CodeReviewer {
  private rules: ReviewRule[];

  constructor() {
    this.rules = [...DEFAULT_RULES];
  }

  reviewCode(code: string, file: string = 'inline'): ReviewIssue[] {
    const issues: ReviewIssue[] = [];

    for (const rule of this.rules) {
      const matches = code.match(new RegExp(rule.pattern.source, rule.pattern.flags));
      if (matches) {
        for (let i = 0; i < matches.length; i++) {
          const lineNo = this.findLineNumber(code, matches[i]);
          issues.push({
            id: `${rule.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: rule.type,
            severity: rule.severity,
            file,
            line: lineNo,
            message: rule.message,
            suggestion: rule.suggestion,
          });
        }
      }
    }

    return issues.sort((a, b) => {
      const severityOrder = { error: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  reviewFile(content: string, filePath: string): ReviewResult {
    const issues = this.reviewCode(content, filePath);
    return this.buildResult(issues);
  }

  reviewDirectory(files: Array<{ path: string; content: string }>): ReviewResult {
    const allIssues: ReviewIssue[] = [];
    for (const file of files) {
      const issues = this.reviewCode(file.content, file.path);
      allIssues.push(...issues);
    }
    return this.buildResult(allIssues);
  }

  getIssuesBySeverity(issues: ReviewIssue[]): Record<IssueSeverity, ReviewIssue[]> {
    return {
      error: issues.filter((i) => i.severity === 'error'),
      warning: issues.filter((i) => i.severity === 'warning'),
      info: issues.filter((i) => i.severity === 'info'),
    };
  }

  generateSummary(issues: ReviewIssue[]): string {
    const bySeverity = this.getIssuesBySeverity(issues);
    const byType = this.getIssuesByType(issues);

    const parts: string[] = [];
    parts.push(`${i18n.t('ai.code-reviewer.k7')}${issues.length}${i18n.t('ai.code-reviewer.k8')}`);

    if (bySeverity.error.length > 0) {
      parts.push(
        `${i18n.t('ai.code-reviewer.k9')}${bySeverity.error.length}${i18n.t('ai.code-reviewer.k10')}`
      );
    }
    if (bySeverity.warning.length > 0) {
      parts.push(
        `${i18n.t('ai.code-reviewer.k11')}${bySeverity.warning.length}${i18n.t('ai.code-reviewer.k12')}`
      );
    }
    if (bySeverity.info.length > 0) {
      parts.push(
        `${i18n.t('ai.code-reviewer.k13')}${bySeverity.info.length}${i18n.t('ai.code-reviewer.k14')}`
      );
    }

    const typeSummaries = Object.entries(byType)
      .filter(([, v]) => v.length > 0)
      .map(([k, v]) => `${this.getTypeLabel(k)} ${v.length}${i18n.t('ai.code-reviewer.k15')}`);
    if (typeSummaries.length > 0) {
      parts.push(`${i18n.t('ai.code-reviewer.k16')}${typeSummaries.join('、')}`);
    }

    return `${parts.join('；')}。`;
  }

  getReviewRules(): ReviewRule[] {
    return [...this.rules];
  }

  addCustomRule(rule: Omit<ReviewRule, 'id'>): ReviewRule {
    const newRule: ReviewRule = {
      ...rule,
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    this.rules.push(newRule);
    return newRule;
  }

  private buildResult(issues: ReviewIssue[]): ReviewResult {
    const errors = issues.filter((i) => i.severity === 'error').length;

    const score = this.calculateScore(issues);
    const passed = errors === 0;

    return {
      issues,
      summary: this.generateSummary(issues),
      score,
      passed,
      reviewed_at: Date.now(),
    };
  }

  private calculateScore(issues: ReviewIssue[]): number {
    let score = 100;
    for (const issue of issues) {
      switch (issue.severity) {
        case 'error':
          score -= 15;
          break;
        case 'warning':
          score -= 5;
          break;
        case 'info':
          score -= 1;
          break;
      }
    }
    return Math.max(0, Math.min(100, score));
  }

  private getIssuesByType(issues: ReviewIssue[]): Record<string, ReviewIssue[]> {
    const grouped: Record<string, ReviewIssue[]> = {};
    for (const issue of issues) {
      if (!grouped[issue.type]) {
        grouped[issue.type] = [];
      }
      grouped[issue.type].push(issue);
    }
    return grouped;
  }

  private getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      bug: 'Bug',
      style: i18n.t('ai.code-reviewer.k29'),
      performance: i18n.t('ai.code-reviewer.k30'),
      security: i18n.t('ai.code-reviewer.k31'),
      maintainability: i18n.t('ai.code-reviewer.k32'),
    };
    return labels[type] ?? type;
  }

  private findLineNumber(code: string, match: string): number {
    const idx = code.indexOf(match);
    if (idx === -1) return 1;
    return code.slice(0, idx).split('\n').length;
  }
}

export const codeReviewer = new CodeReviewer();
