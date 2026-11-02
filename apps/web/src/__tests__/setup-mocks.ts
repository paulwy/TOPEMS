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
    toggleTheme: vi.fn(),
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
    getThemeList: vi.fn(() => [
      { value: 'light', label: 'Light', description: '' },
      { value: 'dark', label: 'Dark', description: '' },
      { value: 'system', label: 'System', description: '' },
    ]),
    THEME_ICON_KEYS: { light: 'light', dark: 'dark', system: 'system' },
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

    // Use refs so the stable `mutate` callback always invokes the latest
    // mutationFn / callbacks (avoids stale-closure when state captured by the
    // mutationFn changes between renders).
    const mutationFnRef = React.useRef(mutationFn);
    const onSuccessRef = React.useRef(onSuccess);
    const onErrorRef = React.useRef(onError);
    const onMutateRef = React.useRef(onMutate);
    const onSettledRef = React.useRef(onSettled);
    React.useEffect(() => {
      mutationFnRef.current = mutationFn;
      onSuccessRef.current = onSuccess;
      onErrorRef.current = onError;
      onMutateRef.current = onMutate;
      onSettledRef.current = onSettled;
    });

    const mutate = React.useCallback(async (vars: any) => {
      setIsPending(true);
      setIsError(false);
      setError(null);
      setIsSuccess(false);
      setStatus('pending');
      setVariables(vars);

      let context: any;
      if (onMutateRef.current) {
        try {
          context = onMutateRef.current(vars);
        } catch (e) {
          // ignore
        }
      }

      try {
        const result = mutationFnRef.current ? await mutationFnRef.current(vars) : undefined;
        setData(result);
        setIsSuccess(true);
        setStatus('success');
        if (onSuccessRef.current) onSuccessRef.current(result, vars, context);
        if (onSettledRef.current) onSettledRef.current(result, null, vars, context);
        return result;
      } catch (err: any) {
        setIsError(true);
        setError(err);
        setStatus('error');
        if (onErrorRef.current) onErrorRef.current(err, vars, context);
        if (onSettledRef.current) onSettledRef.current(undefined, err, vars, context);
        throw err;
      } finally {
        setIsPending(false);
      }
    }, []);

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
  // @topems/shared-components i18n keys (raw i18next singleton)
  'shared.status_badge.active': '启用',
  'shared.status_badge.inactive': '停用',
  'shared.status_badge.pending': '待处理',
  'shared.status_badge.approved': '已批准',
  'shared.status_badge.rejected': '已拒绝',
  'shared.status_badge.draft': '草稿',
  'shared.status_badge.published': '已发布',
  'shared.status_badge.archived': '已归档',
  'shared.status_badge.deleted': '已删除',
  'shared.status_badge.completed': '已完成',
  'shared.status_badge.cancelled': '已取消',
  'shared.status_badge.processing': '处理中',
  'shared.status_badge.failed': '失败',
  'shared.status_badge.success': '成功',
  'shared.status_badge.warning': '警告',
  'shared.status_badge.error': '错误',
  'shared.status_badge.info': '信息',
  'shared.status_badge.employee_active': '在职',
  'shared.status_badge.employee_inactive': '离职',
  'shared.status_badge.customer_active': '活跃',
  'shared.status_badge.project_active': '进行中',
  'shared.status_badge.workflow_approved': '已通过',
  'shared.status_badge.finance_posted': '已记账',
  'components.pagination.total': '共 {{total}} 条，第 {{current}}/{{pageCount}} 页',
  'components.pagination.first_page': '第一页',
  'components.pagination.last_page': '最后一页',
  'components.pagination.prev_page': '上一页',
  'components.pagination.next_page': '下一页',
  'components.pagination.per_page': '每页',
  'components.cascader.placeholder': '请选择',
  'components.cascader.back_text': '返回',
  'shared.date_range_picker.placeholder': '选择日期范围',
  'shared.date_range_picker.today': '今天',
  'shared.date_range_picker.yesterday': '昨天',
  'shared.date_range_picker.this_week': '本周',
  'shared.date_range_picker.this_month': '本月',
  'shared.date_range_picker.this_quarter': '本季度',
  'shared.date_range_picker.this_year': '今年',
  'shared.date_range_picker.quick_select': '快捷选择',
  'shared.date_range_picker.cancel': '取消',
  'shared.date_range_picker.confirm': '确定',
  'components.filter_bar.title': '筛选条件',
  'components.filter_bar.collapse': '收起筛选',
  'components.filter_bar.expand': '展开筛选',
  'components.filter_bar.reset': '重置筛选',
  'components.filter_bar.search': '搜索',
  'components.filter_bar.all': '全部',
  'components.filter_bar.start_date': '开始日期',
  'components.filter_bar.end_date': '结束日期',
  'components.filter_bar.separator': '至',
  'components.filter_bar.applied_filters': '已选条件',
};

// ─── Supplement translations from real zh locale files ─────────────────────
// 很多组件直接调用 `i18n.t('module.page.key')`，其译文保存在 src/i18n/locales/zh/*.json。
// 这里把真实 zh locale 合并进 __TEST_TRANSLATIONS__（仅填充缺失键，不覆盖手工维护值），
// 使 `i18n.t()` 返回真实中文而不是原始 key。扁平 key 与嵌套对象都会被展开。
const __flattenLocale = (obj: Record<string, unknown>, prefix = ''): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, __flattenLocale(v as Record<string, unknown>, key));
    } else if (typeof v === 'string') {
      out[key] = v;
    }
  }
  return out;
};
(() => {
  const localeFiles = [
    'admin',
    'ai',
    'api',
    'aps',
    'asset',
    'automation',
    'bi',
    'common',
    'components',
    'config',
    'context',
    'crm',
    'debug',
    'design_system',
    'design-system',
    'desktop',
    'dev_platform',
    'dev-platform',
    'devtools',
    'doc',
    'ehs',
    'erp',
    'finance',
    'fullstack_automation',
    'gis',
    'help',
    'hooks',
    'hrm',
    'iam',
    'im',
    'integration',
    'intelligent_ops',
    'intelligent-ops',
    'layouts',
    'lib',
    'lims',
    'mes',
    'microfrontend',
    'master',
    'mobile',
    'monitor',
    'notification',
    'oa',
    'pages',
    'pdm',
    'performance',
    'plugin',
    'pm',
    'qms',
    'rd',
    'report',
    'routes',
    'schema',
    'schemas',
    'scm',
    'services',
    'shared',
    'srm',
    'store',
    'system',
    'templates',
    'theme',
    'ticket',
    'tms',
    'utils',
    'wms',
    'workflow',
  ];
  for (const name of localeFiles) {
    try {
      const raw = require(`../i18n/locales/zh/${name}.json`) as Record<string, unknown>;
      for (const [k, v] of Object.entries(__flattenLocale(raw))) {
        if (!(k in __TEST_TRANSLATIONS__)) __TEST_TRANSLATIONS__[k] = v;
      }
    } catch {
      // ignore missing locale files
    }
  }
})();

const __mockTranslate = (key: string, ns?: string, opts?: Record<string, unknown>): string => {
  let text: string | undefined;
  if (ns) {
    const full = `${ns}.${key}`;
    text = __TEST_TRANSLATIONS__[full] ?? __TEST_TRANSLATIONS__[key];
  } else {
    text = __TEST_TRANSLATIONS__[key];
  }
  if (text === undefined) return key;
  if (opts && Object.keys(opts).length > 0) {
    return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) =>
      name in opts ? String(opts[name]) : `{{${name}}}`
    );
  }
  return text;
};

vi.mock('react-i18next', () => ({
  useTranslation: (ns?: string) => ({
    t: (key: string, opts?: Record<string, unknown>) => __mockTranslate(key, ns, opts),
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
  subscribeResourceVersion: vi.fn(() => () => {}),
  getResourceVersion: () => 0,
}));

// ─── Mock raw i18next (used by @topems/shared-components) ──────────────────
vi.mock('i18next', () => {
  const interpolate = (base: string, options?: Record<string, unknown>): string => {
    if (!options) return base;
    let out = base;
    for (const [k, v] of Object.entries(options)) {
      out = out.split(`{{${k}}}`).join(String(v));
      out = out.split(`{${k}}`).join(String(v));
      out = out.split(`\${${k}}`).join(String(v));
    }
    return out;
  };
  const t = (key: string, options?: Record<string, unknown>) =>
    interpolate(__TEST_TRANSLATIONS__[key] ?? key, options);
  const mockI18n = {
    t,
    language: 'zh-CN',
    changeLanguage: vi.fn(),
    exists: (key: string) => !!__TEST_TRANSLATIONS__[key],
    on: vi.fn(),
    off: vi.fn(),
    use: vi.fn(() => mockI18n),
    init: vi.fn(),
  };
  return { default: mockI18n, ...mockI18n };
});

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
  const CrudPageImpl = ({ schema, apiAdapter, customRowActions, actions, headerContent, children }: any) => {
      const { useState, useEffect } = React;
      const [rows, setRows] = useState<any[]>([]);
      const [loading, setLoading] = useState<boolean>(true);
      // 与 __listPageTemplate 的 crud 模式一致：adapter.list → 行数据（页面测试 mock 的 api 会经 adapter 命中）
      useEffect(() => {
        let active = true;
        if (!apiAdapter?.list) {
          setLoading(false);
          return;
        }
        setLoading(true);
        Promise.resolve(apiAdapter.list({ page: 1, pageSize: 1000, search: undefined }))
          .then((resp: any) => {
            if (!active) return;
            const items =
              resp?.data?.items ??
              resp?.data?.data ??
              resp?.data ??
              (Array.isArray(resp) ? resp : []);
            setRows(Array.isArray(items) ? items : []);
            setLoading(false);
          })
          .catch(() => {
            if (active) {
              setRows([]);
              setLoading(false);
            }
          });
        return () => {
          active = false;
        };
      }, [apiAdapter]);

      const title = schema?.title || 'CRUD';
      const nodes: React.ReactNode[] = [React.createElement('h1', { key: '__t' }, title)];
      if (headerContent) {
        // 函数型 headerContent（monitor/rd 等页面传 (rows, total) => JSX 或 () => JSX）
        // 必须调用后才能作为 ReactNode 渲染，否则报 "Functions are not valid as a React child"
        nodes.push(
          typeof headerContent === 'function'
            ? headerContent(rows, rows.length)
            : headerContent
        );
      }
      if (loading) {
        nodes.push(
          React.createElement(
            'div',
            { key: '__loading', 'data-testid': 'crud-loading' },
            'Loading...'
          )
        );
      }
      rows.forEach((row: any, ri: number) => {
        const rowNodes: React.ReactNode[] = (schema?.fields ?? []).map((f: any) =>
          React.createElement(
            'span',
            { key: f.name, 'data-testid': `cell-${f.name}-${ri}` },
            String(row[f.name] ?? '')
          )
        );
        (customRowActions ?? [])
          .filter((a: any) => !a.show || a.show(row))
          .forEach((a: any) => {
            rowNodes.push(
              React.createElement(
                'button',
                {
                  key: a.key,
                  'data-testid': `row-action-${a.key}-${ri}`,
                  onClick: () => a.onClick(row),
                },
                a.label
              )
            );
          });
        nodes.push(
          React.createElement('div', { key: ri, 'data-testid': `crud-row-${ri}` }, ...rowNodes)
        );
      });
      if (children) nodes.push(children);
      return React.createElement('div', { 'data-testid': 'crud-page' }, ...nodes);
  };
  // 同时提供 default 与命名导出 CrudPage：rd 等 8 页使用 `import { CrudPage } from '@/components/templates/CrudPage'`
  return { default: CrudPageImpl, CrudPage: CrudPageImpl };
});

const __templateStub = ({ children }: any) => React.createElement('div', null, children);
const __dashboardTemplate = ({ children, statCards, stats, title }: any) => {
  const cards = statCards ?? stats ?? [];
  const nodes: React.ReactNode[] = [];
  if (title != null) nodes.push(React.createElement('div', { key: '__t' }, title));
  cards.forEach((c: any, i: number) => {
    nodes.push(
      React.createElement(
        'div',
        { key: i, 'data-testid': `stat-card-${c?.id ?? i}` },
        React.createElement('span', null, c?.title),
        React.createElement('span', null, `${c?.value ?? ''}${c?.suffix ?? ''}`)
      )
    );
  });
  if (children) nodes.push(children);
  return React.createElement('div', null, ...nodes);
};
const __listPageTemplate = ({
  children,
  title,
  subtitle,
  columns,
  data: dataProp,
  loading: propLoading,
  emptyMessage,
  actions,
  rowActions,
  renderRowActions,
  crud,
  toolbar,
}: any) => {
  const api = crud?.api;
  const hasCrud = !!api;
  const [state, setState] = React.useState<any>({
    loading: propLoading ?? hasCrud,
    data: dataProp ?? [],
    error: null,
    formOpen: false,
    formValues: {},
  });
  // 非 crud 模式：父组件异步更新 data / loading 时保持同步
  React.useEffect(() => {
    if (hasCrud) return;
    setState((s: any) => ({ ...s, data: dataProp ?? [] }));
  }, [dataProp]);
  React.useEffect(() => {
    if (hasCrud) return;
    setState((s: any) => ({ ...s, loading: propLoading ?? false }));
  }, [propLoading]);
  React.useEffect(() => {
    if (!api) return;
    let active = true;
    setState((s: any) => ({ ...s, loading: true, error: null }));
    Promise.resolve(api.list({ page: 1, pageSize: 1000 }))
      .then((resp: any) => {
        if (!active) return;
        const items = resp?.data?.items ?? resp?.data?.data ?? resp?.data ?? resp;
        setState((s: any) => ({ ...s, loading: false, data: Array.isArray(items) ? items : [] }));
      })
      .catch((err: any) => {
        if (!active) return;
        setState((s: any) => ({
          ...s,
          loading: false,
          data: [],
          error: err?.message ?? String(err),
        }));
      });
    return () => {
      active = false;
    };
  }, [api]);

  const nodes: React.ReactNode[] = [];
  if (title != null) nodes.push(React.createElement('div', { key: '__t' }, title));
  if (subtitle != null) nodes.push(React.createElement('div', { key: '__s' }, subtitle));
  const toolbarActions =
    hasCrud && crud?.createButtonText
      ? [
          {
            label: crud.createButtonText,
            onClick: () => setState((s: any) => ({ ...s, formOpen: true, formValues: {} })),
          },
        ]
      : (actions ?? []);
  if (toolbarActions && toolbarActions.length > 0) {
    toolbarActions.forEach((a: any, ai: number) => {
      nodes.push(React.createElement('button', { key: `__a${ai}`, onClick: a?.onClick }, a?.label));
    });
  }
  if (state.loading) {
    nodes.push(React.createElement('div', { key: '__prog', role: 'progressbar' }, 'Loading...'));
  } else {
    // 表头（列标签）：真实 ListPageTemplate 在空态/数据态都渲染表头
    (columns ?? []).forEach((col: any, ci: number) => {
      nodes.push(
        React.createElement(
          'div',
          { key: `__h${ci}`, 'data-testid': `header-${col?.id ?? ci}` },
          col?.label
        )
      );
    });
    if (state.error != null) {
      nodes.push(React.createElement('div', { key: '__err' }, state.error));
    } else if (!state.data || state.data.length === 0) {
      if (emptyMessage != null)
        nodes.push(React.createElement('div', { key: '__empty' }, emptyMessage));
    } else {
      (state.data as any[]).forEach((row, ri) => {
        (columns ?? []).forEach((col: any, ci: number) => {
          const cell = col?.render ? col.render(row) : row?.[col?.id ?? col?.field ?? ''];
          nodes.push(
            React.createElement(
              'div',
              { key: `__r${ri}c${ci}`, 'data-testid': `cell-${col?.id ?? ci}` },
              cell
            )
          );
        });
        const acts: any[] = [...(rowActions ?? crud?.rowActions ?? [])];
        if (hasCrud) {
          acts.push({
            key: '__del',
            label: '删除',
            onClick: (r: any) => {
              const delFn = api?.delete ?? api?.remove;
              if (delFn) void delFn(r?.id ?? r?.key);
            },
          });
        }
        if (renderRowActions) {
          nodes.push(
            React.createElement(
              'div',
              { key: `__ra${ri}`, 'data-testid': `row-actions-${ri}` },
              renderRowActions(row)
            )
          );
        } else if (acts.length > 0) {
          acts.forEach((ra: any, rj: number) => {
            nodes.push(
              React.createElement(
                'button',
                { key: `__rr${ri}-${rj}`, onClick: () => ra?.onClick?.(row) },
                ra?.label
              )
            );
          });
        }
      });
    }
  }
  if (hasCrud && state.formOpen) {
    const fields = crud?.formFields ?? [];
    const requiredFields = fields.filter((f: any) => f?.required);
    const allFilled = requiredFields.every(
      (f: any) => ((state.formValues[f?.key] ?? '') as string).trim() !== ''
    );
    const submitLabel = crud?.createSubmitText ?? '创建';
    nodes.push(
      React.createElement(
        'div',
        { key: '__dlg', role: 'dialog' },
        React.createElement('h2', null, crud?.createButtonText ?? '新建'),
        ...fields.map((f: any, fi: number) =>
          React.createElement('input', {
            key: `__f${fi}`,
            'aria-label': f?.label ?? String(f?.key),
            value: state.formValues[f?.key] ?? '',
            onChange: (e: any) =>
              setState((s: any) => ({
                ...s,
                formValues: { ...s.formValues, [f?.key]: e.target.value },
              })),
          })
        ),
        React.createElement(
          'button',
          {
            key: '__create',
            disabled: !allFilled,
            onClick: () => {
              void api.create(state.formValues);
              setState((s: any) => ({ ...s, formOpen: false }));
            },
          },
          submitLabel
        ),
        React.createElement(
          'button',
          { key: '__cancel', onClick: () => setState((s: any) => ({ ...s, formOpen: false })) },
          '取消'
        )
      )
    );
  }
  return React.createElement('div', null, ...nodes, children);
};
// 显式具名导出（vitest mock 校验走普通属性访问，Proxy 不可靠）。
const __statsPageTemplate = ({
  children,
  loading,
  statCards,
  title,
  tables,
  customToolbar,
  tabs,
  tabValue,
  onTabChange,
}: any) => {
  if (loading) {
    return React.createElement('div', { role: 'progressbar' }, 'Loading...');
  }
  const nodes: React.ReactNode[] = [];
  if (title != null) nodes.push(React.createElement('div', { key: '__t' }, title));
  if (customToolbar) nodes.push(React.createElement('div', { key: '__toolbar' }, customToolbar));
  (tabs ?? []).forEach((t: any, i: number) => {
    nodes.push(
      React.createElement(
        'button',
        {
          key: `__tab${i}`,
          'data-testid': `stat-tab-${t.value}`,
          'aria-selected': t.value === tabValue,
          onClick: () => onTabChange?.(t.value),
        },
        t.label
      )
    );
  });
  (statCards ?? []).forEach((c: any, i: number) => {
    nodes.push(
      React.createElement(
        'div',
        { key: `__sc${i}`, 'data-testid': `stat-card-${c?.id ?? i}` },
        React.createElement('span', null, c?.title),
        React.createElement('span', null, `${c?.value ?? ''}${c?.suffix ?? ''}`)
      )
    );
  });
  (tables ?? []).forEach((tb: any, ti: number) => {
    if (tb?.title != null) nodes.push(React.createElement('div', { key: `__tt${ti}` }, tb.title));
    (tb?.data ?? []).forEach((row: any, ri: number) => {
      (tb?.columns ?? []).forEach((col: any, ci: number) => {
        const cell = col?.render
          ? col.render(row[col?.field ?? col?.id], row)
          : row[col?.field ?? col?.id ?? ''];
        nodes.push(
          React.createElement(
            'div',
            { key: `__tr${ti}-${ri}-${ci}`, 'data-testid': `tcell-${col?.id ?? ci}` },
            cell
          )
        );
      });
    });
  });
  return React.createElement('div', null, ...nodes, children);
};
vi.mock('@/components/templates', () => ({
  DashboardTemplate: __dashboardTemplate,
  ListPageTemplate: __listPageTemplate,
  DetailPageTemplate: __templateStub,
  MasterDetailPageTemplate: __templateStub,
  FormPageTemplate: __templateStub,
  TreePageTemplate: __templateStub,
  CardListTemplate: __templateStub,
  GisMapTemplate: __templateStub,
  ChatPageTemplate: __templateStub,
  AiToolPageTemplate: __templateStub,
  StatsPageTemplate: __statsPageTemplate,
  SettingsPageTemplate: __templateStub,
  WizardPageTemplate: __templateStub,
  AuthPageTemplate: __templateStub,
  MobilePageTemplate: __templateStub,
  DesignerTemplate: __templateStub,
  CardAction: __templateStub,
  ChartCard: __templateStub,
  GeoFence: __templateStub,
  MapMarker: __templateStub,
  MasterColumn: __templateStub,
  PageAction: __templateStub,
  QuickAction: __templateStub,
  RowAction: __templateStub,
  SettingSection: __templateStub,
  StatCard: __templateStub,
  StatsStatCard: __templateStub,
  TreeNode: __templateStub,
  TrackPoint: __templateStub,
  WizardStep: __templateStub,
  default: __templateStub,
}));
// 子路径模板导入（部分页面直接从子路径 import，不走 barrel）
vi.mock('@/components/templates/StatsPageTemplate', () => ({
  StatsPageTemplate: __statsPageTemplate,
  default: __statsPageTemplate,
}));
vi.mock('@/components/templates/ListPageTemplate', () => ({
  ListPageTemplate: __listPageTemplate,
  default: __listPageTemplate,
}));
vi.mock('@/components/templates/DashboardTemplate', () => ({
  DashboardTemplate: __dashboardTemplate,
  StatCard: __templateStub,
  default: __dashboardTemplate,
}));
vi.mock('@/components/templates/DetailPageTemplate', () => ({
  DetailPageTemplate: __templateStub,
  default: __templateStub,
}));
vi.mock('@/components/templates/FormPageTemplate', () => ({
  FormPageTemplate: __templateStub,
  default: __templateStub,
}));
vi.mock('@/components/templates/SettingsPageTemplate', () => ({
  SettingsPageTemplate: __templateStub,
  default: __templateStub,
}));
vi.mock('@/components/templates/DesignerTemplate', () => ({
  DesignerTemplate: __templateStub,
  default: __templateStub,
}));
vi.mock('@/components/templates/GisMapTemplate', () => ({
  GisMapTemplate: __templateStub,
  default: __templateStub,
}));
vi.mock('@/components/templates/KanbanPageTemplate', () => ({
  KanbanPageTemplate: __templateStub,
  default: __templateStub,
}));
vi.mock('@/components/templates/ReportViewerTemplate', () => ({
  ReportViewerTemplate: __templateStub,
  default: __templateStub,
}));
vi.mock('@/components/templates/TreeBuilder', () => ({
  TreeBuilder: __templateStub,
  default: __templateStub,
}));

const __commonFallback = ({ children, title }: any) =>
  React.createElement('div', null, children, title);
// 显式具名导出（vitest mock 校验走普通属性访问，Proxy 不可靠）。
vi.mock('@/components/common', () => ({
  PageContainer: ({ children }: any) => React.createElement('div', null, children),
  LoadingSpinner: () => React.createElement('div', { 'data-testid': 'loading' }, 'Loading...'),
  FormBuilder: () => React.createElement('div', null, 'Form'),
  FormDialog: ({ children, title, open }: any) =>
    open === false ? null : React.createElement('div', { role: 'dialog' }, children, title),
  FormDrawer: ({ children }: any) => React.createElement('div', null, children),
  ActionButton: __commonFallback,
  BackButton: __commonFallback,
  ConfirmDialog: ({ children }: any) => React.createElement('div', null, children),
  CurrencyField: __commonFallback,
  DataExport: __commonFallback,
  DataTable: __commonFallback,
  Dialog: __commonFallback,
  EmptyState: __commonFallback,
  FormField: __commonFallback,
  FormSelect: __commonFallback,
  Grid: __commonFallback,
  ImageUpload: __commonFallback,
  StatCardGroup: __commonFallback,
  StatusBadge: __commonFallback,
  StatusChip: __commonFallback,
  default: __commonFallback,
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

// ─── Mock useTheme to return the app custom theme (with extended palette colors) ─────────
// v9 迁移后，扩展色（purple/orange/teal/cyan/pink/yellow/blue 等）只存在于应用自定义 theme。
// 直接 render（无 ThemeProvider）的页面测试里 useTheme() 会拿到 MUI 默认 palette，
// 访问扩展色崩（Cannot read properties of undefined (reading '500')）。
// 这里让 useTheme 恒返回默认 theme + 内联扩展色色阶（与 packages/tokens 色值一致），
// 与真实运行时对齐；对已包 ThemeProvider 的测试无副作用（同色值）。
const __extendedPalette = {
  teal: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
    main: '#14b8a6',
    light: '#2dd4bf',
    dark: '#0d9488',
  },
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
    main: '#f97316',
    light: '#fb923c',
    dark: '#ea580c',
  },
  yellow: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
    main: '#eab308',
    light: '#fde047',
    dark: '#ca8a04',
  },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    main: '#3b82f6',
    light: '#60a5fa',
    dark: '#2563eb',
  },
  cyan: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
    main: '#06b6d4',
    light: '#22d3ee',
    dark: '#0891b2',
  },
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
    main: '#a855f7',
    light: '#c084fc',
    dark: '#9333ea',
  },
  pink: {
    50: '#fdf2f8',
    100: '#fce7f3',
    200: '#fbcfe8',
    300: '#f9a8d4',
    400: '#f472b6',
    500: '#ec4899',
    600: '#db2777',
    700: '#be185d',
    800: '#9d174d',
    900: '#831843',
    main: '#ec4899',
    light: '#f472b6',
    dark: '#db2777',
  },
  surface: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
  },
  accent: { main: '#ffd700', light: '#fcd34d', dark: '#f59e0b' },
};
const __extendedStandard = {
  primary: {
    50: '#eef4ff',
    100: '#e0ebff',
    200: '#c7daff',
    300: '#a4c2fc',
    400: '#769cf5',
    500: '#4f78ed',
    600: '#365ae3',
    700: '#2a46c2',
    800: '#263b9e',
    900: '#24357d',
    main: '#365ae3',
    light: '#769cf5',
    dark: '#365ae3',
    contrastText: '#ffffff',
  },
  secondary: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
    main: '#8b5cf6',
    light: '#a78bfa',
    dark: '#7c3aed',
    contrastText: '#ffffff',
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    main: '#22c55e',
    light: '#86efac',
    dark: '#16a34a',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    main: '#f59e0b',
    light: '#fde68a',
    dark: '#d97706',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    main: '#ef4444',
    light: '#fca5a5',
    dark: '#dc2626',
  },
  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    main: '#0ea5e9',
    light: '#7dd3fc',
    dark: '#0284c7',
  },
};
vi.mock('@mui/material/styles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mui/material/styles')>();
  const base = actual.createTheme();
  return {
    ...actual,
    useTheme: () => ({
      ...base,
      palette: {
        ...base.palette,
        ...__extendedStandard,
        teal: __extendedPalette.teal,
        orange: __extendedPalette.orange,
        yellow: __extendedPalette.yellow,
        blue: __extendedPalette.blue,
        cyan: __extendedPalette.cyan,
        purple: __extendedPalette.purple,
        pink: __extendedPalette.pink,
        surface: __extendedPalette.surface,
        accent: __extendedPalette.accent,
      },
    }),
  };
});
