import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import PluginMarketplacePage from '../plugin/PluginMarketplacePage';

// PluginMarketplacePage：ListPageTemplate 手写形态（pluginsQuery/healthQuery 双 useQuery +
// usePluginStore 状态 + grid/list 双视图 + PluginDetailModal MUI Dialog + 安装/评分闭环）
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh-CN' },
  }),
}));

// 页面直接 import i18n 实例（default）
vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

vi.mock('@/utils/i18n', () => ({
  localizedName: (zh: string, _en?: string) => zh,
}));

const mockListPage = vi.hoisted(() => vi.fn());
const mockAddNotification = vi.hoisted(() => vi.fn());
const mockSetSearchQuery = vi.hoisted(() => vi.fn());
const mockInstallPlugin = vi.hoisted(() => vi.fn());
const mockFetchMp = vi.hoisted(() => vi.fn());
const mockFetchHealth = vi.hoisted(() => vi.fn());
const mockFetchInstalled = vi.hoisted(() => vi.fn());

vi.mock('@/components/templates', () => ({
  ListPageTemplate: (p: Record<string, unknown>) => {
    mockListPage(p);
    return <div data-testid='list-page-template'>{p.children as React.ReactNode}</div>;
  },
}));

vi.mock('@/store', () => ({
  useNotificationStore: (selector?: (state: { addNotification: unknown }) => unknown) =>
    selector
      ? selector({ addNotification: mockAddNotification })
      : { addNotification: mockAddNotification },
}));

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const mockPlugins = vi.hoisted(() => [
  {
    id: 'p1',
    code: 'analytic-engine',
    name: '数据分析引擎',
    description: '实时分析',
    version: '1.0.0',
    is_free: true,
    install_count: 1200,
    rating: 4.8,
    rating_count: 56,
    tags: ['analytics'],
    created_at: '2026-09-01',
    price_cents: 0,
  },
  {
    id: 'p2',
    code: 'scheduler',
    name: '定时任务',
    description: '定时执行',
    version: '2.1.0',
    is_free: false,
    install_count: 300,
    rating: 4.2,
    rating_count: 20,
    tags: ['schedule'],
    created_at: '2026-08-01',
    price_cents: 9900,
  },
]);

const mockSuites = vi.hoisted(() => [
  {
    id: 'suite-1',
    code: 'analytics',
    name: '数据分析',
    description: '分析套件',
    plugins: [mockPlugins[0]],
    is_free: true,
    price_cents: 0,
  },
  {
    id: 'suite-2',
    code: 'automation',
    name: '自动化',
    description: '自动化套件',
    plugins: [mockPlugins[1]],
    is_free: false,
    price_cents: 9900,
  },
]);

vi.mock('@/api/plugin', () => ({
  SUITES: () => mockSuites,
  PLUGIN_SUITE_MAP: { 'analytic-engine': 'analytics', scheduler: 'automation' },
  getPluginReviews: vi.fn().mockResolvedValue({ success: true, data: { reviews: [] } }),
  getPluginVersions: vi.fn().mockResolvedValue({ success: true, data: [] }),
  submitPluginReview: vi.fn().mockResolvedValue({ success: true }),
}));

// usePluginStore：返回状态+actions；getState 供 queryFn（全 mock useQuery 不执行 queryFn）
vi.mock('@/store/pluginStore', () => ({
  usePluginStore: () => ({
    healthStatus: { 'analytic-engine': { healthy: true } },
    searchQuery: '',
    setSearchQuery: mockSetSearchQuery,
    fetchMarketplacePlugins: mockFetchMp,
    fetchHealthStatus: mockFetchHealth,
    fetchInstalledPlugins: mockFetchInstalled,
    installPlugin: mockInstallPlugin,
    isPluginInstalled: (code: string) => code === 'analytic-engine',
  }),
  usePluginStore: Object.assign(
    () => ({
      healthStatus: { 'analytic-engine': { healthy: true } },
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      fetchMarketplacePlugins: mockFetchMp,
      fetchHealthStatus: mockFetchHealth,
      fetchInstalledPlugins: mockFetchInstalled,
      installPlugin: mockInstallPlugin,
      isPluginInstalled: (code: string) => code === 'analytic-engine',
    }),
    { getState: () => ({ marketplacePlugins: mockPlugins, healthStatus: {} }) }
  ),
}));

vi.mock('@/lib/reactQuery', () => ({
  QUERY_KEYS: {
    AD_HOC: {
      MARKETPLACE_PLUGINS_BASE: 'marketplace-plugins',
      MARKETPLACE_HEALTH_BASE: 'marketplace-health',
      PLUGIN_REVIEWS_BASE: 'plugin-reviews',
      PLUGIN_VERSIONS_BASE: 'plugin-versions',
    },
  },
  CACHE_DURATIONS: { MEDIUM: 60_000 },
}));

const mockInvalidate = vi.hoisted(() => vi.fn());

// useQuery：plugins/health 直返；reviews/versions 空数组；useMutation 执行 mutationFn+onSuccess
vi.mock('@tanstack/react-query', () => ({
  useQuery: (opts: { queryKey: unknown }) => {
    const key = JSON.stringify(opts.queryKey);
    if (key.includes('marketplace-plugins')) {
      return { data: mockPlugins, isLoading: false, isError: false, error: null, refetch: vi.fn() };
    }
    if (key.includes('marketplace-health')) {
      return {
        data: { 'analytic-engine': { healthy: true } },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      };
    }
    return { data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() };
  },
  useMutation: (opts: {
    mutationFn: (arg: unknown) => Promise<unknown>;
    onSuccess?: (r: unknown) => void;
  }) => ({
    mutate: (arg: unknown) => {
      opts
        .mutationFn(arg)
        .then((r) => opts.onSuccess?.(r))
        .catch(() => {});
    },
    mutateAsync: (arg: unknown) =>
      opts.mutationFn(arg).then((r) => {
        opts.onSuccess?.(r);
        return r;
      }),
    isPending: false,
  }),
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));

describe('PluginMarketplacePage（ListPageTemplate 手写形态：双 useQuery + store + grid 视图 + 详情/安装）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPage.mockClear();
    mockAddNotification.mockClear();
    mockSetSearchQuery.mockClear();
    mockInstallPlugin.mockResolvedValue(true);
  });

  it('渲染 ListPageTemplate（title/subtitle/data 2 行/loading/searchable/columns）', async () => {
    render(<PluginMarketplacePage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    expect(props.title).toBe('plugin.marketplace_page.title');
    expect(props.data).toHaveLength(2);
    expect(props.loading).toBe(false);
    expect(props.searchable).toBe(true);
    expect(props.columns.length).toBeGreaterThan(5);
  });

  it('headerContent suite 卡片（2 个 suite 名称渲染）', async () => {
    render(<PluginMarketplacePage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    const { getByText } = render(<>{props.headerContent}</>);
    expect(getByText('数据分析')).toBeInTheDocument();
    expect(getByText('自动化')).toBeInTheDocument();
  });

  it('columns 渲染（plugin name/price free/actions 安装按钮）', async () => {
    render(<PluginMarketplacePage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    const nameCol = props.columns.find((c: { id: string }) => c.id === 'plugin');
    expect(nameCol.render(mockPlugins[0])).not.toBeNull();
    const priceCol = props.columns.find((c: { id: string }) => c.id === 'price');
    expect(priceCol.render(mockPlugins[0])).not.toBeNull();
    const actionCol = props.columns.find((c: { id: string }) => c.id === 'actions');
    expect(actionCol.render(mockPlugins[1])).not.toBeNull();
  });

  it('suite 筛选：点击 analytics 套件卡片 → ListPageTemplate data 过滤为 1', async () => {
    render(<PluginMarketplacePage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    const { getByText } = render(<>{props.headerContent}</>);
    fireEvent.click(getByText('数据分析'));
    await waitFor(() => {
      const last = mockListPage.mock.calls.at(-1)[0];
      expect(last.data).toHaveLength(1);
      expect(last.data[0].code).toBe('analytic-engine');
    });
  });

  it('排序 popular：data 按 install_count 降序（1200 在前）', async () => {
    render(<PluginMarketplacePage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    expect(props.data[0].install_count).toBe(1200);
    expect(props.data[1].install_count).toBe(300);
  });

  it('grid 视图安装：点击 purchase → installPlugin 被调 + success toast', async () => {
    render(<PluginMarketplacePage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    const { getByText } = render(<>{props.renderCardView(props.data)}</>);
    fireEvent.click(getByText('plugin.common.purchase'));
    await waitFor(() => {
      expect(mockInstallPlugin).toHaveBeenCalledWith('scheduler');
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success' })
      );
    });
  });

  it('详情 Dialog：onRowClick 打开插件详情（渲染名称）', async () => {
    render(<PluginMarketplacePage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    act(() => props.onRowClick(mockPlugins[1]));
    await waitFor(() => {
      expect(screen.getByText('定时任务')).toBeInTheDocument();
    });
  });

  it('refresh action：触发 addNotification refresh_success', async () => {
    render(<PluginMarketplacePage />);
    await screen.findByTestId('list-page-template');

    const props = mockListPage.mock.calls.at(-1)[0];
    act(() => props.actions[0].onClick());
    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'plugin.message.refresh_success' })
    );
  });
});
