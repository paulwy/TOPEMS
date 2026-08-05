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
    name: '用户登录流程',
    type: 'e2e',
    steps: [
      { name: '打开登录页', action: 'navigate("/login")', expected: '页面加载完成' },
      { name: '填写用户名', action: 'fill("username", "admin")', expected: '用户名已填入' },
      { name: '填写密码', action: 'fill("password", "password123")', expected: '密码已填入' },
      { name: '点击登录', action: 'click("login-btn")', expected: '跳转到仪表盘' },
    ],
    expected_result: '用户成功登录并跳转到仪表盘',
    priority: 'critical',
    status: 'pending',
    created_at: new Date().toISOString(),
    tags: ['auth', 'login', 'critical-path'],
    module: 'auth',
  },
  {
    id: generateId(),
    name: '数据列表分页',
    type: 'integration',
    steps: [
      { name: '加载列表', action: 'fetch("/api/items?page=1")', expected: '返回第一页数据' },
      { name: '切换到第二页', action: 'click("page-2")', expected: '加载第二页数据' },
      { name: '验证数据更新', action: 'assert(items.length > 0)', expected: '数据已更新' },
    ],
    expected_result: '分页功能正常工作',
    priority: 'high',
    status: 'pending',
    created_at: new Date().toISOString(),
    tags: ['list', 'pagination'],
    module: 'common',
  },
  {
    id: generateId(),
    name: '表单验证 - 必填字段',
    type: 'unit',
    steps: [
      { name: '创建表单', action: 'createForm()', expected: '表单实例已创建' },
      { name: '提交空表单', action: 'submit()', expected: '验证失败' },
      { name: '填写必填字段', action: 'fill(requiredFields)', expected: '字段已填写' },
      { name: '再次提交', action: 'submit()', expected: '验证通过' },
    ],
    expected_result: '表单正确验证必填字段',
    priority: 'high',
    status: 'pending',
    created_at: new Date().toISOString(),
    tags: ['form', 'validation'],
    module: 'common',
  },
  {
    id: generateId(),
    name: 'API 响应缓存',
    type: 'unit',
    steps: [
      { name: '首次请求', action: 'fetch("/api/data")', expected: '请求发送到服务器' },
      { name: '二次请求', action: 'fetch("/api/data")', expected: '从缓存返回' },
      { name: '清除缓存', action: 'clearCache()', expected: '缓存已清除' },
      { name: '再次请求', action: 'fetch("/api/data")', expected: '请求发送到服务器' },
    ],
    expected_result: '缓存机制正常工作',
    priority: 'medium',
    status: 'pending',
    created_at: new Date().toISOString(),
    tags: ['api', 'cache', 'performance'],
    module: 'api',
  },
  {
    id: generateId(),
    name: '主题切换',
    type: 'integration',
    steps: [
      { name: '获取当前主题', action: 'getTheme()', expected: '返回当前主题' },
      { name: '切换主题', action: 'toggleTheme()', expected: '主题已切换' },
      { name: '验证持久化', action: 'reload()', expected: '主题保持切换后状态' },
    ],
    expected_result: '主题切换正常工作且持久化',
    priority: 'medium',
    status: 'pending',
    created_at: new Date().toISOString(),
    tags: ['ui', 'theme', 'preference'],
    module: 'ui',
  },
];

class SmartTesterImpl {
  private scenarios: Map<string, TestScenario> = new Map();
  private results: Map<string, TestResult[]> = new Map();
  private listeners: Set<(event: SmartTestEvent) => void> = new Set();

  constructor() {
    for (const scenario of DEFAULT_SCENARIOS) {
      this.scenarios.set(scenario.id, { ...scenario });
    }
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
  }): TestScenario[] {
    const count = params?.count || 5;
    const module = params?.module || 'all';
    const types: TestType[] = params?.type ? [params.type] : ['unit', 'integration', 'e2e'];
    const priorities: TestPriority[] = params?.priority
      ? [params.priority]
      : ['medium', 'high', 'critical'];

    const generated: TestScenario[] = [];

    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const priority = priorities[i % priorities.length];
      const id = generateId();

      const scenario: TestScenario = {
        id,
        name: `AI 生成测试 - ${module} #${i + 1}`,
        type,
        steps: [
          { name: '初始化', action: `setup_${module}()`, expected: '环境已初始化' },
          { name: '执行操作', action: `execute_${type}_test()`, expected: '操作完成' },
          { name: '验证结果', action: 'assert_result()', expected: '结果符合预期' },
          { name: '清理', action: 'teardown()', expected: '环境已清理' },
        ],
        expected_result: `${type.toUpperCase()} 测试通过`,
        priority,
        status: 'pending',
        created_at: new Date().toISOString(),
        tags: ['ai-generated', type],
        module,
      };

      this.scenarios.set(id, scenario);
      generated.push(scenario);
    }

    this.emit({ type: 'tests_generated', count, module });
    return generated;
  }

  async runTests(
    scenarioIds?: string[],
    _options?: { parallel?: boolean; timeout_ms?: number }
  ): Promise<TestResult[]> {
    const ids = scenarioIds || Array.from(this.scenarios.keys());
    const results: TestResult[] = [];

    this.emit({ type: 'tests_started', count: ids.length });

    for (const id of ids) {
      const scenario = this.scenarios.get(id);
      if (!scenario) continue;

      scenario.status = 'running';
      this.emit({ type: 'test_started', scenario_id: id });

      const start = Date.now();

      await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 150));

      const passed = Math.random() > 0.15;
      const duration = Date.now() - start;

      const result: TestResult = {
        scenario_id: id,
        passed,
        duration_ms: duration,
        coverage: passed ? 0.7 + Math.random() * 0.3 : Math.random() * 0.5,
        error_message: passed
          ? undefined
          : 'Assertion failed: expected value does not match actual result',
        assertion_results: scenario.steps.map((step) => ({
          name: step.name,
          passed: passed || Math.random() > 0.3,
          expected: step.expected,
          actual: passed ? step.expected : 'Unexpected result',
        })),
      };

      scenario.status = passed ? 'passed' : 'failed';
      results.push(result);

      const scenarioResults = this.results.get(id) || [];
      scenarioResults.push(result);
      this.results.set(id, scenarioResults);

      this.emit({ type: 'test_completed', scenario_id: id, passed, duration_ms: duration });
    }

    this.emit({
      type: 'tests_completed',
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
    });

    return results;
  }

  getTestResults(scenarioId?: string): TestResult[] {
    if (scenarioId) {
      return this.results.get(scenarioId) || [];
    }
    const all: TestResult[] = [];
    for (const results of this.results.values()) {
      all.push(...results);
    }
    return all.sort((a, b) => b.duration_ms - a.duration_ms);
  }

  getCoverage(): CoverageReport {
    const results = this.getTestResults();
    const totalScenarios = this.scenarios.size;
    const totalCoverage =
      results.length > 0 ? results.reduce((sum, r) => sum + r.coverage, 0) / results.length : 0;

    return {
      total_statements: Math.round(totalScenarios * 50),
      covered_statements: Math.round(totalScenarios * 50 * totalCoverage),
      total_branches: Math.round(totalScenarios * 15),
      covered_branches: Math.round(totalScenarios * 15 * totalCoverage * 0.9),
      total_functions: Math.round(totalScenarios * 20),
      covered_functions: Math.round(totalScenarios * 20 * totalCoverage * 0.95),
      line_coverage: totalCoverage * 100,
      branch_coverage: totalCoverage * 90,
      function_coverage: totalCoverage * 95,
      file_coverage: Array.from(this.scenarios.values()).map((s) => ({
        file: `${s.module || 'unknown'}/${s.id}.test.ts`,
        line_coverage: totalCoverage * 100,
        branch_coverage: totalCoverage * 85,
        function_coverage: totalCoverage * 90,
      })),
    };
  }

  addScenario(scenario: Omit<TestScenario, 'id' | 'status' | 'created_at'>): TestScenario {
    const newScenario: TestScenario = {
      ...scenario,
      id: generateId(),
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    this.scenarios.set(newScenario.id, newScenario);
    this.emit({ type: 'scenario_added', scenario_id: newScenario.id });
    return newScenario;
  }

  listScenarios(filter?: {
    type?: TestType;
    status?: TestStatus;
    module?: string;
  }): TestScenario[] {
    let result = Array.from(this.scenarios.values());
    if (filter?.type) result = result.filter((s) => s.type === filter.type);
    if (filter?.status) result = result.filter((s) => s.status === filter.status);
    if (filter?.module) result = result.filter((s) => s.module === filter.module);
    return result.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  getFailureAnalysis(scenarioId: string): FailureAnalysis | null {
    const results = this.results.get(scenarioId) || [];
    const failures = results.filter((r) => !r.passed);
    if (failures.length === 0) return null;

    const scenario = this.scenarios.get(scenarioId);
    const lastFailure = failures[failures.length - 1];

    return {
      scenario_id: scenarioId,
      failure_type: lastFailure.error_message?.includes('timeout')
        ? 'timeout'
        : lastFailure.error_message?.includes('Error')
          ? 'error'
          : 'assertion',
      root_cause: lastFailure.error_message || 'Unknown failure',
      stack_trace: scenario
        ? `at ${scenario.name} (${scenario.id})\n  at TestRunner.execute (test-runner.ts)\n  at AsyncTestQueue.process (test-queue.ts)`
        : undefined,
      suggestion: '检查相关依赖是否正常，验证输入数据格式是否符合预期。',
      similar_failures: failures.slice(-3).map((f) => f.error_message || 'Unknown'),
      first_seen: failures[0] ? new Date().toISOString() : new Date().toISOString(),
      occurrence_count: failures.length,
    };
  }

  getStats(): {
    total: number;
    byType: Record<TestType, number>;
    by_status: Record<TestStatus, number>;
  } {
    const all = Array.from(this.scenarios.values());
    return {
      total: all.length,
      byType: {
        unit: all.filter((s) => s.type === 'unit').length,
        integration: all.filter((s) => s.type === 'integration').length,
        e2e: all.filter((s) => s.type === 'e2e').length,
      },
      by_status: {
        pending: all.filter((s) => s.status === 'pending').length,
        running: all.filter((s) => s.status === 'running').length,
        passed: all.filter((s) => s.status === 'passed').length,
        failed: all.filter((s) => s.status === 'failed').length,
        skipped: all.filter((s) => s.status === 'skipped').length,
      },
    };
  }
}

export type SmartTestEvent =
  | { type: 'tests_generated'; count: number; module: string }
  | { type: 'tests_started'; count: number }
  | { type: 'test_started'; scenario_id: string }
  | { type: 'test_completed'; scenario_id: string; passed: boolean; duration_ms: number }
  | { type: 'tests_completed'; total: number; passed: number; failed: number }
  | { type: 'scenario_added'; scenario_id: string };

export const smartTester = new SmartTesterImpl();
export { SmartTesterImpl as SmartTester };
