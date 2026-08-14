import i18n from '@/i18n';
/**
 * V50.0 前端 A2UI — 智能代码审查器
 *
 * 智能代码质量分析：
 * - 代码规范检查 → 最佳实践建议
 * - 性能问题检测 → 优化方案
 * - 安全漏洞扫描 → 修复建议
 * - 可维护性评估 → 重构建议
 * - 架构模式识别 → 改进建议
 */

// ============ 枚举与类型定义 ============

export enum ReviewSeverity {
  CRITICAL = 'critical',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  HINT = 'hint',
}

export enum ReviewCategory {
  BUGRISK = 'bug_risk',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  MAINTAINABILITY = 'maintainability',
  BESTPRACTICE = 'best_practice',
  ACCESSIBILITY = 'accessibility',
  TYPESAFETY = 'type_safety',
  ARCHITECTURE = 'architecture',
  STYLE = 'style',
  COMPLEXITY = 'complexity',
}

export enum FixDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  MANUAL = 'manual',
}

export enum ReviewStatus {
  PENDING = 'pending',
  INPROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// ============ 接口定义 ============

export interface CodeReviewRequest {
  source_file: string;
  source_code: string;
  review_type?: 'full' | 'quick' | 'security' | 'performance' | 'accessibility';
  severity_filter?: ReviewSeverity[];
  categories?: ReviewCategory[];
  custom_rules?: CustomRule[];
  baseline_file?: string;
  exclude_patterns?: string[];
  max_issues?: number;
}

export interface CustomRule {
  id: string;
  name: string;
  pattern: string | RegExp;
  message: string;
  severity: ReviewSeverity;
  category: ReviewCategory;
  fix?: string;
}

export interface CodeReviewResult {
  file: string;
  issues: ReviewIssue[];
  metrics: CodeMetrics;
  score: ReviewScore;
  summary: ReviewSummary;
  suggestions: ReviewSuggestion[];
  approved: boolean;
  review_time: number;
}

export interface ReviewIssue {
  id: string;
  rule_id: string;
  message: string;
  description: string;
  severity: ReviewSeverity;
  category: ReviewCategory;
  line: number;
  column: number;
  end_line?: number;
  end_column?: number;
  code_snippet: string;
  fix_suggestion?: FixSuggestion;
  references?: string[];
  tags?: string[];
}

export interface FixSuggestion {
  description: string;
  difficulty: FixDifficulty;
  fix_code?: string;
  auto_fixable: boolean;
  steps?: string[];
}

export interface CodeMetrics {
  lines_of_code: number;
  lines_of_comments: number;
  cyclomatic_complexity: number;
  cognitive_complexity: number;
  maintainability_index: number;
  halstead_volume: number;
  coupling_degree: number;
  cohesion_score: number;
  test_coverage_estimate: number;
  duplicated_lines: number;
  todo_count: number;
}

export interface ReviewScore {
  overall: number;
  quality: number;
  security: number;
  performance: number;
  maintainability: number;
  accessibility: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface ReviewSummary {
  total_issues: number;
  critical_count: number;
  error_count: number;
  warning_count: number;
  info_count: number;
  by_category: Record<ReviewCategory, number>;
  top_issues: string[];
  improvement_potential: number;
}

export interface ReviewSuggestion {
  type: 'refactor' | 'optimize' | 'secure' | 'document' | 'test' | 'style';
  description: string;
  priority: 'high' | 'medium' | 'low';
  impact: string;
  effort: string;
  example?: string;
}

export interface DiffReviewResult {
  added_issues: ReviewIssue[];
  fixed_issues: string[];
  unchanged_issues: ReviewIssue[];
  new_metrics: CodeMetrics;
  delta_summary: string;
}

export interface PatternDetection {
  pattern_type: string;
  locations: number[];
  confidence: number;
  suggestion?: string;
}

// ============ 规则定义 ============

const REVIEW_RULES: ReviewRuleDef[] = [
  // Bug 风险
  {
    id: 'no-unused-vars',
    category: ReviewCategory.BUGRISK,
    severity: ReviewSeverity.WARNING,
    message: i18n.t('shared.smart-code-reviewer.k0'),
    pattern: /(?:const|let|var)\s+(\w+)\s*=[^;]+;(?!.*\1\b)/g,
    check: (code: string) => {
      const issues: ReviewIssue[] = [];
      const lines = code.split('\n');
      lines.forEach((line, idx) => {
        const match = line.match(/(?:const|let|var)\s+(\w+)/);
        if (match) {
          const varName = match[1];
          const restOfFile = lines.slice(idx + 1).join('\n');
          if (!restOfFile.includes(varName)) {
            issues.push({
              id: `unused-var-${idx}`,
              rule_id: 'no-unused-vars',
              message: `${i18n.t('shared.smart-code-reviewer.k0')}${varName}${i18n.t('shared.smart-code-reviewer.k1')}`,
              description: i18n.t('shared.smart-code-reviewer.k1'),
              severity: ReviewSeverity.WARNING,
              category: ReviewCategory.BUGRISK,
              line: idx + 1,
              column: line.indexOf(varName) + 1,
              code_snippet: line.trim(),
              fix_suggestion: {
                description: i18n.t('shared.smart-code-reviewer.k2'),
                difficulty: FixDifficulty.EASY,
                auto_fixable: true,
              },
            });
          }
        }
      });
      return issues;
    },
  },
  {
    id: 'no-empty-function',
    category: ReviewCategory.BUGRISK,
    severity: ReviewSeverity.WARNING,
    message: i18n.t('shared.smart-code-reviewer.k3'),
    pattern: /function\s+\w+\s*\([^)]*\)\s*{\s*}/g,
  },
  {
    id: 'no-compare-literal',
    category: ReviewCategory.BUGRISK,
    severity: ReviewSeverity.WARNING,
    message: i18n.t('shared.smart-code-reviewer.k4'),
    pattern: /if\s*\([^)]*(?:==|!=)\s*['"][^'"]*['"]\)/g,
  },

  // 性能问题
  {
    id: 'no-large-bundle',
    category: ReviewCategory.PERFORMANCE,
    severity: ReviewSeverity.INFO,
    message: i18n.t('shared.smart-code-reviewer.k5'),
    check: (code: string) => {
      const lines = code.split('\n').length;
      if (lines > 500) {
        return [
          {
            id: 'large-file',
            rule_id: 'no-large-bundle',
            message: `${i18n.t('shared.smart-code-reviewer.k2')}${lines}${i18n.t('shared.smart-code-reviewer.k3')}`,
            description: i18n.t('shared.smart-code-reviewer.k6'),
            severity: ReviewSeverity.INFO,
            category: ReviewCategory.PERFORMANCE,
            line: 1,
            column: 1,
            code_snippet: `${i18n.t('shared.smart-code-reviewer.k4')}${lines}${i18n.t('shared.smart-code-reviewer.k5')}`,
            fix_suggestion: {
              description: i18n.t('shared.smart-code-reviewer.k7'),
              difficulty: FixDifficulty.MEDIUM,
              auto_fixable: false,
            },
          },
        ];
      }
      return [];
    },
  },
  {
    id: 'no-inline-function',
    category: ReviewCategory.PERFORMANCE,
    severity: ReviewSeverity.INFO,
    message: i18n.t('shared.smart-code-reviewer.k8'),
    pattern: /(?:onClick|onChange|on[A-Z]\w*)=\{?\s*(?:\(\)=>|function\s*\()/g,
  },
  {
    id: 'no-memo-oomission',
    category: ReviewCategory.PERFORMANCE,
    severity: ReviewSeverity.HINT,
    message: i18n.t('shared.smart-code-reviewer.usememo_9'),
    pattern: /(?:const|let)\s+\w+\s*=\s*(?:\w+\.\w+\(\)|\[[^\]]+\]\.map|JSON\.parse)/g,
  },

  // 安全问题
  {
    id: 'no-eval',
    category: ReviewCategory.SECURITY,
    severity: ReviewSeverity.CRITICAL,
    message: i18n.t('shared.smart-code-reviewer.eval_10'),
    pattern: /eval\s*\(/g,
  },
  {
    id: 'no-inner-html',
    category: ReviewCategory.SECURITY,
    severity: ReviewSeverity.CRITICAL,
    message: i18n.t('shared.smart-code-reviewer.innerhtmlxss_6'),
    pattern: /\.innerHTML\s*=/g,
  },
  {
    id: 'no-document-write',
    category: ReviewCategory.SECURITY,
    severity: ReviewSeverity.ERROR,
    message: i18n.t('shared.smart-code-reviewer.documentwrite_7'),
    pattern: /document\.write\s*\(/g,
  },
  {
    id: 'no-hardcoded-secret',
    category: ReviewCategory.SECURITY,
    severity: ReviewSeverity.CRITICAL,
    message: i18n.t('shared.smart-code-reviewer.k11'),
    pattern: /(?:password|secret|api[_-]?key|token|auth)\s*[=:]\s*['"][^'"]+['"]/gi,
  },

  // 可维护性
  {
    id: 'no-magic-number',
    category: ReviewCategory.MAINTAINABILITY,
    severity: ReviewSeverity.INFO,
    message: i18n.t('shared.smart-code-reviewer.k12'),
    pattern: /(?:==|!=|>=|<=|>|<)\s*(?![01])(\d{2,})\b/g,
  },
  {
    id: 'no-long-function',
    category: ReviewCategory.MAINTAINABILITY,
    severity: ReviewSeverity.WARNING,
    message: i18n.t('shared.smart-code-reviewer.k13'),
    check: (code: string) => {
      const issues: ReviewIssue[] = [];
      const lines = code.split('\n');
      let functionStart = -1;
      let functionLines = 0;

      lines.forEach((line, idx) => {
        if (line.match(/(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\()/)) {
          functionStart = idx;
          functionLines = 0;
        }
        if (functionStart >= 0) {
          functionLines++;
          if (line.includes('}') || line.trim().endsWith('};')) {
            if (functionLines > 50) {
              issues.push({
                id: `long-func-${functionStart}`,
                rule_id: 'no-long-function',
                message: `${i18n.t('shared.smart-code-reviewer.k8')}${functionLines}${i18n.t('shared.smart-code-reviewer.k9')}`,
                description: i18n.t('shared.smart-code-reviewer.k14'),
                severity: ReviewSeverity.WARNING,
                category: ReviewCategory.MAINTAINABILITY,
                line: functionStart + 1,
                column: 1,
                code_snippet: lines[functionStart].trim(),
                fix_suggestion: {
                  description: i18n.t('shared.smart-code-reviewer.k15'),
                  difficulty: FixDifficulty.MEDIUM,
                  auto_fixable: false,
                },
              });
            }
            functionStart = -1;
          }
        }
      });
      return issues;
    },
  },
  {
    id: 'no-deep-nesting',
    category: ReviewCategory.MAINTAINABILITY,
    severity: ReviewSeverity.WARNING,
    message: i18n.t('shared.smart-code-reviewer.k16'),
    check: (code: string) => {
      const issues: ReviewIssue[] = [];
      const lines = code.split('\n');
      let maxNesting = 0;
      let maxNestingLine = 0;

      lines.forEach((line, idx) => {
        const currentNesting = (line.match(/^\s*/)?.[0].length ?? 0) / 2;

        if (currentNesting > maxNesting) {
          maxNesting = currentNesting;
          maxNestingLine = idx;
        }
      });

      if (maxNesting > 4) {
        issues.push({
          id: `deep-nesting-${maxNestingLine}`,
          rule_id: 'no-deep-nesting',
          message: `${i18n.t('shared.smart-code-reviewer.k10')}${Math.floor(maxNesting)}${i18n.t('shared.smart-code-reviewer.k11')}`,
          description: i18n.t('shared.smart-code-reviewer.k17'),
          severity: ReviewSeverity.WARNING,
          category: ReviewCategory.MAINTAINABILITY,
          line: maxNestingLine + 1,
          column: 1,
          code_snippet: lines[maxNestingLine].trim(),
        });
      }

      return issues;
    },
  },

  // 最佳实践
  {
    id: 'prefer-const',
    category: ReviewCategory.BESTPRACTICE,
    severity: ReviewSeverity.HINT,
    message: i18n.t('shared.smart-code-reviewer.const_18'),
    pattern: /let\s+(\w+)\s*=[^;]+;(?!.*\1\s*=)/g,
  },
  {
    id: 'prefer-arrow-callback',
    category: ReviewCategory.BESTPRACTICE,
    severity: ReviewSeverity.HINT,
    message: i18n.t('shared.smart-code-reviewer.k19'),
    pattern: /function\s*\([^)]*\)\s*{\s*return\s+/g,
  },
  {
    id: 'no-var',
    category: ReviewCategory.BESTPRACTICE,
    severity: ReviewSeverity.WARNING,
    message: i18n.t('shared.smart-code-reviewer.k20'),
    pattern: /\bvar\s+/g,
  },

  // 类型安全
  {
    id: 'no-any-type',
    category: ReviewCategory.TYPESAFETY,
    severity: ReviewSeverity.WARNING,
    message: i18n.t('shared.smart-code-reviewer.any_21'),
    pattern: /:\s*any\b/g,
  },
  {
    id: 'no-explicit-any',
    category: ReviewCategory.TYPESAFETY,
    severity: ReviewSeverity.WARNING,
    message: i18n.t('shared.smart-code-reviewer.any_22'),
    pattern: /<any>|as\s+any\b/g,
  },

  // 无障碍
  {
    id: 'no-alt-missing',
    category: ReviewCategory.ACCESSIBILITY,
    severity: ReviewSeverity.ERROR,
    message: i18n.t('shared.smart-code-reviewer.alt_23'),
    pattern: /<img[^>]*(?<!alt=["'][^"']*["'])[^>]*>/g,
  },
  {
    id: 'no-empty-alt',
    category: ReviewCategory.ACCESSIBILITY,
    severity: ReviewSeverity.WARNING,
    message: i18n.t('shared.smart-code-reviewer.alt_12'),
    pattern: /<img[^>]*alt=["']["'][^>]*>/g,
  },
  {
    id: 'no-click-without-key',
    category: ReviewCategory.ACCESSIBILITY,
    severity: ReviewSeverity.WARNING,
    message: i18n.t('shared.smart-code-reviewer.k24'),
    pattern: /<(?:div|span)[^>]*onClick[^>]*(?!onKeyDown)[^>]*>/g,
  },

  // 架构
  {
    id: 'no-direct-dom',
    category: ReviewCategory.ARCHITECTURE,
    severity: ReviewSeverity.INFO,
    message: i18n.t('shared.smart-code-reviewer.dom_25'),
    pattern: /document\.(?:getElementById|querySelector|getElementsBy)/g,
  },
  {
    id: 'no-global-state',
    category: ReviewCategory.ARCHITECTURE,
    severity: ReviewSeverity.WARNING,
    message: i18n.t('shared.smart-code-reviewer.k26'),
    pattern: /(?:window\.|global\.|globalThis\.)\w+\s*=/g,
  },
];

interface ReviewRuleDef {
  id: string;
  category: ReviewCategory;
  severity: ReviewSeverity;
  message: string;
  pattern?: RegExp;
  check?: (code: string) => ReviewIssue[];
}

// ============ 智能代码审查器 ============

export class SmartCodeReviewer {
  private rules: ReviewRuleDef[];
  private reviewCount = 0;

  constructor(rules: ReviewRuleDef[] = REVIEW_RULES) {
    this.rules = rules;
  }

  /**
   * 审查代码
   */
  async reviewCode(request: CodeReviewRequest): Promise<CodeReviewResult> {
    const startTime = Date.now();
    const issues = await this.detectIssues(request);
    const metrics = this.calculateMetrics(request.source_code);
    const score = this.calculateScore(issues, metrics);
    const summary = this.generateSummary(issues);
    const suggestions = this.generateSuggestions(issues, metrics);

    this.reviewCount++;

    return {
      file: request.source_file,
      issues: issues.slice(0, request.max_issues ?? 100),
      metrics,
      score,
      summary,
      suggestions,
      approved: score.overall >= 70 && summary.critical_count === 0,
      review_time: Date.now() - startTime,
    };
  }

  /**
   * 审查代码差异
   */
  async reviewDiff(
    oldCode: string,
    newCode: string,
    request: CodeReviewRequest
  ): Promise<DiffReviewResult> {
    const oldIssues = await this.detectIssues({
      ...request,
      source_code: oldCode,
    });
    const newIssues = await this.detectIssues({
      ...request,
      source_code: newCode,
    });

    const oldIssueIds = new Set(oldIssues.map((i) => i.rule_id));
    const newIssueIds = new Set(newIssues.map((i) => i.rule_id));

    const addedIssues = newIssues.filter((i) => !oldIssueIds.has(i.rule_id));
    const fixedIssues = oldIssues.filter((i) => !newIssueIds.has(i.rule_id)).map((i) => i.message);

    const unchangedIssues = newIssues.filter((i) => oldIssueIds.has(i.rule_id));

    const newMetrics = this.calculateMetrics(newCode);
    const deltaSummary = this.generateDeltaSummary(
      addedIssues.length,
      fixedIssues.length,
      oldIssues.length,
      newIssues.length
    );

    return {
      added_issues: addedIssues,
      fixed_issues: fixedIssues,
      unchanged_issues: unchangedIssues,
      new_metrics: newMetrics,
      delta_summary: deltaSummary,
    };
  }

  /**
   * 快速检查
   */
  async quickCheck(code: string): Promise<{
    pass: boolean;
    critical_issues: number;
    quick_fixes: string[];
  }> {
    const criticalIssues = await this.detectIssues({
      source_file: 'quick-check',
      source_code: code,
      severity_filter: [ReviewSeverity.CRITICAL, ReviewSeverity.ERROR],
    });

    const quickFixes: string[] = [];
    for (const issue of criticalIssues) {
      if (issue.fix_suggestion?.auto_fixable) {
        quickFixes.push(issue.message);
      }
    }

    return {
      pass: criticalIssues.length === 0,
      critical_issues: criticalIssues.length,
      quick_fixes: quickFixes,
    };
  }

  /**
   * 获取修复建议
   */
  getFixSuggestions(issue: ReviewIssue): {
    can_auto_fix: boolean;
    fix_steps: string[];
    code_example?: string;
  } {
    const fixSteps: string[] = [];

    if (!issue.fix_suggestion) {
      return {
        can_auto_fix: false,
        fix_steps: [i18n.t('shared.smart-code-reviewer.k27')],
      };
    }

    switch (issue.rule_id) {
      case 'no-unused-vars':
        fixSteps.push(i18n.t('shared.smart-code-reviewer.1_13'));
        fixSteps.push(i18n.t('shared.smart-code-reviewer.2_14'));
        fixSteps.push(i18n.t('shared.smart-code-reviewer.3_15'));
        break;

      case 'no-eval':
        fixSteps.push(i18n.t('shared.smart-code-reviewer.1eval_16'));
        fixSteps.push(i18n.t('shared.smart-code-reviewer.k17'));
        fixSteps.push(i18n.t('shared.smart-code-reviewer.k18'));
        break;

      case 'no-inner-html':
        fixSteps.push(i18n.t('shared.smart-code-reviewer.k19'));
        fixSteps.push(i18n.t('shared.smart-code-reviewer.2domapi_20'));
        fixSteps.push(i18n.t('shared.smart-code-reviewer.3_21'));
        break;

      case 'prefer-const':
        fixSteps.push(i18n.t('shared.smart-code-reviewer.letconst_28'));
        break;

      case 'no-var':
        fixSteps.push(i18n.t('shared.smart-code-reviewer.varconstlet_29'));
        break;

      default:
        fixSteps.push(issue.fix_suggestion.description);
    }

    return {
      can_auto_fix: issue.fix_suggestion.auto_fixable,
      fix_steps: fixSteps,
      code_example: issue.fix_suggestion.fix_code,
    };
  }

  /**
   * 检测架构模式
   */
  detectPatterns(code: string): PatternDetection[] {
    const patterns: PatternDetection[] = [];

    // React Hooks 模式
    if (code.includes('useState') || code.includes('useEffect')) {
      patterns.push({
        pattern_type: 'React Hooks',
        locations: this.findPatternLocations(code, /use[A-Z]\w*/g),
        confidence: 0.95,
        suggestion: i18n.t('shared.smart-code-reviewer.k30'),
      });
    }

    // 高阶组件
    if (code.includes('withRouter') || code.includes('withStyles')) {
      patterns.push({
        pattern_type: 'Higher-Order Component',
        locations: this.findPatternLocations(code, /with\w+/g),
        confidence: 0.85,
        suggestion: i18n.t('shared.smart-code-reviewer.hookshoc_31'),
      });
    }

    // Render Props
    if (code.includes('render={') || code.includes('children as function')) {
      patterns.push({
        pattern_type: 'Render Props',
        locations: this.findPatternLocations(code, /render=\{/g),
        confidence: 0.8,
      });
    }

    // Context 模式
    if (code.includes('createContext') || code.includes('useContext')) {
      patterns.push({
        pattern_type: 'Context API',
        locations: this.findPatternLocations(code, /createContext|useContext/g),
        confidence: 0.9,
        suggestion: i18n.t('shared.smart-code-reviewer.k32'),
      });
    }

    // 自定义 Hook
    const customHooks = code.match(/use[A-Z]\w*(?!\s*\()/g);
    if (customHooks && customHooks.length > 0) {
      patterns.push({
        pattern_type: 'Custom Hooks',
        locations: this.findPatternLocations(code, /use[A-Z]\w*(?!\s*\()/g),
        confidence: 0.85,
        suggestion: i18n.t('shared.smart-code-reviewer.k33'),
      });
    }

    return patterns;
  }

  /**
   * 获取审查统计
   */
  getStats(): {
    total_reviews: number;
    rules_count: number;
    categories: string[];
  } {
    return {
      total_reviews: this.reviewCount,
      rules_count: this.rules.length,
      categories: [...new Set(this.rules.map((r) => r.category))],
    };
  }

  /**
   * 添加自定义规则
   */
  addRule(rule: ReviewRuleDef): void {
    const existingIdx = this.rules.findIndex((r) => r.id === rule.id);
    if (existingIdx >= 0) {
      this.rules[existingIdx] = rule;
    } else {
      this.rules.push(rule);
    }
  }

  // ============ 私有方法 ============

  private async detectIssues(request: CodeReviewRequest): Promise<ReviewIssue[]> {
    const issues: ReviewIssue[] = [];
    const code = request.source_code;
    const lines = code.split('\n');

    // 应用规则
    for (const rule of this.rules) {
      // 分类过滤
      if (request.categories && !request.categories.includes(rule.category)) {
        continue;
      }

      // 严重程度过滤
      if (request.severity_filter && !request.severity_filter.includes(rule.severity)) {
        continue;
      }

      // 使用自定义检查函数
      if (rule.check) {
        const ruleIssues = rule.check(code);
        issues.push(...ruleIssues);
        continue;
      }

      // 使用正则模式
      if (rule.pattern) {
        const matches = code.matchAll(rule.pattern);
        for (const match of matches) {
          const lineNum = code.substring(0, match.index).split('\n').length;
          const line = lines[lineNum - 1] ?? '';

          issues.push({
            id: `${rule.id}-${lineNum}-${match.index}`,
            rule_id: rule.id,
            message: rule.message,
            description: `${i18n.t('shared.smart-code-reviewer.k22')}${request.source_file}${i18n.t('shared.smart-code-reviewer.k23')}${lineNum}${i18n.t('shared.smart-code-reviewer.k24')}`,
            severity: rule.severity,
            category: rule.category,
            line: lineNum,
            column: match.index - code.lastIndexOf('\n', match.index - 1),
            code_snippet: line.trim(),
          });
        }
      }
    }

    // 应用自定义规则
    if (request.custom_rules) {
      for (const custom of request.custom_rules) {
        const pattern =
          typeof custom.pattern === 'string' ? new RegExp(custom.pattern, 'g') : custom.pattern;

        const matches = code.matchAll(pattern);
        for (const match of matches) {
          const lineNum = code.substring(0, match.index).split('\n').length;
          const line = lines[lineNum - 1] ?? '';

          issues.push({
            id: `${custom.id}-${lineNum}`,
            rule_id: custom.id,
            message: custom.message,
            description: `${i18n.t('shared.smart-code-reviewer.k25')}${custom.name}${i18n.t('shared.smart-code-reviewer.k26')}`,
            severity: custom.severity,
            category: custom.category,
            line: lineNum,
            column: match.index - code.lastIndexOf('\n', match.index - 1),
            code_snippet: line.trim(),
            fix_suggestion: custom.fix
              ? {
                  description: custom.fix,
                  difficulty: FixDifficulty.MEDIUM,
                  auto_fixable: false,
                }
              : undefined,
          });
        }
      }
    }

    // 按严重程度排序
    const severityOrder: Record<ReviewSeverity, number> = {
      [ReviewSeverity.CRITICAL]: 0,
      [ReviewSeverity.ERROR]: 1,
      [ReviewSeverity.WARNING]: 2,
      [ReviewSeverity.INFO]: 3,
      [ReviewSeverity.HINT]: 4,
    };

    return issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }

  private calculateMetrics(code: string): CodeMetrics {
    const lines = code.split('\n');

    const linesOfCode = lines.filter((l) => l.trim() && !l.trim().startsWith('//')).length;
    const linesOfComments = lines.filter(
      (l) => l.trim().startsWith('//') || l.trim().startsWith('*')
    ).length;

    // 圈复杂度估算
    const branches = (code.match(/\b(?:if|else|for|while|case|catch|\|\||&&)\b/g) || []).length;
    const functions = (code.match(/(?:function\s+\w+|=>\s*{|\)\s*{)/g) || []).length;
    const cyclomaticComplexity = branches + functions + 1;

    // 认知复杂度估算
    const nesting = this.calculateNesting(code);
    const cognitiveComplexity = cyclomaticComplexity + nesting * 2;

    // 可维护性指数（简化版）
    const maintainabilityIndex = Math.max(0, 100 - cognitiveComplexity * 2 - linesOfCode / 10);

    // Halstead 体积估算
    const operators = (code.match(/[+\-*/%=<>!&|^~?:.]/g) || []).length;
    const operands = (code.match(/\b[a-zA-Z_]\w*\b/g) || []).length;
    const halsteadVolume = (operators + operands) * Math.log2(operators + operands + 1);

    // 耦合度估算
    const imports = (code.match(/^import/g) || []).length;
    const exports = (code.match(/^export/g) || []).length;
    const couplingDegree = imports + exports;

    // 内聚度估算（简化）
    const cohesionScore = Math.max(0, 100 - couplingDegree * 5);

    // 测试覆盖率估算
    const testCoverageEstimate =
      code.includes('.test.') || code.includes('.spec.')
        ? 100
        : Math.max(0, 100 - cyclomaticComplexity * 5);

    // 重复代码行估算
    const uniqueLines = new Set(lines.map((l) => l.trim()).filter(Boolean));
    const duplicatedLines = linesOfCode - uniqueLines.size;

    // TODO 计数
    const todoCount = (code.match(/(?:TODO|FIXME|HACK|XXX)/gi) || []).length;

    return {
      lines_of_code: linesOfCode,
      lines_of_comments: linesOfComments,
      cyclomatic_complexity: cyclomaticComplexity,
      cognitive_complexity: cognitiveComplexity,
      maintainability_index: Math.round(maintainabilityIndex),
      halstead_volume: Math.round(halsteadVolume),
      coupling_degree: couplingDegree,
      cohesion_score: Math.round(cohesionScore),
      test_coverage_estimate: Math.round(testCoverageEstimate),
      duplicated_lines: Math.max(0, duplicatedLines),
      todo_count: todoCount,
    };
  }

  private calculateNesting(code: string): number {
    let maxNesting = 0;
    let currentNesting = 0;

    for (const char of code) {
      if (char === '{') {
        currentNesting++;
        maxNesting = Math.max(maxNesting, currentNesting);
      }
      if (char === '}') {
        currentNesting--;
      }
    }

    return maxNesting;
  }

  private calculateScore(issues: ReviewIssue[], metrics: CodeMetrics): ReviewScore {
    let qualityScore = 100;
    let securityScore = 100;
    let performanceScore = 100;
    let maintainabilityScore = metrics.maintainability_index;
    let accessibilityScore = 100;

    for (const issue of issues) {
      const deduction = this.getScoreDeduction(issue.severity);

      switch (issue.category) {
        case ReviewCategory.SECURITY:
          securityScore -= deduction * 2;
          break;
        case ReviewCategory.PERFORMANCE:
          performanceScore -= deduction;
          break;
        case ReviewCategory.ACCESSIBILITY:
          accessibilityScore -= deduction;
          break;
        case ReviewCategory.MAINTAINABILITY:
          maintainabilityScore -= deduction * 0.5;
          break;
        default:
          qualityScore -= deduction;
      }
    }

    qualityScore = Math.max(0, qualityScore);
    securityScore = Math.max(0, securityScore);
    performanceScore = Math.max(0, performanceScore);
    maintainabilityScore = Math.max(0, maintainabilityScore);
    accessibilityScore = Math.max(0, accessibilityScore);

    const overall = Math.round(
      qualityScore * 0.3 +
        securityScore * 0.25 +
        performanceScore * 0.15 +
        maintainabilityScore * 0.2 +
        accessibilityScore * 0.1
    );

    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
    if (overall >= 90) grade = 'A';
    else if (overall >= 80) grade = 'B';
    else if (overall >= 70) grade = 'C';
    else if (overall >= 60) grade = 'D';

    return {
      overall,
      quality: Math.round(qualityScore),
      security: Math.round(securityScore),
      performance: Math.round(performanceScore),
      maintainability: Math.round(maintainabilityScore),
      accessibility: Math.round(accessibilityScore),
      grade,
    };
  }

  private getScoreDeduction(severity: ReviewSeverity): number {
    const deductions: Record<ReviewSeverity, number> = {
      [ReviewSeverity.CRITICAL]: 20,
      [ReviewSeverity.ERROR]: 10,
      [ReviewSeverity.WARNING]: 5,
      [ReviewSeverity.INFO]: 2,
      [ReviewSeverity.HINT]: 1,
    };
    return deductions[severity] ?? 0;
  }

  private generateSummary(issues: ReviewIssue[]): ReviewSummary {
    const byCategory: Record<ReviewCategory, number> = {} as Record<ReviewCategory, number>;

    for (const issue of issues) {
      byCategory[issue.category] = (byCategory[issue.category] ?? 0) + 1;
    }

    const topIssues = issues
      .filter((i) => i.severity === ReviewSeverity.CRITICAL || i.severity === ReviewSeverity.ERROR)
      .slice(0, 5)
      .map((i) => `${i.rule_id}: ${i.message}`);

    const improvementPotential = issues.filter((i) => i.fix_suggestion?.auto_fixable).length;

    return {
      total_issues: issues.length,
      critical_count: issues.filter((i) => i.severity === ReviewSeverity.CRITICAL).length,
      error_count: issues.filter((i) => i.severity === ReviewSeverity.ERROR).length,
      warning_count: issues.filter((i) => i.severity === ReviewSeverity.WARNING).length,
      info_count: issues.filter((i) => i.severity === ReviewSeverity.INFO).length,
      by_category: byCategory,
      top_issues: topIssues,
      improvement_potential: improvementPotential,
    };
  }

  private generateSuggestions(issues: ReviewIssue[], metrics: CodeMetrics): ReviewSuggestion[] {
    const suggestions: ReviewSuggestion[] = [];

    // 基于问题类型
    if (issues.some((i) => i.category === ReviewCategory.SECURITY)) {
      suggestions.push({
        type: 'secure',
        description: i18n.t('shared.smart-code-reviewer.k34'),
        priority: 'high',
        impact: i18n.t('shared.smart-code-reviewer.k35'),
        effort: i18n.t('shared.smart-code-reviewer.k36'),
      });
    }

    if (issues.some((i) => i.category === ReviewCategory.PERFORMANCE)) {
      suggestions.push({
        type: 'optimize',
        description: i18n.t('shared.smart-code-reviewer.k37'),
        priority: 'medium',
        impact: i18n.t('shared.smart-code-reviewer.k38'),
        effort: i18n.t('shared.smart-code-reviewer.k39'),
      });
    }

    // 基于指标
    if (metrics.cyclomatic_complexity > 15) {
      suggestions.push({
        type: 'refactor',
        description: i18n.t('shared.smart-code-reviewer.k40'),
        priority: 'high',
        impact: i18n.t('shared.smart-code-reviewer.k41'),
        effort: i18n.t('shared.smart-code-reviewer.k42'),
      });
    }

    if (metrics.test_coverage_estimate < 80) {
      suggestions.push({
        type: 'test',
        description: i18n.t('shared.smart-code-reviewer.80_43'),
        priority: 'medium',
        impact: i18n.t('shared.smart-code-reviewer.k44'),
        effort: i18n.t('shared.smart-code-reviewer.k45'),
      });
    }

    if (metrics.duplicated_lines > 20) {
      suggestions.push({
        type: 'refactor',
        description: i18n.t('shared.smart-code-reviewer.k46'),
        priority: 'medium',
        impact: i18n.t('shared.smart-code-reviewer.k47'),
        effort: i18n.t('shared.smart-code-reviewer.k48'),
      });
    }

    if (metrics.lines_of_comments < metrics.lines_of_code * 0.1) {
      suggestions.push({
        type: 'document',
        description: i18n.t('shared.smart-code-reviewer.k49'),
        priority: 'low',
        impact: i18n.t('shared.smart-code-reviewer.k50'),
        effort: i18n.t('shared.smart-code-reviewer.k51'),
      });
    }

    return suggestions;
  }

  private generateDeltaSummary(
    added: number,
    fixed: number,
    oldTotal: number,
    newTotal: number
  ): string {
    const parts: string[] = [];

    if (added > 0) {
      parts.push(`${i18n.t('shared.smart-code-reviewer.k27')}${added}${i18n.t('shared.smart-code-reviewer.k28')}`);
    }
    if (fixed > 0) {
      parts.push(`${i18n.t('shared.smart-code-reviewer.k29')}${fixed}${i18n.t('shared.smart-code-reviewer.k30')}`);
    }
    if (added === 0 && fixed === 0) {
      parts.push(i18n.t('shared.smart-code-reviewer.k52'));
    }

    const trend = newTotal > oldTotal ? i18n.t('shared.smart-code-reviewer.k55') : newTotal < oldTotal ? i18n.t('shared.smart-code-reviewer.k54') : i18n.t('shared.smart-code-reviewer.k53');
    parts.push(`${i18n.t('shared.smart-code-reviewer.k31')}${trend}`);

    return parts.join('，');
  }

  private findPatternLocations(code: string, pattern: RegExp): number[] {
    const locations: number[] = [];
    let match: RegExpExecArray | null;
    const globalPattern = new RegExp(
      pattern.source,
      pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
    );

    while ((match = globalPattern.exec(code)) !== null) {
      const lineNum = code.substring(0, match.index).split('\n').length;
      locations.push(lineNum);
    }

    return locations;
  }
}

// ============ 单例实例 ============

export const smartCodeReviewer = new SmartCodeReviewer();

export default smartCodeReviewer;
