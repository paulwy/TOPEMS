export type TestType = 'unit' | 'integration' | 'e2e';
export type TestPriority = 'low' | 'medium' | 'high' | 'critical';
export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface TestStep {
  name: string;
  action: string;
  expected: string;
}
