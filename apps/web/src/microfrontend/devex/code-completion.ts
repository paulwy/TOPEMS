import { moduleRegistry, type ModuleRegistration } from '../registry/module-registry';
import { smartDebugger, type ComponentTreeNode } from './smart-debugger';
import { performanceAnalyzer } from './performance-analyzer';

export type CompletionKind = 'module-api' | 'prop' | 'import' | 'snippet' | 'type';

export interface CompletionItem {
  id: string;
  kind: CompletionKind;
  label: string;
  insertText: string;
  detail?: string;
  documentation?: string;
  sortOrder: number;
}

export interface CompletionContext {
  filePath: string;
  cursorPosition: number;
  lineContent: string;
  language: 'typescript' | 'tsx' | 'javascript' | 'jsx';
  importedModules: string[];
  availableImports: string[];
}

export interface Snippet {
  id: string;
  title: string;
  description: string;
  code: string;
  tags: string[];
}

const SNIPPET_LIBRARY: Snippet[] = [
  {
    id: 'mf-lazy-load',
    title: '微前端懒加载模块',
    description: '使用 React.lazy 和 Suspense 懒加载远程模块',
    code: `const ModuleName = React.lazy(() => import('./microfrontend/module-name'));

const ModuleNamePage: React.FC = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <ModuleName />
  </Suspense>
);`,
    tags: ['microfrontend', 'lazy', 'react'],
  },
  {
    id: 'mf-dynamic-import',
    title: '动态导入远程模块',
    description: '使用动态 import() 按需加载远程模块',
    code: `const loadModule = async () => {
  const module = await import('@/microfrontend/module-name');
  module.default.init();
  return module;
};`,
    tags: ['microfrontend', 'dynamic-import'],
  },
  {
    id: 'mf-module-gate',
    title: '模块权限门控',
    description: '使用 ModuleGate 组件控制模块访问权限',
    code: `<ModuleGate module="moduleCode" action="view">
  <RemoteModule />
</ModuleGate>`,
    tags: ['microfrontend', 'permissions', 'module-gate'],
  },
  {
    id: 'mf-version-check',
    title: '版本检查与热更新',
    description: '使用 versionManager 检查模块更新',
    code: `import { versionManager } from '@/microfrontend';

versionManager.onVersionUpdate((event) => {
  console.log(\`模块 \${event.moduleId} 有新版本\`);
});

versionManager.startAutoCheck(5 * 60 * 1000);`,
    tags: ['microfrontend', 'version', 'hot-reload'],
  },
  {
    id: 'mf-sandbox-isolation',
    title: '沙箱隔离加载模块',
    description: '使用沙箱安全加载不可信的远程模块',
    code: `import { SandboxedRemoteLoader } from '@/microfrontend';

<SandboxedRemoteLoader
  moduleId="untrusted-module"
  entryUrl="/remote-entry.js"
  isolation={{ jsSandbox: true, styleIsolation: 'shadow-dom' }}
/>`,
    tags: ['microfrontend', 'sandbox', 'security'],
  },
  {
    id: 'mf-perf-monitor',
    title: '性能监控埋点',
    description: '记录组件渲染性能指标',
    code: `import { performanceAnalyzer } from '@/microfrontend/devex';

performanceAnalyzer.recordRender('ComponentName', renderTime, propsChanged, stateChanged);`,
    tags: ['microfrontend', 'performance', 'monitoring'],
  },
  {
    id: 'mf-debug-session',
    title: '录制调试会话',
    description: '开始/停止调试会话，记录可重放的操作序列',
    code: `import { smartDebugger } from '@/microfrontend/devex';

const session = smartDebugger.startSession('用户流程测试');
// ... 执行操作 ...
smartDebugger.stopSession();
smartDebugger.replaySession(session.id);`,
    tags: ['microfrontend', 'debug', 'testing'],
  },
  {
    id: 'mf-error-boundary',
    title: '错误边界包装',
    description: '为微前端模块添加错误边界保护',
    code: `import ErrorBoundary from '@/components/ErrorBoundary';

<ErrorBoundary
  fallback={<ModuleErrorFallback moduleName="ModuleName" />}
  onError={(error) => {
    console.error('Module error:', error);
  }}
>
  <RemoteModule />
</ErrorBoundary>`,
    tags: ['microfrontend', 'error-boundary', 'react'],
  },
  {
    id: 'mf-smart-preload',
    title: '智能预加载模块',
    description: '用户空闲时预加载指定模块',
    code: `import { prefetchOnIdle } from '@/microfrontend';

const preloadResult = await prefetchOnIdle(['/remote-module-entry.js']);`,
    tags: ['microfrontend', 'preload', 'performance'],
  },
  {
    id: 'mf-state-inspection',
    title: '状态检查与导出',
    description: '检查 Redux/Zustand 状态并导出快照',
    code: `import { smartDebugger } from '@/microfrontend/devex';

const stores = smartDebugger.getAllStateStores();
const reduxState = smartDebugger.inspectReduxState();
const zustandStores = smartDebugger.inspectZustandStores();`,
    tags: ['microfrontend', 'state', 'debug'],
  },
];

const MICRO_FRONTEND_APIS: Array<{
  name: string;
  path: string;
  description: string;
  props: Array<{ name: string; type: string; required: boolean; description: string }>;
}> = [
  {
    name: 'RemoteLoader',
    path: '@/microfrontend',
    description: '远程模块加载器，支持 Module Federation 动态加载',
    props: [
      { name: 'moduleId', type: 'string', required: true, description: '远程模块 ID' },
      { name: 'entryUrl', type: 'string', required: true, description: '远程入口 URL' },
      { name: 'fallback', type: 'ReactNode', required: false, description: '加载中占位组件' },
      { name: 'errorBoundary', type: 'boolean', required: false, description: '是否启用错误边界' },
    ],
  },
  {
    name: 'SandboxedRemoteLoader',
    path: '@/microfrontend',
    description: '沙箱化远程模块加载器，提供 JS/样式/事件隔离',
    props: [
      { name: 'moduleId', type: 'string', required: true, description: '远程模块 ID' },
      { name: 'entryUrl', type: 'string', required: true, description: '远程入口 URL' },
      {
        name: 'isolation',
        type: 'SandboxedRemoteLoaderIsolation',
        required: true,
        description: '隔离配置',
      },
      { name: 'fallback', type: 'ReactNode', required: false, description: '加载中占位组件' },
    ],
  },
  {
    name: 'ModuleMarketplace',
    path: '@/microfrontend',
    description: '模块市场浏览与管理面板',
    props: [{ name: 'onClose', type: '() => void', required: true, description: '关闭回调' }],
  },
  {
    name: 'DependencyGovernance',
    path: '@/microfrontend',
    description: '依赖治理面板，展示依赖图与冲突检测',
    props: [{ name: 'onClose', type: '() => void', required: true, description: '关闭回调' }],
  },
  {
    name: 'SecurityCenter',
    path: '@/microfrontend',
    description: '安全中心面板，扫描漏洞与权限审计',
    props: [{ name: 'onClose', type: '() => void', required: true, description: '关闭回调' }],
  },
  {
    name: 'RuntimeDashboard',
    path: '@/microfrontend',
    description: '运行时控制台，展示模块生命周期状态',
    props: [{ name: 'onClose', type: '() => void', required: true, description: '关闭回调' }],
  },
  {
    name: 'AIOpsPanel',
    path: '@/microfrontend',
    description: 'AI 运维面板，智能告警与异常检测',
    props: [{ name: 'onClose', type: '() => void', required: true, description: '关闭回调' }],
  },
];

export class CodeCompletion {
  private static instance: CodeCompletion;

  private customSnippets: Map<string, Snippet> = new Map();
  private moduleApiCache: Map<string, CompletionItem[]> = new Map();

  private constructor() {
    SNIPPET_LIBRARY.forEach((s) => this.customSnippets.set(s.id, s));
  }

  static getInstance(): CodeCompletion {
    if (!CodeCompletion.instance) {
      CodeCompletion.instance = new CodeCompletion();
    }
    return CodeCompletion.instance;
  }

  // ==================== Module API Suggestions ====================

  getModuleAPISuggestions(moduleId: string): CompletionItem[] {
    const cached = this.moduleApiCache.get(moduleId);
    if (cached) return cached;

    const mod = moduleRegistry.getModule(moduleId);
    if (!mod) return [];

    const suggestions: CompletionItem[] = [];

    for (const api of MICRO_FRONTEND_APIS) {
      if (
        api.name.toLowerCase().includes(mod.name.toLowerCase()) ||
        mod.name.toLowerCase().includes(api.name.toLowerCase())
      ) {
        suggestions.push({
          id: `api_${api.name}`,
          kind: 'module-api',
          label: api.name,
          insertText: api.name,
          detail: `from ${api.path}`,
          documentation: api.description,
          sortOrder: 0,
        });

        for (const prop of api.props) {
          suggestions.push({
            id: `prop_${api.name}_${prop.name}`,
            kind: 'prop',
            label: `${prop.name}: ${prop.type}${prop.required ? ' (required)' : ''}`,
            insertText: `${prop.name}={${prop.type === 'string' ? `''` : prop.type === 'number' ? '0' : prop.type === 'boolean' ? 'false' : '{}'}}`,
            detail: prop.description,
            documentation: `Type: ${prop.type}\nRequired: ${prop.required}`,
            sortOrder: prop.required ? 1 : 2,
          });
        }
      }
    }

    this.moduleApiCache.set(moduleId, suggestions);
    return suggestions;
  }

  // ==================== Type-Safe Prop Hints ====================

  getPropHints(componentName: string): CompletionItem[] {
    const api = MICRO_FRONTEND_APIS.find((a) => a.name === componentName);
    if (!api) return [];

    return api.props.map((prop) => ({
      id: `prop_hint_${componentName}_${prop.name}`,
      kind: 'prop',
      label: `${prop.name}${prop.required ? '' : '?'}: ${prop.type}`,
      insertText: `${prop.name}={}`,
      detail: prop.description,
      documentation: `Required: ${prop.required}\n${prop.description}`,
      sortOrder: prop.required ? 0 : 1,
    }));
  }

  // ==================== Auto-Import Suggestions ====================

  getAutoImportSuggestions(context: CompletionContext): CompletionItem[] {
    const suggestions: CompletionItem[] = [];
    const modules = moduleRegistry.listModules();

    for (const mod of modules) {
      if (!context.importedModules.includes(mod.id)) {
        const importStatement = `import { ${mod.name} } from '@/microfrontend';`;
        suggestions.push({
          id: `import_${mod.id}`,
          kind: 'import',
          label: mod.name,
          insertText: importStatement,
          detail: `Import ${mod.name} from @/microfrontend`,
          documentation: `${mod.description || mod.name}\n\nVersion: ${mod.version}`,
          sortOrder: 1,
        });
      }
    }

    for (const api of MICRO_FRONTEND_APIS) {
      if (!context.importedModules.includes(api.name)) {
        suggestions.push({
          id: `import_api_${api.name}`,
          kind: 'import',
          label: api.name,
          insertText: `import { ${api.name} } from '${api.path}';`,
          detail: `Import ${api.name}`,
          documentation: api.description,
          sortOrder: 0,
        });
      }
    }

    return suggestions;
  }

  // ==================== Snippet Library ====================

  getSnippets(tags?: string[]): Snippet[] {
    if (!tags || tags.length === 0) {
      return Array.from(this.customSnippets.values());
    }
    return Array.from(this.customSnippets.values()).filter((s) =>
      tags.some((tag) => s.tags.includes(tag))
    );
  }

  getSnippet(id: string): Snippet | undefined {
    return this.customSnippets.get(id);
  }

  addSnippet(snippet: Omit<Snippet, 'id'>): Snippet {
    const newSnippet: Snippet = {
      ...snippet,
      id: `custom_${Date.now()}`,
    };
    this.customSnippets.set(newSnippet.id, newSnippet);
    return newSnippet;
  }

  removeSnippet(id: string): boolean {
    const isBuiltIn = SNIPPET_LIBRARY.some((s) => s.id === id);
    if (isBuiltIn) return false;
    return this.customSnippets.delete(id);
  }

  getSnippetSuggestions(query?: string): CompletionItem[] {
    const snippets = this.getSnippets();
    const filtered = query
      ? snippets.filter((s) => s.title.toLowerCase().includes(query.toLowerCase()))
      : snippets;

    return filtered.map((s) => ({
      id: `snippet_${s.id}`,
      kind: 'snippet',
      label: `📝 ${s.title}`,
      insertText: s.code,
      detail: s.description,
      documentation: `${s.description}\n\nTags: ${s.tags.join(', ')}`,
      sortOrder: 5,
    }));
  }

  // ==================== Unified Completion ====================

  getCompletions(context: CompletionContext): CompletionItem[] {
    const completions: CompletionItem[] = [];

    const activeModule = this.detectActiveModule(context);
    if (activeModule) {
      completions.push(...this.getModuleAPISuggestions(activeModule));
    }

    completions.push(...this.getAutoImportSuggestions(context));

    if (context.lineContent.trim().startsWith('<') || context.lineContent.includes('<')) {
      const componentName = this.detectComponentName(context.lineContent);
      if (componentName) {
        completions.push(...this.getPropHints(componentName));
      }
    }

    completions.push(...this.getSnippetSuggestions());

    return completions.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  private detectActiveModule(context: CompletionContext): string | null {
    const match = context.lineContent.match(/from\s+['"].*microfrontend[\/']([^'"]*)['"]/);
    if (match) {
      return match[1].split('/')[0];
    }
    return null;
  }

  private detectComponentName(line: string): string | null {
    const match = line.match(/<([A-Z][a-zA-Z0-9]*)/);
    if (match) {
      return match[1];
    }
    return null;
  }

  getDocumentationForSymbol(symbol: string): string | null {
    const api = MICRO_FRONTEND_APIS.find((a) => a.name === symbol);
    if (api) {
      return `${api.name}\n${'='.repeat(api.name.length)}\n\n${api.description}\n\nProps:\n${api.props.map((p) => `  ${p.name}${p.required ? ' (required)' : ''}: ${p.type} - ${p.description}`).join('\n')}`;
    }
    return null;
  }

  clearCache(): void {
    this.moduleApiCache.clear();
  }

  reset(): void {
    this.customSnippets.clear();
    SNIPPET_LIBRARY.forEach((s) => this.customSnippets.set(s.id, s));
    this.moduleApiCache.clear();
  }
}

export const codeCompletion = CodeCompletion.getInstance();
