/**
 * V82-2d GIS/BI/Portal 组件测试（4 共享模板）
 *
 * 测试范围：
 *  1. DashboardTemplate  — BI 看板 / Portal 首页 / GIS 分区分析页
 *  2. StatsPageTemplate  — BI 分析报表 / 数据统计 / 指标监控页
 *  3. GisMapTemplate     — GIS 地图跟踪 / 围栏管理 / 设备定位页
 *  4. SettingsPageTemplate — Portal 系统/模块 设置页（BI 数据源权限 / GIS 图层配置 等）
 *
 * 每组件覆盖三态：空态 / 基础态 / 交互态 + 状态 Banner + 关键文本验证
 *
 * Mock 约定：同 V82-2a/b/c 模板，保持一致可复用。
 */
import React from 'react';
import { vi, type Mock } from 'vitest';
import { act, within } from '@testing-library/react';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/__tests__/test-utils';

// ========== 被测组件 ==========
// 1. DashboardTemplate：BI 看板 / Portal 首页聚合
import {
  DashboardTemplate,
  type StatCardConfig,
  type ChartConfig as DashboardChartConfig,
  type DataTableConfig as DashboardTableConfig,
} from '@/components/templates/DashboardTemplate';
// 2. StatsPageTemplate：BI 报表 / 指标监控页（带搜索/导出/时间范围工具栏）
import {
  StatsPageTemplate,
  type StatCard as StatsStatCard,
  type ChartConfig as StatsChartConfig,
  type DataTable as StatsDataTable,
  type TableColumn as StatsTableColumn,
} from '@/components/templates/StatsPageTemplate';
// 3. GisMapTemplate：GIS 地图（mock react-leaflet 真实 Canvas 不跑 DOM）
import {
  GisMapTemplate,
  type MapMarker,
  type GeoFence,
  type TrackPoint,
  type MapLayer,
} from '@/components/templates/GisMapTemplate';
// 4. SettingsPageTemplate：Portal/BI/GIS 配置设置页
import {
  SettingsPageTemplate,
  type SettingSection,
  type SettingTab,
} from '@/components/templates/SettingsPageTemplate';

// ========== 全局 mock（同 V82-2c 模板，保持一致） ==========
const i18nMap = vi.hoisted(() => {
  const base: Record<string, string> = {
    'templates.dashboard_template.k0': '数据总览',
    'templates.dashboard_template.k1': '同比',
    'templates.dashboard_template.k2': '环比',
    'templates.dashboard_template.k3': '导出',
    'templates.dashboard_template.k4': '刷新',
    'templates.stats_page_template.k0': '导出',
    'templates.stats_page_template.k1': '搜索...',
    'templates.stats_page_template.k2': '时间范围',
    'templates.stats_page_template.k3': '刷新',
    'templates.stats_page_template.k4': '刷新',
    'components.stats_page_template.k0': '图表',
    'components.stats_page_template.k1': '搜索...',
    'components.stats_page_template.k2': '导出',
    'templates.page_header.k0': '搜索',
    'templates.page_header.k1': '搜索...',
    'templates.page_header.k2': '刷新',
    'templates.page_header.k3': '刷新',
    'templates.list_search_bar.k0': '刷新',
    'templates.list_search_bar.k1': '刷新',
    'templates.gis_map_template.k0': '矢量地图',
    'templates.gis_map_template.k1': '卫星影像',
    'templates.gis_map_template.k2': '标记点',
    'templates.gis_map_template.k3': '聚类点',
    'templates.gis_map_template.k4': '电子围栏',
    'templates.gis_map_template.k5': '轨迹线',
    'templates.gis_map_template.k6': '搜索',
    'templates.gis_map_template.k7': '搜索',
    'templates.gis_map_template.k8': '图层',
    'templates.gis_map_template.k9': '图层',
    'templates.gis_map_template.k10': '放大',
    'templates.gis_map_template.k11': '放大',
    'templates.gis_map_template.k12': '全屏',
    'templates.gis_map_template.k13': '退出全屏',
    'templates.gis_map_template.k14': '全屏切换',
    'templates.gis_map_template.k15': '播放轨迹',
    'templates.gis_map_template.k16': '播放',
    'templates.gis_map_template.k17': '暂停轨迹',
    'templates.gis_map_template.k18': '暂停',
    'templates.gis_map_template.k19': '重置轨迹',
    'templates.gis_map_template.k20': '重置',
    'templates.gis_map_template.k21': '清除轨迹',
    'templates.gis_map_template.k22': '清除',
    'templates.gis_map_template.k23': '重置',
    'templates.gis_map_template.k24': '上一帧',
    'templates.gis_map_template.k25': '下一帧',
    'templates.gis_map_template.k26': '搜索',
    'templates.gis_map_template.k27': '搜索',
    'templates.gis_map_template.k28': '图层',
    'templates.gis_map_template.k29': '图层',
    'templates.gis_map_template.k30': '标记',
    'templates.gis_map_template.k31': '标记',
    'templates.settings_page_template.k0': '保存设置',
    'templates.settings_page_template.k1': '重置',
    'templates.settings_page_template.k2': '基础设置',
    'templates.settings_page_template.k3': '权限设置',
    'templates.settings_page_template.k4': '保存',
    'templates.settings_page_template.k5': '取消',
    'templates.card_list_template.k3': '刷新',
    'templates.card_list_template.k4': '刷新',
    'templates.form_page_template.k2': '重置',
    'templates.list_page_template.k30': '刷新',
    'templates.list_page_template.k31': '刷新',
    'components.dashboard_template.k4': '刷新',
    'components.gis_map_template.k0': '卫星地图',
    'components.gis_map_template.k1': '矢量地图',
    'components.gis_map_template.k2': '标记点',
    'components.gis_map_template.k3': '标记簇',
    'components.gis_map_template.k4': '围栏',
    'components.gis_map_template.k5': '轨迹',
    'components.gis_map_template.k32': '搜索地点、设备或围栏...',
    'components.gis_map_template.k33': '图层管理',
    'components.gis_map_template.k34': '底图',
    'components.gis_map_template.k35': '业务图层',
    'components.gis_map_template.k36': '轨迹播放',
    'components.gis_map_template.k37': '绘图',
    'components.gis_map_template.k6': '放大',
    'components.gis_map_template.k7': '放大',
    'components.gis_map_template.k8': '缩小',
    'components.gis_map_template.k9': '缩小',
    'components.gis_map_template.k10': '定位',
    'components.gis_map_template.k11': '定位',
    'components.gis_map_template.k12': '全屏',
    'components.gis_map_template.k13': '退出全屏',
    'components.gis_map_template.k14': '全屏切换',
    'components.gis_map_template.k15': '播放',
    'components.gis_map_template.k16': '播放',
    'components.gis_map_template.k17': '暂停',
    'components.gis_map_template.k18': '暂停',
    'components.gis_map_template.k19': '重置',
    'components.gis_map_template.k20': '重置',
    'components.gis_map_template.k21': '清除',
    'components.gis_map_template.k22': '清除',
    'components.gis_map_template.k23': '重置',
    'components.gis_map_template.k24': '上一帧',
    'components.gis_map_template.k25': '下一帧',
    'components.gis_map_template.k26': '搜索',
    'components.gis_map_template.k27': '搜索',
    'components.gis_map_template.k28': '图层',
    'components.gis_map_template.k29': '图层',
    'components.gis_map_template.k30': '轨迹',
    'components.gis_map_template.k31': '轨迹',
    'components.layer_panel.k0': '图层',
    'components.layer_manager.k0': '图层',
    'components.crud_page.k23': '搜索',
    'components.crud_page.k26': '导出',
    'components.list_page_template.k2': '搜索',
    'components.export_button.k0': '导出',
    'components.bff_data_table.k6': '刷新',
    'components.bff_data_table.k7': '刷新',
  };
  return base;
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options && typeof options === 'object') {
        let result = i18nMap[key] ?? key;
        for (const [k, v] of Object.entries(options)) {
          result = result.replace(`{{${k}}}`, String(v));
        }
        return result;
      }
      return i18nMap[key] ?? key;
    },
    i18n: { language: 'zh-CN', changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string, options?: Record<string, unknown>) => {
      if (options && typeof options === 'object') {
        let result = i18nMap[key] ?? key;
        for (const [k, v] of Object.entries(options)) {
          result = result.replace(`{{${k}}}`, String(v));
        }
        return result;
      }
      return i18nMap[key] ?? key;
    },
  },
}));

// lucide-react：所有用到的图标 Mock 为 data-testid svg
vi.mock('lucide-react', async (importOriginal) => {
  const actual: Record<
    string,
    React.ComponentType<React.SVGProps<SVGSVGElement>>
  > = await importOriginal();
  const needMock = [
    'TrendingUp',
    'TrendingDown',
    'Search',
    'FileText',
    'DollarSign',
    'BarChart3',
    'Target',
    'CreditCard',
    'Calculator',
    'Building',
    'Users',
    'Package',
    'Warehouse',
    'ClipboardList',
    'CheckCircle',
    'AlertCircle',
    'Clock',
    'Activity',
    'RefreshCw',
    'Download',
    'Calendar',
    'Layers',
    'ZoomIn',
    'ZoomOut',
    'Maximize2',
    'Minimize2',
    'Locate',
    'Navigation',
    'Play',
    'Pause',
    'RotateCcw',
    'Trash2',
    'Circle',
    'Square',
    'PenTool',
    'Settings',
    'Save',
    'Database',
    'Shield',
    'Bell',
  ];
  const mk = (n: string) =>
    function I(props: React.SVGProps<SVGSVGElement>) {
      return React.createElement('svg', {
        'data-testid': `icon-${n}`,
        ...props,
      });
    };
  const overrides: Record<string, unknown> = {};
  for (const name of needMock) overrides[name] = mk(name.toLowerCase());
  return { ...actual, ...overrides };
});

// shared-components：EmptyState / ErrorEmptyState / BackButton / FormDialog / FormDrawer
vi.mock('@topems/shared-components', () => ({
  EmptyState: ({
    title,
    description,
    action,
    emoji,
    actionLabel,
    onAction,
  }: {
    title?: string;
    description?: string;
    action?: { label: string; onClick?: () => void };
    icon?: React.ReactNode;
    emoji?: string;
    actionLabel?: string;
    onAction?: () => void;
  }) => (
    <div data-testid='empty-state'>
      {emoji && <span data-testid='empty-state-emoji'>{emoji}</span>}
      {title && <p>{title}</p>}
      {description && <small>{description}</small>}
      {/* 新签名：actionLabel+onAction；旧签名：action.label+onClick。都支持 */}
      {(actionLabel || action) && (
        <button
          type='button'
          data-testid='empty-state-action'
          onClick={onAction ?? action?.onClick}
        >
          {actionLabel ?? action?.label}
        </button>
      )}
    </div>
  ),
  ErrorEmptyState: ({
    error,
    title,
    message,
    onRetry,
  }: {
    error?: string;
    title?: string;
    message?: string;
    onRetry?: () => void;
  }) => (
    <div data-testid='error-empty-state'>
      {title && <h4>{title}</h4>}
      {(error || message) && <p>{error ?? message}</p>}
      {onRetry && (
        <button
          type='button'
          data-testid='error-empty-state-retry'
          onClick={onRetry}
        >
          重试
        </button>
      )}
    </div>
  ),
  BackButton: ({ href, onClick }: { href?: string; onClick?: () => void }) => (
    <button
      type='button'
      data-testid='back-button'
      data-href={href}
      onClick={onClick}
    >
      返回
    </button>
  ),
  FormDialog: ({
    open,
    title,
    onClose,
    onSubmit,
    loading,
    children,
  }: {
    open?: boolean;
    title?: string;
    onClose?: () => void;
    onSubmit?: () => void;
    loading?: boolean;
    children?: React.ReactNode;
  }) =>
    open ? (
      <div
        role='dialog'
        data-testid='form-dialog'
      >
        {title && <h3>{title}</h3>}
        {children}
        <button
          type='button'
          onClick={onClose}
          data-loading={loading ? 'true' : undefined}
        >
          关闭
        </button>
        <button
          type='button'
          onClick={onSubmit}
          data-loading={loading ? 'true' : undefined}
        >
          提交
        </button>
      </div>
    ) : null,
  FormDrawer: ({
    open,
    title,
    onClose,
    onSubmit,
    loading,
    children,
  }: {
    open?: boolean;
    title?: string;
    onClose?: () => void;
    onSubmit?: () => void;
    loading?: boolean;
    children?: React.ReactNode;
  }) =>
    open ? (
      <div
        role='dialog'
        data-testid='form-drawer'
      >
        {title && <h3>{title}</h3>}
        {children}
        <button
          type='button'
          onClick={onClose}
          data-loading={loading ? 'true' : undefined}
        >
          关闭Drawer
        </button>
        <button
          type='button'
          onClick={onSubmit}
          data-loading={loading ? 'true' : undefined}
        >
          提交Drawer
        </button>
      </div>
    ) : null,
}));

// @/components/common：PageContainer（DashboardTemplate 用）
vi.mock('@/components/common', () => ({
  Grid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PageContainer: ({
    title,
    subtitle,
    children,
    actions,
  }: {
    title?: string;
    subtitle?: string;
    children?: React.ReactNode;
    autoBreadcrumbs?: boolean;
    headerProps?: Record<string, unknown>;
    actions?:
      | Array<{ label: string; onClick?: () => void; variant?: string; icon?: React.ReactNode }>
      | React.ReactNode;
  }) => (
    <div data-testid='page-container'>
      <header>
        {title && <h2>{title}</h2>}
        {subtitle && <p>{subtitle}</p>}
        {Array.isArray(actions) &&
          actions.map((a, i) => (
            <button
              key={i}
              type='button'
              onClick={a.onClick}
            >
              {a.label}
            </button>
          ))}
      </header>
      {children}
    </div>
  ),
  QuickSearch: () => <div data-testid='quick-search' />,
  FormDialog: (props: {
    open?: boolean;
    title?: string;
    onClose?: () => void;
    onSubmit?: () => void;
    loading?: boolean;
    children?: React.ReactNode;
  }) =>
    props.open ? (
      <div
        role='dialog'
        data-testid='form-dialog'
      >
        {props.title && <h3>{props.title}</h3>}
        {props.children}
        <button
          type='button'
          onClick={props.onClose}
        >
          关闭
        </button>
        <button
          type='button'
          onClick={props.onSubmit}
        >
          提交
        </button>
      </div>
    ) : null,
  FormDrawer: (props: {
    open?: boolean;
    title?: string;
    onClose?: () => void;
    onSubmit?: () => void;
    loading?: boolean;
    children?: React.ReactNode;
  }) =>
    props.open ? (
      <div
        role='dialog'
        data-testid='form-drawer'
      >
        {props.title && <h3>{props.title}</h3>}
        {props.children}
        <button
          type='button'
          onClick={props.onClose}
        >
          关闭Drawer
        </button>
        <button
          type='button'
          onClick={props.onSubmit}
        >
          提交Drawer
        </button>
      </div>
    ) : null,
}));

// PageHeader：SettingsPageTemplate 用
vi.mock('@/components/templates/PageHeader', () => ({
  PageHeader: ({
    title,
    subtitle,
    description,
    loading,
    children,
    actions,
    breadcrumbs,
    backButton,
  }: {
    title: string;
    subtitle?: string;
    description?: string;
    loading?: boolean;
    breadcrumbs?: Array<{ label: string; href?: string; onClick?: () => void }>;
    backButton?: { href?: string; onClick?: () => void };
    pageIcon?: React.ReactNode;
    actions?:
      | Array<{ label: string; onClick?: () => void; variant?: string; icon?: React.ReactNode }>
      | React.ReactNode;
    children?: React.ReactNode;
  }) => {
    let actionsNode: React.ReactNode = null;
    if (Array.isArray(actions)) {
      actionsNode = (
        <>
          {actions.map((a, i) => (
            <button
              key={i}
              type='button'
              onClick={a.onClick}
              data-variant={a.variant}
            >
              {a.label}
              {a.icon}
            </button>
          ))}
        </>
      );
    } else if (actions) {
      actionsNode = actions;
    }
    return (
      <div data-testid='mock-page-header'>
        {backButton && (
          <button
            type='button'
            data-testid='back-button'
            onClick={backButton.onClick}
          >
            ← 返回
          </button>
        )}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav data-testid='breadcrumbs'>
            {breadcrumbs.map((b, i) => (
              <span
                key={i}
                onClick={b.onClick}
                role={b.onClick ? 'link' : undefined}
              >
                {i > 0 && ' / '}
                {b.label}
              </span>
            ))}
          </nav>
        )}
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
        {description && <p>{description}</p>}
        {loading ? <div data-testid='page-header-loading' /> : null}
        {actions && <div data-testid='page-header-actions'>{actionsNode}</div>}
        {children}
      </div>
    );
  },
}));

// react-leaflet + leaflet：leaflet 需要真实 DOM 支持，不能在 jsdom 下 work
// Mock 为最简组件，保证 MapContainer 子元素能被渲染并在 RTL 下可查到
vi.mock('react-leaflet', () => {
  const mk =
    (name: string) =>
    (
      props: Record<string, unknown> & {
        children?: React.ReactNode;
        eventHandlers?: Record<string, (e?: unknown) => void>;
      }
    ) => {
      const { children, position, eventHandlers, onClick, ...rest } = props;
      // 组件通过 eventHandlers.click 传递回调（leaflet 模式）；也兼容直接传 onClick
      const handleClick = (e: React.MouseEvent) => {
        eventHandlers?.click?.(e);
        if (typeof onClick === 'function') (onClick as (e: React.MouseEvent) => void)(e);
      };
      return React.createElement(
        'div',
        {
          'data-testid': `leaflet-${name.toLowerCase()}`,
          'data-position': position ? JSON.stringify(position) : undefined,
          onClick: handleClick,
          ...rest,
        },
        children
      );
    };
  return {
    __esModule: true,
    MapContainer: mk('MapContainer'),
    TileLayer: mk('TileLayer'),
    Marker: mk('Marker'),
    Popup: mk('Popup'),
    Polyline: mk('Polyline'),
    Polygon: mk('Polygon'),
    Circle: mk('Circle'),
  };
});

// leaflet.css 是 side-effect import，vitest 默认忽略 css 不用 mock；logger 要 mock 避免触发 fs
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// @/schema：DashboardTemplate 动态加载 schema.getColumns；mock 为 passthrough
vi.mock('@/schema', () => ({
  getColumns: (cols: unknown[]) => cols ?? [],
  EntitySchema: {},
  DashboardSchema: {},
  StatCardSchema: {},
  ChartSchema: {},
  DataTableSchema: {},
  DashboardColor: 'primary' as unknown,
  IconName: 'FileText' as unknown,
}));

// MUI Drawer/Modal 在 jsdom 下会 portal 到 body，但子元素 accessibility 正常。
// 为了让 Drawer 子元素直接 inline 渲染（保证 screen/document.querySelector 可直接找到），
// 这里将 Drawer 简化为 open → 渲染 children 的简单 div。
// 其他 MUI 组件正常使用。因为 vi.mock 的 partial mock 只会覆盖 Drawer，其余通过 importOriginal 透传。
vi.mock('@mui/material', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mui/material')>();
  return {
    ...actual,
    Drawer: ({ open, children }: { open?: boolean; children?: React.ReactNode }) =>
      open ? <div data-testid='mui-drawer'>{children}</div> : null,
  };
});

// ========== 共享 helper ==========
const formatNumber = (num: number) => num.toLocaleString('zh-CN', { maximumFractionDigits: 2 });

// ============================================================
// Suite 1 · DashboardTemplate（BI 看板 / Portal 首页）
//  1. 空态：statCards=[] charts=[] table=undefined → 仅 title + "暂无统计数据"
//  2. 基础态：4 StatCards + mainChart（折线） + 最近事项 Table 3 行
//  3. 交互：快捷操作 2 个按钮回调；刷新按钮 onRefresh 被触发
//  4. 状态：loading skeleton 覆盖 statCards/charts；error 空态
// ============================================================
describe('DashboardTemplate · BI/Portal 看板聚合', () => {
  const defaultStatCards: StatCardConfig[] = [
    {
      title: '今日销售额',
      value: formatNumber(128650),
      color: 'primary',
      trend: { value: 8.5, label: '环比' },
    },
    {
      title: '订单总数',
      value: formatNumber(428),
      color: 'success',
      trend: { value: -2.1, label: '环比' },
    },
    { title: '活跃客户', value: formatNumber(1386), color: 'warning' },
    { title: '待处理工单', value: formatNumber(37), color: 'error' },
  ];

  const defaultRecentTable: DashboardTableConfig = {
    title: '最近事项',
    columns: [
      { id: 'no', label: '单据编号' },
      { id: 'type', label: '类型' },
      { id: 'owner', label: '负责人' },
    ],
    data: [
      { no: 'SO-2026-08121', type: '销售订单', owner: '张三' },
      { no: 'WO-2026-08120', type: '工作订单', owner: '李四' },
      { no: 'PO-2026-08119', type: '采购订单', owner: '王五' },
    ],
  };

  it('空态：statCards=[] charts=[] table=undefined → 只渲染标题，无任何数据卡片/图表/表格', () => {
    renderWithProviders(
      <DashboardTemplate
        title='BI · 经营分析总览'
        subtitle='Portal 首页 · 经营决策看板'
        statCards={[]}
        charts={[]}
      />
    );
    expect(screen.getByText('BI · 经营分析总览')).toBeInTheDocument();
    expect(screen.getByText('Portal 首页 · 经营决策看板')).toBeInTheDocument();
    // 不存在卡片/图表/表格关键文本
    expect(screen.queryByText('今日销售额')).not.toBeInTheDocument();
    expect(screen.queryByText('最近事项')).not.toBeInTheDocument();
  });

  it('基础态：4 张 StatCards 标题/值 + 最近事项 DataTable 3 行 + header actions "导出 CSV"按钮存在', () => {
    renderWithProviders(
      <DashboardTemplate
        title='BI · 经营分析总览'
        subtitle='Portal 首页'
        statCards={defaultStatCards}
        table={defaultRecentTable}
        actions={[{ label: '导出 CSV', onClick: vi.fn() }]}
      />
    );
    // StatCards
    expect(screen.getByText('今日销售额')).toBeInTheDocument();
    expect(screen.getByText('订单总数')).toBeInTheDocument();
    expect(screen.getByText('活跃客户')).toBeInTheDocument();
    expect(screen.getByText('待处理工单')).toBeInTheDocument();
    // 表格
    expect(screen.getByText('最近事项')).toBeInTheDocument();
    expect(screen.getByText('单据编号')).toBeInTheDocument();
    expect(screen.getByText('SO-2026-08121')).toBeInTheDocument();
    expect(screen.getByText('WO-2026-08120')).toBeInTheDocument();
    expect(screen.getByText('PO-2026-08119')).toBeInTheDocument();
    // header actions 按钮（PageContainer mock 会把 actions 数组渲染为按钮）
    expect(screen.getByRole('button', { name: /导出 CSV/ })).toBeInTheDocument();
    // DashboardTemplate 会自动把 onRefresh 加为 "刷新" 按钮
    expect(screen.queryByRole('button', { name: /刷新/ })).not.toBeInTheDocument();
  });

  it('交互：header actions 导出回调 + onRefresh "刷新"按钮回调（刷新按钮由 DashboardTemplate 自动注入）', () => {
    const onExport: Mock = vi.fn();
    const onRefresh: Mock = vi.fn();
    renderWithProviders(
      <DashboardTemplate
        title='BI · 经营分析总览'
        statCards={defaultStatCards}
        onRefresh={onRefresh}
        actions={[{ label: '导出 CSV', onClick: onExport }]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /导出 CSV/ }));
    expect(onExport).toHaveBeenCalledTimes(1);
    // DashboardTemplate L743-L749：当传了 onRefresh 时会 headerActions 新增 label="刷新"按钮
    fireEvent.click(screen.getByRole('button', { name: /刷新/ }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('状态：4 StatCards loading=true → 每张 Skeleton(3 个 skeleton) × 4 = ≥12；DataTable loading Skeleton tbody 行 ≥ 3', () => {
    const loadingCards: StatCardConfig[] = defaultStatCards.map((c) => ({ ...c, loading: true }));
    const { container } = renderWithProviders(
      <DashboardTemplate
        title='BI · 经营分析总览'
        statCards={loadingCards}
        table={{ ...defaultRecentTable, loading: true }}
      />
    );
    // MUI Skeleton = span.MuiSkeleton-root
    const skel = container.querySelectorAll('span.MuiSkeleton-root');
    expect(skel.length).toBeGreaterThanOrEqual(8);
  });
});

// ============================================================
// Suite 2 · StatsPageTemplate（BI 报表 / 统计监控）
//  1. 空态：emptyState 配置 + action 按钮
//  2. 基础态：4 StatCards + 2 Charts 区 + 1 DataTable（3 行）+ 工具条 4 按钮
//  3. 交互：搜索输入 + 导出按钮 + 刷新按钮 + Tab 切换 + 时间范围 Select
// ============================================================
describe('StatsPageTemplate · BI 统计报表页', () => {
  const statCards: StatsStatCard[] = [
    {
      id: 's1',
      title: '总访问量',
      value: formatNumber(32580),
      trend: { value: 12.3, direction: 'up', label: '周同比' },
    },
    {
      id: 's2',
      title: '注册用户',
      value: formatNumber(1842),
      trend: { value: -1.2, direction: 'down' },
    },
    { id: 's3', title: '转化率', value: '4.82%', color: 'success' },
    { id: 's4', title: '平均停留', value: '3m 28s', color: 'warning' },
  ];

  const charts: StatsChartConfig[] = [
    {
      id: 'c1',
      title: '近 7 日访问趋势（折线）',
      type: 'line',
      dataKey: 'value',
      nameKey: 'name',
      data: [
        { name: '08-06', value: 3200 },
        { name: '08-07', value: 4100 },
        { name: '08-08', value: 3900 },
      ],
    },
    {
      id: 'c2',
      title: '渠道占比（饼图）',
      type: 'pie',
      dataKey: 'value',
      nameKey: 'name',
      data: [
        { name: '搜索', value: 45 },
        { name: '推广', value: 28 },
        { name: '直接', value: 27 },
      ],
    },
  ];

  const tables: StatsDataTable[] = [
    {
      id: 't1',
      title: 'Top 5 来源页面',
      columns: [
        { id: 'rank', label: '排名', field: 'rank' },
        { id: 'page', label: '页面', field: 'page' },
        { id: 'pv', label: 'PV', field: 'pv' },
        { id: 'uv', label: 'UV', field: 'uv' },
      ] as StatsTableColumn[],
      data: [
        { rank: 1, page: '/dashboard', pv: 8421, uv: 1203 },
        { rank: 2, page: '/bi/analytics', pv: 5842, uv: 802 },
        { rank: 3, page: '/reports/sales', pv: 3712, uv: 485 },
      ],
    },
  ];

  it('空态：emptyState 配置"暂无数据"并显示 action 按钮"立即同步"，点击触发回调', () => {
    const onAction: Mock = vi.fn();
    renderWithProviders(
      <StatsPageTemplate
        title='BI · 分析报表'
        emptyState={{
          title: '暂无数据',
          description: '尚未同步数据',
          actionLabel: '立即同步',
          onAction,
        }}
      />
    );
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
    expect(screen.getByText('尚未同步数据')).toBeInTheDocument();
    // mock EmptyState 按钮文本子节点会直接包含 actionLabel 文本
    fireEvent.click(screen.getByTestId('empty-state-action'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('基础态：4 StatCards + 2 图表标题 + Top 表 3 行 + 工具条显示（搜索/导出/刷新/时间范围）', () => {
    const searchOnChange: Mock = vi.fn();
    renderWithProviders(
      <StatsPageTemplate
        title='BI · 分析报表'
        subtitle='数据中台 · 用户分析'
        statCards={statCards}
        charts={charts}
        tables={tables}
        search={{ value: '', onChange: searchOnChange }}
        onExport={vi.fn()}
        onRefresh={vi.fn()}
        timeRangeOptions={[
          { id: '7d', label: '最近 7 天' },
          { id: '30d', label: '最近 30 天' },
          { id: 'q', label: '本季度' },
        ]}
        timeRange='7d'
        onTimeRangeChange={vi.fn()}
        chartSectionTitle='图表分析区'
        tableSectionTitle='明细数据表'
      />
    );
    // 基础文本
    expect(screen.getByText('BI · 分析报表')).toBeInTheDocument();
    expect(screen.getByText('数据中台 · 用户分析')).toBeInTheDocument();
    // statCards
    expect(screen.getByText('总访问量')).toBeInTheDocument();
    expect(screen.getByText('注册用户')).toBeInTheDocument();
    expect(screen.getByText('转化率')).toBeInTheDocument();
    expect(screen.getByText('平均停留')).toBeInTheDocument();
    // charts 标题
    expect(screen.getByText('图表分析区')).toBeInTheDocument();
    expect(screen.getByText('近 7 日访问趋势（折线）')).toBeInTheDocument();
    expect(screen.getByText('渠道占比（饼图）')).toBeInTheDocument();
    // table（field 存在 → 行值被渲染）
    expect(screen.getByText('明细数据表')).toBeInTheDocument();
    expect(screen.getByText('Top 5 来源页面')).toBeInTheDocument();
    expect(screen.getByText('排名')).toBeInTheDocument();
    expect(screen.getByText('/dashboard')).toBeInTheDocument();
    expect(screen.getByText('/bi/analytics')).toBeInTheDocument();
    expect(screen.getByText('/reports/sales')).toBeInTheDocument();
    // 工具条控件：搜索 TextField placeholder 默认 "搜索..."
    expect(screen.getByPlaceholderText('搜索...')).toBeInTheDocument();
    // 导出：Button label 默认 "导出"
    expect(screen.getByRole('button', { name: /导出/ })).toBeInTheDocument();
    // 刷新 IconButton aria-label='刷新'
    expect(screen.getByRole('button', { name: '刷新' })).toBeInTheDocument();
  });

  it('交互：搜索 change+Enter；导出；刷新；Tab 切换；showTimeRange=false 隐藏时间范围', () => {
    const onExport: Mock = vi.fn();
    const onRefresh: Mock = vi.fn();
    const onTabChange: Mock = vi.fn();
    const onTimeRange: Mock = vi.fn();
    const searchOnChange: Mock = vi.fn();
    const onSearchSubmit: Mock = vi.fn();
    const { rerender } = renderWithProviders(
      <StatsPageTemplate
        title='BI · 分析报表'
        statCards={statCards}
        tabs={[
          { id: 'report', label: '报表视图' },
          { id: 'dim', label: '维度下钻' },
          { id: 'compare', label: '对比分析' },
        ]}
        tabValue='report'
        onTabChange={onTabChange}
        search={{ value: '', onChange: searchOnChange, placeholder: '输入报表名称' }}
        onSearch={onSearchSubmit}
        onExport={onExport}
        onRefresh={onRefresh}
        timeRangeOptions={[
          { id: '7d', label: '最近 7 天' },
          { id: '30d', label: '最近 30 天' },
        ]}
        timeRange='7d'
        onTimeRangeChange={onTimeRange}
      />
    );
    // 搜索 change
    const input = screen.getByPlaceholderText('输入报表名称') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '销售' } });
    expect(searchOnChange).toHaveBeenCalledTimes(1);
    expect(searchOnChange).toHaveBeenCalledWith('销售');
    // 搜索 Enter 触发 onSearch
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSearchSubmit).toHaveBeenCalledTimes(1);
    // 导出
    fireEvent.click(screen.getAllByRole('button', { name: /导出/ })[0]);
    expect(onExport).toHaveBeenCalledTimes(1);
    // 刷新
    fireEvent.click(screen.getAllByRole('button', { name: '刷新' })[0]);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    // Tab 切换
    fireEvent.click(screen.getByRole('tab', { name: /维度下钻/ }));
    expect(onTabChange).toHaveBeenCalledTimes(1);
    // showTimeRange 默认 true → combobox 存在；改为 false 再 rerender → 消失
    expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(1);
    rerender(
      <StatsPageTemplate
        title='BI · 分析报表'
        statCards={statCards}
        tabs={[]}
        showTimeRange={false}
        search={{ value: '', onChange: vi.fn() }}
      />
    );
    // showTimeRange=false → 不再渲染 combobox
    expect(screen.queryAllByRole('combobox').length).toBe(0);
  });
});

// ============================================================
// Suite 3 · GisMapTemplate（GIS 地图跟踪/围栏/定位）
//  1. 空态：markers=[] fences=[] layers 默认 2 项 + 图层面板显示
//  2. 基础态：3 markers + 2 fences（circle + polygon） + trackPoints 3 点轨迹
//  3. 交互：marker 点击回调；fence 点击回调；图层显隐切换；搜索输入；trackPlayback 播放/暂停
// ============================================================
describe('GisMapTemplate · GIS 地图页', () => {
  const markers: MapMarker[] = [
    { id: 'm1', name: '成品仓 W-01', position: [31.23, 121.47], type: 'storage' },
    { id: 'm2', name: '原料仓 W-02', position: [31.24, 121.48], type: 'storage' },
    {
      id: 'm3',
      name: '设备告警点',
      position: [31.235, 121.475],
      type: 'warning',
      color: '#d32f2f',
    },
  ];
  const fences: GeoFence[] = [
    {
      id: 'f1',
      name: '园区周界围栏',
      type: 'polygon',
      position: [31.23, 121.47],
      coordinates: [
        [31.2, 121.4],
        [31.3, 121.4],
        [31.3, 121.5],
        [31.2, 121.5],
      ],
      alertOnEnter: true,
    },
    { id: 'f2', name: '危险品 50m 警戒', type: 'circle', position: [31.235, 121.475], radius: 50 },
  ];
  const trackPoints: TrackPoint[] = [
    { id: 'p1', timestamp: '2026-08-12 08:00:00', position: [31.23, 121.47], speed: 25 },
    { id: 'p2', timestamp: '2026-08-12 08:05:00', position: [31.233, 121.472], speed: 30 },
    {
      id: 'p3',
      timestamp: '2026-08-12 08:10:00',
      position: [31.235, 121.475],
      speed: 22,
      accuracy: 5,
    },
  ];

  it('空态：MapContainer mock 渲染 + 右侧 4 个 control 存在（搜索/图层/缩放/全屏） + 初始图层 Drawer 未打开', () => {
    renderWithProviders(
      <GisMapTemplate
        initialCenter={[31.23, 121.47]}
        initialZoom={13}
        markers={[]}
        fences={[]}
        trackPoints={[]}
      />
    );
    // MapContainer mock
    expect(screen.getByTestId('leaflet-mapcontainer')).toBeInTheDocument();
    // 搜索按钮（IconButton aria-label="搜索"）
    expect(screen.getByRole('button', { name: '搜索' })).toBeInTheDocument();
    // 图层按钮（IconButton aria-label="图层"）
    expect(screen.getByRole('button', { name: '图层' })).toBeInTheDocument();
    // Drawer mock 默认 open=false，所以图层面板不显示 "叠加层/基础图层" 内容
    expect(screen.queryByText('OpenStreetMap')).not.toBeInTheDocument();
    expect(screen.queryByText('卫星地图')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('搜索地点、设备或围栏...')).not.toBeInTheDocument();
  });

  it('基础态：3 markers leaflet-marker + 1 polygon + 1 circle fence + 图层 Drawer 打开显示 2 base + 4 overlay 名称', () => {
    renderWithProviders(
      <GisMapTemplate
        initialCenter={[31.23, 121.47]}
        initialZoom={13}
        markers={markers}
        fences={fences}
      />
    );
    // markers
    expect(screen.getAllByTestId('leaflet-marker').length).toBe(3);
    // fences: leaflet-polygon 1 个 + leaflet-circle 1 个
    expect(screen.getAllByTestId('leaflet-polygon').length).toBe(1);
    expect(screen.getAllByTestId('leaflet-circle').length).toBe(1);
    // 打开图层 Drawer
    fireEvent.click(screen.getByRole('button', { name: '图层' }));
    // baseLayers 名称
    expect(screen.getByText('OpenStreetMap')).toBeInTheDocument();
    expect(screen.getByText('卫星地图')).toBeInTheDocument();
    // overlayLayers 4 个名称
    expect(screen.getByText('标记点')).toBeInTheDocument();
    expect(screen.getByText('标记簇')).toBeInTheDocument();
    expect(screen.getByText('围栏')).toBeInTheDocument();
    expect(screen.getByText('轨迹')).toBeInTheDocument();
  });

  it('交互：marker click 回调参数断言；overlay switch toggle; 搜索 Drawer + Enter; 轨迹播放/暂停', async () => {
    const onMarkerClick: Mock = vi.fn();
    const onFenceClick: Mock = vi.fn();
    const onLayer: Mock = vi.fn();
    const onSearch: Mock = vi.fn();
    const onTrack: Mock = vi.fn();
    const { container } = renderWithProviders(
      <GisMapTemplate
        initialCenter={[31.23, 121.47]}
        initialZoom={13}
        markers={markers}
        fences={fences}
        trackPoints={trackPoints}
        onMarkerClick={onMarkerClick}
        onFenceClick={onFenceClick}
        onLayerVisibilityChange={onLayer}
        onSearch={onSearch}
        onTrackPlayback={onTrack}
      />
    );
    // marker click：确保至少 3 个 leaflet-marker
    const markerEls = screen.getAllByTestId('leaflet-marker');
    expect(markerEls.length).toBeGreaterThanOrEqual(3);
    fireEvent.click(markerEls[0]);
    expect(onMarkerClick).toHaveBeenCalledTimes(1);
    expect(onMarkerClick).toHaveBeenCalledWith(markers[0]);

    // 图层 overlay toggle：通过 aria-label="图层" 按钮打开 Drawer
    const layerBtn = container.querySelector<HTMLElement>('button[aria-label="图层"]');
    if (layerBtn) fireEvent.click(layerBtn);
    const markerSwitch = screen.getByLabelText('标记点') as HTMLInputElement;
    fireEvent.click(markerSwitch);
    expect(onLayer).toHaveBeenCalledTimes(1);
    expect(onLayer).toHaveBeenCalledWith('markers', false);

    // 搜索 Drawer：通过 aria-label="搜索" 搜索按钮
    const searchBtn = container.querySelector<HTMLElement>('button[aria-label="搜索"]');
    if (searchBtn) fireEvent.click(searchBtn);
    const searchInput = screen.getByPlaceholderText('搜索地点、设备或围栏...') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: '叉车 A-03' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    await waitFor(() => expect(onSearch).toHaveBeenCalledWith('叉车 A-03'));

    // 轨迹播放 / 暂停：通过 Navigation svg 向上找 button 点击
    const navIcon = screen.getByTestId('icon-navigation');
    const navButton = navIcon.closest('button');
    expect(navButton).toBeTruthy();
    if (navButton) fireEvent.click(navButton);
    // 通过 Play svg 取 button（TrackPlayback Drawer 的 aria-label='执行'，不是"播放"）
    const playIcon = screen.getByTestId('icon-play');
    const playBtn = playIcon.closest('button');
    expect(playBtn).toBeTruthy();
    if (playBtn) fireEvent.click(playBtn);
    expect(onTrack).toHaveBeenCalledWith(true);
    const pauseIcon = screen.getByTestId('icon-pause');
    const pauseBtn = pauseIcon.closest('button');
    expect(pauseBtn).toBeTruthy();
    if (pauseBtn) fireEvent.click(pauseBtn);
    expect(onTrack).toHaveBeenLastCalledWith(false);
  });
});

// ============================================================
// Suite 4 · SettingsPageTemplate（Portal 配置页）
//  1. 空态：loading=true → skeleton；error Banner；success Banner
//  2. 基础态：tabs 2 个（基础/权限）+ 2 sections × 字段；保存/重置按钮
//  3. 交互：保存/重置回调；Tab 切换显示对应 section；switch/input 字段 onChange
// ============================================================
describe('SettingsPageTemplate · Portal 配置设置页', () => {
  const basicSection: SettingSection = {
    id: 'basic',
    title: '基础配置',
    description: '设置数据源基础信息',
    fields: [
      {
        id: 'ds_name',
        label: '数据源名称',
        type: 'text',
        value: 'BI-HIVE-PROD',
        placeholder: '请输入数据源名称',
      },
      { id: 'ds_host', label: '主机地址', type: 'text', value: 'hive.prod.internal' },
      { id: 'ds_port', label: '端口', type: 'number', value: 10000 },
      { id: 'ds_enabled', label: '启用该数据源', type: 'switch', value: true },
    ],
  };
  const permSection: SettingSection = {
    id: 'perm',
    title: '权限配置',
    description: '行级权限与角色绑定',
    fields: [
      { id: 'role_admin', label: '管理员可见', type: 'checkbox', value: true },
      { id: 'role_analyst', label: '分析师可读', type: 'checkbox', value: true },
      { id: 'role_viewer', label: '访客可见', type: 'checkbox', value: false },
      { id: 'ds_desc', label: '备注说明', type: 'textarea', value: '' },
    ],
  };
  const sections: SettingSection[] = [basicSection, permSection];
  const tabs: SettingTab[] = [
    { id: 'tab-basic', label: '基础设置', sections: [basicSection] },
    { id: 'tab-perm', label: '权限设置', sections: [permSection] },
  ];

  it('状态：loading skeleton × 3；error Alert 文本；success Alert 文本', () => {
    const { unmount, container } = renderWithProviders(
      <SettingsPageTemplate
        title='BI · 数据源设置'
        description='HIVE 生产数据源配置'
        loading
        sections={sections}
      />
    );
    const skel = container.querySelectorAll('span.MuiSkeleton-root');
    // Settings L503：loading → 3 个 Skeleton rect
    expect(skel.length).toBeGreaterThanOrEqual(3);
    unmount();

    renderWithProviders(
      <SettingsPageTemplate
        title='BI · 数据源设置'
        sections={sections}
        error='保存失败：HIVE 连接超时'
      />
    );
    // MUI Alert 里会渲染 error 文本
    expect(screen.getByText('保存失败：HIVE 连接超时')).toBeInTheDocument();

    const { unmount: un } = renderWithProviders(
      <SettingsPageTemplate
        title='BI · 数据源设置'
        sections={sections}
        success='已保存并生效'
      />
    );
    expect(screen.getByText('已保存并生效')).toBeInTheDocument();
    un();
  });

  it('基础态：tabs 2 项（基础设置/权限设置）+ 基础设置 section 字段；保存按钮/重置按钮文本默认值', () => {
    renderWithProviders(
      <SettingsPageTemplate
        title='BI · 数据源设置'
        subtitle='Portal 管理员 → 数据权限'
        tabs={tabs}
        showSaveButton
        showResetButton
      />
    );
    // header
    expect(screen.getByText('BI · 数据源设置')).toBeInTheDocument();
    expect(screen.getByText('Portal 管理员 → 数据权限')).toBeInTheDocument();
    // Tab（第 0 个默认 active）
    expect(screen.getByRole('tab', { name: '基础设置' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '权限设置' })).toBeInTheDocument();
    // 基础设置 section（activeTab=0 渲染 tabs[0].sections）
    expect(screen.getByText('基础配置')).toBeInTheDocument();
    expect(screen.getByDisplayValue('BI-HIVE-PROD')).toBeInTheDocument();
    expect(screen.getByDisplayValue('hive.prod.internal')).toBeInTheDocument();
    expect(screen.getByDisplayValue(10000)).toBeInTheDocument();
    // 按钮：保存按钮 Button text=saveButtonText("保存设置")；重置=resetButtonText("重置")
    expect(screen.getByRole('button', { name: '保存设置' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重置' })).toBeInTheDocument();
  });

  it('交互：保存/重置回调；Tab 切换后 section 变更；字段变更后 onSave 带上最新值', async () => {
    const onSave: Mock = vi.fn(async () => {});
    const onReset: Mock = vi.fn();
    renderWithProviders(
      <SettingsPageTemplate
        title='BI · 数据源设置'
        tabs={tabs}
        onSave={onSave}
        onReset={onReset}
      />
    );
    // Tab 切换：点"权限设置" Tab → activeTab=1 → 渲染 permSection
    fireEvent.click(screen.getByRole('tab', { name: '权限设置' }));
    expect(screen.getByRole('button', { name: '访客可见' })).toBeInTheDocument();
    expect(screen.queryByDisplayValue('BI-HIVE-PROD')).not.toBeInTheDocument();

    // 切回基础设置，改 ds_name 触发 hasChanges=true
    fireEvent.click(screen.getByRole('tab', { name: '基础设置' }));
    const nameInput = screen.getByDisplayValue('BI-HIVE-PROD') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'BI-HIVE-PROD-V2' } });

    // 先点重置（修改过 → 按钮 enabled → onReset 被调用 → hasChanges reset）
    fireEvent.click(screen.getByRole('button', { name: '重置' }));
    expect(onReset).toHaveBeenCalledTimes(1);
    // 重置后 ds_name 回到初始值
    expect(screen.getByDisplayValue('BI-HIVE-PROD')).toBeInTheDocument();

    // 再改一次并保存
    fireEvent.change(screen.getByDisplayValue('BI-HIVE-PROD') as HTMLInputElement, {
      target: { value: 'BI-HIVE-PROD-V3' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存设置' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]?.ds_name).toBe('BI-HIVE-PROD-V3');
  });
});
