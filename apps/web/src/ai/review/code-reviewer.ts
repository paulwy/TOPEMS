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

