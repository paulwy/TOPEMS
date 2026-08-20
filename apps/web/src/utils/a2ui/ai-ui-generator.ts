import i18n from '@/i18n';
/**
 * V50.0 前端 A2UI — AI UI Generator
 *
 * V63.5 F-9: 解决 TS2307 模块找不到错误。
 * V63.5: 完善 stub 类型签名与占位组件树结构。
 * V64.0+: 接入本地 ollama 模型（qwen2.5-coder:7b-dev），AI 驱动组件树生成；
 *         模型不可达或返回非法时降级为占位结构，不抛错。
 */

// ============ 枚举与类型定义 ============

enum UIGenerationMode {
  TEXTTOUI = 'text_to_ui',
  DESIGNTOUI = 'design_to_ui',
  SKETCHTOUI = 'sketch_to_ui',
}

enum LayoutStrategy {
  FLEXBOX = 'flexbox',
  GRID = 'grid',
  ABSOLUTE = 'absolute',
}

enum ComponentLevel {
  ATOM = 'atom',
  MOLECULE = 'molecule',
  ORGANISM = 'organism',
  TEMPLATE = 'template',
  PAGE = 'page',
}

export interface ThemeConfig {
  primary_color?: string;
  font_family?: string;
  mode?: 'light' | 'dark';
}

export interface ResponsiveBreakpoint {
  name: string;
  min_width?: number;
  max_width?: number;
}

export interface DesignConstraints {
  target_framework?: string;
  responsive?: boolean;
  theme?: ThemeConfig;
  breakpoints?: ResponsiveBreakpoint[];
}

export interface AccessibilityReport {
  score: number;
  issues: string[];
}

/**
 * 生成的组件结构 — 占位的组件树节点。
 * 后续接入真实 AI 生成 API 后将填充实际组件树。
 */
export interface GeneratedComponent {
  name: string;
  type: string;
  props: Record<string, unknown>;
  children: GeneratedComponent[];
}

export interface UIGenerationResult {
  component: string;
  component_tree: GeneratedComponent;
  mode: UIGenerationMode;
  layout: LayoutStrategy;
  level: ComponentLevel;
  accessibility: AccessibilityReport;
  suggestions: string[];
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

interface RawUIGenerationPayload {
  component?: unknown;
  component_tree?: unknown;
  mode?: unknown;
  layout?: unknown;
  level?: unknown;
  accessibility?: unknown;
  suggestions?: unknown;
}

// ============ 生成器 ============

/**
 * 生成选项 — AI 生成 UI 的输入参数。
 */
export interface GenerateOptions {
  prompt: string;
  mode?: UIGenerationMode;
  constraints?: DesignConstraints;
}

/** 向后兼容别名，等价于 GenerateOptions。 */
export type AIUIGenerationRequest = GenerateOptions;

/**
 * V64.0+ AI 驱动 UI 生成器。
 * 通过本地 ollama 模型生成组件树；模型不可达或返回非法时降级为占位结构，不抛错。
 */
class AIUIGenerator {
  async generate(request: GenerateOptions): Promise<UIGenerationResult> {
    const mode = request.mode ?? UIGenerationMode.TEXTTOUI;
    const fallback = this.buildFallback(request, mode);
    try {
      const prompt = this.buildPrompt(request, mode);
      const parsed = (await callOllama(prompt)) as RawUIGenerationPayload;
      if (!parsed || typeof parsed !== 'object') {
        console.warn(i18n.t('shared.ai-ui-generator.k0'));
        return fallback;
      }
      return this.coerceResult(parsed, request, mode);
    } catch (err) {
      console.warn(i18n.t('shared.ai-ui-generator.k1'), err);
      return fallback;
    }
  }

  private buildFallback(request: GenerateOptions, mode: UIGenerationMode): UIGenerationResult {
    return {
      component: '',
      component_tree: {
        name: 'PlaceholderRoot',
        type: 'Container',
        props: { prompt: request.prompt },
        children: [],
      },
      mode,
      layout: LayoutStrategy.FLEXBOX,
      level: ComponentLevel.MOLECULE,
      accessibility: { score: 100, issues: [] },
      suggestions: [i18n.t('shared.ai-ui-generator.k0')],
    };
  }

  private buildPrompt(request: GenerateOptions, mode: UIGenerationMode): string {
    const constraints = request.constraints ?? {};
    const framework = constraints.target_framework ?? 'react';
    const theme = constraints.theme ?? {};
    const responsive = constraints.responsive ?? true;
    return [
      'You are a senior frontend architect. Generate a UI component tree as STRICT JSON (no markdown).',
      `Input prompt: ${request.prompt}`,
      `Generation mode: ${mode}`,
      `Target framework: ${framework}`,
      `Responsive: ${responsive}`,
      `Theme: ${JSON.stringify(theme)}`,
      '',
      'Output JSON schema (fill every field):',
      '{',
      '  "component": "<PascalCase component name>",',
      '  "component_tree": {',
      '    "name": "<root node name>",',
      '    "type": "<Container|Layout|Card|Form|...>",',
      '    "props": { },',
      '    "children": [ { "name": "...", "type": "...", "props": {}, "children": [] } ]',
      '  },',
      `  "mode": "${mode}",`,
      '  "layout": "<flexbox|grid|absolute>",',
      '  "level": "<atom|molecule|organism|template|page>",',
      '  "accessibility": { "score": <0-100>, "issues": ["..."] },',
      '  "suggestions": ["<next-step improvement>", ...]',
      '}',
      'Return ONLY the JSON object.',
    ].join('\n');
  }

  private coerceResult(
    parsed: RawUIGenerationPayload,
    request: GenerateOptions,
    mode: UIGenerationMode
  ): UIGenerationResult {
    return {
      component: typeof parsed.component === 'string' ? parsed.component : '',
      component_tree: this.coerceTree(parsed.component_tree, request),
      mode,
      layout: this.coerceLayout(parsed.layout),
      level: this.coerceLevel(parsed.level),
      accessibility: this.coerceAccessibility(parsed.accessibility),
      suggestions: this.coerceSuggestions(parsed.suggestions, request),
    };
  }

  private coerceTree(node: unknown, request: GenerateOptions): GeneratedComponent {
    if (!node || typeof node !== 'object') {
      return {
        name: 'PlaceholderRoot',
        type: 'Container',
        props: { prompt: request.prompt },
        children: [],
      };
    }
    const raw = node as Record<string, unknown>;
    const children = Array.isArray(raw.children)
      ? raw.children.map((c) => this.coerceTree(c, request))
      : [];
    return {
      name: typeof raw.name === 'string' ? raw.name : 'Node',
      type: typeof raw.type === 'string' ? raw.type : 'Container',
      props:
        raw.props && typeof raw.props === 'object' ? (raw.props as Record<string, unknown>) : {},
      children,
    };
  }

  private coerceLayout(v: unknown): LayoutStrategy {
    switch (v) {
      case 'grid':
        return LayoutStrategy.GRID;
      case 'absolute':
        return LayoutStrategy.ABSOLUTE;
      case 'flexbox':
      default:
        return LayoutStrategy.FLEXBOX;
    }
  }

  private coerceLevel(v: unknown): ComponentLevel {
    switch (v) {
      case 'atom':
        return ComponentLevel.ATOM;
      case 'organism':
        return ComponentLevel.ORGANISM;
      case 'template':
        return ComponentLevel.TEMPLATE;
      case 'page':
        return ComponentLevel.PAGE;
      case 'molecule':
      default:
        return ComponentLevel.MOLECULE;
    }
  }

  private coerceAccessibility(v: unknown): AccessibilityReport {
    if (!v || typeof v !== 'object') {
      return { score: 100, issues: [] };
    }
    const raw = v as Record<string, unknown>;
    const score = typeof raw.score === 'number' ? raw.score : 100;
    const issues = Array.isArray(raw.issues)
      ? raw.issues.filter((s): s is string => typeof s === 'string')
      : [];
    return { score, issues };
  }

  private coerceSuggestions(v: unknown, request: GenerateOptions): string[] {
    if (Array.isArray(v)) {
      const filtered = v.filter((s): s is string => typeof s === 'string');
      if (filtered.length > 0) {
        return filtered;
      }
    }
    return [
      `${i18n.t('shared.ai-ui-generator.k2')}${request.prompt.slice(0, 40)}${i18n.t('shared.ai-ui-generator.ai_3')}`,
    ];
  }
}

const aiUiGenerator = new AIUIGenerator();

export default aiUiGenerator;
