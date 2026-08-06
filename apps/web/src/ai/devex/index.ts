// STATUS: WIRED | Integrated in App.tsx DevTools panel
import { smartDebugger, SmartDebugger } from './smart-debugger';
import { performanceAnalyzerV59, PerformanceAnalyzerV59 } from './performance-analyzer';
import { codeRefactorer, CodeRefactorer } from './code-refactor';

export type {
  DebugSession,
  CallStackFrame,
  Breakpoint,
  DebugSuggestion,
  StateAnalysis,
} from './smart-debugger';

export type {
  PerfSnapshot,
  PerfIssue,
  PerfIssueType,
  PerformanceBudget,
  TrendPoint,
  BudgetCategory,
  BudgetUsage,
} from './performance-analyzer';

export type {
  RefactoringPlan,
  RefactoringType,
  CodeIssue,
  CodeIssueType,
  RefactoringHistory,
  ImpactEstimate,
} from './code-refactor';

export { V59DevExPanel } from './v59-devex-panel';

export {
  smartDebugger,
  SmartDebugger,
  performanceAnalyzerV59,
  PerformanceAnalyzerV59,
  codeRefactorer,
  CodeRefactorer,
};
