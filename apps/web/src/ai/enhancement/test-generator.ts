import i18n from '@/i18n';
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
  i18n.t('ai.test-generator.null_0'),
  i18n.t('ai.test-generator.undefined_0'),
  i18n.t('ai.test-generator.k1'),
  i18n.t('ai.test-generator.k2'),
  i18n.t('ai.test-generator.k3'),
  i18n.t('ai.test-generator.k4'),
  i18n.t('ai.test-generator.k5'),
  i18n.t('ai.test-generator.k6'),
  i18n.t('ai.test-generator.unicode_1'),
  i18n.t('ai.test-generator.html_2'),
  i18n.t('ai.test-generator.sql_3'),
  i18n.t('ai.test-generator.k7'),
  i18n.t('ai.test-generator.0maxmin_4'),
  i18n.t('ai.test-generator.k8'),
  i18n.t('ai.test-generator.k9'),
  i18n.t('ai.test-generator.k10'),
  i18n.t('ai.test-generator.k11'),
  i18n.t('ai.test-generator.k12'),
  i18n.t('ai.test-generator.k13'),
  i18n.t('ai.test-generator.k14'),
  i18n.t('ai.test-generator.k15'),
  i18n.t('ai.test-generator.dpiretina_16'),
  i18n.t('ai.test-generator.k17'),
  i18n.t('ai.test-generator.k18'),
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

    lines2.push(`  it(i18n.t('ai.test-generator.k19'), () => {`);
    lines2.push(`    render(<${componentName} ${props ? this.toPropsString(props) : ''} />);`);
    lines2.push(`    expect(screen).toBeDefined();`);
    lines2.push(`  });`);
    lines2.push('');

    lines2.push(`  it(i18n.t('ai.test-generator.props_20'), async () => {`);
    lines2.push(
      `    const { rerender } = render(<${componentName} ${props ? this.toPropsString(props) : ''} />);`
    );
    lines2.push(`    rerender(<${componentName} ${props ? this.toPropsString(props) : ''} />);`);
    lines2.push(`    await waitFor(() => {`);
    lines2.push(`      expect(screen).toBeDefined();`);
    lines2.push(`    });`);
    lines2.push(`  });`);
    lines2.push('');

    lines2.push(`  it(i18n.t('ai.test-generator.a11y_21'), async () => {`);
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
    lines.push(`  it(i18n.t('ai.test-generator.k22'), () => {`);
    lines.push(`    const { result } = renderHook(() => ${hookName}());`);
    lines.push(`    expect(result.current).toBeDefined();`);
    lines.push(`  });`);
    lines.push('');
    lines.push(`  it(i18n.t('ai.test-generator.k23'), () => {`);
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
    lines.push(`${i18n.t('ai.test-generator.it_5')}${endpoint}', async () => {`);
    lines.push(`    const result = await apiClient.${endpoint}();`);
    lines.push(`    expect(result).toBeDefined();`);
    lines.push(`  });`);
    lines.push('');
    lines.push(`  it(i18n.t('ai.test-generator.api_24'), async () => {`);
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
    const assertions: string[] = [
      i18n.t('ai.test-generator.k27'),
      i18n.t('ai.test-generator.k26'),
      i18n.t('ai.test-generator.dom_25'),
    ];

    const given: string[] = [
      `${i18n.t('ai.test-generator.k6')}${componentName}${i18n.t('ai.test-generator.k7')}`,
    ];
    const when: string[] = [i18n.t('ai.test-generator.k28')];
    const then: string[] = assertions.map((a) => `${i18n.t('ai.test-generator.k8')}${a}`);

    if (result?.props.length) {
      const requiredProps = result.props.filter((p) => p.required);
      if (requiredProps.length) {
        given.push(
          `${i18n.t('ai.test-generator.props_9')}${requiredProps.map((p) => p.name).join(', ')}`
        );
      }
    }

    return {
      name: i18n.t('ai.test-generator.k29'),
      description: `${i18n.t('ai.test-generator.k10')}${componentName}${i18n.t('ai.test-generator.k11')}`,
      given_when_then: { given, when, then },
      assertions,
    };
  }

  private generatePropTests(_componentName: string, result: AnalysisResult): TestMethod[] {
    const tests: TestMethod[] = [];

    for (const prop of result.props) {
      tests.push({
        name: `${i18n.t('ai.test-generator.k12')}${prop.name} prop`,
        description: `${i18n.t('ai.test-generator.k13')}${prop.name}${i18n.t('ai.test-generator.prop_14')}${prop.type}${prop.required ? i18n.t('ai.test-generator.k0') : ''}`,
        given_when_then: {
          given: [
            i18n.t('ai.test-generator.k0'),
            `${i18n.t('ai.test-generator.k15')}${prop.name} prop`,
          ],
          when: [i18n.t('ai.test-generator.prop_1')],
          then: [i18n.t('ai.test-generator.prop_2'), `{i18n.t('ai.test-generator.k4')}`],
        },
        assertions: [
          `prop ${prop.name}${i18n.t('ai.test-generator.k16')}`,
          prop.required ? i18n.t('ai.test-generator.prop_31') : i18n.t('ai.test-generator.prop_30'),
        ],
      });
    }

    return tests;
  }

  private generateInteractionTests(_componentName: string, result: AnalysisResult): TestMethod[] {
    const tests: TestMethod[] = [];

    for (const handler of result.eventHandlers) {
      tests.push({
        name: `${i18n.t('ai.test-generator.k17')}${handler}${i18n.t('ai.test-generator.k18')}`,
        description: `${i18n.t('ai.test-generator.k19')}${handler}${i18n.t('ai.test-generator.k20')}`,
        given_when_then: {
          given: [i18n.t('ai.test-generator.k5'), `${handler}${i18n.t('ai.test-generator.k21')}`],
          when: [`${i18n.t('ai.test-generator.k22')}${handler}${i18n.t('ai.test-generator.k23')}`],
          then: [i18n.t('ai.test-generator.k6'), `{i18n.t('ai.test-generator.k8')}`],
        },
        assertions: [
          `${handler}${i18n.t('ai.test-generator.k24')}`,
          i18n.t('ai.test-generator.k9'),
          `{i18n.t('ai.test-generator.k11')}`,
        ],
      });
    }

    if (result.stateHooks.length > 0) {
      tests.push({
        name: i18n.t('ai.test-generator.k32'),
        description: i18n.t('ai.test-generator.k33'),
        given_when_then: {
          given: [i18n.t('ai.test-generator.k35'), i18n.t('ai.test-generator.k34')],
          when: [i18n.t('ai.test-generator.k36')],
          then: [i18n.t('ai.test-generator.k37'), i18n.t('ai.test-generator.ui_25')],
        },
        assertions: [i18n.t('ai.test-generator.k39'), i18n.t('ai.test-generator.k38')],
      });
    }

    return tests;
  }

  private generateDataTests(_componentName: string, result: AnalysisResult): TestMethod[] {
    const tests: TestMethod[] = [];

    if (result.effects.length > 0) {
      tests.push({
        name: i18n.t('ai.test-generator.k40'),
        description: i18n.t('ai.test-generator.k41'),
        given_when_then: {
          given: [i18n.t('ai.test-generator.k42')],
          when: [i18n.t('ai.test-generator.k43')],
          then: [i18n.t('ai.test-generator.api_26'), i18n.t('ai.test-generator.k44')],
        },
        assertions: [
          i18n.t('ai.test-generator.k47'),
          i18n.t('ai.test-generator.k46'),
          i18n.t('ai.test-generator.k45'),
        ],
      });
    }

    return tests;
  }

  private generateErrorTests(_componentName: string, result: AnalysisResult): TestMethod[] {
    const tests: TestMethod[] = [];

    for (const edgeCase of result.edgeCases.slice(0, 5)) {
      tests.push({
        name: `${i18n.t('ai.test-generator.k27')}${edgeCase}`,
        description: `${i18n.t('ai.test-generator.k28')}${edgeCase}`,
        given_when_then: {
          given: [
            i18n.t('ai.test-generator.k12'),
            `${i18n.t('ai.test-generator.k29')}${edgeCase}${i18n.t('ai.test-generator.k30')}`,
          ],
          when: [i18n.t('ai.test-generator.k13')],
          then: [i18n.t('ai.test-generator.k49'), i18n.t('ai.test-generator.k48')],
        },
        assertions: [
          i18n.t('ai.test-generator.k51'),
          i18n.t('ai.test-generator.ui_31'),
          i18n.t('ai.test-generator.k50'),
        ],
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
      cases.push(
        i18n.t('ai.test-generator.k53'),
        i18n.t('ai.test-generator.k52'),
        i18n.t('ai.test-generator.api_32')
      );
    }

    if (/JSON\.parse|JSON\.stringify/.test(source)) {
      cases.push(i18n.t('ai.test-generator.json_55'), i18n.t('ai.test-generator.k54'));
    }

    if (/localStorage|sessionStorage/.test(source)) {
      cases.push(i18n.t('ai.test-generator.k57'), i18n.t('ai.test-generator.k56'));
    }

    if (/window\.|document\./.test(source)) {
      cases.push(i18n.t('ai.test-generator.ssr_33'), i18n.t('ai.test-generator.k58'));
    }

    if (/\?\.|\|\|/.test(source)) {
      cases.push(i18n.t('ai.test-generator.null_59'), i18n.t('ai.test-generator.undefined_34'));
    }

    if (/<input|<select|<textarea|<form/.test(source)) {
      cases.push(
        i18n.t('ai.test-generator.k62'),
        i18n.t('ai.test-generator.k61'),
        i18n.t('ai.test-generator.k60')
      );
    }

    return cases.length > 0
      ? cases
      : [i18n.t('ai.test-generator.k63'), i18n.t('ai.test-generator.props_35')];
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
