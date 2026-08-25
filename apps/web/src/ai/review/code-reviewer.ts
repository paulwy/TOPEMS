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
