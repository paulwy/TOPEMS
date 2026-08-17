import { moduleRegistry, type ModuleRegistration } from '../registry/module-registry';
import { smartDebugger, type ComponentTreeNode } from './smart-debugger';
import i18n from '@/i18n';

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
    title: i18n.t('shared.code-completion.k0'),
    description: i18n.t('microfrontend.code-completion.k0'),
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
    title: i18n.t('shared.code-completion.k1'),
    description: i18n.t('shared.code-completion.k2'),
    code: `const loadModule = async () => {
  const module = await import('@/microfrontend/module-name');
  module.default.init();
  return module;
};`,
    tags: ['microfrontend', 'dynamic-import'],
  },
  {
    id: 'mf-module-gate',
    title: i18n.t('shared.code-completion.k3'),
    description: i18n.t('shared.code-completion.k4'),
    code: `<ModuleGate module="moduleCode" action="view">
  <RemoteModule />
</ModuleGate>`,
    tags: ['microfrontend', 'permissions', 'module-gate'],
  },
  {
    id: 'mf-version-check',
    title: i18n.t('shared.code-completion.k5'),
    description: i18n.t('shared.code-completion.k6'),
    code: `import { versionManager } from '@/microfrontend';

versionManager.onVersionUpdate((event) => {
  console.log(\`{i18n.t('microfrontend.code-completion.k0')} \${event.moduleId} {i18n.t('microfrontend.code-completion.k1')}\`);
});

versionManager.startAutoCheck(5 * 60 * 1000);`,
    tags: ['microfrontend', 'version', 'hot-reload'],
  },
  {
    id: 'mf-sandbox-isolation',
    title: i18n.t('shared.code-completion.k7'),
    description: i18n.t('shared.code-completion.k8'),
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
    title: i18n.t('shared.code-completion.k9'),
    description: i18n.t('shared.code-completion.k10'),
    code: `import { performanceAnalyzer } from '@/microfrontend/devex';

performanceAnalyzer.recordRender('ComponentName', renderTime, propsChanged, stateChanged);`,
    tags: ['microfrontend', 'performance', 'monitoring'],
  },
  {
    id: 'mf-debug-session',
    title: i18n.t('shared.code-completion.k11'),
    description: i18n.t('shared.code-completion.k12'),
    code: `import { smartDebugger } from '@/microfrontend/devex';

const session = smartDebugger.startSession(i18n.t('shared.code-completion.k13'));
// ... 执行操作 ...
smartDebugger.stopSession();
smartDebugger.replaySession(session.id);`,
    tags: ['microfrontend', 'debug', 'testing'],
  },
  {
    id: 'mf-error-boundary',
    title: i18n.t('shared.code-completion.k14'),
    description: i18n.t('shared.code-completion.k15'),
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
    title: i18n.t('shared.code-completion.k16'),
    description: i18n.t('shared.code-completion.k17'),
    code: `import { prefetchOnIdle } from '@/microfrontend';

const preloadResult = await prefetchOnIdle(['/remote-module-entry.js']);`,
    tags: ['microfrontend', 'preload', 'performance'],
  },
  {
    id: 'mf-state-inspection',
    title: i18n.t('shared.code-completion.k18'),
    description: i18n.t('shared.code-completion.k19'),
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
    description: i18n.t('shared.code-completion.k20'),
    props: [
      {
        name: 'moduleId',
        type: 'string',
        required: true,
        description: i18n.t('shared.code-completion.id_21'),
      },
      {
        name: 'entryUrl',
        type: 'string',
        required: true,
        description: i18n.t('shared.code-completion.url_22'),
      },
      {
        name: 'fallback',
        type: 'ReactNode',
        required: false,
        description: i18n.t('shared.code-completion.k23'),
      },
      {
        name: 'errorBoundary',
        type: 'boolean',
        required: false,
        description: i18n.t('shared.code-completion.k24'),
      },
    ],
  },
  {
    name: 'SandboxedRemoteLoader',
    path: '@/microfrontend',
    description: i18n.t('shared.code-completion.k25'),
    props: [
      {
        name: 'moduleId',
        type: 'string',
        required: true,
        description: i18n.t('shared.code-completion.id_26'),
      },
      {
        name: 'entryUrl',
        type: 'string',
        required: true,
        description: i18n.t('shared.code-completion.url_27'),
      },
      {
        name: 'isolation',
        type: 'SandboxedRemoteLoaderIsolation',
        required: true,
        description: i18n.t('shared.code-completion.k28'),
      },
      {
        name: 'fallback',
        type: 'ReactNode',
        required: false,
        description: i18n.t('shared.code-completion.k29'),
      },
    ],
  },
  {
    name: 'ModuleMarketplace',
    path: '@/microfrontend',
    description: i18n.t('shared.code-completion.k30'),
    props: [
      {
        name: 'onClose',
        type: '() => void',
        required: true,
        description: i18n.t('shared.code-completion.k31'),
      },
    ],
  },
  {
    name: 'DependencyGovernance',
    path: '@/microfrontend',
    description: i18n.t('shared.code-completion.k32'),
    props: [
      {
        name: 'onClose',
        type: '() => void',
        required: true,
        description: i18n.t('shared.code-completion.k33'),
      },
    ],
  },
  {
    name: 'SecurityCenter',
    path: '@/microfrontend',
    description: i18n.t('shared.code-completion.k34'),
    props: [
      {
        name: 'onClose',
        type: '() => void',
        required: true,
        description: i18n.t('shared.code-completion.k35'),
      },
    ],
  },
  {
    name: 'RuntimeDashboard',
    path: '@/microfrontend',
    description: i18n.t('shared.code-completion.k36'),
    props: [
      {
        name: 'onClose',
        type: '() => void',
        required: true,
        description: i18n.t('shared.code-completion.k37'),
      },
    ],
  },
  {
    name: 'AIOpsPanel',
    path: '@/microfrontend',
    description: i18n.t('microfrontend.code-completion.k1'),
    props: [
      {
        name: 'onClose',
        type: '() => void',
        required: true,
        description: i18n.t('shared.code-completion.k38'),
      },
    ],
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
