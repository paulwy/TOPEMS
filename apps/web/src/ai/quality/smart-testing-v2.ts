import i18n from '@/i18n';

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

function generateId(): string {
  return `tc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_TEST_CASES: TestCase[] = [
  {
    id: generateId(),
    name: i18n.t('ai.smart-testing-v2.k0'),
    type: 'Unit',
    priority: 'critical',
    status: 'pending',
    coverage: 0,
    module: 'auth',
    tags: ['auth', 'login', 'form'],
    description: i18n.t('ai.smart-testing-v2.k1'),
    steps: [
      {
        name: i18n.t('ai.smart-testing-v2.k3'),
        action: 'initForm()',
        expected: i18n.t('ai.smart-testing-v2.k2'),
      },
      {
        name: i18n.t('ai.smart-testing-v2.k5'),
        action: 'submit()',
        expected: i18n.t('ai.smart-testing-v2.k4'),
      },
      {
        name: i18n.t('ai.smart-testing-v2.k7'),
        action: 'fill("username", "admin")',
        expected: i18n.t('ai.smart-testing-v2.k6'),
      },
      {
        name: i18n.t('ai.smart-testing-v2.k9'),
        action: 'submit()',
        expected: i18n.t('ai.smart-testing-v2.k8'),
      },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: generateId(),
    name: i18n.t('ai.smart-testing-v2.k10'),
    type: 'Integration',
    priority: 'high',
    status: 'pending',
    coverage: 0,
    module: 'common',
    tags: ['list', 'pagination', 'api'],
    description: i18n.t('ai.smart-testing-v2.api_11'),
    steps: [
      {
        name: i18n.t('ai.smart-testing-v2.k13'),
        action: 'fetchPage(1)',
        expected: i18n.t('ai.smart-testing-v2.20_12'),
      },
      {
        name: i18n.t('ai.smart-testing-v2.k15'),
        action: 'fetchPage(2)',
        expected: i18n.t('ai.smart-testing-v2.k14'),
      },
      {
        name: i18n.t('ai.smart-testing-v2.k17'),
        action: 'assertNoOverlap()',
        expected: i18n.t('ai.smart-testing-v2.k16'),
      },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: generateId(),
    name: i18n.t('ai.smart-testing-v2.k18'),
    type: 'E2E',
    priority: 'critical',
    status: 'pending',
    coverage: 0,
    module: 'ecommerce',
    tags: ['e2e', 'checkout', 'critical-path'],
    description: i18n.t('ai.smart-testing-v2.k19'),
    steps: [
      {
        name: i18n.t('ai.smart-testing-v2.k21'),
        action: 'register()',
        expected: i18n.t('ai.smart-testing-v2.k20'),
      },
      {
        name: i18n.t('ai.smart-testing-v2.k23'),
        action: 'browseProducts()',
        expected: i18n.t('ai.smart-testing-v2.k22'),
      },
      {
        name: i18n.t('ai.smart-testing-v2.k25'),
        action: 'addToCart()',
        expected: i18n.t('ai.smart-testing-v2.k24'),
      },
      {
        name: i18n.t('ai.smart-testing-v2.k27'),
        action: 'checkout()',
        expected: i18n.t('ai.smart-testing-v2.k26'),
      },
    ],
    created_at: new Date().toISOString(),
  },
];
