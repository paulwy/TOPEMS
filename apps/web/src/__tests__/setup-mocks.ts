import { vi } from 'vitest';
import React from 'react';

/**
 * Module-level mocks for store, OpenTelemetry, and React Query.
 * Only loaded for component/page tests that transitively import these modules.
 * Unit tests (pure functions) don't need this file.
 */

// ─── Mock @/store to prevent errors during module initialization ──────────
vi.mock('@/store', () => {
  const notificationState = {
    notifications: [],
    addNotification: vi.fn(),
    removeNotification: vi.fn(),
    clearNotifications: vi.fn(),
  };

  const authState = {
    user: { id: '1', username: 'testuser', email: 'test@example.com', isActive: true },
    token: 'test-token',
    permissions: [],
    roles: [],
    setUser: vi.fn(),
    setToken: vi.fn(),
    setPermissions: vi.fn(),
    setRoles: vi.fn(),
    clearAuth: vi.fn(),
    updateUser: vi.fn(),
    isAuthenticated: vi.fn(() => true),
    hasPermission: vi.fn(() => true),
    hasAnyPermission: vi.fn(() => true),
    hasAllPermissions: vi.fn(() => true),
    hasRole: vi.fn(() => true),
    hasAnyRole: vi.fn(() => true),
    isSuperuser: vi.fn(() => true),
    getDisplayName: vi.fn(() => 'Test User'),
    getAvatarUrl: vi.fn(() => ''),
  };

  const themeState = {
    theme: 'light',
    setTheme: vi.fn(),
  };

  const uiState = {
    sidebarOpen: true,
    sidebarCollapsed: false,
    toggleSidebar: vi.fn(),
    setSidebarOpen: vi.fn(),
    toggleSidebarCollapsed: vi.fn(),
    setSidebarCollapsed: vi.fn(),
  };

  const workflowState = {
    currentTaskId: null,
    taskStatus: 'pending',
    setCurrentTaskId: vi.fn(),
    setTaskStatus: vi.fn(),
    completeTask: vi.fn(),
  };

  const moduleLoadingState = {
    modules: {},
    loading: false,
    progress: 0,
    loadModule: vi.fn(),
    setModuleState: vi.fn(),
    reset: vi.fn(),
  };

  const shortcutState = {
    shortcuts: [],
    addShortcut: vi.fn(),
    removeShortcut: vi.fn(),
    updateShortcut: vi.fn(),
  };

  const notificationSettingsState = {
    settings: {},
    updateSettings: vi.fn(),
  };

  const biState = {
    summary: null,
    development: null,
    quality: null,
    production: null,
    laboratory: null,
    loading: false,
    error: null,
    fetchData: vi.fn(),
    clearData: vi.fn(),
  };

  const createStore = (state: any) => {
    const store = (selector?: (s: any) => any) => {
      if (selector) {
        return selector(state);
      }
      return state;
    };
    store.getState = vi.fn(() => state);
    store.subscribe = vi.fn();
    store.setState = vi.fn();
    return store;
  };

  return {
    useNotificationStore: createStore(notificationState),
    useAuthStore: createStore(authState),
    useThemeStore: createStore(themeState),
    useUIStore: createStore(uiState),
    useWorkflowStore: createStore(workflowState),
    useModuleLoadingStore: createStore(moduleLoadingState),
    useShortcutsStore: createStore(shortcutState),
    useNotificationSettingsStore: createStore(notificationSettingsState),
    useBIStore: createStore(biState),
    useAuth: vi.fn(() => authState),
    useTheme: vi.fn(() => themeState),
    useSidebarOpen: vi.fn(() => true),
    useSidebarCollapsed: vi.fn(() => false),
    useToggleSidebar: vi.fn(),
    useSetSidebarOpen: vi.fn(),
    useToggleSidebarCollapsed: vi.fn(),
    useSetSidebarCollapsed: vi.fn(),
    useModuleState: vi.fn(),
    useTotalProgress: vi.fn(() => 100),
    useIsModuleLoaded: vi.fn(() => true),
    useIsModuleLoading: vi.fn(() => false),
    useHasModuleError: vi.fn(() => false),
    useBISummary: vi.fn(),
    useBIDevelopment: vi.fn(),
    useBIQuality: vi.fn(),
    useBIProduction: vi.fn(),
    useBILaboratory: vi.fn(),
    useBILoading: vi.fn(() => false),
    useBIError: vi.fn(() => null),
  };
});

// ─── Mock opentelemetry modules ────────────────────────────────────────────
vi.mock('@opentelemetry/sdk-trace-web', () => ({
  ConsoleSpanExporter: vi.fn(),
  BatchSpanProcessor: vi.fn(),
  WebTracerProvider: vi.fn().mockReturnValue({
    register: vi.fn(),
  }),
}));

vi.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: vi.fn(),
}));

vi.mock('@opentelemetry/context-zone', () => ({
  ZoneContextManager: vi.fn(),
}));

vi.mock('@opentelemetry/instrumentation', () => ({
  Instrumentation: vi.fn(),
  registerInstrumentations: vi.fn(),
}));

vi.mock('@opentelemetry/instrumentation-xml-http-request', () => ({
  XMLHttpRequestInstrumentation: vi.fn(),
}));

vi.mock('@opentelemetry/instrumentation-fetch', () => ({
  FetchInstrumentation: vi.fn(),
}));

vi.mock('@opentelemetry/semantic-conventions', () => ({
  SemanticResourceAttributes: {},
}));

vi.mock('@opentelemetry/propagator-b3', () => ({
  B3Propagator: vi.fn().mockReturnValue({
    inject: vi.fn(),
    extract: vi.fn(),
  }),
}));

vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: vi.fn().mockReturnValue({
      startSpan: vi.fn().mockReturnValue({
        setAttribute: vi.fn(),
        recordException: vi.fn(),
        setStatus: vi.fn(),
        end: vi.fn(),
      }),
    }),
    setSpan: vi.fn(),
  },
  context: {
    active: vi.fn(),
    with: vi.fn(),
  },
  propagation: {
    setGlobalPropagator: vi.fn(),
    inject: vi.fn(),
  },
  SpanStatusCode: {
    ERROR: 'ERROR',
  },
}));

vi.mock('@opentelemetry/resources', () => ({}));

// ─── Mock direct store imports ────────────────────────────────────────────
vi.mock('@/store/notificationStore', () => ({
  useNotificationStore: vi.fn(() => ({
    notifications: [],
    addNotification: vi.fn(),
    removeNotification: vi.fn(),
    clearNotifications: vi.fn(),
  })),
  useNotifications: vi.fn(() => []),
  useAddNotification: vi.fn(),
  useRemoveNotification: vi.fn(),
  useClearNotifications: vi.fn(),
}));

vi.mock('@/store/pluginStore', () => ({
  usePluginStore: vi.fn(() => ({
    plugins: [],
    installedPlugins: [],
    loading: false,
    error: null,
    installPlugin: vi.fn(),
    uninstallPlugin: vi.fn(),
    activatePlugin: vi.fn(),
    deactivatePlugin: vi.fn(),
    fetchPlugins: vi.fn(),
  })),
  useInstalledPlugins: vi.fn(() => []),
  useMarketplacePlugins: vi.fn(() => []),
  usePluginHealthStatus: vi.fn(),
  usePluginLoading: vi.fn(() => false),
  usePluginError: vi.fn(() => null),
  useSelectedPluginCode: vi.fn(() => ''),
  useSelectedPlugins: vi.fn(() => []),
  useSearchQuery: vi.fn(() => ''),
  useActiveCategory: vi.fn(() => ''),
  useIsPluginInstalled: vi.fn(() => false),
  useIsPluginActive: vi.fn(() => false),
  usePluginHealth: vi.fn(),
  useInstalledPlugin: vi.fn(),
  useMarketplacePlugin: vi.fn(),
  useFilteredPlugins: vi.fn(() => []),
  useFilteredInstalledPlugins: vi.fn(() => []),
  useHealthSummary: vi.fn(),
  useInstalledCount: vi.fn(() => 0),
  useActiveCount: vi.fn(() => 0),
}));

// ─── Mock @tanstack/react-query ────────────────────────────────────────────
vi.mock('@tanstack/react-query', () => {
  const mockQueryCache = {
    getAll: vi.fn(() => []),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };

  const mockQueryClient = {
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
    removeQueries: vi.fn(),
    resetQueries: vi.fn(),
    fetchQuery: vi.fn(),
    prefetchQuery: vi.fn(),
    cancelQueries: vi.fn(),
    setQueryDefaults: vi.fn(),
    setMutationDefaults: vi.fn(),
    getQueryState: vi.fn(),
    isFetching: vi.fn(() => 0),
    isMutating: vi.fn(() => 0),
    defaultOptions: {},
    getQueryCache: vi.fn(() => mockQueryCache),
    mount: vi.fn(),
    unmount: vi.fn(),
  };

  const useQueryClient = () => mockQueryClient;

  const useQuery = ({ queryKey, queryFn, initialData, enabled = true, select }: any) => {
    const [data, setData] = React.useState<any>(initialData);
    const [isLoading, setIsLoading] = React.useState<boolean>(!initialData && enabled);
    const [isFetching, setIsFetching] = React.useState<boolean>(!initialData && enabled);
    const [isError, setIsError] = React.useState<boolean>(false);
    const [error, setError] = React.useState<any>(null);
    const [status, setStatus] = React.useState<string>(
      initialData ? 'success' : enabled ? 'pending' : 'pending'
    );

    const fetchData = React.useCallback(() => {
      if (!queryFn) return;
      setIsFetching(true);
      if (!initialData) setIsLoading(true);
      try {
        const result = queryFn();
        if (result && typeof result.then === 'function') {
          result
            .then((res: any) => {
              const selectedData = select ? select(res) : res;
              setData(selectedData);
              setIsError(false);
              setError(null);
              setStatus('success');
            })
            .catch((err: any) => {
              setIsError(true);
              setError(err);
              setStatus('error');
            })
            .finally(() => {
              setIsLoading(false);
              setIsFetching(false);
            });
        } else {
          const selectedData = select ? select(result) : result;
          setData(selectedData);
          setIsError(false);
          setError(null);
          setStatus('success');
          setIsLoading(false);
          setIsFetching(false);
        }
      } catch (err: any) {
        setIsError(true);
        setError(err);
        setStatus('error');
        setIsLoading(false);
        setIsFetching(false);
      }
    }, [queryKey ? JSON.stringify(queryKey) : 'default']);

    React.useEffect(() => {
      if (!enabled || !queryFn) {
        setIsLoading(false);
        setIsFetching(false);
        return;
      }
      fetchData();
    }, [queryKey ? JSON.stringify(queryKey) : 'default', enabled, fetchData]);

    const refetch = React.useCallback(() => {
      if (!queryFn) return Promise.resolve({ data: undefined });
      fetchData();
      return Promise.resolve({ data });
    }, [queryKey ? JSON.stringify(queryKey) : 'default', fetchData, data]);

    return {
      data,
      isLoading,
      isFetching,
      isError,
      error,
      refetch,
      isSuccess: status === 'success',
      isPending: status === 'pending',
      status,
      failureCount: 0,
      isRefetching: false,
    };
  };

  const useMutation = ({ mutationFn, onSuccess, onError, onMutate, onSettled }: any) => {
    const [isPending, setIsPending] = React.useState<boolean>(false);
    const [isError, setIsError] = React.useState<boolean>(false);
    const [error, setError] = React.useState<any>(null);
    const [isSuccess, setIsSuccess] = React.useState<boolean>(false);
    const [data, setData] = React.useState<any>(undefined);
    const [status, setStatus] = React.useState<string>('idle');
    const [variables, setVariables] = React.useState<any>(undefined);

    const mutate = React.useCallback(
      async (vars: any) => {
        setIsPending(true);
        setIsError(false);
        setError(null);
        setIsSuccess(false);
        setStatus('pending');
        setVariables(vars);

        let context: any;
        if (onMutate) {
          try {
            context = onMutate(vars);
          } catch (e) {
            // ignore
          }
        }

        try {
          const result = mutationFn ? await mutationFn(vars) : undefined;
          setData(result);
          setIsSuccess(true);
          setStatus('success');
          if (onSuccess) onSuccess(result, vars, context);
          if (onSettled) onSettled(result, null, vars, context);
          return result;
        } catch (err: any) {
          setIsError(true);
          setError(err);
          setStatus('error');
          if (onError) onError(err, vars, context);
          if (onSettled) onSettled(undefined, err, vars, context);
          throw err;
        } finally {
          setIsPending(false);
        }
      },
      [mutationFn ? mutationFn.toString() : '']
    );

    const mutateAsync = React.useCallback(
      async (vars: any) => {
        return mutate(vars);
      },
      [mutate]
    );

    const reset = React.useCallback(() => {
      setIsPending(false);
      setIsError(false);
      setError(null);
      setIsSuccess(false);
      setData(undefined);
      setStatus('idle');
      setVariables(undefined);
    }, []);

    return {
      mutate,
      mutateAsync,
      isPending,
      isLoading: isPending,
      isError,
      error,
      isSuccess,
      data,
      reset,
      status,
      variables,
    };
  };

  const useInfiniteQuery = ({
    queryKey,
    queryFn,
    initialData,
    enabled = true,
    getNextPageParam,
  }: any) => {
    const [data, setData] = React.useState<any>(initialData ?? { pages: [], pageParams: [] });
    const [isLoading, setIsLoading] = React.useState<boolean>(!initialData && enabled);
    const [isFetching, setIsFetching] = React.useState<boolean>(!initialData && enabled);
    const [isError, setIsError] = React.useState<boolean>(false);
    const [error, setError] = React.useState<any>(null);
    const [hasNextPage, setHasNextPage] = React.useState<boolean>(false);

    React.useEffect(() => {
      if (!enabled || !queryFn) {
        setIsLoading(false);
        setIsFetching(false);
        return;
      }

      let cancelled = false;
      setIsFetching(true);
      if (!initialData) setIsLoading(true);

      Promise.resolve()
        .then(() => queryFn({ pageParam: 0 }))
        .then((result: any) => {
          if (cancelled) return;
          setData({ pages: [result], pageParams: [0] });
          setIsError(false);
          setError(null);
          if (getNextPageParam) {
            const nextParam = getNextPageParam(result, { pages: [result], pageParams: [0] });
            setHasNextPage(nextParam !== undefined && nextParam !== null);
          }
        })
        .catch((err: any) => {
          if (cancelled) return;
          setIsError(true);
          setError(err);
        })
        .finally(() => {
          if (cancelled) return;
          setIsLoading(false);
          setIsFetching(false);
        });

      return () => {
        cancelled = true;
      };
    }, [queryKey ? JSON.stringify(queryKey) : 'default', enabled]);

    const fetchNextPage = React.useCallback(async () => {
      setIsFetching(true);
      try {
        const nextPageParam = data.pageParams.length;
        const result = queryFn ? await queryFn({ pageParam: nextPageParam }) : undefined;
        setData((prev: any) => ({
          pages: [...prev.pages, result],
          pageParams: [...prev.pageParams, nextPageParam],
        }));
        return { data: result };
      } finally {
        setIsFetching(false);
      }
    }, [data, queryKey ? JSON.stringify(queryKey) : 'default']);

    const refetch = React.useCallback(() => {
      setIsFetching(true);
      return Promise.resolve()
        .then(() => queryFn?.({ pageParam: 0 }))
        .then((result: any) => {
          setData({ pages: [result], pageParams: [0] });
          setIsFetching(false);
          return { data: { pages: [result], pageParams: [0] } };
        });
    }, [queryKey ? JSON.stringify(queryKey) : 'default']);

    return {
      data,
      isLoading,
      isFetching,
      isFetchingNextPage: false,
      isFetchingPreviousPage: false,
      hasNextPage,
      hasPreviousPage: false,
      fetchNextPage,
      fetchPreviousPage: vi.fn(),
      isError,
      error,
      refetch,
      isSuccess: !isLoading && !isError,
      status: isLoading ? 'pending' : isError ? 'error' : 'success',
    };
  };

  const QueryClientProvider = ({ children }: any) => children;

  return {
    useQuery,
    useMutation,
    useQueryClient,
    useInfiniteQuery,
    QueryClientProvider,
    QueryClient: vi.fn(function QueryClient() {
      return mockQueryClient;
    }),
    QueryCache: vi.fn(),
    MutationCache: vi.fn(),
    useQueries: vi.fn(() => []),
    useIsFetching: vi.fn(() => 0),
    useIsMutating: vi.fn(() => 0),
    dehydrate: vi.fn(() => ({ queries: [], mutations: [] })),
    hydrate: vi.fn(),
    HydrationBoundary: ({ children }: any) => children,
    keepPreviousData: 'keepPreviousData',
  };
});

// ─── Mock react-i18next ───────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh-CN', changeLanguage: vi.fn() },
  }),
  withTranslation: () => (Component: any) => Component,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

// ─── Mock recharts ─────────────────────────────────────────────────────────
const makeChart = (name: string) => {
  const Component = ({ children, ...props }: any) =>
    React.createElement('div', { 'data-testid': name, ...props }, children);
  Component.displayName = name;
  return Component;
};
vi.mock('recharts', () => ({
  ResponsiveContainer: makeChart('ResponsiveContainer'),
  BarChart: makeChart('BarChart'),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  LineChart: makeChart('LineChart'),
  Line: () => null,
  PieChart: makeChart('PieChart'),
  Pie: () => null,
  Cell: () => null,
  AreaChart: makeChart('AreaChart'),
  Area: () => null,
  RadarChart: makeChart('RadarChart'),
  Radar: () => null,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
  ScatterChart: makeChart('ScatterChart'),
  Scatter: () => null,
  ZAxis: () => null,
  ComposedChart: makeChart('ComposedChart'),
  ReferenceLine: () => null,
  ReferenceArea: () => null,
  Label: () => null,
  LabelList: () => null,
  RadialBarChart: makeChart('RadialBarChart'),
  RadialBar: () => null,
  FunnelChart: makeChart('FunnelChart'),
  Funnel: () => null,
  Treemap: makeChart('Treemap'),
  Sankey: makeChart('Sankey'),
}));

// ─── Mock CrudPage and complex template components ────────────────────────
vi.mock('@/components/templates/CrudPage', () => {
  const React = require('react');
  return {
    default: ({ schema, breadcrumbs, headerContent, children }: any) => {
      const title = schema?.title || 'CRUD';
      return React.createElement('div', { 'data-testid': 'crud-page' },
        React.createElement('h1', null, title),
        headerContent,
        children
      );
    },
  };
});

vi.mock('@/components/templates', () => ({
  DashboardTemplate: ({ children }: any) => React.createElement('div', null, children),
  ListPageTemplate: ({ children }: any) => React.createElement('div', null, children),
}));

vi.mock('@/components/common', () => ({
  PageContainer: ({ children }: any) => React.createElement('div', null, children),
  LoadingSpinner: () => React.createElement('div', { 'data-testid': 'loading' }, 'Loading...'),
  FormBuilder: () => React.createElement('div', null, 'Form'),
}));

vi.mock('@/components/bi/DashboardEditor', () => ({
  DashboardEditor: () => React.createElement('div', null, 'DashboardEditor'),
}));

vi.mock('@/components/bi/DashboardTemplateManager', () => ({
  DashboardTemplateManager: () => React.createElement('div', null, 'DashboardTemplateManager'),
}));

vi.mock('@/components/export', () => ({
  ExportButton: () => React.createElement('button', null, 'Export'),
}));

// ─── Mock utils/logger ────────────────────────────────────────────────────
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  log: vi.fn(),
  group: vi.fn(),
  groupEnd: vi.fn(),
  table: vi.fn(),
  time: vi.fn(),
  timeEnd: vi.fn(),
  child: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    setLevel: vi.fn(),
  })),
  setLevel: vi.fn(),
};
vi.mock('@/utils/logger', () => ({
  default: vi.fn(() => mockLogger),
  createLogger: vi.fn(() => mockLogger),
  logger: mockLogger,
  apiLogger: { ...mockLogger },
  authLogger: { ...mockLogger },
  errorLogger: { ...mockLogger },
  LogLevel: 'info',
}));

// ─── Mock schema helpers ──────────────────────────────────────────────────
vi.mock('@/schema/crudPageAdapter', () => ({
  createCrudPageAdapter: (api: any) => api,
}));

vi.mock('@/schema', () => ({
  getColumns: vi.fn(() => []),
  getFormFields: vi.fn(() => []),
  getFilterParams: vi.fn(() => ({})),
}));

// ─── Mock @/components/common subpath exports ──────────────────────────────
vi.mock('@/components/common/FormBuilder', () => ({
  FormBuilder: () => React.createElement('div', null, 'FormBuilder'),
}));

// ─── react-transition-group sub-path ESM compatibility is handled by ─────
// patching MUI's .mjs imports to use explicit `/cjs/` paths (see pretest script).

// ─── Mock react-transition-group subpath Context (MUI 9 imports as bare specifier) ───
vi.mock('react-transition-group/TransitionGroupContext', () => ({
  __esModule: true,
  default: React.createContext({}),
}));
