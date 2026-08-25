
export type RefactoringType = 'ExtractFunction' | 'ExtractVariable' | 'Rename' | 'Inline' | 'Move';

export interface RefactoringPlan {
  id: string;
  file: string;
  type: RefactoringType;
  oldCode: string;
  newCode: string;
  reason: string;
  risk: 'low' | 'medium' | 'high';
  createdAt: number;
  status: 'pending' | 'applied' | 'rejected';
}

export type CodeIssueType = 'LongMethod' | 'Complexity' | 'Duplication' | 'GodClass';

export interface CodeIssue {
  id: string;
  file: string;
  line: number;
  type: CodeIssueType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
  metric?: {
    complexity?: number;
    length?: number;
    duplicates?: number;
    classSize?: number;
  };
}

export interface RefactoringHistory {
  planId: string;
  type: RefactoringType;
  file: string;
  appliedAt: number;
  summary: string;
}

export interface ImpactEstimate {
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  dependencies: string[];
  testCoverage: { before: number; after: number };
  risk: 'low' | 'medium' | 'high';
  description: string;
}

