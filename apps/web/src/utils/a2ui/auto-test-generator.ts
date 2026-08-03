/**
 * V50.0 前端 A2UI — Auto Test Generator
 *
 * V63.5 F-9: 解决 TS2307 模块找不到错误。
 * V63.5: 完善 stub 类型签名与占位测试用例结构。
 * V64.0+: 接入本地 ollama 模型（qwen2.5-coder:7b-dev），AI 驱动测试用例生成；
 *         模型不可达或返回非法时降级为占位结构，不抛错。
 */

// ============ 枚举与类型定义 ============

export enum TestGenerationStrategy {
  Unit = 'unit',
  Integration = 'integration',
  E2E = 'e2e',
}

export enum TestPriority {
  Critical = 'critical',
  High = 'high',
  Medium = 'medium',
  Low = 'low',
}

export enum MockType {
  Function = 'function',
  Module = 'module',
  Data = 'data',
}

export enum TestStatus {
  Pending = 'pending',
  Running = 'running',
  Passed = 'passed',
  Failed = 'failed',
  Skipped = 'skipped',
}

/**
 * 测试生成选项 — 自动测试生成的输入参数。
 */
export interface TestGenerationOptions {
  target_file: string;
  source_code?: string;
  strategy?: TestGenerationStrategy;
  framework?: string;
  priority?: TestPriority;
}

/** 向后兼容别名，等价于 TestGenerationOptions。 */
export type AutoTestRequest = TestGenerationOptions;

export interface TestCaseInfo {
  name: string;
  status: TestStatus;
  priority?: TestPriority;
  duration_ms?: number;
}

export interface MockDefinition {
  target: string;
  type: MockType;
  implementation?: unknown;
}

export interface CoverageEstimate {
  lines: number;
  branches: number;
  functions: number;
  statements: number;
}

/**
 * 生成的测试用例结构 — 占位的测试套件结构。
 * 后续接入真实测试生成 API 后将填充实际用例与 fixtures。
 */
export interface GeneratedTest {
  name: string;
  cases: TestCaseInfo[];
  fixtures: MockDefinition[];
}

export interface GeneratedTestSuite {
  file: string;
  tests: TestCaseInfo[];
  mocks: MockDefinition[];
  coverage: CoverageEstimate;
  test_code: string;
  generated_test: GeneratedTest;
}

// ============ Ollama 本地模型配置 ============

const OLLAMA_ENDPOINT = 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = 'qwen2.5-coder:7b-dev';
const OLLAMA_TIMEOUT_MS = 30_000;

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
  model?: string;
}

/**
 * 调用本地 ollama `/api/generate` 接口（stream=false, format=json）。
 * 失败时抛错，由调用方负责降级。
 */
async function callOllama(prompt: string): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
  try {
    const resp = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        format: 'json',
      }),
      signal: controller.signal,
    });
    if (!resp.ok) {
      throw new Error(`ollama HTTP ${resp.status}`);
    }
    const data = (await resp.json()) as OllamaGenerateResponse;
    const text = data?.response ?? '';
    if (!text) {
      throw new Error('ollama returned empty response');
    }
    return JSON.parse(text);
  } finally {
    clearTimeout(timeoutId);
  }
}

interface RawTestSuitePayload {
  file?: unknown;
  tests?: unknown;
  mocks?: unknown;
  coverage?: unknown;
  test_code?: unknown;
  generated_test?: unknown;
}

// ============ 生成器 ============

/**
 * V64.0+ AI 驱动测试用例生成器。
 * 通过本地 ollama 模型生成测试建议；模型不可达或返回非法时降级为占位结构，不抛错。
 */
export class AutoTestGenerator {
  async generate(request: TestGenerationOptions): Promise<GeneratedTestSuite> {
    const strategy = request.strategy ?? TestGenerationStrategy.Unit;
    const fallback = this.buildFallback(request, strategy);
    try {
      const prompt = this.buildPrompt(request, strategy);
      const parsed = (await callOllama(prompt)) as RawTestSuitePayload;
      if (!parsed || typeof parsed !== 'object') {
        console.warn('[a2ui] ollama 返回非对象 payload，降级为占位结构');
        return fallback;
      }
      return this.coerceResult(parsed, request, strategy);
    } catch (err) {
      console.warn('[a2ui] ollama 调用失败，降级为占位结构:', err);
      return fallback;
    }
  }

  private buildFallback(
    request: TestGenerationOptions,
    strategy: TestGenerationStrategy
  ): GeneratedTestSuite {
    return {
      file: request.target_file,
      tests: [],
      mocks: [],
      coverage: { lines: 0, branches: 0, functions: 0, statements: 0 },
      test_code: '',
      generated_test: {
        name: `PlaceholderSuite_${strategy}`,
        cases: [],
        fixtures: [],
      },
    };
  }

  private buildPrompt(
    request: TestGenerationOptions,
    strategy: TestGenerationStrategy
  ): string {
    const framework = request.framework ?? 'vitest';
    const priority = request.priority ?? TestPriority.Medium;
    const source = request.source_code ?? '(no source provided)';
    return [
      'You are a senior test engineer. Generate a test suite suggestion as STRICT JSON (no markdown).',
      `Target file: ${request.target_file}`,
      `Strategy: ${strategy}`,
      `Framework: ${framework}`,
      `Priority: ${priority}`,
      '',
      'Source code:',
      '```',
      source,
      '```',
      '',
      'Output JSON schema (fill every field):',
      '{',
      '  "file": "<target file path>",',
      '  "tests": [ { "name": "<test case name>", "status": "pending", "priority": "<critical|high|medium|low>", "duration_ms": <number> } ],',
      '  "mocks": [ { "target": "<module/function path>", "type": "<function|module|data>", "implementation": {} } ],',
      '  "coverage": { "lines": <0-100>, "branches": <0-100>, "functions": <0-100>, "statements": <0-100> },',
      '  "test_code": "<full generated test source code string>",',
      '  "generated_test": { "name": "<suite name>", "cases": [ { "name": "...", "status": "pending", "priority": "...", "duration_ms": 0 } ], "fixtures": [ { "target": "...", "type": "...", "implementation": {} } ] }',
      '}',
      'Return ONLY the JSON object.',
    ].join('\n');
  }

  private coerceResult(
    parsed: RawTestSuitePayload,
    request: TestGenerationOptions,
    strategy: TestGenerationStrategy
  ): GeneratedTestSuite {
    return {
      file: typeof parsed.file === 'string' ? parsed.file : request.target_file,
      tests: this.coerceTests(parsed.tests),
      mocks: this.coerceMocks(parsed.mocks),
      coverage: this.coerceCoverage(parsed.coverage),
      test_code: typeof parsed.test_code === 'string' ? parsed.test_code : '',
      generated_test: this.coerceGeneratedTest(parsed.generated_test, strategy),
    };
  }

  private coerceTests(v: unknown): TestCaseInfo[] {
    if (!Array.isArray(v)) return [];
    return v
      .map((item) => this.coerceTest(item))
      .filter((t): t is TestCaseInfo => t !== null);
  }

  private coerceTest(v: unknown): TestCaseInfo | null {
    if (!v || typeof v !== 'object') return null;
    const raw = v as Record<string, unknown>;
    if (typeof raw.name !== 'string' || !raw.name) return null;
    return {
      name: raw.name,
      status: this.coerceStatus(raw.status),
      priority: this.coercePriority(raw.priority),
      duration_ms: typeof raw.duration_ms === 'number' ? raw.duration_ms : undefined,
    };
  }

  private coerceMocks(v: unknown): MockDefinition[] {
    if (!Array.isArray(v)) return [];
    return v
      .map((item) => this.coerceMock(item))
      .filter((m): m is MockDefinition => m !== null);
  }

  private coerceMock(v: unknown): MockDefinition | null {
    if (!v || typeof v !== 'object') return null;
    const raw = v as Record<string, unknown>;
    if (typeof raw.target !== 'string' || !raw.target) return null;
    return {
      target: raw.target,
      type: this.coerceMockType(raw.type),
      implementation: raw.implementation,
    };
  }

  private coerceCoverage(v: unknown): CoverageEstimate {
    if (!v || typeof v !== 'object') {
      return { lines: 0, branches: 0, functions: 0, statements: 0 };
    }
    const raw = v as Record<string, unknown>;
    const num = (val: unknown): number =>
      typeof val === 'number' && val >= 0 ? val : 0;
    return {
      lines: num(raw.lines),
      branches: num(raw.branches),
      functions: num(raw.functions),
      statements: num(raw.statements),
    };
  }

  private coerceGeneratedTest(
    v: unknown,
    strategy: TestGenerationStrategy
  ): GeneratedTest {
    if (!v || typeof v !== 'object') {
      return { name: `PlaceholderSuite_${strategy}`, cases: [], fixtures: [] };
    }
    const raw = v as Record<string, unknown>;
    return {
      name: typeof raw.name === 'string' ? raw.name : `PlaceholderSuite_${strategy}`,
      cases: this.coerceTests(raw.cases),
      fixtures: this.coerceMocks(raw.fixtures),
    };
  }

  private coerceStatus(v: unknown): TestStatus {
    switch (v) {
      case 'running':
        return TestStatus.Running;
      case 'passed':
        return TestStatus.Passed;
      case 'failed':
        return TestStatus.Failed;
      case 'skipped':
        return TestStatus.Skipped;
      case 'pending':
      default:
        return TestStatus.Pending;
    }
  }

  private coercePriority(v: unknown): TestPriority {
    switch (v) {
      case 'critical':
        return TestPriority.Critical;
      case 'high':
        return TestPriority.High;
      case 'low':
        return TestPriority.Low;
      case 'medium':
      default:
        return TestPriority.Medium;
    }
  }

  private coerceMockType(v: unknown): MockType {
    switch (v) {
      case 'module':
        return MockType.Module;
      case 'data':
        return MockType.Data;
      case 'function':
      default:
        return MockType.Function;
    }
  }
}

export const autoTestGenerator = new AutoTestGenerator();

export default autoTestGenerator;
