export type TestType = 'Unit' | 'Integration' | 'E2E';
export type TestPriority = 'low' | 'medium' | 'high' | 'critical';
export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
export type RunStatus = 'idle' | 'running' | 'completed' | 'cancelled';

export interface TestCase {
  id: string;
  name: string;
  type: TestType;
  priority: TestPriority;
  status: TestStatus;
  coverage: number;
  module?: string;
  tags: string[];
  description?: string;
  steps?: Array<{ name: string; action: string; expected: string }>;
  created_at: string;
  updated_at?: string;
}

export interface TestResultDetail {
  testCaseId: string;
  passed: boolean;
  duration_ms: number;
  coverage: number;
  error_message?: string;
  assertion_results?: Array<{
    name: string;
    passed: boolean;
    expected: string;
    actual: string;
  }>;
}

export interface TestRun {
  id: string;
  testCaseIds: string[];
  startTime: string;
  endTime: string;
  results: TestResultDetail[];
  coverage: number;
  status: RunStatus;
  total_duration_ms: number;
  executor: string;
  environment?: string;
}

export interface TestSuggestion {
  id: string;
  testCaseId: string;
  type: 'coverage' | 'edge-case' | 'performance' | 'security';
  message: string;
  suggestion: string;
  confidence: number;
}

export interface TestTrendPoint {
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  coverage: number;
  duration_ms: number;
}

export interface SmartTestEvent {
  type:
    | 'tests_generated'
    | 'tests_started'
    | 'test_started'
    | 'test_completed'
    | 'tests_completed'
    | 'regenerate_completed'
    | 'suggestions_generated';
  [key: string]: unknown;
}
