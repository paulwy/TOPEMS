import i18n from '@/i18n';
/**
 * V47.0 前端 AI 增强 — 自动化测试生成器
 *
 * 支持多种测试类型：
 * - 单元测试：为函数/组件生成单元测试
 * - 集成测试：为 API 调用生成集成测试
 * - 快照测试：为 React 组件生成快照测试
 * - E2E 测试骨架：生成端到端测试骨架
 *
 * 支持边界值分析、等价类划分等测试用例设计方法，
 * 支持自动生成 Mock 数据和 Mock 函数。
 */

// ============ 枚举与类型定义 ============

export enum TestFramework {
  JEST = 'jest',
  VITEST = 'vitest',
  PLAYWRIGHT = 'playwright',
  REACTTESTINGLIBRARY = 'react-testing-library',
}

export enum TestType {
  UNIT = 'unit',
  INTEGRATION = 'integration',
  SNAPSHOT = 'snapshot',
  E2E = 'e2e',
}

export enum MockStrategy {
  AUTO = 'auto',
  MANUAL = 'manual',
  PARTIAL = 'partial',
  NONE = 'none',
}

export enum TestCaseDesignMethod {
  BOUNDARYVALUEANALYSIS = 'boundary_value',
  EQUIVALENCEPARTITIONING = 'equivalence',
  DECISIONTABLE = 'decision_table',
  STATETRANSITION = 'state_transition',
  ERRORGUESSING = 'error_guessing',
}

// ============ 接口定义 ============

export interface FunctionParameter {
  name: string;
  type: string;
  optional?: boolean;
  default_value?: unknown;
}

export interface FunctionSignature {
  name: string;
  parameters: FunctionParameter[];
  return_type: string;
  is_async?: boolean;
  is_exported?: boolean;
}

export interface TestGenerationRequest {
  source_file: string;
  source_code: string;
  test_type: TestType;
  framework: TestFramework;
  coverage_targets?: string[];
  mock_strategy?: MockStrategy;
  function_signatures?: FunctionSignature[];
  component_name?: string;
  design_methods?: TestCaseDesignMethod[];
  language?: string;
}

export interface TestCase {
  name: string;
  description: string;
  input: Record<string, unknown>;
  expected_output: unknown;
  test_type: TestType;
  design_method?: TestCaseDesignMethod;
  skip?: boolean;
  only?: boolean;
}

export interface GeneratedTest {
  test_code: string;
  test_file_path: string;
  test_cases: TestCase[];
  coverage_estimate: number;
  imports_needed: string[];
  mock_data: Record<string, unknown>;
  mock_functions: MockFunctionDef[];
  framework_config?: Record<string, unknown>;
}

export interface MockFunctionDef {
  name: string;
  module: string;
  return_value: unknown;
  is_default?: boolean;
  implementation?: string;
}

export interface CoverageAnalysis {
  total_lines: number;
  covered_lines: number;
  uncovered_lines: number[];
  branches_covered: number;
  branches_total: number;
  functions_covered: number;
  functions_total: number;
  coverage_percentage: number;
  uncovered_functions: string[];
  suggestions: string[];
}

export interface EdgeCase {
  description: string;
  input: Record<string, unknown>;
  reason: string;
  expected_behavior?: string;
}

// ============ 测试模板生成 ============

const FRAMEWORK_IMPORTS: Record<TestFramework, string[]> = {
  [TestFramework.JEST]: [
    "import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';",
  ],
  [TestFramework.VITEST]: [
    "import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';",
  ],
  [TestFramework.PLAYWRIGHT]: ["import { test, expect } from '@playwright/test';"],
  [TestFramework.REACTTESTINGLIBRARY]: [
    "import { render, screen, fireEvent, waitFor } from '@testing-library/react';",
    "import { describe, it, expect, vi } from 'vitest';",
  ],
};

const TEST_FILE_SUFFIX: Record<TestType, string> = {
  [TestType.UNIT]: '.test',
  [TestType.INTEGRATION]: '.integration.test',
  [TestType.SNAPSHOT]: '.snapshot.test',
  [TestType.E2E]: '.e2e.spec',
};

// ============ 测试生成器 ============

export class TestGenerator {
  /**
   * 生成测试
   */
  async generateTests(request: TestGenerationRequest): Promise<GeneratedTest> {
    const designMethods = request.design_methods ?? [
      TestCaseDesignMethod.BOUNDARYVALUEANALYSIS,
      TestCaseDesignMethod.EQUIVALENCEPARTITIONING,
    ];

    const testCases = this.generateTestCases(request, designMethods);
    const mockData = this.generateMockData(request);
    const mockFunctions = this.generateMockFunctions(request);
    const importsNeeded = this.collectImports(request, testCases, mockFunctions);
    const testCode = this.buildTestCode(request, testCases, mockData, mockFunctions, importsNeeded);
    const coverageEstimate = this.estimateCoverage(testCases, request);

    return {
      test_code: testCode,
      test_file_path: this.getTestFilePath(request),
      test_cases: testCases,
      coverage_estimate: coverageEstimate,
      imports_needed: importsNeeded,
      mock_data: mockData,
      mock_functions: mockFunctions,
    };
  }

  /**
   * 分析覆盖率
   */
  analyzeCoverage(source_code: string, test_cases: TestCase[]): CoverageAnalysis {
    const lines = source_code.split('\n');
    const totalLines = lines.filter((line) => line.trim() && !line.trim().startsWith('//')).length;

    // 估算覆盖行数
    const coveredLines = Math.min(totalLines, Math.floor(totalLines * (test_cases.length * 0.15)));

    const uncoveredLines: number[] = [];
    for (let i = coveredLines + 1; i <= totalLines; i++) {
      uncoveredLines.push(i);
    }

    // 检测函数数量
    const functionPattern =
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/g;
    const functions: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = functionPattern.exec(source_code)) !== null) {
      functions.push(match[1] ?? match[2] ?? '');
    }

    const functionsCovered = Math.min(functions.length, test_cases.length);
    const branchesTotal = functions.length * 2;
    const branchesCovered = Math.min(branchesTotal, test_cases.length * 2);

    const coveragePercentage = totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0;

    const uncoveredFunctions = functions.slice(functionsCovered);

    const suggestions: string[] = [];
    if (coveragePercentage < 80) {
      suggestions.push(i18n.t('shared.test-generator.k0'));
    }
    if (uncoveredFunctions.length > 0) {
      suggestions.push(`${i18n.t('shared.test-generator.k0')}${uncoveredFunctions.join(', ')}`);
    }
    if (test_cases.length < functions.length) {
      suggestions.push(i18n.t('shared.test-generator.k1'));
    }

    return {
      total_lines: totalLines,
      covered_lines: coveredLines,
      uncovered_lines: uncoveredLines,
      branches_covered: branchesCovered,
      branches_total: branchesTotal,
      functions_covered: functionsCovered,
      functions_total: functions.length,
      coverage_percentage: coveragePercentage,
      uncovered_functions: uncoveredFunctions,
      suggestions,
    };
  }

  /**
   * 建议边界情况
   */
  suggestEdgeCases(source_code: string, function_signatures?: FunctionSignature[]): EdgeCase[] {
    const edgeCases: EdgeCase[] = [];

    if (function_signatures && function_signatures.length > 0) {
      for (const fn of function_signatures) {
        edgeCases.push(...this.generateFunctionEdgeCases(fn));
      }
    } else {
      // 从源码推断函数
      const functions = this.extractFunctions(source_code);
      for (const fn of functions) {
        edgeCases.push(...this.generateFunctionEdgeCases(fn));
      }
    }

    // 通用边界情况
    edgeCases.push(
      {
        description: i18n.t('shared.test-generator.k2'),
        input: {},
        reason: i18n.t('shared.test-generator.k3'),
        expected_behavior: i18n.t('shared.test-generator.k4'),
      },
      {
        description: i18n.t('shared.test-generator.null_1'),
        input: { value: null },
        reason: i18n.t('shared.test-generator.null_5'),
        expected_behavior: i18n.t('shared.test-generator.null_6'),
      },
      {
        description: i18n.t('shared.test-generator.undefined_2'),
        input: { value: undefined },
        reason: i18n.t('shared.test-generator.undefined_7'),
        expected_behavior: i18n.t('shared.test-generator.undefined_8'),
      }
    );

    return edgeCases;
  }

  /**
   * 生成 Mock 数据
   */
  generateMocks(request: TestGenerationRequest): {
    mock_data: Record<string, unknown>;
    mock_functions: MockFunctionDef[];
  } {
    return {
      mock_data: this.generateMockData(request),
      mock_functions: this.generateMockFunctions(request),
    };
  }

  /**
   * 优化测试套件
   */
  optimizeTestSuite(
    test_cases: TestCase[],
    coverage_analysis: CoverageAnalysis
  ): {
    optimized_cases: TestCase[];
    removed_cases: TestCase[];
    added_cases: TestCase[];
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    const removedCases: TestCase[] = [];
    const addedCases: TestCase[] = [];

    // 移除重复测试用例
    const seen = new Set<string>();
    const deduped: TestCase[] = [];

    for (const tc of test_cases) {
      const key = `${tc.name}-${JSON.stringify(tc.input)}`;
      if (seen.has(key)) {
        removedCases.push(tc);
        recommendations.push(`${i18n.t('shared.test-generator.k3')}${tc.name}`);
      } else {
        seen.add(key);
        deduped.push(tc);
      }
    }

    // 根据覆盖率分析添加缺失的测试
    if (coverage_analysis.uncovered_functions.length > 0) {
      for (const fnName of coverage_analysis.uncovered_functions) {
        addedCases.push({
          name: `should handle ${fnName} function`,
          description: `${i18n.t('shared.test-generator.k4')}${fnName}${i18n.t('shared.test-generator.k5')}`,
          input: {},
          expected_output: undefined,
          test_type: TestType.UNIT,
          design_method: TestCaseDesignMethod.ERRORGUESSING,
        });
        recommendations.push(`${i18n.t('shared.test-generator.k6')}${fnName}`);
      }
    }

    if (coverage_analysis.coverage_percentage < 80) {
      recommendations.push(i18n.t('shared.test-generator.k9'));
    }

    if (deduped.length < 3) {
      recommendations.push(i18n.t('shared.test-generator.k10'));
    }

    return {
      optimized_cases: [...deduped, ...addedCases],
      removed_cases: removedCases,
      added_cases: addedCases,
      recommendations,
    };
  }

  // ============ 私有方法：测试用例生成 ============

  private generateTestCases(
    request: TestGenerationRequest,
    designMethods: TestCaseDesignMethod[]
  ): TestCase[] {
    const cases: TestCase[] = [];
    const functions = request.function_signatures ?? this.extractFunctions(request.source_code);

    for (const fn of functions) {
      for (const method of designMethods) {
        cases.push(...this.generateCasesByMethod(fn, method, request.test_type));
      }
    }

    // 如果是组件测试，添加组件专用测试
    if (request.component_name) {
      cases.push(...this.generateComponentTestCases(request));
    }

    // 如果是 API 集成测试，添加 API 专用测试
    if (request.test_type === TestType.INTEGRATION) {
      cases.push(...this.generateApiTestCases(request));
    }

    // 如果是 E2E 测试，添加 E2E 骨架
    if (request.test_type === TestType.E2E) {
      cases.push(...this.generateE2ETestCases(request));
    }

    // 去重
    return this.dedupeTestCases(cases);
  }

  private generateCasesByMethod(
    fn: FunctionSignature,
    method: TestCaseDesignMethod,
    testType: TestType
  ): TestCase[] {
    const cases: TestCase[] = [];
    const fnName = fn.name;

    switch (method) {
      case TestCaseDesignMethod.BOUNDARYVALUEANALYSIS:
        cases.push(
          {
            name: `${fnName} should handle minimum boundary`,
            description: `${i18n.t('shared.test-generator.k7')}${fnName}${i18n.t('shared.test-generator.k8')}`,
            input: this.getBoundaryValues(fn, 'min'),
            expected_output: this.inferExpectedOutput(fn, 'min'),
            test_type: testType,
            design_method: method,
          },
          {
            name: `${fnName} should handle maximum boundary`,
            description: `${i18n.t('shared.test-generator.k9')}${fnName}${i18n.t('shared.test-generator.k10')}`,
            input: this.getBoundaryValues(fn, 'max'),
            expected_output: this.inferExpectedOutput(fn, 'max'),
            test_type: testType,
            design_method: method,
          },
          {
            name: `${fnName} should handle zero/empty boundary`,
            description: `${i18n.t('shared.test-generator.k11')}${fnName}${i18n.t('shared.test-generator.k12')}`,
            input: this.getBoundaryValues(fn, 'zero'),
            expected_output: this.inferExpectedOutput(fn, 'zero'),
            test_type: testType,
            design_method: method,
          }
        );
        break;

      case TestCaseDesignMethod.EQUIVALENCEPARTITIONING:
        cases.push(
          {
            name: `${fnName} should handle valid input (positive case)`,
            description: `${i18n.t('shared.test-generator.k13')}${fnName}${i18n.t('shared.test-generator.k14')}`,
            input: this.getValidInput(fn),
            expected_output: this.inferExpectedOutput(fn, 'valid'),
            test_type: testType,
            design_method: method,
          },
          {
            name: `${fnName} should handle invalid input (negative case)`,
            description: `${i18n.t('shared.test-generator.k15')}${fnName}${i18n.t('shared.test-generator.k16')}`,
            input: this.getInvalidInput(fn),
            expected_output: this.inferExpectedOutput(fn, 'invalid'),
            test_type: testType,
            design_method: method,
          }
        );
        break;

      case TestCaseDesignMethod.ERRORGUESSING:
        cases.push(
          {
            name: `${fnName} should throw error for null input`,
            description: `${i18n.t('shared.test-generator.k17')}${fnName}${i18n.t('shared.test-generator.null_18')}`,
            input: { [fn.parameters[0]?.name ?? 'input']: null },
            expected_output: 'throw Error',
            test_type: testType,
            design_method: method,
          },
          {
            name: `${fnName} should throw error for undefined input`,
            description: `${i18n.t('shared.test-generator.k19')}${fnName}${i18n.t('shared.test-generator.undefined_20')}`,
            input: { [fn.parameters[0]?.name ?? 'input']: undefined },
            expected_output: 'throw Error',
            test_type: testType,
            design_method: method,
          }
        );
        break;

      case TestCaseDesignMethod.DECISIONTABLE:
        cases.push({
          name: `${fnName} should handle decision table case 1`,
          description: i18n.t('utils.test-generator.k0'),
          input: this.getValidInput(fn),
          expected_output: this.inferExpectedOutput(fn, 'valid'),
          test_type: testType,
          design_method: method,
        });
        break;

      case TestCaseDesignMethod.STATETRANSITION:
        cases.push({
          name: `${fnName} should handle state transition`,
          description: i18n.t('utils.test-generator.k1'),
          input: this.getValidInput(fn),
          expected_output: this.inferExpectedOutput(fn, 'valid'),
          test_type: testType,
          design_method: method,
        });
        break;
    }

    return cases;
  }

  private generateComponentTestCases(request: TestGenerationRequest): TestCase[] {
    const componentName = request.component_name ?? 'Component';
    return [
      {
        name: `${componentName} should render without crashing`,
        description: `${i18n.t('shared.test-generator.k21')}${componentName}${i18n.t('shared.test-generator.k22')}`,
        input: { props: {} },
        expected_output: 'rendered component',
        test_type: request.test_type,
      },
      {
        name: `${componentName} should render with props`,
        description: `${i18n.t('shared.test-generator.k23')}${componentName}${i18n.t('shared.test-generator.props_24')}`,
        input: { props: { title: 'Test', visible: true } },
        expected_output: 'rendered with props',
        test_type: request.test_type,
      },
      {
        name: `${componentName} should handle user interaction`,
        description: `${i18n.t('shared.test-generator.k25')}${componentName}${i18n.t('shared.test-generator.k26')}`,
        input: { action: 'click', target: 'button' },
        expected_output: 'callback called',
        test_type: request.test_type,
      },
      {
        name: `${componentName} should handle empty state`,
        description: `${i18n.t('shared.test-generator.k27')}${componentName}${i18n.t('shared.test-generator.k28')}`,
        input: { props: { data: [] } },
        expected_output: 'empty state shown',
        test_type: request.test_type,
      },
      {
        name: `${componentName} should handle loading state`,
        description: `${i18n.t('shared.test-generator.k29')}${componentName}${i18n.t('shared.test-generator.k30')}`,
        input: { props: { loading: true } },
        expected_output: 'loading indicator shown',
        test_type: request.test_type,
      },
      {
        name: `${componentName} should handle error state`,
        description: `${i18n.t('shared.test-generator.k31')}${componentName}${i18n.t('shared.test-generator.k32')}`,
        input: { props: { error: new Error('Test error') } },
        expected_output: 'error message shown',
        test_type: request.test_type,
      },
    ];
  }

  private generateApiTestCases(_request: TestGenerationRequest): TestCase[] {
    return [
      {
        name: 'API should return data on successful request',
        description: i18n.t('shared.test-generator.api_11'),
        input: { method: 'GET', endpoint: '/api/test', params: {} },
        expected_output: { status: 200, data: [] },
        test_type: TestType.INTEGRATION,
      },
      {
        name: 'API should handle 404 error',
        description: i18n.t('shared.test-generator.api404_12'),
        input: { method: 'GET', endpoint: '/api/nonexistent' },
        expected_output: { status: 404 },
        test_type: TestType.INTEGRATION,
      },
      {
        name: 'API should handle 500 error',
        description: i18n.t('shared.test-generator.api_13'),
        input: { method: 'GET', endpoint: '/api/error' },
        expected_output: { status: 500 },
        test_type: TestType.INTEGRATION,
      },
      {
        name: 'API should handle network timeout',
        description: i18n.t('shared.test-generator.api_14'),
        input: { method: 'GET', endpoint: '/api/timeout', timeout: 1000 },
        expected_output: 'timeout error',
        test_type: TestType.INTEGRATION,
      },
    ];
  }

  private generateE2ETestCases(_request: TestGenerationRequest): TestCase[] {
    return [
      {
        name: 'should navigate to page',
        description: i18n.t('shared.test-generator.e2e_33'),
        input: { url: '/' },
        expected_output: 'page loaded',
        test_type: TestType.E2E,
      },
      {
        name: 'should login successfully',
        description: i18n.t('shared.test-generator.e2e_34'),
        input: { username: 'test', password: 'test' },
        expected_output: 'redirected to dashboard',
        test_type: TestType.E2E,
      },
      {
        name: 'should perform CRUD operations',
        description: i18n.t('shared.test-generator.e2e_35'),
        input: { action: 'create' },
        expected_output: 'record created',
        test_type: TestType.E2E,
      },
    ];
  }

  // ============ 私有方法：Mock 生成 ============

  private generateMockData(request: TestGenerationRequest): Record<string, unknown> {
    const mockData: Record<string, unknown> = {};

    if (request.component_name) {
      mockData.props = {
        title: 'Mock Title',
        visible: true,
        data: [1, 2, 3],
        loading: false,
        error: null,
      };
    }

    const functions = request.function_signatures ?? this.extractFunctions(request.source_code);
    for (const fn of functions) {
      const mockKey = `mock_${fn.name}_result`;
      mockData[mockKey] = this.generateMockValueForType(fn.return_type);
    }

    // 通用 API Mock 数据
    if (request.test_type === TestType.INTEGRATION) {
      mockData.apiResponse = {
        status: 200,
        data: { id: 1, name: 'Mock Data' },
        message: 'success',
      };
      mockData.apiError = {
        status: 500,
        message: 'Internal Server Error',
      };
    }

    return mockData;
  }

  private generateMockFunctions(request: TestGenerationRequest): MockFunctionDef[] {
    const mocks: MockFunctionDef[] = [];
    const strategy = request.mock_strategy ?? MockStrategy.AUTO;

    if (strategy === MockStrategy.NONE) return mocks;

    const functions = request.function_signatures ?? this.extractFunctions(request.source_code);

    for (const fn of functions) {
      mocks.push({
        name: fn.name,
        module: request.source_file,
        return_value: this.generateMockValueForType(fn.return_type),
        is_default: fn.is_exported,
        implementation: `vi.fn().mockResolvedValue(${JSON.stringify(
          this.generateMockValueForType(fn.return_type)
        )})`,
      });
    }

    // API Mock
    if (request.test_type === TestType.INTEGRATION) {
      mocks.push({
        name: 'apiClient',
        module: '../client',
        return_value: { get: {}, post: {}, put: {}, delete: {} },
        implementation: `vi.fn(() => ({ get: vi.fn().mockResolvedValue({ data: {} }), post: vi.fn() }))`,
      });
    }

    return mocks;
  }

  private generateMockValueForType(type: string): unknown {
    const lowerType = type.toLowerCase();

    if (lowerType.includes('string')) return 'mock-value';
    if (lowerType.includes('number')) return 42;
    if (lowerType.includes('boolean')) return true;
    if (lowerType.includes('void')) return undefined;
    if (lowerType.includes('null')) return null;
    if (lowerType.includes('promise')) return {};
    if (lowerType.includes('array') || lowerType.includes('[]')) return [];
    if (lowerType.includes('object') || lowerType.includes('{}')) return { id: 1 };

    return null;
  }

  // ============ 私有方法：测试代码构建 ============

  private buildTestCode(
    request: TestGenerationRequest,
    testCases: TestCase[],
    mockData: Record<string, unknown>,
    mockFunctions: MockFunctionDef[],
    imports: string[]
  ): string {
    const lines: string[] = [];
    const framework = request.framework;

    // 导入部分
    lines.push('/**');
    lines.push(i18n.t('utils.test-generator.k2'));
    lines.push(`${i18n.t('shared.test-generator.k36')}${this.getTestTypeName(request.test_type)}`);
    lines.push(`${i18n.t('shared.test-generator.k37')}${this.getFrameworkName(framework)}`);
    lines.push(`${i18n.t('shared.test-generator.k38')}${new Date().toISOString()}`);
    lines.push(' */');
    lines.push('');

    // 框架导入
    const frameworkImports =
      FRAMEWORK_IMPORTS[framework] ?? FRAMEWORK_IMPORTS[TestFramework.VITEST];
    lines.push(...frameworkImports);

    // 自定义导入
    for (const imp of imports) {
      lines.push(imp);
    }
    lines.push('');

    // Mock 设置
    if (mockFunctions.length > 0) {
      lines.push(i18n.t('shared.test-generator.k39'));
      for (const mock of mockFunctions) {
        lines.push(`vi.mock('${mock.module}', () => ({`);
        if (mock.is_default) {
          lines.push(`  default: ${mock.implementation ?? 'vi.fn()'},`);
        }
        lines.push(`  ${mock.name}: ${mock.implementation ?? 'vi.fn()'},`);
        lines.push(`}));`);
        lines.push('');
      }
    }

    // Mock 数据
    if (Object.keys(mockData).length > 0) {
      lines.push(i18n.t('shared.test-generator.k40'));
      lines.push(`const mockData = ${JSON.stringify(mockData, null, 2)};`);
      lines.push('');
    }

    // 测试套件
    const suiteName = request.component_name
      ? `${request.component_name} Component`
      : this.getBaseName(request.source_file);

    if (framework === TestFramework.PLAYWRIGHT) {
      lines.push(`test.describe('${suiteName}', () => {`);
    } else {
      lines.push(`describe('${suiteName}', () => {`);
    }

    // beforeEach / afterEach
    lines.push('  beforeEach(() => {');
    lines.push('    vi.clearAllMocks();');
    lines.push('  });');
    lines.push('');

    // 测试用例
    for (const tc of testCases) {
      const testFn = tc.only ? 'it.only' : tc.skip ? 'it.skip' : 'it';
      lines.push(`  ${testFn}('${tc.name}', async () => {`);
      lines.push(`    // ${tc.description}`);
      lines.push(`${i18n.t('shared.test-generator.k41')}${JSON.stringify(tc.input)}`);
      lines.push(`${i18n.t('shared.test-generator.k42')}${JSON.stringify(tc.expected_output)}`);

      if (request.test_type === TestType.SNAPSHOT) {
        lines.push('    // const { container } = render(<Component />);');
        lines.push('    // expect(container).toMatchSnapshot();');
        lines.push('    expect(true).toBe(true);');
      } else if (request.test_type === TestType.E2E) {
        lines.push("    // await page.goto('/');");
        lines.push('    // await expect(page).toHaveTitle(/.*/);');
        lines.push('    expect(true).toBe(true);');
      } else {
        lines.push(i18n.t('shared.test-generator.todo_43'));
        lines.push('    expect(true).toBe(true);');
      }

      lines.push('  });');
      lines.push('');
    }

    lines.push('});');
    lines.push('');

    return lines.join('\n');
  }

  // ============ 私有方法：辅助函数 ============

  private extractFunctions(sourceCode: string): FunctionSignature[] {
    const functions: FunctionSignature[] = [];

    // 匹配 function 声明
    const funcPattern =
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*{/g;
    let match: RegExpExecArray | null;
    while ((match = funcPattern.exec(sourceCode)) !== null) {
      const name = match[1];
      const params = this.parseParameters(match[2]);
      const returnType = (match[3] ?? 'void').trim();
      functions.push({
        name,
        parameters: params,
        return_type: returnType,
        is_async: /async/.test(match[0]),
        is_exported: match[0].includes('export'),
      });
    }

    // 匹配箭头函数
    const arrowPattern =
      /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)(?:\s*:\s*([^=]+?))?\s*=>/g;
    while ((match = arrowPattern.exec(sourceCode)) !== null) {
      const name = match[1];
      const params = this.parseParameters(match[2]);
      const returnType = (match[3] ?? 'void').trim();
      functions.push({
        name,
        parameters: params,
        return_type: returnType,
        is_async: /async/.test(match[0]),
        is_exported: match[0].includes('export'),
      });
    }

    return functions;
  }

  private parseParameters(paramString: string): FunctionParameter[] {
    if (!paramString.trim()) return [];

    const params: FunctionParameter[] = [];
    const parts = paramString
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    for (const part of parts) {
      const colonIdx = part.indexOf(':');
      if (colonIdx === -1) {
        params.push({ name: part, type: 'any' });
        continue;
      }

      const name = part.slice(0, colonIdx).trim();
      const typeAndDefault = part.slice(colonIdx + 1).trim();
      const questionIdx = name.indexOf('?');
      const isOptional = questionIdx !== -1;

      const eqIdx = typeAndDefault.indexOf('=');
      const type = eqIdx !== -1 ? typeAndDefault.slice(0, eqIdx).trim() : typeAndDefault;
      const defaultValue = eqIdx !== -1 ? typeAndDefault.slice(eqIdx + 1).trim() : undefined;

      params.push({
        name: isOptional ? name.slice(0, questionIdx) : name,
        type: type || 'any',
        optional: isOptional,
        default_value: defaultValue,
      });
    }

    return params;
  }

  private getBoundaryValues(
    fn: FunctionSignature,
    boundary: 'min' | 'max' | 'zero'
  ): Record<string, unknown> {
    const input: Record<string, unknown> = {};
    for (const param of fn.parameters) {
      const lowerType = param.type.toLowerCase();
      let value: unknown;

      if (lowerType.includes('number')) {
        value =
          boundary === 'min'
            ? Number.MIN_SAFE_INTEGER
            : boundary === 'max'
              ? Number.MAX_SAFE_INTEGER
              : 0;
      } else if (lowerType.includes('string')) {
        value = boundary === 'zero' ? '' : boundary === 'min' ? 'a' : 'z'.repeat(1000);
      } else if (lowerType.includes('array') || lowerType.includes('[]')) {
        value = boundary === 'zero' ? [] : boundary === 'min' ? [1] : Array(1000).fill(0);
      } else if (lowerType.includes('boolean')) {
        value = boundary === 'zero' ? false : true;
      } else {
        value = boundary === 'zero' ? null : { mock: boundary };
      }

      input[param.name] = value;
    }
    return input;
  }

  private getValidInput(fn: FunctionSignature): Record<string, unknown> {
    const input: Record<string, unknown> = {};
    for (const param of fn.parameters) {
      const lowerType = param.type.toLowerCase();

      if (lowerType.includes('number')) input[param.name] = 42;
      else if (lowerType.includes('string')) input[param.name] = 'valid-input';
      else if (lowerType.includes('boolean')) input[param.name] = true;
      else if (lowerType.includes('array') || lowerType.includes('[]'))
        input[param.name] = [1, 2, 3];
      else if (lowerType.includes('object') || lowerType.includes('{}'))
        input[param.name] = { id: 1 };
      else input[param.name] = null;
    }
    return input;
  }

  private getInvalidInput(fn: FunctionSignature): Record<string, unknown> {
    const input: Record<string, unknown> = {};
    for (const param of fn.parameters) {
      const lowerType = param.type.toLowerCase();

      if (lowerType.includes('number')) input[param.name] = 'not-a-number';
      else if (lowerType.includes('string')) input[param.name] = 12345;
      else if (lowerType.includes('boolean')) input[param.name] = 'true';
      else if (lowerType.includes('array') || lowerType.includes('[]'))
        input[param.name] = 'not-an-array';
      else input[param.name] = undefined;
    }
    return input;
  }

  private inferExpectedOutput(fn: FunctionSignature, scenario: string): unknown {
    const lowerType = fn.return_type.toLowerCase();

    if (scenario === 'invalid') return 'throw Error';
    if (lowerType.includes('void')) return undefined;
    if (lowerType.includes('string')) return 'expected-string';
    if (lowerType.includes('number')) return 0;
    if (lowerType.includes('boolean')) return true;
    if (lowerType.includes('array') || lowerType.includes('[]')) return [];
    if (lowerType.includes('promise')) return {};
    return null;
  }

  private generateFunctionEdgeCases(fn: FunctionSignature): EdgeCase[] {
    const cases: EdgeCase[] = [];

    for (const param of fn.parameters) {
      const lowerType = param.type.toLowerCase();

      if (lowerType.includes('number')) {
        cases.push(
          {
            description: `${fn.name}: ${param.name}${i18n.t('shared.test-generator.1_44')}`,
            input: { [param.name]: -1 },
            reason: i18n.t('shared.test-generator.k15'),
            expected_behavior: i18n.t('shared.test-generator.k16'),
          },
          {
            description: `${fn.name}: ${param.name}${i18n.t('shared.test-generator.0_45')}`,
            input: { [param.name]: 0 },
            reason: i18n.t('shared.test-generator.k17'),
            expected_behavior: i18n.t('shared.test-generator.k18'),
          },
          {
            description: `${fn.name}: ${param.name} = NaN`,
            input: { [param.name]: NaN },
            reason: i18n.t('shared.test-generator.nan_19'),
            expected_behavior: i18n.t('shared.test-generator.nan_20'),
          },
          {
            description: `${fn.name}: ${param.name} = Infinity`,
            input: { [param.name]: Infinity },
            reason: i18n.t('shared.test-generator.k21'),
            expected_behavior: i18n.t('shared.test-generator.k22'),
          }
        );
      }

      if (lowerType.includes('string')) {
        cases.push(
          {
            description: `${fn.name}: ${param.name}${i18n.t('shared.test-generator.k46')}`,
            input: { [param.name]: '' },
            reason: i18n.t('shared.test-generator.k23'),
            expected_behavior: i18n.t('shared.test-generator.k24'),
          },
          {
            description: `${fn.name}: ${param.name} = very long string`,
            input: { [param.name]: 'a'.repeat(10000) },
            reason: i18n.t('shared.test-generator.k25'),
            expected_behavior: i18n.t('shared.test-generator.k26'),
          },
          {
            description: `${fn.name}: ${param.name} = special characters`,
            input: { [param.name]: '<script>alert("xss")</script>' },
            reason: i18n.t('shared.test-generator.xss_27'),
            expected_behavior: i18n.t('shared.test-generator.k28'),
          }
        );
      }

      if (lowerType.includes('array') || lowerType.includes('[]')) {
        cases.push(
          {
            description: `${fn.name}: ${param.name}${i18n.t('shared.test-generator.k47')}`,
            input: { [param.name]: [] },
            reason: i18n.t('shared.test-generator.k29'),
            expected_behavior: i18n.t('shared.test-generator.k30'),
          },
          {
            description: `${fn.name}: ${param.name} = [null, undefined]`,
            input: { [param.name]: [null, undefined] },
            reason: i18n.t('shared.test-generator.k31'),
            expected_behavior: i18n.t('shared.test-generator.k32'),
          }
        );
      }
    }

    return cases;
  }

  private collectImports(
    request: TestGenerationRequest,
    _testCases: TestCase[],
    mockFunctions: MockFunctionDef[]
  ): string[] {
    const imports: string[] = [];
    const sourceBaseName = this.getBaseName(request.source_file);

    // 导入源文件
    if (request.test_type === TestType.UNIT || request.test_type === TestType.SNAPSHOT) {
      imports.push(
        `import { ${request.component_name ?? sourceBaseName} } from './${sourceBaseName}';`
      );
    }

    // 导入 Mock 依赖
    const mockModules = new Set(mockFunctions.map((m) => m.module));
    for (const mod of mockModules) {
      if (mod !== request.source_file) {
        imports.push(`// vi.mock('${mod}');`);
      }
    }

    // 快照测试需要额外导入
    if (request.test_type === TestType.SNAPSHOT) {
      imports.push("import renderer from 'react-test-renderer';");
    }

    return imports;
  }

  private estimateCoverage(testCases: TestCase[], request: TestGenerationRequest): number {
    const functions = request.function_signatures ?? this.extractFunctions(request.source_code);
    if (functions.length === 0) return 0;

    const testedFunctions = new Set<string>();
    for (const tc of testCases) {
      const match = tc.name.match(/^(\w+)\s/);
      if (match) testedFunctions.add(match[1]);
    }

    const functionCoverage = testedFunctions.size / functions.length;
    const caseBonus = Math.min(0.2, testCases.length * 0.02);

    return Math.min(100, Math.round((functionCoverage + caseBonus) * 100));
  }

  private getTestFilePath(request: TestGenerationRequest): string {
    const baseName = this.getBaseName(request.source_file);
    const suffix = TEST_FILE_SUFFIX[request.test_type];
    const ext = request.framework === TestFramework.PLAYWRIGHT ? 'ts' : 'ts';
    return `${baseName}${suffix}.${ext}`;
  }

  private dedupeTestCases(cases: TestCase[]): TestCase[] {
    const seen = new Set<string>();
    return cases.filter((c) => {
      const key = `${c.name}-${JSON.stringify(c.input)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private getBaseName(filePath: string): string {
    const parts = filePath.replace(/\\/g, '/').split('/');
    const fileName = parts[parts.length - 1];
    return fileName.replace(/\.[^.]+$/, '');
  }

  private getTestTypeName(type: TestType): string {
    const names: Record<TestType, string> = {
      [TestType.UNIT]: i18n.t('shared.test-generator.k33'),
      [TestType.INTEGRATION]: i18n.t('shared.test-generator.k34'),
      [TestType.SNAPSHOT]: i18n.t('shared.test-generator.k35'),
      [TestType.E2E]: i18n.t('shared.test-generator.k36'),
    };
    return names[type] ?? i18n.t('shared.test-generator.k37');
  }

  private getFrameworkName(framework: TestFramework): string {
    const names: Record<TestFramework, string> = {
      [TestFramework.JEST]: 'Jest',
      [TestFramework.VITEST]: 'Vitest',
      [TestFramework.PLAYWRIGHT]: 'Playwright',
      [TestFramework.REACTTESTINGLIBRARY]: 'React Testing Library',
    };
    return names[framework] ?? 'Vitest';
  }
}

// ============ 单例实例 ============

export const testGenerator = new TestGenerator();

export default testGenerator;
