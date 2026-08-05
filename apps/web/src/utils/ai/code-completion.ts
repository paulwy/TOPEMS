/**
 * V47.0 前端 AI 增强 — 智能代码补全引擎
 *
 * 提供多种补全模式：
 * - 上下文感知补全：基于当前文件、光标位置、变量作用域
 * - 类型推断补全：基于 TypeScript 类型信息
 * - 模式匹配补全：识别常见编程模式并建议
 * - 自然语言转代码：描述功能自动生成代码
 */

// ============ 枚举与类型定义 ============

export enum CompletionType {
  SNIPPET = 'snippet',
  FUNCTION = 'function',
  VARIABLE = 'variable',
  IMPORT = 'import',
  TEMPLATE = 'template',
  NATURALLANGUAGE = 'natural_language',
}

export enum CompletionMode {
  CONTEXTAWARE = 'context_aware',
  TYPEINFERENCE = 'type_inference',
  PATTERNMATCHING = 'pattern_matching',
  NATURALLANGUAGETOCODE = 'nl_to_code',
}

// ============ 接口定义 ============

export interface VariableInfo {
  name: string;
  type: string;
  scope: 'global' | 'module' | 'function' | 'block';
  declared_at?: number;
  is_const?: boolean;
}

export interface ImportInfo {
  path: string;
  items: string[];
  is_default?: boolean;
  is_namespace?: boolean;
}

export interface CompletionContext {
  file_path: string;
  cursor_position: number;
  surrounding_code: string;
  language: string;
  imports: ImportInfo[];
  variables: VariableInfo[];
  current_line?: string;
  current_word?: string;
  trigger_character?: string;
  mode?: CompletionMode;
}

export interface CompletionSuggestion {
  text: string;
  type: CompletionType;
  confidence: number;
  description: string;
  insert_text: string;
  cursor_offset: number;
  detail?: string;
  documentation?: string;
  deprecated?: boolean;
  preselect?: boolean;
}

export interface CompletionHistoryEntry {
  id: string;
  suggestion: CompletionSuggestion;
  context: Pick<CompletionContext, 'file_path' | 'language' | 'mode'>;
  accepted: boolean;
  timestamp: number;
}

export interface CodeSnippet {
  id: string;
  name: string;
  description: string;
  language: string;
  prefix: string;
  body: string;
  placeholders?: string[];
  category: string;
}

// ============ 预置代码片段模板 ============

const REACT_SNIPPETS: CodeSnippet[] = [
  {
    id: 'react-component',
    name: 'React Function Component',
    description: '创建一个 React 函数组件',
    language: 'typescript',
    prefix: 'rfc',
    body: `interface \${1:ComponentName}Props {
  \${2:children}: React.ReactNode;
}

export function \${1:ComponentName}({ \${2:children} }: \${1:ComponentName}Props) {
  return (
    <div>
      \${0}
    </div>
  );
}`,
    placeholders: ['ComponentName', 'children'],
    category: 'react',
  },
  {
    id: 'react-use-state',
    name: 'useState Hook',
    description: '创建 useState 状态钩子',
    language: 'typescript',
    prefix: 'useState',
    body: `const [\${1:state}, set\${1:State}] = useState<\${2:type}>(\${3:initialValue});`,
    placeholders: ['state', 'type', 'initialValue'],
    category: 'react',
  },
  {
    id: 'react-use-effect',
    name: 'useEffect Hook',
    description: '创建 useEffect 副作用钩子',
    language: 'typescript',
    prefix: 'useEffect',
    body: `useEffect(() => {
  \${0}
  return () => {
    // cleanup
  };
}, [\${1:deps}]);`,
    placeholders: ['deps'],
    category: 'react',
  },
  {
    id: 'react-use-callback',
    name: 'useCallback Hook',
    description: '创建 useCallback 记忆化回调',
    language: 'typescript',
    prefix: 'useCallback',
    body: `const \${1:callback} = useCallback((\${2:params}) => {
  \${0}
}, [\${3:deps}]);`,
    placeholders: ['callback', 'params', 'deps'],
    category: 'react',
  },
  {
    id: 'react-use-memo',
    name: 'useMemo Hook',
    description: '创建 useMemo 记忆化值',
    language: 'typescript',
    prefix: 'useMemo',
    body: `const \${1:memoValue} = useMemo(() => {
  \${0}
}, [\${2:deps}]);`,
    placeholders: ['memoValue', 'deps'],
    category: 'react',
  },
  {
    id: 'react-use-ref',
    name: 'useRef Hook',
    description: '创建 useRef 引用钩子',
    language: 'typescript',
    prefix: 'useRef',
    body: `const \${1:ref} = useRef<\${2:type}>(\${3:initialValue});`,
    placeholders: ['ref', 'type', 'initialValue'],
    category: 'react',
  },
  {
    id: 'react-use-query',
    name: 'useQuery Hook (TanStack Query)',
    description: '创建 TanStack Query 数据查询钩子',
    language: 'typescript',
    prefix: 'useQuery',
    body: `const { data, isLoading, error } = useQuery({
  queryKey: ['\${1:key}'],
  queryFn: () => \${2:fetchFn}(),
});`,
    placeholders: ['key', 'fetchFn'],
    category: 'react',
  },
  {
    id: 'react-use-mutation',
    name: 'useMutation Hook (TanStack Query)',
    description: '创建 TanStack Query 数据变更钩子',
    language: 'typescript',
    prefix: 'useMutation',
    body: `const { mutate, isPending } = useMutation({
  mutationFn: (\${1:vars}) => \${2:apiFn}(\${1:vars}),
  onSuccess: (data) => {
    \${0}
  },
});`,
    placeholders: ['vars', 'apiFn'],
    category: 'react',
  },
];

const TYPESCRIPT_SNIPPETS: CodeSnippet[] = [
  {
    id: 'ts-interface',
    name: 'TypeScript Interface',
    description: '定义 TypeScript 接口',
    language: 'typescript',
    prefix: 'interface',
    body: `interface \${1:Name} {
  \${2:property}: \${3:type};
  \${0}
}`,
    placeholders: ['Name', 'property', 'type'],
    category: 'typescript',
  },
  {
    id: 'ts-type-alias',
    name: 'TypeScript Type Alias',
    description: '定义 TypeScript 类型别名',
    language: 'typescript',
    prefix: 'type',
    body: `type \${1:Name} = \${2:type};`,
    placeholders: ['Name', 'type'],
    category: 'typescript',
  },
  {
    id: 'ts-enum',
    name: 'TypeScript Enum',
    description: '定义 TypeScript 枚举',
    language: 'typescript',
    prefix: 'enum',
    body: `enum \${1:Name} {
  \${2:Member} = '\${2:Member}',
  \${0}
}`,
    placeholders: ['Name', 'Member'],
    category: 'typescript',
  },
  {
    id: 'ts-generic-function',
    name: 'Generic Function',
    description: '定义泛型函数',
    language: 'typescript',
    prefix: 'gfn',
    body: `function \${1:name}<\${2:T}>(\${3:arg}: \${2:T}): \${2:T} {
  \${0}
  return \${3:arg};
}`,
    placeholders: ['name', 'T', 'arg'],
    category: 'typescript',
  },
  {
    id: 'ts-async-function',
    name: 'Async Function',
    description: '定义异步函数',
    language: 'typescript',
    prefix: 'async',
    body: `async function \${1:name}(\${2:params}): Promise<\${3:type}> {
  \${0}
}`,
    placeholders: ['name', 'params', 'type'],
    category: 'typescript',
  },
  {
    id: 'ts-class',
    name: 'TypeScript Class',
    description: '定义 TypeScript 类',
    language: 'typescript',
    prefix: 'class',
    body: `class \${1:Name} {
  \${2:property}: \${3:type};

  constructor(\${2:property}: \${3:type}) {
    this.\${2:property} = \${2:property};
  }

  \${0}
}`,
    placeholders: ['Name', 'property', 'type'],
    category: 'typescript',
  },
  {
    id: 'ts-import-type',
    name: 'Import Type',
    description: '导入类型定义',
    language: 'typescript',
    prefix: 'import type',
    body: `import type { \${1:Type} } from '\${2:path}';`,
    placeholders: ['Type', 'path'],
    category: 'typescript',
  },
  {
    id: 'ts-zod-schema',
    name: 'Zod Schema',
    description: '定义 Zod 验证模式',
    language: 'typescript',
    prefix: 'zod',
    body: `const \${1:schema} = z.object({
  \${2:field}: z.\${3:string}(),
  \${0}
});`,
    placeholders: ['schema', 'field', 'string'],
    category: 'typescript',
  },
];

const ALL_SNIPPETS: CodeSnippet[] = [...REACT_SNIPPETS, ...TYPESCRIPT_SNIPPETS];

// ============ 编程模式匹配规则 ============

interface PatternRule {
  id: string;
  name: string;
  pattern: RegExp;
  suggestion: Partial<CompletionSuggestion>;
  description: string;
}

const PATTERN_RULES: PatternRule[] = [
  {
    id: 'console-log',
    name: 'Console Log',
    pattern: /console\.\s*$/,
    suggestion: {
      text: 'log(',
      insert_text: 'log($0)',
      type: CompletionType.SNIPPET,
      description: 'console.log 调试输出',
    },
    description: '匹配 console. 并建议 log',
  },
  {
    id: 'use-state-pattern',
    name: 'useState Pattern',
    pattern: /const\s+\w+\s*=\s*$/,
    suggestion: {
      text: 'useState(',
      insert_text: 'useState($0)',
      type: CompletionType.SNIPPET,
      description: 'React useState 钩子',
    },
    description: '匹配 const xxx = 并建议 useState',
  },
  {
    id: 'arrow-function',
    name: 'Arrow Function',
    pattern: /=>\s*$/,
    suggestion: {
      text: '{ ',
      insert_text: '{\n  $0\n}',
      type: CompletionType.SNIPPET,
      description: '箭头函数体',
    },
    description: '匹配 => 并建议函数体块',
  },
  {
    id: 'if-statement',
    name: 'If Statement',
    pattern: /if\s*$/,
    suggestion: {
      text: '(condition) {',
      insert_text: '($1) {\n  $0\n}',
      type: CompletionType.SNIPPET,
      description: 'if 条件语句',
    },
    description: '匹配 if 并建议条件语句结构',
  },
  {
    id: 'try-catch',
    name: 'Try Catch',
    pattern: /try\s*$/,
    suggestion: {
      text: ' {',
      insert_text: ' {\n  $0\n} catch (error) {\n  console.error(error);\n}',
      type: CompletionType.TEMPLATE,
      description: 'try-catch 错误处理',
    },
    description: '匹配 try 并建议 try-catch 结构',
  },
];

// ============ 代码补全引擎 ============

export class CodeCompletionEngine {
  private snippets: CodeSnippet[];
  private patterns: PatternRule[];
  private history: CompletionHistoryEntry[] = [];
  private acceptedPatterns = new Map<string, number>();
  private rejectedPatterns = new Map<string, number>();
  private maxHistorySize = 1000;

  constructor(snippets: CodeSnippet[] = ALL_SNIPPETS, patterns: PatternRule[] = PATTERN_RULES) {
    this.snippets = snippets;
    this.patterns = patterns;
  }

  /**
   * 获取补全建议列表
   */
  async getCompletions(context: CompletionContext): Promise<CompletionSuggestion[]> {
    const mode = context.mode ?? CompletionMode.CONTEXTAWARE;
    const suggestions: CompletionSuggestion[] = [];

    switch (mode) {
      case CompletionMode.CONTEXTAWARE:
        suggestions.push(...this.getContextAwareCompletions(context));
        break;
      case CompletionMode.TYPEINFERENCE:
        suggestions.push(...this.getTypeInferenceCompletions(context));
        break;
      case CompletionMode.PATTERNMATCHING:
        suggestions.push(...this.getPatternMatchCompletions(context));
        break;
      case CompletionMode.NATURALLANGUAGETOCODE:
        suggestions.push(...this.getNaturalLanguageCompletions(context));
        break;
      default:
        suggestions.push(...this.getContextAwareCompletions(context));
        suggestions.push(...this.getPatternMatchCompletions(context));
    }

    // 根据历史记录调整置信度
    const adjusted = this.adjustConfidenceByHistory(suggestions);

    // 按置信度降序排序
    return adjusted.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 获取内联补全（单条最佳建议）
   */
  async getInlineCompletion(context: CompletionContext): Promise<CompletionSuggestion | null> {
    const completions = await this.getCompletions(context);
    return completions[0] ?? null;
  }

  /**
   * 接受补全建议
   */
  acceptSuggestion(suggestion: CompletionSuggestion, context: CompletionContext): void {
    const entry: CompletionHistoryEntry = {
      id: this.generateId(),
      suggestion,
      context: {
        file_path: context.file_path,
        language: context.language,
        mode: context.mode,
      },
      accepted: true,
      timestamp: Date.now(),
    };

    this.addToHistory(entry);
    this.acceptedPatterns.set(
      suggestion.text,
      (this.acceptedPatterns.get(suggestion.text) ?? 0) + 1
    );
  }

  /**
   * 拒绝补全建议
   */
  rejectSuggestion(suggestion: CompletionSuggestion, context: CompletionContext): void {
    const entry: CompletionHistoryEntry = {
      id: this.generateId(),
      suggestion,
      context: {
        file_path: context.file_path,
        language: context.language,
        mode: context.mode,
      },
      accepted: false,
      timestamp: Date.now(),
    };

    this.addToHistory(entry);
    this.rejectedPatterns.set(
      suggestion.text,
      (this.rejectedPatterns.get(suggestion.text) ?? 0) + 1
    );
  }

  /**
   * 从用户接受记录中学习
   */
  learnFromAcceptance(): void {
    // 统计高频接受的补全
    const acceptedList = Array.from(this.acceptedPatterns.entries()).sort((a, b) => b[1] - a[1]);

    // 提升高频补全的优先级（通过调整 patterns 顺序）
    for (const [text] of acceptedList) {
      const idx = this.patterns.findIndex((p) => p.suggestion.text === text);
      if (idx > 0) {
        const [rule] = this.patterns.splice(idx, 1);
        this.patterns.unshift(rule);
      }
    }
  }

  /**
   * 获取补全历史
   */
  getHistory(): CompletionHistoryEntry[] {
    return [...this.history];
  }

  /**
   * 清空历史
   */
  clearHistory(): void {
    this.history = [];
    this.acceptedPatterns.clear();
    this.rejectedPatterns.clear();
  }

  /**
   * 注册自定义代码片段
   */
  registerSnippet(snippet: CodeSnippet): void {
    const existingIdx = this.snippets.findIndex((s) => s.id === snippet.id);
    if (existingIdx >= 0) {
      this.snippets[existingIdx] = snippet;
    } else {
      this.snippets.push(snippet);
    }
  }

  /**
   * 注册自定义模式规则
   */
  registerPattern(pattern: PatternRule): void {
    const existingIdx = this.patterns.findIndex((p) => p.id === pattern.id);
    if (existingIdx >= 0) {
      this.patterns[existingIdx] = pattern;
    } else {
      this.patterns.push(pattern);
    }
  }

  // ============ 私有方法 ============

  private getContextAwareCompletions(context: CompletionContext): CompletionSuggestion[] {
    const suggestions: CompletionSuggestion[] = [];
    const currentWord = context.current_word ?? '';

    // 匹配变量名补全
    for (const variable of context.variables) {
      if (!currentWord || variable.name.startsWith(currentWord)) {
        suggestions.push({
          text: variable.name,
          type: CompletionType.VARIABLE,
          confidence: this.calculateVariableConfidence(variable, context),
          description: `变量: ${variable.name} (${variable.type})`,
          insert_text: variable.name,
          cursor_offset: variable.name.length,
          detail: `作用域: ${variable.scope}${variable.is_const ? ' (const)' : ''}`,
        });
      }
    }

    // 匹配 import 补全
    for (const imp of context.imports) {
      for (const item of imp.items) {
        if (!currentWord || item.startsWith(currentWord)) {
          suggestions.push({
            text: item,
            type: CompletionType.IMPORT,
            confidence: 0.7,
            description: `导入: ${item} (from ${imp.path})`,
            insert_text: item,
            cursor_offset: item.length,
            detail: imp.is_default ? '默认导出' : imp.is_namespace ? '命名空间导入' : '命名导入',
          });
        }
      }
    }

    // 匹配代码片段补全
    for (const snippet of this.snippets) {
      if (snippet.language !== context.language) continue;
      if (!currentWord || snippet.prefix.startsWith(currentWord)) {
        suggestions.push({
          text: snippet.prefix,
          type: CompletionType.SNIPPET,
          confidence: currentWord === snippet.prefix ? 0.9 : 0.6,
          description: snippet.description,
          insert_text: snippet.body,
          cursor_offset: 0,
          detail: `片段: ${snippet.name}`,
          documentation: snippet.body,
          preselect: currentWord === snippet.prefix,
        });
      }
    }

    return suggestions;
  }

  private getTypeInferenceCompletions(context: CompletionContext): CompletionSuggestion[] {
    const suggestions: CompletionSuggestion[] = [];
    const code = context.surrounding_code;

    // 根据变量类型推断可能的属性和方法
    const memberAccessPattern = /(\w+)\s*\.\s*$/;
    const match = code.match(memberAccessPattern);

    if (match) {
      const varName = match[1];
      const variable = context.variables.find((v) => v.name === varName);

      if (variable) {
        const typeCompletions = this.getTypeBasedCompletions(variable.type);
        suggestions.push(...typeCompletions);
      }
    }

    // 根据赋值上下文推断类型
    const assignmentPattern = /const\s+(\w+)\s*=\s*$/;
    const assignMatch = code.match(assignmentPattern);
    if (assignMatch) {
      const varName = assignMatch[1];
      suggestions.push({
        text: `${varName}Value`,
        type: CompletionType.VARIABLE,
        confidence: 0.5,
        description: `推断变量: ${varName}`,
        insert_text: `${varName}Value`,
        cursor_offset: `${varName}Value`.length,
      });
    }

    return suggestions;
  }

  private getPatternMatchCompletions(context: CompletionContext): CompletionSuggestion[] {
    const suggestions: CompletionSuggestion[] = [];
    const code = context.surrounding_code;

    for (const rule of this.patterns) {
      if (rule.pattern.test(code)) {
        suggestions.push({
          text: rule.suggestion.text ?? '',
          type: rule.suggestion.type ?? CompletionType.SNIPPET,
          confidence: 0.75,
          description: rule.description,
          insert_text: rule.suggestion.insert_text ?? rule.suggestion.text ?? '',
          cursor_offset: 0,
          detail: `模式: ${rule.name}`,
        });
      }
    }

    return suggestions;
  }

  private getNaturalLanguageCompletions(context: CompletionContext): CompletionSuggestion[] {
    const suggestions: CompletionSuggestion[] = [];
    const commentPattern = /\/\/\s*(.+)$/;
    const match = context.current_line?.match(commentPattern);

    if (match) {
      const description = match[1].trim().toLowerCase();

      // 基于自然语言描述匹配代码模板
      const nlMapping = this.matchNaturalLanguageToSnippet(description);

      if (nlMapping) {
        suggestions.push({
          text: nlMapping.name,
          type: CompletionType.NATURALLANGUAGE,
          confidence: 0.8,
          description: `从描述生成: ${description}`,
          insert_text: nlMapping.body,
          cursor_offset: 0,
          detail: `匹配模板: ${nlMapping.name}`,
          documentation: nlMapping.body,
        });
      }
    }

    return suggestions;
  }

  private getTypeBasedCompletions(type: string): CompletionSuggestion[] {
    const typeMap: Record<string, string[]> = {
      string: [
        'length',
        'charAt',
        'indexOf',
        'slice',
        'substring',
        'toUpperCase',
        'toLowerCase',
        'trim',
        'split',
        'replace',
        'match',
      ],
      number: ['toFixed', 'toString', 'toPrecision', 'toExponential'],
      boolean: ['toString', 'valueOf'],
      array: [
        'length',
        'push',
        'pop',
        'shift',
        'unshift',
        'slice',
        'splice',
        'map',
        'filter',
        'reduce',
        'forEach',
        'find',
        'some',
        'every',
        'includes',
        'indexOf',
      ],
      object: ['keys', 'values', 'entries', 'hasOwnProperty', 'toString'],
      promise: ['then', 'catch', 'finally'],
    };

    const lowerType = type.toLowerCase();
    const matchedKey = Object.keys(typeMap).find((key) => lowerType.includes(key));

    if (!matchedKey) return [];

    return typeMap[matchedKey].map((method) => ({
      text: method,
      type: CompletionType.FUNCTION,
      confidence: 0.85,
      description: `${type}.${method}()`,
      insert_text: `${method}($0)`,
      cursor_offset: method.length,
      detail: `方法: ${method}`,
    }));
  }

  private matchNaturalLanguageToSnippet(description: string): CodeSnippet | null {
    const keywordMap: Record<string, string[]> = {
      component: ['react-component', 'rfc'],
      state: ['react-use-state', 'useState'],
      effect: ['react-use-effect', 'useEffect'],
      callback: ['react-use-callback', 'useCallback'],
      memo: ['react-use-memo', 'useMemo'],
      ref: ['react-use-ref', 'useRef'],
      query: ['react-use-query', 'useQuery'],
      mutation: ['react-use-mutation', 'useMutation'],
      interface: ['ts-interface', 'interface'],
      type: ['ts-type-alias', 'type'],
      enum: ['ts-enum', 'enum'],
      async: ['ts-async-function', 'async'],
      class: ['ts-class', 'class'],
    };

    for (const [keyword, snippetIds] of Object.entries(keywordMap)) {
      if (description.includes(keyword)) {
        const snippet = this.snippets.find((s) => snippetIds.includes(s.id));
        if (snippet) return snippet;
      }
    }

    return null;
  }

  private calculateVariableConfidence(variable: VariableInfo, context: CompletionContext): number {
    let confidence = 0.5;

    // 越近作用域优先级越高
    const scopeWeight: Record<VariableInfo['scope'], number> = {
      block: 0.9,
      function: 0.7,
      module: 0.5,
      global: 0.3,
    };
    confidence = scopeWeight[variable.scope];

    // 已使用变量优先级降低
    const usageCount = context.surrounding_code.split(variable.name).length - 1;
    if (usageCount > 2) {
      confidence *= 0.8;
    }

    return confidence;
  }

  private adjustConfidenceByHistory(suggestions: CompletionSuggestion[]): CompletionSuggestion[] {
    return suggestions.map((suggestion) => {
      const acceptedCount = this.acceptedPatterns.get(suggestion.text) ?? 0;
      const rejectedCount = this.rejectedPatterns.get(suggestion.text) ?? 0;
      const total = acceptedCount + rejectedCount;

      if (total === 0) return suggestion;

      const acceptanceRate = acceptedCount / total;
      const adjustedConfidence = suggestion.confidence * (0.5 + acceptanceRate * 0.5);

      return {
        ...suggestion,
        confidence: Math.min(1, adjustedConfidence),
      };
    });
  }

  private addToHistory(entry: CompletionHistoryEntry): void {
    this.history.push(entry);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  private generateId(): string {
    return `comp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    total_suggestions: number;
    accepted_count: number;
    rejected_count: number;
    acceptance_rate: number;
    top_accepted: Array<{ text: string; count: number }>;
  } {
    const acceptedEntries = this.history.filter((h) => h.accepted);
    const rejectedEntries = this.history.filter((h) => !h.accepted);
    const topAccepted = Array.from(this.acceptedPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([text, count]) => ({ text, count }));

    return {
      total_suggestions: this.history.length,
      accepted_count: acceptedEntries.length,
      rejected_count: rejectedEntries.length,
      acceptance_rate: this.history.length > 0 ? acceptedEntries.length / this.history.length : 0,
      top_accepted: topAccepted,
    };
  }
}

// ============ 单例实例 ============

export const codeCompletionEngine = new CodeCompletionEngine();

export default codeCompletionEngine;
