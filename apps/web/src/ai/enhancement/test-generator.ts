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

const COMMON_EDGE_CASES: string[] = [
  '空值/null 输入',
  'undefined 输入',
  '空字符串',
  '空数组',
  '空对象',
  '超大值',
  '负数',
  '特殊字符',
  'Unicode 字符',
  'HTML 注入尝试',
  'SQL 注入尝试',
  '超长文本',
  '边界数值 (0, MAX, MIN)',
  '并发操作',
  '网络错误',
  '超时场景',
  '权限不足',
  '未登录状态',
  '深色/浅色主题切换',
  '不同语言/区域设置',
  '屏幕尺寸变化 (响应式)',
  '高 DPI / Retina 屏幕',
  '无障碍辅助功能',
  '浏览器兼容性',
];

const MOCK_DATA_GENERATORS: Record<string, () => unknown> = {
  string: () => faker.random.string(),
  email: () => faker.internet.email(),
  phone: () => faker.phone.number(),
  number: () => faker.random.number(),
  date: () => faker.date.recent(),
  boolean: () => faker.random.boolean(),
  array: () => [],
  object: () => ({}),
  id: () => faker.random.uuid(),
};

const faker = {
  random: {
    string: () => Math.random().toString(36).substring(2, 10),
    number: () => Math.floor(Math.random() * 10000),
    boolean: () => Math.random() > 0.5,
    uuid: () =>
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }),
  },
  internet: {
    email: () => `user${Math.floor(Math.random() * 10000)}@example.com`,
  },
  phone: {
    number: () => `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
  },
  date: {
    recent: () => new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)),
  },
};

export class AutoTestGenerator {
  private framework: TestFramework;
  private assertionStrategy: AssertionStrategy;
  private analysisCache: Map<string, AnalysisResult> = new Map();

  constructor(framework: TestFramework = 'vitest', assertionStrategy: AssertionStrategy = 'rtl') {
    this.framework = framework;
    this.assertionStrategy = assertionStrategy;
  }

  setFramework(framework: TestFramework): void {
    this.framework = framework;
  }

  setAssertionStrategy(strategy: AssertionStrategy): void {
    this.assertionStrategy = strategy;
  }

  analyzeComponent(source: string, componentName: string): AnalysisResult {
    const result: AnalysisResult = {
      componentName,
      props: this.extractProps(source),
      stateHooks: this.extractStateHooks(source),
      effects: this.extractEffects(source),
      eventHandlers: this.extractEventHandlers(source),
      edgeCases: this.detectEdgeCases(source),
      coverage: this.estimateCoverage(source),
    };

    this.analysisCache.set(componentName, result);
    return result;
  }

  generateTestSuite(componentName: string, analysis?: AnalysisResult): TestSuite {
    const result = analysis ?? this.analysisCache.get(componentName);
    const tests: TestMethod[] = [];

    tests.push(this.generateRenderTest(componentName, result));

    if (result) {
      tests.push(...this.generatePropTests(componentName, result));
      tests.push(...this.generateInteractionTests(componentName, result));
      tests.push(...this.generateDataTests(componentName, result));
      tests.push(...this.generateErrorTests(componentName, result));
    }

    return {
      name: `${componentName} Test Suite`,
      tests,
      setup: this.generateSetup(),
      teardown: this.generateTeardown(),
      coverage_target: componentName,
    };
  }

  generateComponentTest(componentName: string, props?: Record<string, unknown>): string {
    const lines: string[] = [];
    const importFramework = this.framework === 'vitest' ? 'vitest' : '@testing-library/react';
    const rtlImport =
      this.framework === 'vitest' ? '@testing-library/react' : '@testing-library/react';

    lines.push(`import { describe, it, expect, vi, beforeEach } from '${importFramework}';`);
    lines.push(`import { render, screen, fireEvent, waitFor } from '${rtlImport}';`);
    lines.push(`import userEvent from '@testing-library/user-event';`);
    lines.push(`import { ${componentName} } from './${componentName}';`);
    lines.push('');

    const lines2: string[] = [];
    lines2.push(`describe('${componentName}', () => {`);
    lines2.push(`  beforeEach(() => {`);
    lines2.push(`    vi.clearAllMocks();`);
    lines2.push(`  });`);
    lines2.push('');

    lines2.push(`  it('应该正确渲染组件', () => {`);
    lines2.push(`    render(<${componentName} ${props ? this.toPropsString(props) : ''} />);`);
    lines2.push(`    expect(screen).toBeDefined();`);
    lines2.push(`  });`);
    lines2.push('');

    lines2.push(`  it('应该处理 props 变更', async () => {`);
    lines2.push(
      `    const { rerender } = render(<${componentName} ${props ? this.toPropsString(props) : ''} />);`
    );
    lines2.push(`    rerender(<${componentName} ${props ? this.toPropsString(props) : ''} />);`);
    lines2.push(`    await waitFor(() => {`);
    lines2.push(`      expect(screen).toBeDefined();`);
    lines2.push(`    });`);
    lines2.push(`  });`);
    lines2.push('');

    lines2.push(`  it('应该通过 a11y 检查', async () => {`);
    lines2.push(
      `    const { container } = render(<${componentName} ${props ? this.toPropsString(props) : ''} />);`
    );
    lines2.push(`    await expect(container).toBeAccessible();`);
    lines2.push(`  });`);
    lines2.push(`});`);

    return [...lines, ...lines2].join('\n');
  }

  generateHookTest(hookName: string): string {
    const lines: string[] = [];
    const importSource = this.framework === 'vitest' ? 'vitest' : '@testing-library/react';

    lines.push(`import { describe, it, expect, vi } from '${importSource}';`);
    lines.push(`import { renderHook, act } from '@testing-library/react';`);
    lines.push(`import { ${hookName} } from './${hookName}';`);
    lines.push('');
    lines.push(`describe('${hookName}', () => {`);
    lines.push(`  it('应该正确初始化', () => {`);
    lines.push(`    const { result } = renderHook(() => ${hookName}());`);
    lines.push(`    expect(result.current).toBeDefined();`);
    lines.push(`  });`);
    lines.push('');
    lines.push(`  it('应该处理状态更新', () => {`);
    lines.push(`    const { result } = renderHook(() => ${hookName}());`);
    lines.push(`    act(() => {`);
    lines.push(`      result.current.update?.();`);
    lines.push(`    });`);
    lines.push(`    expect(result.current).toBeDefined();`);
    lines.push(`  });`);
    lines.push(`});`);

    return lines.join('\n');
  }

  generateAPITest(moduleName: string, endpoint: string): string {
    const lines: string[] = [];
    const importSource = this.framework === 'vitest' ? 'vitest' : '@testing-library/react';

    lines.push(`import { describe, it, expect, vi, beforeEach } from '${importSource}';`);
    lines.push(`import { apiClient } from '@/api/client';`);
    lines.push('');
    lines.push(`describe('${moduleName} API', () => {`);
    lines.push(`  beforeEach(() => {`);
    lines.push(`    vi.spyOn(apiClient, '${endpoint}').mockResolvedValue({});`);
    lines.push(`  });`);
    lines.push('');
    lines.push(`  it('应该成功调用 ${endpoint}', async () => {`);
    lines.push(`    const result = await apiClient.${endpoint}();`);
    lines.push(`    expect(result).toBeDefined();`);
    lines.push(`  });`);
    lines.push('');
    lines.push(`  it('应该处理 API 错误', async () => {`);
    lines.push(`    vi.spyOn(apiClient, '${endpoint}').mockRejectedValue(new Error('API Error'));`);
    lines.push(`    await expect(apiClient.${endpoint}()).rejects.toThrow('API Error');`);
    lines.push(`  });`);
    lines.push(`});`);

    return lines.join('\n');
  }

  generateMockData(type: string, schema?: Record<string, unknown>): unknown {
    if (schema) {
      return this.generateMockFromSchema(schema);
    }
    const generator = MOCK_DATA_GENERATORS[type];
    return generator ? generator() : null;
  }

  getEdgeCases(): string[] {
    return [...COMMON_EDGE_CASES];
  }

  getAnalysis(componentName: string): AnalysisResult | undefined {
    return this.analysisCache.get(componentName);
  }

  private generateRenderTest(componentName: string, result?: AnalysisResult): TestMethod {
    const assertions: string[] = ['组件正常渲染', '不应抛出错误', '基本 DOM 结构正确'];

    const given: string[] = [`已渲染 <${componentName} /> 组件`];
    const when: string[] = ['组件挂载完成'];
    const then: string[] = assertions.map((a) => `验证：${a}`);

    if (result?.props.length) {
      const requiredProps = result.props.filter((p) => p.required);
      if (requiredProps.length) {
        given.push(`提供必要 props: ${requiredProps.map((p) => p.name).join(', ')}`);
      }
    }

    return {
      name: '应该正确渲染',
      description: `验证 ${componentName} 基本渲染功能`,
      given_when_then: { given, when, then },
      assertions,
    };
  }

  private generatePropTests(_componentName: string, result: AnalysisResult): TestMethod[] {
    const tests: TestMethod[] = [];

    for (const prop of result.props) {
      tests.push({
        name: `应该接受 ${prop.name} prop`,
        description: `验证 ${prop.name} prop 类型: ${prop.type}${prop.required ? ' (必填)' : ''}`,
        given_when_then: {
          given: [`组件已渲染`, `传入 ${prop.name} prop`],
          when: [`Prop 值传递给组件`],
          then: [`正确渲染 prop 值`, `不应产生警告`],
        },
        assertions: [
          `prop ${prop.name} 被正确接收`,
          prop.required ? '缺少必填 prop 时应有警告' : '可选 prop 缺失时正常工作',
        ],
      });
    }

    return tests;
  }

  private generateInteractionTests(_componentName: string, result: AnalysisResult): TestMethod[] {
    const tests: TestMethod[] = [];

    for (const handler of result.eventHandlers) {
      tests.push({
        name: `应该响应 ${handler} 事件`,
        description: `验证 ${handler} 事件处理器正确触发`,
        given_when_then: {
          given: [`组件已渲染`, `${handler} 处理器已注册`],
          when: [`用户触发 ${handler} 对应的交互`],
          then: [`处理器被调用`, `参数正确传递`],
        },
        assertions: [`${handler} 处理器被调用`, `调用次数正确`, `参数符合预期`],
      });
    }

    if (result.stateHooks.length > 0) {
      tests.push({
        name: '应该正确管理状态',
        description: '验证状态更新逻辑',
        given_when_then: {
          given: ['组件已渲染', '初始状态已设定'],
          when: ['触发状态变更操作'],
          then: ['状态正确更新', 'UI 响应状态变化'],
        },
        assertions: ['状态值正确', '渲染结果与状态一致'],
      });
    }

    return tests;
  }

  private generateDataTests(_componentName: string, result: AnalysisResult): TestMethod[] {
    const tests: TestMethod[] = [];

    if (result.effects.length > 0) {
      tests.push({
        name: '应该正确执行副作用',
        description: '验证 useEffect/useLayoutEffect 正确执行',
        given_when_then: {
          given: ['组件已挂载'],
          when: ['副作用触发'],
          then: ['API 调用正确', '数据正确获取'],
        },
        assertions: ['数据获取成功', '加载状态正确', '错误处理正确'],
      });
    }

    return tests;
  }

  private generateErrorTests(_componentName: string, result: AnalysisResult): TestMethod[] {
    const tests: TestMethod[] = [];

    for (const edgeCase of result.edgeCases.slice(0, 5)) {
      tests.push({
        name: `应该处理 ${edgeCase}`,
        description: `边界场景测试: ${edgeCase}`,
        given_when_then: {
          given: [`组件已渲染`, `模拟 ${edgeCase} 场景`],
          when: [`触发边界条件`],
          then: ['组件不崩溃', '显示适当错误信息或降级'],
        },
        assertions: ['无未捕获错误', 'UI 保持可用', '用户体验可接受'],
      });
    }

    return tests;
  }

  private generateSetup(): string[] {
    if (this.framework === 'vitest') {
      return [
        'import { beforeEach, vi } from "vitest";',
        'beforeEach(() => { vi.clearAllMocks(); });',
      ];
    }
    return [
      'import { beforeEach, jest } from "@jest/globals";',
      'beforeEach(() => { jest.clearAllMocks(); });',
    ];
  }

  private generateTeardown(): string[] {
    return ['afterEach(() => { cleanup(); });'];
  }

  private toPropsString(props: Record<string, unknown>): string {
    return Object.entries(props)
      .map(([key, value]) => {
        if (typeof value === 'string') return `${key}="${value}"`;
        if (typeof value === 'boolean') return value ? key : `${key}={false}`;
        return `${key}={${JSON.stringify(value)}}`;
      })
      .join(' ');
  }

  private extractProps(source: string): Array<{ name: string; type: string; required: boolean }> {
    const props: Array<{ name: string; type: string; required: boolean }> = [];
    const interfaceMatch = source.match(/interface\s+(\w+Props)\s*\{([^}]*)\}/s);

    if (interfaceMatch) {
      const body = interfaceMatch[2];
      const propRegex = /(\w+)(\??)\s*:\s*([^;]+)/g;
      let match: RegExpExecArray | null;
      while ((match = propRegex.exec(body)) !== null) {
        props.push({
          name: match[1],
          type: match[3].trim(),
          required: match[2] !== '?',
        });
      }
    }

    return props;
  }

  private extractStateHooks(source: string): string[] {
    const hooks: string[] = [];
    const regex = /useState<?([^>;\s]*?)>?\s*\(/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(source)) !== null) {
      hooks.push(`useState<${match[1] || 'unknown'}>`);
    }
    return hooks;
  }

  private extractEffects(source: string): string[] {
    const effects: string[] = [];
    const regex = /useEffect\s*\(/g;
    const matches = source.match(regex);
    if (matches) {
      for (let i = 0; i < matches.length; i++) {
        effects.push(`useEffect #${i + 1}`);
      }
    }
    return effects;
  }

  private extractEventHandlers(source: string): string[] {
    const handlers: string[] = [];
    const patterns = [/on(\w+)\s*=/g, /handle(\w+)\s*=/g, /(\w+)\s*=>\s*\{/g];

    for (const pattern of patterns) {
      const matches = source.match(pattern);
      if (matches) {
        for (const match of matches) {
          handlers.push(match.replace(/\s*[=:].*$/, ''));
        }
      }
    }

    return [...new Set(handlers)];
  }

  private detectEdgeCases(source: string): string[] {
    const cases: string[] = [];

    if (/fetch\(|axios\.|apiClient\./.test(source)) {
      cases.push('网络错误', '超时场景', 'API 错误响应');
    }

    if (/JSON\.parse|JSON\.stringify/.test(source)) {
      cases.push('无效 JSON', '大数据量序列化');
    }

    if (/localStorage|sessionStorage/.test(source)) {
      cases.push('存储空间不足', '隐私模式');
    }

    if (/window\.|document\./.test(source)) {
      cases.push('SSR 环境', '浏览器兼容性');
    }

    if (/\?\.|\|\|/.test(source)) {
      cases.push('空值/null 输入', 'undefined 输入');
    }

    if (/<input|<select|<textarea|<form/.test(source)) {
      cases.push('表单验证', '无效输入', '特殊字符');
    }

    return cases.length > 0 ? cases : ['基本渲染', 'Props 变更'];
  }

  private estimateCoverage(source: string): {
    branches: number;
    statements: number;
    functions: number;
  } {
    const lines = source.split('\n').length;
    const ifCount = (source.match(/\bif\b/g) || []).length;
    const ternaryCount = (source.match(/\?\s*[^:]+:/g) || []).length;
    const switchCount = (source.match(/\bswitch\b/g) || []).length;
    const forCount = (source.match(/\bfor\b|\bwhile\b|\.map\(|\.filter\(|\.reduce\(/g) || [])
      .length;
    const funcCount = (source.match(/function\s+|=>\s*[{(]/g) || []).length;

    const branches = ifCount * 2 + ternaryCount * 2 + switchCount + forCount;
    const statements = Math.floor(lines * 0.7);
    const functions = funcCount;

    return {
      branches,
      statements,
      functions,
    };
  }

  private generateMockFromSchema(schema: Record<string, unknown>): unknown {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schema)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.generateMockFromSchema(value as Record<string, unknown>);
      } else {
        result[key] = this.generateMockData(String(value));
      }
    }
    return result;
  }
}

export const autoTestGenerator = new AutoTestGenerator();

export default autoTestGenerator;
