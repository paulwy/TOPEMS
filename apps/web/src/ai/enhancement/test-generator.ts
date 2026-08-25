/**
 * V53.0 前端 AI 增强 — 自动化测试生成
 *
 * 提供智能测试用例生成能力：
 * - 组件测试生成 (React Testing Library)
 * - Hook 测试生成
 * - API 集成测试生成
 * - 边界场景检测与覆盖率分析
 * - Mock 数据生成
 * - 测试套件组织
 * - 断言策略选择
 */

export type TestFramework = 'jest' | 'vitest';
export type TestType = 'component' | 'hook' | 'api' | 'integration';
export type AssertionStrategy = 'rtl' | 'jest' | 'vitest';

export interface TestCase {
  name: string;
  description: string;
  given_when_then: {
    given: string[];
    when: string[];
    then: string[];
  };
  assertions: string[];
  priority: 'high' | 'medium' | 'low';
  category: 'rendering' | 'interaction' | 'data' | 'error' | 'accessibility';
}

export interface TestMethod {
  name: string;
  description: string;
  given_when_then: {
    given: string[];
    when: string[];
    then: string[];
  };
  assertions: string[];
}

export interface TestSuite {
  name: string;
  tests: TestMethod[];
  setup?: string[];
  teardown?: string[];
  coverage_target?: string;
}

export interface AnalysisResult {
  componentName: string;
  props: Array<{ name: string; type: string; required: boolean }>;
  stateHooks: string[];
  effects: string[];
  eventHandlers: string[];
  edgeCases: string[];
  coverage: {
    branches: number;
    statements: number;
    functions: number;
  };
}
