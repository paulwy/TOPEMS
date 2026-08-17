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

// ─── Mock react-i18next with translation lookup ────────────────────────────
const __TEST_TRANSLATIONS__: Record<string, string> = {
  // shared.config (module config names - explicit per-module to avoid k0 conflicts)
  'shared.config.iam_name': '身份与权限',
  'shared.config.admin_name': '系统管理',
  'shared.config.k0': '模块',
  'shared.config.k1': '系统配置',
  'shared.config.k2': '概览',
  'shared.config.k3': '名称',
  'shared.config.k4': '详情',
  'shared.config.k5': '配置',
  'shared.config.k6': '自动化',
  'shared.config.k7': '设置',
  // shared.data_export
  'shared.data_export.k0': '导出',
  'shared.data_export.excel_1': '导出 Excel',
  'shared.data_export.csv_2': '导出 CSV',
  'shared.data_export.pdf_3': '导出 PDF',
  'shared.data_export.k4': '导出设置',
  'shared.data_export.k5': '请输入文件名',
  'shared.data_export.k6': '选择导出字段',
  'shared.data_export.k7': '取消',
  // components.data_export
  'components.data_export.k0': '导出设置',
  'components.data_export.k1': '文件名',
  'components.data_export.k2': '导出格式',
  'components.data_export.k3': '全选',
  'components.data_export.k4': '取消全选',
  'components.data_export.k5': '字段',
  'components.data_export.k6': '导出',
  // shared.quick_search
  'shared.quick_search.k0': '清除',
  'shared.quick_search.k1': '清除历史',
  // components.quick_search
  'components.quick_search.k0': '搜索...',
  'components.quick_search.k1': '搜索建议',
  'components.quick_search.k2': '搜索历史',
  'components.quick_search.k3': '未找到相关结果',
  'components.quick_search.enter_0': '按回车搜索',
  'components.quick_search.query_0': '搜索',
  // shared.format
  'shared.format.k0': '刚刚',
  'shared.format.k1': '未启用',
  'shared.format.k2': '已启用',
  'shared.format.k3': '活跃',
  'shared.format.k4': '停用',
  'shared.format.k5': '待处理',
  'shared.format.k6': '已批准',
  'shared.format.k7': '已拒绝',
  'shared.format.k8': '已完成',
  'shared.format.k9': '处理中',
  'shared.format.k10': '已取消',
  'shared.format.k11': '草稿',
  'shared.format.k12': '已发布',
  'shared.format.k13': '已删除',
  'shared.format.k14': '成功',
  'shared.format.k15': '失败',
  'shared.format.k16': '警告',
  'shared.format.k17': '错误',
  'shared.format.yyyymm_12': 'YYYY年MM月',
  'shared.format.duration.hour': '小时',
  'shared.format.duration.minute': '分钟',
  'shared.format.duration.second': '秒',
  'shared.format.relative_time.minute_ago': '分钟前',
  'shared.format.relative_time.hour_ago': '小时前',
  'shared.format.relative_time.day_ago': '天前',
  'shared.format.relative_time.week_ago': '周前',
  'shared.format.relative_time.month_ago': '个月前',
  'shared.format.relative_time.year_ago': '年前',
  // system (LogConfigPanel)
  'system.system_params_page_components_log_config_panel.e1': '日志级别和格式',
  'system.system_params_page_components_log_config_panel.e2': '配置日志的输出级别和记录格式',
  'system.system_params_page_components_log_config_panel.e3': '文件输出配置',
  'system.system_params_page_components_log_config_panel.e4': '配置日志文件的存储策略',
  'system.system_params_page_components_log_config_panel.e5': '文件输出',
  'system.system_params_page_components_log_config_panel.e6': '高级配置',
  'system.system_params_page_components_log_config_panel.e7': '控制台、数据库与远程日志',
  'system.log_config_panel.k0': '日志级别',
  'system.log_config_panel.k1': '日志级别',
  'system.log_config_panel.k2': '日志格式',
  'system.log_config_panel.k3': '日志格式',
  'system.log_config_panel.k4': '文本',
  'system.log_config_panel.k5': '输出方式',
  'system.log_config_panel.k6': '输出方式',
  'system.log_config_panel.k7': '仅控制台',
  'system.log_config_panel.k8': '仅文件',
  'system.log_config_panel.k9': '控制台和文件',
  'system.log_config_panel.k10': '记录到数据库',
  'system.log_config_panel.k11': '已启用',
  'system.log_config_panel.k12': '已禁用',
  'system.log_config_panel.k13': '日志文件路径',
  'system.log_config_panel.mb_14': '单文件最大大小 (MB)',
  'system.log_config_panel.k15': '保留文件数量',
  'system.log_config_panel.k16': '控制台输出',
  'system.log_config_panel.k17': '启用远程日志',
  'system.log_config_panel.url_18': '远程日志URL',
  'system.log_config_panel.k19': '保存配置',
  'system.system_params_page_components_cache_config_panel.m4': '保存中...',
  // shared.error_handler (utils/errorHandler 全局错误分类使用)
  'shared.error_handler.k0': '未知错误',
  'shared.error_handler.k1': '网络连接失败，请检查网络设置',
  'shared.error_handler.k2': '请求超时，请稍后重试',
  'shared.error_handler.k3': '登录已过期，请重新登录',
  'shared.error_handler.k4': '没有权限执行此操作',
  'shared.error_handler.k5': '请求的资源不存在',
  'shared.error_handler.k6': '请求数据验证失败',
  'shared.error_handler.k7': '服务器内部错误，请联系管理员',
  'shared.error_handler.k8': '服务暂时不可用，请稍后重试',
  'shared.error_handler.k9': '服务器未响应，请检查网络连接',
  'shared.error_handler.k10': '操作失败',
  'shared.error_handler.k11': '操作失败',
  // shared.location_message (使用实际 zh/shared.json 翻译值)
  'shared.location_message.k0': '搜索完成',
  'shared.location_message.k1': '创建围栏失败',
  'shared.location_message.k2': '未知错误',
  'shared.location_message.k3': '同步失败',
  'shared.location_message.k4': '围栏已创建',
  'shared.location_message.k5': '同步失败:',
  'shared.location_message.k6': '更新围栏失败',
  'shared.location_message.k7': '未知错误',
  'shared.location_message.k8': '同步失败',
  'shared.location_message.k9': '围栏已更新',
  'shared.location_message.k10': '围栏不存在',
  'shared.location_message.k11': '未知错误',
  'shared.location_message.k12': '同步状态：待同步',
  'shared.location_message.k14': '搜索完成',
  'shared.location_message.k15': '无结果',
  'shared.location_message.k16': '未知错误',
  'shared.location_message.gis_5': '围栏创建并同步到 GIS',
  'shared.location_message.gis_6': 'GIS 搜索失败:',
  'shared.location_message.gis_13': '围栏已同步到 GIS',
};

const __mockTranslate = (key: string, ns?: string): string => {
  if (ns) {
    const full = `${ns}.${key}`;
    if (__TEST_TRANSLATIONS__[full]) return __TEST_TRANSLATIONS__[full];
  }
  return __TEST_TRANSLATIONS__[key] ?? key;
};

vi.mock('react-i18next', () => ({
  useTranslation: (ns?: string) => ({
    t: (key: string) => __mockTranslate(key, ns),
    i18n: {
      language: 'zh-CN',
      changeLanguage: vi.fn(),
      exists: (k: string) => !!__TEST_TRANSLATIONS__[k],
    },
    ready: true,
  }),
  withTranslation: () => (Component: any) => Component,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  Trans: ({ i18nKey, children }: { i18nKey?: string; children?: any }) =>
    React.createElement(React.Fragment, null, __mockTranslate(i18nKey || '') || children),
}));

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => __mockTranslate(key),
    language: 'zh-CN',
    changeLanguage: vi.fn(),
    exists: (key: string) => !!__TEST_TRANSLATIONS__[key],
    loadNamespaces: vi.fn().mockResolvedValue(undefined),
  },
  ensureLanguageLoaded: vi.fn().mockResolvedValue(undefined),
  ensureNamespacesLoaded: vi.fn().mockResolvedValue(undefined),
  loadTranslationsForLang: vi.fn().mockResolvedValue(undefined),
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
      return React.createElement(
        'div',
        { 'data-testid': 'crud-page' },
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
