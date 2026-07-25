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
    name: 'Console.log 残留',
    type: 'maintainability',
    severity: 'warning',
    pattern: /console\.log\(/g,
    message: '生产代码中不应保留 console.log 调试语句',
    suggestion: '移除 console.log 或使用条件日志工具',
  },
  {
    id: 'any-type',
    name: '避免使用 any 类型',
    type: 'maintainability',
    severity: 'warning',
    pattern: /:\s*any\b/g,
    message: '使用 any 类型会绕过 TypeScript 类型检查',
    suggestion: '定义明确的接口或使用 unknown 替代',
  },
  {
    id: 'hardcoded-string',
    name: '硬编码字符串',
    type: 'maintainability',
    severity: 'info',
    pattern: /['"][^'"]{20,}['"]/g,
    message: '检测到可能的硬编码长字符串',
    suggestion: '考虑提取为常量或配置',
  },
  {
    id: 'todo-comment',
    name: 'TODO/FIXME 注释',
    type: 'maintainability',
    severity: 'info',
    pattern: /(TODO|FIXME|HACK|XXX)/g,
    message: '存在待处理的 TODO/FIXME 注释',
    suggestion: '及时处理或创建任务跟踪',
  },
  {
    id: 'nested-loops',
    name: '嵌套循环',
    type: 'performance',
    severity: 'warning',
    pattern: /for\s*\([^)]*\)\s*\{[^}]*for\s*\(/g,
    message: '检测到嵌套循环，可能存在性能问题',
    suggestion: '考虑使用 Map/Set 或优化算法',
  },
  {
    id: 'inline-style',
    name: '内联样式',
    type: 'style',
    severity: 'info',
    pattern: /style\s*=\s*\{/g,
    message: '使用内联样式不利于维护',
    suggestion: '使用 CSS 类名或 styled-components',
  },
  {
    id: 'dangerously-set-html',
    name: 'dangerouslySetInnerHTML 使用',
    type: 'security',
    severity: 'error',
    pattern: /dangerouslySetInnerHTML/g,
    message: '使用 dangerouslySetInnerHTML 可能导致 XSS 攻击',
    suggestion: '对 HTML 内容进行严格消毒，优先使用数据绑定',
  },
  {
    id: 'eval-usage',
    name: 'eval() 使用',
    type: 'security',
    severity: 'error',
    pattern: /\beval\s*\(/g,
    message: '使用 eval() 存在严重安全风险',
    suggestion: '避免使用 eval，使用更安全的替代方案',
  },
  {
    id: 'var-declaration',
    name: 'var 声明',
    type: 'style',
    severity: 'info',
    pattern: /\bvar\s+\w+/g,
    message: '应使用 const/let 替代 var',
    suggestion: '将 var 替换为 const 或 let',
  },
  {
    id: 'long-function',
    name: '过长函数',
    type: 'maintainability',
    severity: 'warning',
    pattern: /\/\/.*function|function\s+\w+/g,
    message: '函数可能过长，请检查',
    suggestion: '将长函数拆分为多个小函数',
  },
  {
    id: 'mutable-state',
    name: '可变状态直接修改',
    type: 'bug',
    severity: 'error',
    pattern: /\.push\(|\.splice\(|\.pop\(|\.shift\(/g,
    message: '直接修改数组可能导致 React 状态不更新',
    suggestion: '使用展开运算符或不可变更新方法',
  },
  {
    id: 'ignore-errors',
    name: '忽略错误',
    type: 'bug',
    severity: 'warning',
    pattern: /catch\s*\(\s*\)\s*\{[\s]*\}/g,
    message: '捕获错误后未处理',
    suggestion: '至少记录错误或给出用户提示',
  },
];

export class CodeReviewer {
  private rules: ReviewRule[];

  constructor() {
    this.rules = [...DEFAULT_RULES];
  }

  review_code(code: string, file: string = 'inline'): ReviewIssue[] {
    const issues: ReviewIssue[] = [];

    for (const rule of this.rules) {
      const matches = code.match(new RegExp(rule.pattern.source, rule.pattern.flags));
      if (matches) {
        for (let i = 0; i < matches.length; i++) {
          const lineNo = this.find_line_number(code, matches[i]);
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

  review_file(content: string, filePath: string): ReviewResult {
    const issues = this.review_code(content, filePath);
    return this.build_result(issues);
  }

  review_directory(files: Array<{ path: string; content: string }>): ReviewResult {
    const allIssues: ReviewIssue[] = [];
    for (const file of files) {
      const issues = this.review_code(file.content, file.path);
      allIssues.push(...issues);
    }
    return this.build_result(allIssues);
  }

  get_issues_by_severity(issues: ReviewIssue[]): Record<IssueSeverity, ReviewIssue[]> {
    return {
      error: issues.filter((i) => i.severity === 'error'),
      warning: issues.filter((i) => i.severity === 'warning'),
      info: issues.filter((i) => i.severity === 'info'),
    };
  }

  generate_summary(issues: ReviewIssue[]): string {
    const bySeverity = this.get_issues_by_severity(issues);
    const byType = this.get_issues_by_type(issues);

    const parts: string[] = [];
    parts.push(`共发现 ${issues.length} 个问题`);

    if (bySeverity.error.length > 0) {
      parts.push(`严重错误 ${bySeverity.error.length} 个`);
    }
    if (bySeverity.warning.length > 0) {
      parts.push(`警告 ${bySeverity.warning.length} 个`);
    }
    if (bySeverity.info.length > 0) {
      parts.push(`建议 ${bySeverity.info.length} 个`);
    }

    const typeSummaries = Object.entries(byType)
      .filter(([, v]) => v.length > 0)
      .map(([k, v]) => `${this.get_type_label(k)} ${v.length} 个`);
    if (typeSummaries.length > 0) {
      parts.push(`涉及 ${typeSummaries.join('、')}`);
    }

    return `${parts.join('；')}。`;
  }

  get_review_rules(): ReviewRule[] {
    return [...this.rules];
  }

  add_custom_rule(rule: Omit<ReviewRule, 'id'>): ReviewRule {
    const newRule: ReviewRule = {
      ...rule,
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    this.rules.push(newRule);
    return newRule;
  }

  private build_result(issues: ReviewIssue[]): ReviewResult {
    const errors = issues.filter((i) => i.severity === 'error').length;
    const warnings = issues.filter((i) => i.severity === 'warning').length;

    const score = this.calculate_score(issues);
    const passed = errors === 0;

    return {
      issues,
      summary: this.generate_summary(issues),
      score,
      passed,
      reviewed_at: Date.now(),
    };
  }

  private calculate_score(issues: ReviewIssue[]): number {
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

  private get_issues_by_type(issues: ReviewIssue[]): Record<string, ReviewIssue[]> {
    const grouped: Record<string, ReviewIssue[]> = {};
    for (const issue of issues) {
      if (!grouped[issue.type]) {
        grouped[issue.type] = [];
      }
      grouped[issue.type].push(issue);
    }
    return grouped;
  }

  private get_type_label(type: string): string {
    const labels: Record<string, string> = {
      bug: 'Bug',
      style: '样式',
      performance: '性能',
      security: '安全',
      maintainability: '可维护性',
    };
    return labels[type] ?? type;
  }

  private find_line_number(code: string, match: string): number {
    const idx = code.indexOf(match);
    if (idx === -1) return 1;
    return code.slice(0, idx).split('\n').length;
  }
}

export const codeReviewer = new CodeReviewer();
