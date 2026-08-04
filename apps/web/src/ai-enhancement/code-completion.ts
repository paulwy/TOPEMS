/**
 * V53.0 前端 AI 增强 — 智能代码补全
 *
 * 提供上下文感知的代码智能补全能力：
 * - 组件 Props / API 类型提示
 * - 基于项目结构的自动导入建议
 * - TypeScript 类型推断
 * - React Hooks 使用建议
 * - 常用代码片段库
 * - 多语言支持 (TypeScript, CSS, JSON)
 */

export enum CompletionKind {
  SNIPPET = 'snippet',
  PROPERTY = 'property',
  FUNCTION = 'function',
  IMPORT = 'import',
  KEYWORD = 'keyword',
  VARIABLE = 'variable',
  TYPE = 'type',
  SNIPPETPLACEHOLDER = 'snippet-placeholder',
}

export interface CompletionContext {
  file: string;
  position: { line: number; character: number };
  trigger_char?: string;
  scope?: string;
  language: 'typescript' | 'css' | 'json';
  content?: string;
  cursor_word?: string;
  imports?: Array<{ path: string; items: string[] }>;
  schema?: Record<string, unknown>;
}

export interface CompletionItem {
  label: string;
  kind: CompletionKind;
  detail?: string;
  insert_text: string;
  sort_order: number;
  documentation?: string;
  deprecated?: boolean;
  preselect?: boolean;
  additional_text?: string;
  filter_text?: string;
  symbol_name?: string;
  symbol_kind?: string;
  text_edit?: {
    range: { start: { line: number; character: number }; end: { line: number; character: number } };
    new_text: string;
  };
}

export interface SnippetDefinition {
  id: string;
  label: string;
  description: string;
  language: string;
  kind: CompletionKind;
  template: string;
  placeholders: Array<{ name: string; default_value?: string }>;
  sort_order: number;
  category: 'react' | 'typescript' | 'css' | 'json' | 'testing';
}

export interface ComponentPropInfo {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  default_value?: unknown;
  deprecated?: boolean;
}

export interface APIEndpointInfo {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  request_type?: string;
  response_type?: string;
}

const REACT_SNIPPETS: SnippetDefinition[] = [
  {
    id: 'v53-rfc',
    label: 'React Function Component',
    description: '创建一个 React 函数组件',
    language: 'typescript',
    kind: CompletionKind.SNIPPET,
    template: `interface \${1:ComponentName}Props {
  \${2:children}: React.ReactNode;
}

export function \${1:ComponentName}({ \${2:children} }: \${1:ComponentName}Props) {
  return (
    <div>
      \${0}
    </div>
  );
}`,
    placeholders: [
      { name: 'ComponentName' },
      { name: 'children', default_value: 'React.ReactNode' },
    ],
    sort_order: 100,
    category: 'react',
  },
  {
    id: 'v53-use-state',
    label: 'useState Hook',
    description: '创建 useState 状态钩子',
    language: 'typescript',
    kind: CompletionKind.SNIPPET,
    template: `const [\${1:state}, set\${1:State}] = useState<\${2:type}>(\${3:initialValue});`,
    placeholders: [{ name: 'state' }, { name: 'type' }, { name: 'initialValue' }],
    sort_order: 200,
    category: 'react',
  },
  {
    id: 'v53-use-effect',
    label: 'useEffect Hook',
    description: '创建 useEffect 副作用钩子',
    language: 'typescript',
    kind: CompletionKind.SNIPPET,
    template: `useEffect(() => {
  \${0}
  return () => {
    // cleanup
  };
}, [\${1:deps}]);`,
    placeholders: [{ name: 'deps' }],
    sort_order: 210,
    category: 'react',
  },
  {
    id: 'v53-use-callback',
    label: 'useCallback Hook',
    description: '创建 useCallback 记忆化回调',
    language: 'typescript',
    kind: CompletionKind.SNIPPET,
    template: `const \${1:callback} = useCallback((\${2:params}) => {
  \${0}
}, [\${3:deps}]);`,
    placeholders: [{ name: 'callback' }, { name: 'params' }, { name: 'deps' }],
    sort_order: 220,
    category: 'react',
  },
  {
    id: 'v53-use-memo',
    label: 'useMemo Hook',
    description: '创建 useMemo 记忆化值',
    language: 'typescript',
    kind: CompletionKind.SNIPPET,
    template: `const \${1:memoValue} = useMemo(() => {
  \${0}
}, [\${2:deps}]);`,
    placeholders: [{ name: 'memoValue' }, { name: 'deps' }],
    sort_order: 230,
    category: 'react',
  },
  {
    id: 'v53-use-ref',
    label: 'useRef Hook',
    description: '创建 useRef 引用钩子',
    language: 'typescript',
    kind: CompletionKind.SNIPPET,
    template: `const \${1:ref} = useRef<\${2:type}>(\${3:initialValue});`,
    placeholders: [{ name: 'ref' }, { name: 'type' }, { name: 'initialValue' }],
    sort_order: 240,
    category: 'react',
  },
  {
    id: 'v53-use-query',
    label: 'useQuery (TanStack Query)',
    description: '创建 TanStack Query 数据查询钩子',
    language: 'typescript',
    kind: CompletionKind.SNIPPET,
    template: `const { data, isLoading, error } = useQuery({
  queryKey: ['\${1:key}'],
  queryFn: () => \${2:fetchFn}(),
});`,
    placeholders: [{ name: 'key' }, { name: 'fetchFn' }],
    sort_order: 300,
    category: 'react',
  },
  {
    id: 'v53-use-mutation',
    label: 'useMutation (TanStack Query)',
    description: '创建 TanStack Query 数据变更钩子',
    language: 'typescript',
    kind: CompletionKind.SNIPPET,
    template: `const { mutate, isPending } = useMutation({
  mutationFn: (\${1:vars}) => \${2:apiFn}(\${1:vars}),
  onSuccess: (data) => {
    \${0}
  },
});`,
    placeholders: [{ name: 'vars' }, { name: 'apiFn' }],
    sort_order: 310,
    category: 'react',
  },
];

const TYPESCRIPT_SNIPPETS: SnippetDefinition[] = [
  {
    id: 'v53-interface',
    label: 'Interface',
    description: '定义 TypeScript 接口',
    language: 'typescript',
    kind: CompletionKind.SNIPPET,
    template: `interface \${1:Name} {
  \${2:property}: \${3:type};
  \${0}
}`,
    placeholders: [{ name: 'Name' }, { name: 'property' }, { name: 'type' }],
    sort_order: 100,
    category: 'typescript',
  },
  {
    id: 'v53-type-alias',
    label: 'Type Alias',
    description: '定义 TypeScript 类型别名',
    language: 'typescript',
    kind: CompletionKind.SNIPPET,
    template: `type \${1:Name} = \${2:type};`,
    placeholders: [{ name: 'Name' }, { name: 'type' }],
    sort_order: 110,
    category: 'typescript',
  },
  {
    id: 'v53-enum',
    label: 'Enum',
    description: '定义 TypeScript 枚举',
    language: 'typescript',
    kind: CompletionKind.SNIPPET,
    template: `enum \${1:Name} {
  \${2:Member} = '\${2:Member}',
  \${0}
}`,
    placeholders: [{ name: 'Name' }, { name: 'Member' }],
    sort_order: 120,
    category: 'typescript',
  },
  {
    id: 'v53-async-function',
    label: 'Async Function',
    description: '定义异步函数',
    language: 'typescript',
    kind: CompletionKind.SNIPPET,
    template: `async function \${1:name}(\${2:params}): Promise<\${3:type}> {
  \${0}
}`,
    placeholders: [{ name: 'name' }, { name: 'params' }, { name: 'type' }],
    sort_order: 130,
    category: 'typescript',
  },
  {
    id: 'v53-generic-function',
    label: 'Generic Function',
    description: '定义泛型函数',
    language: 'typescript',
    kind: CompletionKind.SNIPPET,
    template: `function \${1:name}<\${2:T}>(\${3:arg}: \${2:T}): \${2:T} {
  \${0}
  return \${3:arg};
}`,
    placeholders: [{ name: 'name' }, { name: 'T' }, { name: 'arg' }],
    sort_order: 140,
    category: 'typescript',
  },
  {
    id: 'v53-import-type',
    label: 'Import Type',
    description: '导入类型定义',
    language: 'typescript',
    kind: CompletionKind.SNIPPET,
    template: `import type { \${1:Type} } from '\${2:path}';`,
    placeholders: [{ name: 'Type' }, { name: 'path' }],
    sort_order: 150,
    category: 'typescript',
  },
  {
    id: 'v53-zod-schema',
    label: 'Zod Schema',
    description: '定义 Zod 验证模式',
    language: 'typescript',
    kind: CompletionKind.SNIPPET,
    template: `const \${1:schema} = z.object({
  \${2:field}: z.\${3:string}(),
  \${0}
});`,
    placeholders: [{ name: 'schema' }, { name: 'field' }, { name: 'string' }],
    sort_order: 160,
    category: 'typescript',
  },
];

const CSS_SNIPPETS: SnippetDefinition[] = [
  {
    id: 'v53-css-flex',
    label: 'Flexbox Layout',
    description: '创建 Flexbox 布局容器',
    language: 'css',
    kind: CompletionKind.SNIPPET,
    template: `display: flex;
flex-direction: \${1:row};
justify-content: \${2:flex-start};
align-items: \${3:stretch};
gap: \${4:8px};`,
    placeholders: [
      { name: 'row', default_value: 'row' },
      { name: 'flex-start', default_value: 'flex-start' },
      { name: 'stretch', default_value: 'stretch' },
      { name: '8px', default_value: '8px' },
    ],
    sort_order: 100,
    category: 'css',
  },
  {
    id: 'v53-css-grid',
    label: 'Grid Layout',
    description: '创建 Grid 网格布局',
    language: 'css',
    kind: CompletionKind.SNIPPET,
    template: `display: grid;
grid-template-columns: \${1:repeat(12, 1fr)};
gap: \${2:8px};
grid-template-areas: \${3:header};`,
    placeholders: [{ name: 'repeat(12, 1fr)' }, { name: '8px' }, { name: 'header' }],
    sort_order: 110,
    category: 'css',
  },
  {
    id: 'v53-css-responsive',
    label: 'Responsive Breakpoint',
    description: '响应式断点媒体查询',
    language: 'css',
    kind: CompletionKind.SNIPPET,
    template: `@media (max-width: \${1:768px}) {
  \${0}
}`,
    placeholders: [{ name: '768px' }],
    sort_order: 200,
    category: 'css',
  },
];

const JSON_SNIPPETS: SnippetDefinition[] = [
  {
    id: 'v53-json-api-response',
    label: 'API Response Schema',
    description: 'API 响应 JSON 结构',
    language: 'json',
    kind: CompletionKind.SNIPPET,
    template: `{
  "code": \${1:200},
  "message": "\${2:success}",
  "data": \${3:{}},
  "timestamp": "\${4:2024-01-01T00:00:00Z}"
}`,
    placeholders: [
      { name: '200' },
      { name: 'success' },
      { name: '{}' },
      { name: '2024-01-01T00:00:00Z' },
    ],
    sort_order: 100,
    category: 'json',
  },
];

const ALL_SNIPPETS: SnippetDefinition[] = [
  ...REACT_SNIPPETS,
  ...TYPESCRIPT_SNIPPETS,
  ...CSS_SNIPPETS,
  ...JSON_SNIPPETS,
];

const COMMON_TYPESCRIPT_KEYWORDS: Array<{
  label: string;
  kind: CompletionKind;
  detail: string;
  insert_text: string;
}> = [
  { label: 'import', kind: CompletionKind.KEYWORD, detail: '导入模块', insert_text: 'import ' },
  { label: 'export', kind: CompletionKind.KEYWORD, detail: '导出声明', insert_text: 'export ' },
  {
    label: 'interface',
    kind: CompletionKind.KEYWORD,
    detail: '接口声明',
    insert_text: 'interface ',
  },
  { label: 'type', kind: CompletionKind.KEYWORD, detail: '类型别名', insert_text: 'type ' },
  { label: 'class', kind: CompletionKind.KEYWORD, detail: '类声明', insert_text: 'class ' },
  { label: 'function', kind: CompletionKind.KEYWORD, detail: '函数声明', insert_text: 'function ' },
  { label: 'const', kind: CompletionKind.KEYWORD, detail: '常量声明', insert_text: 'const ' },
  { label: 'let', kind: CompletionKind.KEYWORD, detail: '变量声明', insert_text: 'let ' },
  { label: 'var', kind: CompletionKind.KEYWORD, detail: '变量声明 (旧式)', insert_text: 'var ' },
  { label: 'return', kind: CompletionKind.KEYWORD, detail: '返回值', insert_text: 'return ' },
  { label: 'async', kind: CompletionKind.KEYWORD, detail: '异步修饰符', insert_text: 'async ' },
  { label: 'await', kind: CompletionKind.KEYWORD, detail: '等待异步操作', insert_text: 'await ' },
  { label: 'extends', kind: CompletionKind.KEYWORD, detail: '继承', insert_text: 'extends ' },
  {
    label: 'implements',
    kind: CompletionKind.KEYWORD,
    detail: '实现接口',
    insert_text: 'implements ',
  },
  {
    label: 'namespace',
    kind: CompletionKind.KEYWORD,
    detail: '命名空间',
    insert_text: 'namespace ',
  },
  { label: 'declare', kind: CompletionKind.KEYWORD, detail: '声明', insert_text: 'declare ' },
];

const COMMON_REACT_HOOKS: Array<{ label: string; detail: string; insert_text: string }> = [
  { label: 'useState', detail: '状态管理钩子', insert_text: 'useState' },
  { label: 'useEffect', detail: '副作用钩子', insert_text: 'useEffect' },
  { label: 'useCallback', detail: '记忆化回调', insert_text: 'useCallback' },
  { label: 'useMemo', detail: '记忆化值', insert_text: 'useMemo' },
  { label: 'useRef', detail: '引用钩子', insert_text: 'useRef' },
  { label: 'useContext', detail: '上下文钩子', insert_text: 'useContext' },
  { label: 'useReducer', detail: 'Reducer 钩子', insert_text: 'useReducer' },
  { label: 'useImperativeHandle', detail: '命令式句柄', insert_text: 'useImperativeHandle' },
  { label: 'useLayoutEffect', detail: '布局副作用', insert_text: 'useLayoutEffect' },
  { label: 'useDebugValue', detail: '调试值', insert_text: 'useDebugValue' },
  { label: 'useDeferredValue', detail: '延迟值', insert_text: 'useDeferredValue' },
  { label: 'useTransition', detail: '过渡钩子', insert_text: 'useTransition' },
  { label: 'useId', detail: '唯一 ID 钩子', insert_text: 'useId' },
];

const TYPE_PROPERTY_MAP: Record<string, Array<{ name: string; type: string }>> = {
  string: [
    { name: 'length', type: 'number' },
    { name: 'charAt', type: '(index: number) => string' },
    { name: 'indexOf', type: '(searchString: string, position?: number) => number' },
    { name: 'lastIndexOf', type: '(searchString: string, position?: number) => number' },
    { name: 'slice', type: '(start?: number, end?: number) => string' },
    { name: 'substring', type: '(start: number, end?: number) => string' },
    { name: 'toUpperCase', type: '() => string' },
    { name: 'toLowerCase', type: '() => string' },
    { name: 'trim', type: '() => string' },
    { name: 'split', type: '(separator: string | RegExp) => string[]' },
    { name: 'replace', type: '(searchValue: string | RegExp, replaceValue: string) => string' },
    { name: 'match', type: '(regexp: RegExp) => RegExpMatchArray | null' },
    { name: 'startsWith', type: '(searchString: string) => boolean' },
    { name: 'endsWith', type: '(searchString: string) => boolean' },
    { name: 'includes', type: '(searchString: string) => boolean' },
  ],
  number: [
    { name: 'toFixed', type: '(digits?: number) => string' },
    { name: 'toString', type: '(radix?: number) => string' },
    { name: 'toPrecision', type: '(precision?: number) => string' },
    { name: 'toExponential', type: '(fractionDigits?: number) => string' },
  ],
  boolean: [
    { name: 'toString', type: '() => string' },
    { name: 'valueOf', type: '() => boolean' },
  ],
  array: [
    { name: 'length', type: 'number' },
    { name: 'push', type: '(...items: T[]) => number' },
    { name: 'pop', type: '() => T | undefined' },
    { name: 'shift', type: '() => T | undefined' },
    { name: 'unshift', type: '(...items: T[]) => number' },
    { name: 'slice', type: '(start?: number, end?: number) => T[]' },
    { name: 'splice', type: '(start: number, deleteCount?: number, ...items: T[]) => T[]' },
    { name: 'map', type: '(callback: (value: T, index: number, array: T[]) => U) => U[]' },
    { name: 'filter', type: '(callback: (value: T, index: number, array: T[]) => boolean) => T[]' },
    {
      name: 'reduce',
      type: '(callback: (accumulator: U, value: T, index: number, array: T[]) => U, initialValue: U) => U',
    },
    { name: 'forEach', type: '(callback: (value: T, index: number, array: T[]) => void) => void' },
    {
      name: 'find',
      type: '(callback: (value: T, index: number, array: T[]) => boolean) => T | undefined',
    },
    {
      name: 'some',
      type: '(callback: (value: T, index: number, array: T[]) => boolean) => boolean',
    },
    {
      name: 'every',
      type: '(callback: (value: T, index: number, array: T[]) => boolean) => boolean',
    },
    { name: 'includes', type: '(searchElement: T, fromIndex?: number) => boolean' },
    { name: 'indexOf', type: '(searchElement: T, fromIndex?: number) => number' },
  ],
  promise: [
    {
      name: 'then',
      type: '<TResult = T>(onfulfilled?: (value: T) => TResult | PromiseLike<TResult>, onrejected?: (reason: unknown) => TResult | PromiseLike<TResult>) => Promise<TResult>',
    },
    {
      name: 'catch',
      type: '<TResult = never>(onrejected?: (reason: unknown) => TResult | PromiseLike<TResult>) => Promise<T | TResult>',
    },
    { name: 'finally', type: '(onfinally?: () => void) => Promise<T>' },
  ],
  object: [
    { name: 'keys', type: '(o: object) => string[]' },
    { name: 'values', type: '(o: object) => any[]' },
    { name: 'entries', type: '(o: object) => [string, any][]' },
    { name: 'hasOwnProperty', type: '(v: PropertyKey) => boolean' },
    { name: 'toString', type: '() => string' },
  ],
};

export class IntelligentCodeCompletion {
  private snippets: Map<string, SnippetDefinition>;
  private componentProps: Map<string, ComponentPropInfo[]>;
  private apiEndpoints: Map<string, APIEndpointInfo[]>;
  private projectImports: Map<string, Set<string>>;
  private history: Array<{ context: CompletionContext; item: CompletionItem; accepted: boolean }> =
    [];
  private maxHistorySize = 500;

  constructor() {
    this.snippets = new Map(ALL_SNIPPETS.map((s) => [s.id, s]));
    this.componentProps = new Map();
    this.apiEndpoints = new Map();
    this.projectImports = new Map();
  }

  async getCompletions(context: CompletionContext): Promise<CompletionItem[]> {
    const items: CompletionItem[] = [];

    items.push(...this.getSnippetCompletions(context));
    items.push(...this.getKeywordCompletions(context));
    items.push(...this.getImportCompletions(context));
    items.push(...this.getReactHookCompletions(context));
    items.push(...this.getPropertyCompletions(context));
    items.push(...this.getComponentPropCompletions(context));
    items.push(...this.getAPICompletions(context));

    return items.sort((a, b) => a.sort_order - b.sort_order);
  }

  registerSnippet(snippet: SnippetDefinition): void {
    this.snippets.set(snippet.id, snippet);
  }

  registerComponentProps(component: string, props: ComponentPropInfo[]): void {
    this.componentProps.set(component, props);
  }

  registerAPIEndpoints(module: string, endpoints: APIEndpointInfo[]): void {
    this.apiEndpoints.set(module, endpoints);
  }

  registerProjectImport(module: string, exports: string[]): void {
    const existing = this.projectImports.get(module) ?? new Set<string>();
    for (const exp of exports) {
      existing.add(exp);
    }
    this.projectImports.set(module, existing);
  }

  acceptCompletion(context: CompletionContext, item: CompletionItem): void {
    this.addToHistory(context, item, true);
  }

  rejectCompletion(context: CompletionContext, item: CompletionItem): void {
    this.addToHistory(context, item, false);
  }

  getStats(): {
    totalSnippets: number;
    registeredComponents: number;
    registeredAPIs: number;
    registeredImports: number;
    historySize: number;
  } {
    return {
      totalSnippets: this.snippets.size,
      registeredComponents: this.componentProps.size,
      registeredAPIs: this.apiEndpoints.size,
      registeredImports: this.projectImports.size,
      historySize: this.history.length,
    };
  }

  private getSnippetCompletions(context: CompletionContext): CompletionItem[] {
    const items: CompletionItem[] = [];
    const word = context.cursor_word ?? '';

    for (const snippet of this.snippets.values()) {
      if (snippet.language !== context.language) continue;
      if (word && !snippet.label.toLowerCase().includes(word.toLowerCase())) continue;

      items.push({
        label: snippet.label,
        kind: snippet.kind,
        detail: snippet.description,
        insert_text: snippet.template,
        sort_order: snippet.sort_order,
        documentation: snippet.description,
        filter_text: snippet.label.toLowerCase(),
      });
    }

    return items;
  }

  private getKeywordCompletions(context: CompletionContext): CompletionItem[] {
    if (context.language !== 'typescript') return [];

    const word = context.cursor_word ?? '';
    return COMMON_TYPESCRIPT_KEYWORDS.filter(
      (kw) => !word || kw.label.toLowerCase().startsWith(word.toLowerCase())
    ).map((kw) => ({
      label: kw.label,
      kind: kw.kind,
      detail: kw.detail,
      insert_text: kw.insert_text,
      sort_order: 50,
    }));
  }

  private getImportCompletions(context: CompletionContext): CompletionItem[] {
    if (context.language !== 'typescript') return [];

    const items: CompletionItem[] = [];
    const word = context.cursor_word ?? '';

    for (const [module, exports] of this.projectImports) {
      for (const exp of exports) {
        if (!word || exp.toLowerCase().startsWith(word.toLowerCase())) {
          items.push({
            label: exp,
            kind: CompletionKind.IMPORT,
            detail: `从 ${module} 导入`,
            insert_text: `import { ${exp} } from '${module}';`,
            sort_order: 80,
            filter_text: exp.toLowerCase(),
            additional_text: module,
          });
        }
      }
    }

    return items;
  }

  private getReactHookCompletions(context: CompletionContext): CompletionItem[] {
    if (context.language !== 'typescript') return [];

    const word = context.cursor_word ?? '';
    return COMMON_REACT_HOOKS.filter(
      (hook) => !word || hook.label.toLowerCase().startsWith(word.toLowerCase())
    ).map((hook) => ({
      label: hook.label,
      kind: CompletionKind.FUNCTION,
      detail: hook.detail,
      insert_text: `${hook.label}`,
      sort_order: 100,
      documentation: hook.detail,
    }));
  }

  private getPropertyCompletions(context: CompletionContext): CompletionItem[] {
    if (context.language !== 'typescript') return [];

    const content = context.content ?? '';
    const memberAccessPattern = /(\w+)\s*\.\s*$/;
    const match = content.match(memberAccessPattern);

    if (!match) return [];

    const varName = match[1];
    const word = context.cursor_word ?? '';

    for (const [typeName, props] of Object.entries(TYPE_PROPERTY_MAP)) {
      if (typeName.includes(varName.toLowerCase()) || varName.toLowerCase().includes(typeName)) {
        return props
          .filter((p) => !word || p.name.toLowerCase().startsWith(word.toLowerCase()))
          .map((p) => ({
            label: p.name,
            kind: CompletionKind.PROPERTY,
            detail: `${p.name}: ${p.type}`,
            insert_text: `${p.name}`,
            sort_order: 30,
            symbol_name: p.name,
            symbol_kind: 'property',
          }));
      }
    }

    return [];
  }

  private getComponentPropCompletions(context: CompletionContext): CompletionItem[] {
    if (context.language !== 'typescript') return [];

    const content = context.content ?? '';
    const propPattern = /<(\w+)[^>]*\s+(\w+)\s*=\s*$/;
    const match = content.match(propPattern);

    if (!match) return [];

    const componentName = match[1];
    const propName = match[2];

    const props = this.componentProps.get(componentName);
    if (!props) return [];

    return props
      .filter((p) => !propName || p.name.toLowerCase().startsWith(propName.toLowerCase()))
      .map((p) => ({
        label: p.name,
        kind: CompletionKind.PROPERTY,
        detail: `${p.name}${p.required ? ' (必填)' : ''}: ${p.type}${p.description ? ` — ${p.description}` : ''}`,
        insert_text: `${p.name}={}`,
        sort_order: 40,
        documentation: p.description,
        deprecated: p.deprecated,
      }));
  }

  private getAPICompletions(context: CompletionContext): CompletionItem[] {
    if (context.language !== 'typescript') return [];

    const content = context.content ?? '';
    const fetchPattern = /(?:fetch|api)\s*\(\s*['"`]\/?(\w+)/;
    const match = content.match(fetchPattern);

    if (!match) return [];

    const moduleName = match[1];
    const endpoints = this.apiEndpoints.get(moduleName);
    if (!endpoints) return [];

    return endpoints.map((ep) => ({
      label: `${ep.method} ${ep.path}`,
      kind: CompletionKind.FUNCTION,
      detail: `${ep.description}${ep.request_type ? ` | 请求: ${ep.request_type}` : ''}${ep.response_type ? ` | 响应: ${ep.response_type}` : ''}`,
      insert_text: `// ${ep.description}\n${ep.method} ${ep.path}`,
      sort_order: 60,
      documentation: ep.description,
    }));
  }

  private addToHistory(context: CompletionContext, item: CompletionItem, accepted: boolean): void {
    this.history.push({ context, item, accepted });
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }
}

export const intelligentCodeCompletion = new IntelligentCodeCompletion();

export default intelligentCodeCompletion;
