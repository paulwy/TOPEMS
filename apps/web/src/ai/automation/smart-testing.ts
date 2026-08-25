export type TestType = 'unit' | 'integration' | 'e2e';
export type TestPriority = 'low' | 'medium' | 'high' | 'critical';
export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface TestStep {
  name: string;
  action: string;
  expected: string;
}

export interface TestScenario {
  id: string;
  name: string;
  type: TestType;
  steps: TestStep[];
  expected_result: string;
  priority: TestPriority;
  status: TestStatus;
  created_at: string;
  tags: string[];
  module?: string;
}

export interface TestResult {
  scenario_id: string;
  passed: boolean;
  duration_ms: number;
  coverage: number;
  error_message?: string;
  assertion_results: Array<{
    name: string;
    passed: boolean;
    expected: string;
    actual: string;
  }>;
}

export interface CoverageReport {
  total_statements: number;
  covered_statements: number;
  total_branches: number;
  covered_branches: number;
  total_functions: number;
  covered_functions: number;
  line_coverage: number;
  branch_coverage: number;
  function_coverage: number;
  file_coverage: Array<{
    file: string;
    line_coverage: number;
    branch_coverage: number;
    function_coverage: number;
  }>;
}

export interface FailureAnalysis {
  scenario_id: string;
  failure_type: 'assertion' | 'timeout' | 'error' | 'skip';
  root_cause: string;
  stack_trace?: string;
  suggestion: string;
  similar_failures: string[];
  first_seen: string;
  occurrence_count: number;
}

export type SmartTestEvent =
  | { type: 'tests_generated'; count: number; module: string }
  | { type: 'tests_started'; count: number }
  | { type: 'test_started'; scenario_id: string }
  | { type: 'test_completed'; scenario_id: string; passed: boolean; duration_ms: number }
  | { type: 'tests_completed'; total: number; passed: number; failed: number }
  | { type: 'scenario_added'; scenario_id: string };
