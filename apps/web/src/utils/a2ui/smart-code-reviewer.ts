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
    message: '存在未使用的变量',
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
              message: `变量 '${varName}' 已声明但从未使用`,
              description: '未使用的变量可能是遗留代码或错误',
              severity: ReviewSeverity.WARNING,
              category: ReviewCategory.BUGRISK,
              line: idx + 1,
              column: line.indexOf(varName) + 1,
              code_snippet: line.trim(),
              fix_suggestion: {
                description: '移除未使用的变量',
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
    message: '空函数体',
    pattern: /function\s+\w+\s*\([^)]*\)\s*{\s*}/g,
  },
  {
    id: 'no-compare-literal',
    category: ReviewCategory.BUGRISK,
    severity: ReviewSeverity.WARNING,
    message: '可能的条件判断错误',
    pattern: /if\s*\([^)]*(?:==|!=)\s*['"][^'"]*['"]\)/g,
  },

  // 性能问题
  {
    id: 'no-large-bundle',
    category: ReviewCategory.PERFORMANCE,
    severity: ReviewSeverity.INFO,
    message: '大文件可能影响加载性能',
    check: (code: string) => {
      const lines = code.split('\n').length;
      if (lines > 500) {
        return [
          {
            id: 'large-file',
            rule_id: 'no-large-bundle',
            message: `文件超过 ${lines} 行，建议拆分`,
            description: '大文件会增加初始加载时间和维护难度',
            severity: ReviewSeverity.INFO,
            category: ReviewCategory.PERFORMANCE,
            line: 1,
            column: 1,
            code_snippet: `文件共 ${lines} 行`,
            fix_suggestion: {
              description: '将文件拆分为更小的模块',
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
    message: '内联函数可能导致不必要的重渲染',
    pattern: /(?:onClick|onChange|on[A-Z]\w*)=\{?\s*(?:\(\)=>|function\s*\()/g,
  },
  {
    id: 'no-memo-oomission',
    category: ReviewCategory.PERFORMANCE,
    severity: ReviewSeverity.HINT,
    message: '复杂计算可能需要 useMemo',
    pattern: /(?:const|let)\s+\w+\s*=\s*(?:\w+\.\w+\(\)|\[[^\]]+\]\.map|JSON\.parse)/g,
  },

  // 安全问题
  {
    id: 'no-eval',
    category: ReviewCategory.SECURITY,
    severity: ReviewSeverity.CRITICAL,
    message: '禁止使用 eval',
    pattern: /eval\s*\(/g,
  },
  {
    id: 'no-inner-html',
    category: ReviewCategory.SECURITY,
    severity: ReviewSeverity.CRITICAL,
    message: 'innerHTML 存在 XSS 风险',
    pattern: /\.innerHTML\s*=/g,
  },
  {
    id: 'no-document-write',
    category: ReviewCategory.SECURITY,
    severity: ReviewSeverity.ERROR,
    message: 'document.write 已废弃',
    pattern: /document\.write\s*\(/g,
  },
  {
    id: 'no-hardcoded-secret',
    category: ReviewCategory.SECURITY,
    severity: ReviewSeverity.CRITICAL,
    message: '硬编码的敏感信息',
    pattern: /(?:password|secret|api[_-]?key|token|auth)\s*[=:]\s*['"][^'"]+['"]/gi,
  },

  // 可维护性
  {
    id: 'no-magic-number',
    category: ReviewCategory.MAINTAINABILITY,
    severity: ReviewSeverity.INFO,
    message: '魔法数字应提取为常量',
    pattern: /(?:==|!=|>=|<=|>|<)\s*(?![01])(\d{2,})\b/g,
  },
  {
    id: 'no-long-function',
    category: ReviewCategory.MAINTAINABILITY,
    severity: ReviewSeverity.WARNING,
    message: '函数过长，建议拆分',
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
                message: `函数超过 ${functionLines} 行`,
                description: '长函数难以理解和维护，建议拆分为更小的函数',
                severity: ReviewSeverity.WARNING,
                category: ReviewCategory.MAINTAINABILITY,
                line: functionStart + 1,
                column: 1,
                code_snippet: lines[functionStart].trim(),
                fix_suggestion: {
                  description: '拆分函数为多个职责单一的小函数',
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
    message: '嵌套层级过深',
    check: (code: string) => {
      const issues: ReviewIssue[] = [];
      const lines = code.split('\n');
      let maxNesting = 0;
      let maxNestingLine = 0;

      lines.forEach((line, idx) => {
        const opens = (line.match(/[({\[]/g) || []).length;
        const closes = (line.match(/[)}\]]/g) || []).length;
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
          message: `嵌套层级达到 ${Math.floor(maxNesting)} 层`,
          description: '深层嵌套降低代码可读性，建议使用早返回或提取函数',
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
    message: '不会被重新赋值的变量应使用 const',
    pattern: /let\s+(\w+)\s*=[^;]+;(?!.*\1\s*=)/g,
  },
  {
    id: 'prefer-arrow-callback',
    category: ReviewCategory.BESTPRACTICE,
    severity: ReviewSeverity.HINT,
    message: '优先使用箭头函数',
    pattern: /function\s*\([^)]*\)\s*{\s*return\s+/g,
  },
  {
    id: 'no-var',
    category: ReviewCategory.BESTPRACTICE,
    severity: ReviewSeverity.WARNING,
    message: '避免使用 var，使用 const/let',
    pattern: /\bvar\s+/g,
  },

  // 类型安全
  {
    id: 'no-any-type',
    category: ReviewCategory.TYPESAFETY,
    severity: ReviewSeverity.WARNING,
    message: '避免使用 any 类型',
    pattern: /:\s*any\b/g,
  },
  {
    id: 'no-explicit-any',
    category: ReviewCategory.TYPESAFETY,
    severity: ReviewSeverity.WARNING,
    message: '禁止显式 any',
    pattern: /<any>|as\s+any\b/g,
  },

  // 无障碍
  {
    id: 'no-alt-missing',
    category: ReviewCategory.ACCESSIBILITY,
    severity: ReviewSeverity.ERROR,
    message: '图片必须包含 alt 属性',
    pattern: /<img[^>]*(?<!alt=["'][^"']*["'])[^>]*>/g,
  },
  {
    id: 'no-empty-alt',
    category: ReviewCategory.ACCESSIBILITY,
    severity: ReviewSeverity.WARNING,
    message: 'alt 属性不应为空（装饰性图片除外）',
    pattern: /<img[^>]*alt=["']["'][^>]*>/g,
  },
  {
    id: 'no-click-without-key',
    category: ReviewCategory.ACCESSIBILITY,
    severity: ReviewSeverity.WARNING,
    message: '可点击元素需要键盘支持',
    pattern: /<(?:div|span)[^>]*onClick[^>]*(?!onKeyDown)[^>]*>/g,
  },

  // 架构
  {
    id: 'no-direct-dom',
    category: ReviewCategory.ARCHITECTURE,
    severity: ReviewSeverity.INFO,
    message: '直接 DOM 操作应谨慎使用',
    pattern: /document\.(?:getElementById|querySelector|getElementsBy)/g,
  },
  {
    id: 'no-global-state',
    category: ReviewCategory.ARCHITECTURE,
    severity: ReviewSeverity.WARNING,
    message: '全局状态可能导致难以追踪的问题',
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
        fix_steps: ['手动修复此问题'],
      };
    }

    switch (issue.rule_id) {
      case 'no-unused-vars':
        fixSteps.push('1. 检查变量是否确实不需要');
        fixSteps.push('2. 如果不需要，删除变量声明');
        fixSteps.push('3. 如果需要，补充使用该变量的代码');
        break;

      case 'no-eval':
        fixSteps.push('1. 移除 eval 调用');
        fixSteps.push('2. 使用 JSON.parse 解析 JSON');
        fixSteps.push('3. 使用 new Function 构建动态函数（更安全）');
        break;

      case 'no-inner-html':
        fixSteps.push('1. 使用 textContent 代替 innerHTML');
        fixSteps.push('2. 或使用 DOM API 创建元素');
        fixSteps.push('3. 如必须使用，先对内容进行转义');
        break;

      case 'prefer-const':
        fixSteps.push('将 let 改为 const');
        break;

      case 'no-var':
        fixSteps.push('将 var 改为 const 或 let');
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
        suggestion: '遵循 Hooks 最佳实践：依赖数组完整、避免循环中调用',
      });
    }

    // 高阶组件
    if (code.includes('withRouter') || code.includes('withStyles')) {
      patterns.push({
        pattern_type: 'Higher-Order Component',
        locations: this.findPatternLocations(code, /with\w+/g),
        confidence: 0.85,
        suggestion: '考虑使用 Hooks 替代 HOC',
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
        suggestion: '确保 Context 值稳定性，避免不必要的重渲染',
      });
    }

    // 自定义 Hook
    const customHooks = code.match(/use[A-Z]\w*(?!\s*\()/g);
    if (customHooks && customHooks.length > 0) {
      patterns.push({
        pattern_type: 'Custom Hooks',
        locations: this.findPatternLocations(code, /use[A-Z]\w*(?!\s*\()/g),
        confidence: 0.85,
        suggestion: '确保自定义 Hook 遵循命名规范和返回值一致性',
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
            description: `在 ${request.source_file} 第 ${lineNum} 行检测到问题`,
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
            description: `自定义规则 ${custom.name} 触发`,
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
        description: '优先修复安全问题，特别是 XSS 和敏感信息泄露风险',
        priority: 'high',
        impact: '防止安全漏洞',
        effort: '中等到高',
      });
    }

    if (issues.some((i) => i.category === ReviewCategory.PERFORMANCE)) {
      suggestions.push({
        type: 'optimize',
        description: '优化性能瓶颈，特别是大文件和内联函数',
        priority: 'medium',
        impact: '提升加载和运行性能',
        effort: '低到中等',
      });
    }

    // 基于指标
    if (metrics.cyclomatic_complexity > 15) {
      suggestions.push({
        type: 'refactor',
        description: '降低代码复杂度，拆分长函数和深层嵌套',
        priority: 'high',
        impact: '提高可维护性和可测试性',
        effort: '中等',
      });
    }

    if (metrics.test_coverage_estimate < 80) {
      suggestions.push({
        type: 'test',
        description: '补充单元测试，提高覆盖率至 80% 以上',
        priority: 'medium',
        impact: '提高代码可靠性和回归测试能力',
        effort: '中等到高',
      });
    }

    if (metrics.duplicated_lines > 20) {
      suggestions.push({
        type: 'refactor',
        description: '消除重复代码，提取公共函数或组件',
        priority: 'medium',
        impact: '减少维护成本',
        effort: '低到中等',
      });
    }

    if (metrics.lines_of_comments < metrics.lines_of_code * 0.1) {
      suggestions.push({
        type: 'document',
        description: '添加代码注释和文档，提高可读性',
        priority: 'low',
        impact: '提高代码可读性',
        effort: '低',
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
      parts.push(`新增 ${added} 个问题`);
    }
    if (fixed > 0) {
      parts.push(`修复 ${fixed} 个问题`);
    }
    if (added === 0 && fixed === 0) {
      parts.push('问题数量无变化');
    }

    const trend = newTotal > oldTotal ? '增加' : newTotal < oldTotal ? '减少' : '持平';
    parts.push(`总体问题数 ${trend}`);

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
