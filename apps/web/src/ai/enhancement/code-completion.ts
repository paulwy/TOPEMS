import i18n from '@/i18n';
import { CACHE_DURATIONS, QUERY_KEYS, queryClient } from '@/lib/reactQuery';

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

enum CompletionKind {
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
    description: i18n.t('shared.code-completion.react_0'),
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
    description: i18n.t('shared.code-completion.usestate_1'),
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
    description: i18n.t('shared.code-completion.useeffect_2'),
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
    description: i18n.t('shared.code-completion.usecallback_3'),
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
    description: i18n.t('shared.code-completion.usememo_4'),
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
    description: i18n.t('shared.code-completion.useref_5'),
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
    description: i18n.t('shared.code-completion.k6'),
    language: 'typescript',
    kind: CompletionKind.SNIPPET,
    template: `const { data, isPending, error } = useQuery({
  queryKey: QUERY_KEYS.AD_HOC.1_KEY_BASE,
  queryFn: () => \${2:fetchFn}(),

        staleTime: CACHE_DURATIONS.MEDIUM,});`,
    placeholders: [{ name: 'key' }, { name: 'fetchFn' }],
    sort_order: 300,
    category: 'react',
  },
  {
    id: 'v53-use-mutation',
    label: 'useMutation (TanStack Query)',
    description: i18n.t('shared.code-completion.k7'),
    language: 'typescript',
    kind: CompletionKind.SNIPPET,
    template: `const { mutate, isPending } = useMutation({
  mutationFn: (\${1:vars}) => \${2:apiFn}(\${1:vars}),
  onSuccess: (data) => {
    
    queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.AD_HOC.1_KEY_BASE,
            exact: false,
            refetchType: 'active',
          });
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
    description: i18n.t('shared.code-completion.typescript_8'),
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
    description: i18n.t('shared.code-completion.typescript_9'),
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
    description: i18n.t('shared.code-completion.typescript_10'),
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
    description: i18n.t('shared.code-completion.k11'),
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
    description: i18n.t('shared.code-completion.k12'),
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
    description: i18n.t('shared.code-completion.k13'),
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
    description: i18n.t('shared.code-completion.zod_14'),
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
    description: i18n.t('shared.code-completion.flexbox_15'),
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
    description: i18n.t('shared.code-completion.grid_16'),
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
    description: i18n.t('shared.code-completion.k17'),
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
    description: i18n.t('ai.code-completion.apijson_0'),
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
  {
    label: 'import',
    kind: CompletionKind.KEYWORD,
    detail: i18n.t('shared.code-completion.k18'),
    insert_text: 'import ',
  },
  {
    label: 'export',
    kind: CompletionKind.KEYWORD,
    detail: i18n.t('shared.code-completion.k19'),
    insert_text: 'export ',
  },
  {
    label: 'interface',
    kind: CompletionKind.KEYWORD,
    detail: i18n.t('shared.code-completion.k20'),
    insert_text: 'interface ',
  },
  {
    label: 'type',
    kind: CompletionKind.KEYWORD,
    detail: i18n.t('shared.code-completion.k21'),
    insert_text: 'type ',
  },
  {
    label: 'class',
    kind: CompletionKind.KEYWORD,
    detail: i18n.t('shared.code-completion.k22'),
    insert_text: 'class ',
  },
  {
    label: 'function',
    kind: CompletionKind.KEYWORD,
    detail: i18n.t('shared.code-completion.k23'),
    insert_text: 'function ',
  },
  {
    label: 'const',
    kind: CompletionKind.KEYWORD,
    detail: i18n.t('shared.code-completion.k24'),
    insert_text: 'const ',
  },
  {
    label: 'let',
    kind: CompletionKind.KEYWORD,
    detail: i18n.t('shared.code-completion.k25'),
    insert_text: 'let ',
  },
  {
    label: 'var',
    kind: CompletionKind.KEYWORD,
    detail: i18n.t('shared.code-completion.k26'),
    insert_text: 'var ',
  },
  {
    label: 'return',
    kind: CompletionKind.KEYWORD,
    detail: i18n.t('shared.code-completion.k27'),
    insert_text: 'return ',
  },
  {
    label: 'async',
    kind: CompletionKind.KEYWORD,
    detail: i18n.t('shared.code-completion.k28'),
    insert_text: 'async ',
  },
  {
    label: 'await',
    kind: CompletionKind.KEYWORD,
    detail: i18n.t('shared.code-completion.k29'),
    insert_text: 'await ',
  },
  {
    label: 'extends',
    kind: CompletionKind.KEYWORD,
    detail: i18n.t('shared.code-completion.k30'),
    insert_text: 'extends ',
  },
  {
    label: 'implements',
    kind: CompletionKind.KEYWORD,
    detail: i18n.t('shared.code-completion.k31'),
    insert_text: 'implements ',
  },
  {
    label: 'namespace',
    kind: CompletionKind.KEYWORD,
    detail: i18n.t('shared.code-completion.k32'),
    insert_text: 'namespace ',
  },
  {
    label: 'declare',
    kind: CompletionKind.KEYWORD,
    detail: i18n.t('shared.code-completion.k33'),
    insert_text: 'declare ',
  },
];

const COMMON_REACT_HOOKS: Array<{ label: string; detail: string; insert_text: string }> = [
  { label: 'useState', detail: i18n.t('shared.code-completion.k34'), insert_text: 'useState' },
  { label: 'useEffect', detail: i18n.t('shared.code-completion.k35'), insert_text: 'useEffect' },
  {
    label: 'useCallback',
    detail: i18n.t('shared.code-completion.k36'),
    insert_text: 'useCallback',
  },
  { label: 'useMemo', detail: i18n.t('shared.code-completion.k37'), insert_text: 'useMemo' },
  { label: 'useRef', detail: i18n.t('shared.code-completion.k38'), insert_text: 'useRef' },
  { label: 'useContext', detail: i18n.t('shared.code-completion.k39'), insert_text: 'useContext' },
  {
    label: 'useReducer',
    detail: i18n.t('ai.code-completion.reducer_1'),
    insert_text: 'useReducer',
  },
  {
    label: 'useImperativeHandle',
    detail: i18n.t('shared.code-completion.k40'),
    insert_text: 'useImperativeHandle',
  },
  {
    label: 'useLayoutEffect',
    detail: i18n.t('shared.code-completion.k41'),
    insert_text: 'useLayoutEffect',
  },
  {
    label: 'useDebugValue',
    detail: i18n.t('shared.code-completion.k42'),
    insert_text: 'useDebugValue',
  },
  {
    label: 'useDeferredValue',
    detail: i18n.t('shared.code-completion.k43'),
    insert_text: 'useDeferredValue',
  },
  {
    label: 'useTransition',
    detail: i18n.t('shared.code-completion.k44'),
    insert_text: 'useTransition',
  },
  { label: 'useId', detail: i18n.t('shared.code-completion.id_45'), insert_text: 'useId' },
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
