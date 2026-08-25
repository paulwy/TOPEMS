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

class SmartTestV2Impl {
  private testCases: Map<string, TestCase> = new Map();
  private testRuns: Map<string, TestRun> = new Map();
  private results: Map<string, TestResultDetail[]> = new Map();
  private listeners: Set<(event: SmartTestEvent) => void> = new Set();
  private trends: TestTrendPoint[] = [];

  constructor() {
    for (const tc of DEFAULT_TEST_CASES) {
      this.testCases.set(tc.id, { ...tc });
    }
    this.trends = this.generateInitialTrends();
  }

  private generateInitialTrends(): TestTrendPoint[] {
    const points: TestTrendPoint[] = [];
    const now = Date.now();
    for (let i = 6; i >= 0; i--) {
      const total = 10 + Math.floor(Math.random() * 15);
      const passed = Math.floor(total * (0.8 + Math.random() * 0.15));
      const coverage = 0.6 + Math.random() * 0.3;
      points.push({
        timestamp: new Date(now - i * 86400000).toISOString(),
        total,
        passed,
        failed: total - passed,
        coverage,
        duration_ms: 5000 + Math.random() * 10000,
      });
    }
    return points;
  }

  on(listener: (event: SmartTestEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: SmartTestEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // ignore
      }
    }
  }

  generateTests(params?: {
    module?: string;
    type?: TestType;
    priority?: TestPriority;
    count?: number;
  }): TestCase[] {
    const count = params?.count || 5;
    const module = params?.module || 'all';
    const types: TestType[] = params?.type ? [params.type] : ['Unit', 'Integration', 'E2E'];
    const priorities: TestPriority[] = params?.priority
      ? [params.priority]
      : ['medium', 'high', 'critical'];

    const generated: TestCase[] = [];

    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const priority = priorities[i % priorities.length];
      const id = generateId();

      const testCase: TestCase = {
        id,
        name: `${i18n.t('ai.smart-testing-v2.ai_0')}${module} #${i + 1}`,
        type,
        priority,
        status: 'pending',
        coverage: 0,
        module,
        tags: ['ai-generated', type.toLowerCase()],
        description: `${i18n.t('ai.smart-testing-v2.k1')}${type}${i18n.t('ai.smart-testing-v2.k2')}`,
        steps: [
          {
            name: i18n.t('ai.smart-testing-v2.k29'),
            action: `setup_${module}()`,
            expected: i18n.t('ai.smart-testing-v2.k28'),
          },
          {
            name: i18n.t('ai.smart-testing-v2.k31'),
            action: `execute_${type}_test()`,
            expected: i18n.t('ai.smart-testing-v2.k30'),
          },
          {
            name: i18n.t('ai.smart-testing-v2.k33'),
            action: 'assert_results()',
            expected: i18n.t('ai.smart-testing-v2.k32'),
          },
          {
            name: i18n.t('ai.smart-testing-v2.k35'),
            action: 'teardown()',
            expected: i18n.t('ai.smart-testing-v2.k34'),
          },
        ],
        created_at: new Date().toISOString(),
      };

      this.testCases.set(id, testCase);
      generated.push(testCase);
    }

    this.emit({ type: 'tests_generated', count, module });
    return generated;
  }

  async runTests(
    testCaseIds?: string[],
    _options?: { parallel?: boolean; timeout_ms?: number }
  ): Promise<TestRun> {
    const ids = testCaseIds || Array.from(this.testCases.keys());
    const results: TestResultDetail[] = [];
    const startTime = new Date().toISOString();

    this.emit({ type: 'tests_started', count: ids.length });

    for (const id of ids) {
      const testCase = this.testCases.get(id);
      if (!testCase) continue;

      testCase.status = 'running';
      this.emit({ type: 'test_started', testCaseId: id });

      const start = Date.now();

      await new Promise((resolve) => setTimeout(resolve, 30 + Math.random() * 120));

      const passed = Math.random() > 0.12;
      const duration = Date.now() - start;
      const coverage = passed ? 0.75 + Math.random() * 0.25 : Math.random() * 0.5;

      const result: TestResultDetail = {
        testCaseId: id,
        passed,
        duration_ms: duration,
        coverage,
        error_message: passed ? undefined : 'Assertion failed: expected behavior not observed',
        assertion_results: testCase.steps?.map((step) => ({
          name: step.name,
          passed: passed || Math.random() > 0.3,
          expected: step.expected,
          actual: passed ? step.expected : 'Unexpected result',
        })),
      };

      testCase.status = passed ? 'passed' : 'failed';
      testCase.coverage = coverage;
      testCase.updated_at = new Date().toISOString();

      results.push(result);

      const existingResults = this.results.get(id) || [];
      existingResults.push(result);
      this.results.set(id, existingResults);

      this.emit({ type: 'test_completed', testCaseId: id, passed, duration_ms: duration });
    }

    const endTime = new Date().toISOString();
    const totalCoverage =
      results.length > 0 ? results.reduce((sum, r) => sum + r.coverage, 0) / results.length : 0;

    const run: TestRun = {
      id: generateId(),
      testCaseIds: ids,
      startTime,
      endTime,
      results,
      coverage: totalCoverage,
      status: 'completed',
      total_duration_ms: Date.now() - new Date(startTime).getTime(),
      executor: 'SmartTestV2',
      environment: 'browser',
    };

    this.testRuns.set(run.id, run);

    const passedCount = results.filter((r) => r.passed).length;
    this.emit({
      type: 'tests_completed',
      total: results.length,
      passed: passedCount,
      failed: results.length - passedCount,
      runId: run.id,
    });

    this.updateTrend(run);

    return run;
  }

  getTestResults(testCaseId?: string): TestResultDetail[] {
    if (testCaseId) {
      return this.results.get(testCaseId) || [];
    }
    const all: TestResultDetail[] = [];
    for (const res of this.results.values()) {
      all.push(...res);
    }
    return all.sort((a, b) => b.duration_ms - a.duration_ms);
  }

  getCoverage(): {
    overall: number;
    byType: Record<TestType, number>;
    by_priority: Record<TestPriority, number>;
    total_test_cases: number;
    passed: number;
    failed: number;
    pending: number;
  } {
    const testCases = Array.from(this.testCases.values());
    const results = this.getTestResults();
    const totalCoverage =
      results.length > 0 ? results.reduce((sum, r) => sum + r.coverage, 0) / results.length : 0;

    const byType: Record<TestType, number> = { Unit: 0, Integration: 0, E2E: 0 };
    const typeCount: Record<TestType, number> = { Unit: 0, Integration: 0, E2E: 0 };
    const byPriority: Record<TestPriority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    const priorityCount: Record<TestPriority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const tc of testCases) {
      typeCount[tc.type]++;
      priorityCount[tc.priority]++;
      byType[tc.type] += tc.coverage;
      byPriority[tc.priority] += tc.coverage;
    }

    for (const type of Object.keys(byType) as TestType[]) {
      byType[type] = typeCount[type] > 0 ? byType[type] / typeCount[type] : 0;
    }
    for (const prio of Object.keys(byPriority) as TestPriority[]) {
      byPriority[prio] = priorityCount[prio] > 0 ? byPriority[prio] / priorityCount[prio] : 0;
    }

    return {
      overall: totalCoverage,
      byType,
      by_priority: byPriority,
      total_test_cases: testCases.length,
      passed: testCases.filter((tc) => tc.status === 'passed').length,
      failed: testCases.filter((tc) => tc.status === 'failed').length,
      pending: testCases.filter((tc) => tc.status === 'pending').length,
    };
  }

  getTestSuggestions(): TestSuggestion[] {
    const suggestions: TestSuggestion[] = [];
    const testCases = Array.from(this.testCases.values());
    const results = this.getTestResults();

    const lowCoverage = testCases.filter((tc) => tc.coverage < 0.5);
    for (const tc of lowCoverage) {
      suggestions.push({
        id: generateId(),
        testCaseId: tc.id,
        type: 'coverage',
        message: `${i18n.t('ai.smart-testing-v2.k3')}${tc.name}${i18n.t('ai.smart-testing-v2.k4')}${(tc.coverage * 100).toFixed(1)}%)`,
        suggestion: i18n.t('ai.smart-testing-v2.k36'),
        confidence: 0.85,
      });
    }

    const failedTests = results.filter((r) => !r.passed);
    for (const failed of failedTests) {
      const tc = this.testCases.get(failed.testCaseId);
      if (tc) {
        suggestions.push({
          id: generateId(),
          testCaseId: failed.testCaseId,
          type: 'edge-case',
          message: `${i18n.t('ai.smart-testing-v2.k5')}${tc.name}${i18n.t('ai.smart-testing-v2.k6')}`,
          suggestion: i18n.t('ai.smart-testing-v2.k37'),
          confidence: 0.9,
        });
      }
    }

    const slowTests = results.filter((r) => r.duration_ms > 100);
    for (const slow of slowTests.slice(0, 5)) {
      const tc = this.testCases.get(slow.testCaseId);
      if (tc) {
        suggestions.push({
          id: generateId(),
          testCaseId: slow.testCaseId,
          type: 'performance',
          message: `${i18n.t('ai.smart-testing-v2.k7')}${tc.name}${i18n.t('ai.smart-testing-v2.k8')}${slow.duration_ms}ms)`,
          suggestion: i18n.t('ai.smart-testing-v2.k38'),
          confidence: 0.7,
        });
      }
    }

    if (suggestions.length === 0) {
      suggestions.push({
        id: generateId(),
        testCaseId: '',
        type: 'coverage',
        message: i18n.t('ai.smart-testing-v2.k39'),
        suggestion: i18n.t('ai.smart-testing-v2.k40'),
        confidence: 0.6,
      });
    }

    this.emit({ type: 'suggestions_generated', count: suggestions.length });
    return suggestions;
  }

  regenerateFailed(): TestCase[] {
    const failedCases = Array.from(this.testCases.values()).filter((tc) => tc.status === 'failed');
    const regenerated: TestCase[] = [];

    for (const failed of failedCases) {
      const newId = generateId();
      const newCase: TestCase = {
        ...failed,
        id: newId,
        name: `${failed.name}${i18n.t('ai.smart-testing-v2.k9')}`,
        status: 'pending',
        coverage: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: [...failed.tags, 'regenerated'],
      };
      this.testCases.set(newId, newCase);
      regenerated.push(newCase);
    }

    this.emit({ type: 'regenerate_completed', count: regenerated.length });
    return regenerated;
  }

  getTestTrends(): TestTrendPoint[] {
    return [...this.trends];
  }

  private updateTrend(run: TestRun): void {
    const passed = run.results.filter((r) => r.passed).length;
    this.trends.push({
      timestamp: run.endTime,
      total: run.results.length,
      passed,
      failed: run.results.length - passed,
      coverage: run.coverage,
      duration_ms: run.total_duration_ms,
    });

    if (this.trends.length > 30) {
      this.trends = this.trends.slice(-30);
    }
  }

  getTestCases(filters?: { type?: TestType; status?: TestStatus; module?: string }): TestCase[] {
    let result = Array.from(this.testCases.values());
    if (filters?.type) result = result.filter((tc) => tc.type === filters.type);
    if (filters?.status) result = result.filter((tc) => tc.status === filters.status);
    if (filters?.module) result = result.filter((tc) => tc.module === filters.module);
    return result;
  }

  getTestRun(runId: string): TestRun | undefined {
    return this.testRuns.get(runId);
  }

  getAllRuns(): TestRun[] {
    return Array.from(this.testRuns.values()).sort(
      (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
    );
  }
}
