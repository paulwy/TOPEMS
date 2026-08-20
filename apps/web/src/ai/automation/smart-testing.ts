import i18n from '@/i18n';

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

const generateId = () => `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const DEFAULT_SCENARIOS: TestScenario[] = [
  {
    id: generateId(),
    name: i18n.t('ai.smart-testing.k0'),
    type: 'e2e',
    steps: [
      {
        name: i18n.t('ai.smart-testing.k2'),
        action: 'navigate("/login")',
        expected: i18n.t('ai.smart-testing.k1'),
      },
      {
        name: i18n.t('ai.smart-testing.k4'),
        action: 'fill("username", "admin")',
        expected: i18n.t('ai.smart-testing.k3'),
      },
      {
        name: i18n.t('ai.smart-testing.k6'),
        action: 'fill("password", "password123")',
        expected: i18n.t('ai.smart-testing.k5'),
      },
      {
        name: i18n.t('ai.smart-testing.k8'),
        action: 'click("login-btn")',
        expected: i18n.t('ai.smart-testing.k7'),
      },
    ],
    expected_result: i18n.t('ai.smart-testing.k9'),
    priority: 'critical',
    status: 'pending',
    created_at: new Date().toISOString(),
    tags: ['auth', 'login', 'critical-path'],
    module: 'auth',
  },
  {
    id: generateId(),
    name: i18n.t('ai.smart-testing.k10'),
    type: 'integration',
    steps: [
      {
        name: i18n.t('ai.smart-testing.k12'),
        action: 'fetch("/api/items?page=1")',
        expected: i18n.t('ai.smart-testing.k11'),
      },
      {
        name: i18n.t('ai.smart-testing.k14'),
        action: 'click("page-2")',
        expected: i18n.t('ai.smart-testing.k13'),
      },
      {
        name: i18n.t('ai.smart-testing.k16'),
        action: 'assert(items.length > 0)',
        expected: i18n.t('ai.smart-testing.k15'),
      },
    ],
    expected_result: i18n.t('ai.smart-testing.k17'),
    priority: 'high',
    status: 'pending',
    created_at: new Date().toISOString(),
    tags: ['list', 'pagination'],
    module: 'common',
  },
  {
    id: generateId(),
    name: i18n.t('ai.smart-testing.k18'),
    type: 'unit',
    steps: [
      {
        name: i18n.t('ai.smart-testing.k20'),
        action: 'createForm()',
        expected: i18n.t('ai.smart-testing.k19'),
      },
      {
        name: i18n.t('ai.smart-testing.k22'),
        action: 'submit()',
        expected: i18n.t('ai.smart-testing.k21'),
      },
      {
        name: i18n.t('ai.smart-testing.k24'),
        action: 'fill(requiredFields)',
        expected: i18n.t('ai.smart-testing.k23'),
      },
      {
        name: i18n.t('ai.smart-testing.k26'),
        action: 'submit()',
        expected: i18n.t('ai.smart-testing.k25'),
      },
    ],
    expected_result: i18n.t('ai.smart-testing.k27'),
    priority: 'high',
    status: 'pending',
    created_at: new Date().toISOString(),
    tags: ['form', 'validation'],
    module: 'common',
  },
  {
    id: generateId(),
    name: i18n.t('ai.smart-testing.api_0'),
    type: 'unit',
    steps: [
      {
        name: i18n.t('ai.smart-testing.k29'),
        action: 'fetch("/api/data")',
        expected: i18n.t('ai.smart-testing.k28'),
      },
      {
        name: i18n.t('ai.smart-testing.k31'),
        action: 'fetch("/api/data")',
        expected: i18n.t('ai.smart-testing.k30'),
      },
      {
        name: i18n.t('ai.smart-testing.k33'),
        action: 'clearCache()',
        expected: i18n.t('ai.smart-testing.k32'),
      },
      {
        name: i18n.t('ai.smart-testing.k35'),
        action: 'fetch("/api/data")',
        expected: i18n.t('ai.smart-testing.k34'),
      },
    ],
    expected_result: i18n.t('ai.smart-testing.k36'),
    priority: 'medium',
    status: 'pending',
    created_at: new Date().toISOString(),
    tags: ['api', 'cache', 'performance'],
    module: 'api',
  },
  {
    id: generateId(),
    name: i18n.t('ai.smart-testing.k37'),
    type: 'integration',
    steps: [
      {
        name: i18n.t('ai.smart-testing.k39'),
        action: 'getTheme()',
        expected: i18n.t('ai.smart-testing.k38'),
      },
      {
        name: i18n.t('ai.smart-testing.k41'),
        action: 'toggleTheme()',
        expected: i18n.t('ai.smart-testing.k40'),
      },
      {
        name: i18n.t('ai.smart-testing.k43'),
        action: 'reload()',
        expected: i18n.t('ai.smart-testing.k42'),
      },
    ],
    expected_result: i18n.t('ai.smart-testing.k44'),
    priority: 'medium',
    status: 'pending',
    created_at: new Date().toISOString(),
    tags: ['ui', 'theme', 'preference'],
    module: 'ui',
  },
];


export type SmartTestEvent =
  | { type: 'tests_generated'; count: number; module: string }
  | { type: 'tests_started'; count: number }
  | { type: 'test_started'; scenario_id: string }
  | { type: 'test_completed'; scenario_id: string; passed: boolean; duration_ms: number }
  | { type: 'tests_completed'; total: number; passed: number; failed: number }
  | { type: 'scenario_added'; scenario_id: string };
