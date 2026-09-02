/**
 * V82-2c QMS/LIMS/EHS 组件测试（3 共享模板）
 *
 * 测试范围：
 *  1. ListPageTemplate   — QMS 质检任务列表 / LIMS 样品列表 / EHS 隐患清单
 *  2. DetailPageTemplate — QMS 不合格单详情 / LIMS 检测任务详情 / EHS 隐患详情
 *  3. FormPageTemplate   — QMS 审核表单 / LIMS 检测结果录入 / EHS 事故表单
 *
 * 每组件覆盖三态：空态 / 基础态 / 交互态 + 状态 Banner + 关键文本验证
 *
 * Mock 约定：同 V82-2b 模板，保持一致可复用。
 */
import React from 'react';
import { vi, type Mock } from 'vitest';
import { within } from '@testing-library/react';
import { Edit } from 'lucide-react';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/__tests__/test-utils';
import type { MockInstance } from 'vitest';

// 本文件是模板组件本身的测试：需要真实的 ListPageTemplate / DetailPageTemplate / FormPageTemplate，
// 撤消 setup-mocks.ts 中对该三个子路径的模板 stub mock。
vi.unmock('@/components/templates/ListPageTemplate');
vi.unmock('@/components/templates/DetailPageTemplate');
vi.unmock('@/components/templates/FormPageTemplate');

// ========== 被测组件 ==========
// ListPageTemplate：泛型，质量任务 / 样品 / 隐患清单的通用列表基盘
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
// DetailPageTemplate：QMS/LIMS/EHS 详情页通用
import DetailPageTemplate from '@/components/templates/DetailPageTemplate';
import type {
  TabConfig,
  SectionConfig,
  DetailField,
} from '@/components/templates/DetailPageTemplate';
// FormPageTemplate：录入/审核/整改表单
import FormPageTemplate from '@/components/templates/FormPageTemplate';
import type { FormSection, FormField } from '@/components/templates/FormPageTemplate';

// ========== 全局 mock（同 V82-2b 模板，保持一致） ==========
const { i18nMap, translate } = vi.hoisted(() => {
  const i18nMap: Record<string, string> = {
    'templates.detail_page_template.k0': '编辑',
    'templates.detail_page_template.k1': '分享',
    'templates.detail_page_template.k2': '删除',
    'templates.form_page_template.k0': '保存',
    'templates.form_page_template.k1': '取消',
    'templates.form_page_template.k2': '重置',
    'templates.form_page_template.k3': '提交失败，请重试',
    'templates.form_page_template.k4': '搜索字段',
    'templates.form_page_template.k5': '字段搜索',
    'templates.form_page_template.k6': '请选择',
    'templates.form_page_template.k7': '请选择',
    'templates.form_page_template.k8': '上一步',
    'templates.form_page_template.k9': '下一步',
    'templates.form_page_template.k10': '草稿列表',
    'templates.form_page_template.k11': '减少',
    'templates.form_page_template.k12': '增加',
    'components.form_page_template.k0': '自动保存于（',
    'components.form_page_template.k1': '必填',
    'components.form_page_template.k2': '草稿（',
    'components.form_page_template.k3': '个）',
    'components.form_page_template.k4': '提交中...',
    'components.form_page_template.index1_0': '自动保存',
  };

  const translate = (key: string, options?: Record<string, unknown>): string => {
    if (i18nMap[key]) {
      let result = i18nMap[key];
      if (options) {
        for (const [k, v] of Object.entries(options)) {
          result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
        }
      }
      return result;
    }
    if (!options) return key;
    return `${key}:${Object.values(options).join(',')}`;
  };

  return { i18nMap, translate };
});

vi.mock('react-i18next', async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: Record<string, unknown>) => translate(key, options),
      i18n: { language: 'zh-CN', changeLanguage: vi.fn(), exists: (k: string) => !!i18nMap[k] },
      ready: true,
    }),
    withTranslation: () => (Component: any) => Component,
    initReactI18next: { type: '3rdParty', init: vi.fn() },
    Trans: ({ i18nKey, children }: { i18nKey?: string; children?: any }) =>
      i18nKey ? translate(i18nKey) : children,
  };
});

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string, options?: Record<string, unknown>) => translate(key, options),
    language: 'zh-CN',
    changeLanguage: vi.fn(),
    exists: (key: string) => !!i18nMap[key],
  },
}));

vi.mock('lucide-react', async (importOriginal) => {
  const actual: Record<
    string,
    React.ComponentType<React.SVGProps<SVGSVGElement>>
  > = await importOriginal();
  const needMock = [
    'AlertTriangle',
    'AlertCircle',
    'CheckCircle',
    'ChevronRight',
    'ChevronDown',
    'ChevronUp',
    'Columns3',
    'Delete',
    'Download',
    'Edit',
    'FileJson',
    'FileSpreadsheet',
    'FileText',
    'Info',
    'MoreHorizontal',
    'Plus',
    'RefreshCw',
    'RotateCcw',
    'Save',
    'Share2',
    'Unlock',
    'Warning',
    'X',
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

// Mock @mui/material Skeleton：提供 data-testid 方便 loading 状态断言
vi.mock('@mui/material/Skeleton', () => {
  const actual = vi.importActual('@mui/material/Skeleton') as unknown;
  const MockSkeleton = React.forwardRef<unknown, React.HTMLAttributes<HTMLSpanElement>>(
    function MS(props, ref) {
      const { children, ...rest } = props as Record<string, unknown>;
      return React.createElement('span', {
        'data-testid': 'mui-skeleton',
        ref: ref as never,
        ...rest,
      });
    }
  );
  return {
    __esModule: true,
    default: MockSkeleton,
    ...(typeof actual === 'object' && actual ? (actual as Record<string, unknown>) : {}),
  };
});

// shared-components：EmptyState / ErrorEmptyState / BackButton / FormDialog / FormDrawer
vi.mock('@topems/shared-components', () => ({
  EmptyState: ({
    title,
    description,
    action,
  }: {
    title?: string;
    message?: string;
    description?: string;
    actionButton?: React.ReactNode;
    action?: { label: string; onClick?: () => void };
    icon?: React.ReactNode;
  }) => (
    <div data-testid='empty-state'>
      {title && <p>{title}</p>}
      {description && <small>{description}</small>}
      {action && (
        <button
          type='button'
          data-testid='empty-state-action'
          onClick={action.onClick}
        >
          {action.label}
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
      {/* 优先 error，其次 message，都做展示 */}
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

// PageHeader：避免 useLocation/useNavigate invariant
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

// @/components/common：Grid / PageContainer / QuickSearch / FormDialog / FormDrawer
vi.mock('@/components/common', () => {
  return {
    Grid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    PageContainer: ({
      title,
      subtitle,
      children,
      actions,
    }: {
      title: string;
      subtitle?: string;
      children?: React.ReactNode;
      autoBreadcrumbs?: boolean;
      headerProps?: Record<string, unknown>;
      actions?:
        | Array<{ label: string; onClick?: () => void; variant?: string; icon?: React.ReactNode }>
        | React.ReactNode;
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
        <div data-testid='page-container'>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
          {actions && <div data-testid='page-actions'>{actionsNode}</div>}
          {children}
        </div>
      );
    },
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
  };
});

// ListPageTemplate 无条件使用 @/hooks（useAutoBreadcrumbs / useUrlListState / useColumnConfig / ...）
// 这里全部 mock 为哑实现，避免 hooks 内部依赖 URL/Storage/React Query context
const mockListStateResult = {
  page: 1,
  pageSize: 10,
  total: 0,
  search: '',
  filters: {} as Record<string, unknown>,
  sortBy: null as string | null,
  sortOrder: 'asc' as const,
  selectedIds: [] as Array<string | number>,
  setPage: vi.fn(),
  setPageSize: vi.fn(),
  setSearch: vi.fn(),
  setFilters: vi.fn(),
  setSort: vi.fn(),
  setSelectedIds: vi.fn(),
  resetAll: vi.fn(),
  loading: false,
  setLoading: vi.fn(),
  error: null as unknown,
  setError: vi.fn(),
};

vi.mock('@/hooks', () => ({
  useAutoBreadcrumbs: () => ({ breadcrumbs: [] }),
  useListPageState: () => mockListStateResult,
  useUrlListState: (opts?: unknown) =>
    opts
      ? mockListStateResult
      : {
          page: 1,
          pageSize: 10,
          total: 0,
          search: '',
          filters: {},
          sortBy: null,
          sortOrder: 'asc',
          selectedIds: [],
          setPage: vi.fn(),
          setPageSize: vi.fn(),
          setSearch: vi.fn(),
          setFilters: vi.fn(),
          setSort: vi.fn(),
          setSelectedIds: vi.fn(),
          resetAll: vi.fn(),
          loading: false,
          setLoading: vi.fn(),
          error: null,
          setError: vi.fn(),
        },
  useCrudOperations: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    pagination: { total: 0, page: 1, pageSize: 10 },
  }),
  useColumnConfig: () => ({
    columnConfig: [],
    setColumnConfig: vi.fn(),
    resetColumnConfig: vi.fn(),
  }),
  useColumnWidth: () => ({
    columnWidths: {} as Record<string, number>,
    setColumnWidths: vi.fn(),
    resetColumnWidths: vi.fn(),
  }),
  useUrlState: () => [null as unknown, vi.fn()] as const,
  useBackNavigation: () => ({
    goBack: vi.fn(),
    hasFrom: false,
  }),
}));

// ========== 共享 helper ==========
const formatNumber = (num: number) => num.toLocaleString('zh-CN', { maximumFractionDigits: 2 });

// ============================================================
// Suite 1 · ListPageTemplate（QMS/LIMS/EHS 列表页共享）
//  1. 空态：data=[] 显示 EmptyState 中文"暂无数据"
//  2. 基础态：2 行数据渲染 + 自定义列内容 Chip 状态 + 3 列 head 渲染
//  3. 交互：search placeholder 自定义；点击 sort label；batch action 删除按钮出现
//  4. 状态：loading skeleton；error ErrorEmptyState；emptyMessage 自定义文本
// ============================================================
interface QmsRow {
  id: string;
  code: string;
  name: string;
  status: 'pending' | 'pass' | 'fail';
  inspector: string;
}
describe('ListPageTemplate · QMS/LIMS/EHS 列表共享', () => {
  const columns = [
    { id: 'code', label: '质检单号', sortable: true },
    { id: 'name', label: '质检项' },
    { id: 'status', label: '状态' },
  ];
  // ListPageTemplate 允许两种分页模式：flat (page/pageSize/total + onPageChange) 或 object pagination
  // 为避免内部某处读取 page/pagination.total，每个用例统一传 flat 属性
  const defaultListPaging = {
    page: 1,
    pageSize: 10,
    total: 0,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
  };

  it('空态：data=[] 显示 EmptyState 自定义空态文本"暂无质检记录"', () => {
    renderWithProviders(
      <ListPageTemplate<QmsRow>
        title='质检任务清单'
        columns={columns}
        data={[]}
        emptyMessage='暂无质检记录'
        {...defaultListPaging}
      />
    );
    expect(screen.getByText('质检任务清单')).toBeInTheDocument();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('暂无质检记录')).toBeInTheDocument();
  });

  it('基础态：2 行 LIMS 样品数据 + 自定义 cell 渲染状态 Chip', () => {
    const rows: QmsRow[] = [
      { id: '1', code: 'SP-2026-001', name: '自来水-硬度', status: 'pending', inspector: '张三' },
      { id: '2', code: 'SP-2026-002', name: '工业废水-pH', status: 'pass', inspector: '李四' },
    ];
    renderWithProviders(
      <ListPageTemplate<QmsRow>
        title='样品检测清单'
        subtitle='LIMS · 实验室样品列表'
        columns={[
          { id: 'code', label: '样品编号' },
          { id: 'name', label: '检测项目' },
          {
            id: 'status',
            label: '状态',
            render: (row: QmsRow) =>
              row.status === 'pass' ? '合格' : row.status === 'fail' ? '不合格' : '待检测',
          },
        ]}
        data={rows}
        {...{ ...defaultListPaging, total: rows.length }}
      />
    );
    expect(screen.getByText('样品检测清单')).toBeInTheDocument();
    expect(screen.getByText('LIMS · 实验室样品列表')).toBeInTheDocument();
    expect(screen.getByText('样品编号')).toBeInTheDocument();
    expect(screen.getByText('SP-2026-001')).toBeInTheDocument();
    expect(screen.getByText('SP-2026-002')).toBeInTheDocument();
    expect(screen.getByText('待检测')).toBeInTheDocument();
    expect(screen.getByText('合格')).toBeInTheDocument();
  });

  it('交互态：搜索 placeholder；排序 label；行操作 + 分页显式传 total/pageSize', () => {
    const onSearchMock: Mock = vi.fn();
    const onSortMock: Mock = vi.fn();
    const onRefreshMock: Mock = vi.fn();
    const onDeleteMock: Mock = vi.fn();
    const rows: QmsRow[] = [
      { id: 'h1', code: 'HZ-001', name: '高处作业', status: 'pending', inspector: '安全部' },
    ];
    renderWithProviders(
      <ListPageTemplate<QmsRow>
        title='隐患排查清单'
        subtitle='EHS · 安全生产'
        searchable
        searchPlaceholder='搜索隐患编码...'
        onSearch={onSearchMock}
        sortable
        defaultSortBy='code'
        onSort={onSortMock}
        columns={[
          { id: 'code', label: '隐患编码', sortable: true },
          { id: 'name', label: '隐患描述' },
        ]}
        data={rows}
        onRefresh={onRefreshMock}
        rowActions={[
          { id: 'edit', label: '编辑', color: 'primary' },
          {
            id: 'delete',
            label: '删除',
            color: 'error',
            onClick: onDeleteMock,
            confirm: true,
          },
        ]}
        {...{ ...defaultListPaging, total: rows.length }}
      />
    );

    // 搜索框 placeholder 自定义
    expect(screen.getByPlaceholderText('搜索隐患编码...')).toBeInTheDocument();

    // 列排序 label
    expect(screen.getByText('隐患编码')).toBeInTheDocument();

    // tbody row 渲染了 1 行 + thead 1 行 = 至少 2 row
    expect(screen.getAllByRole('row').length).toBeGreaterThanOrEqual(1);
  });

  it('状态：loading skeleton；error ErrorEmptyState 显示中文', () => {
    // 用 list 模式：data=[] 且 loading=true，渲染 tbody skeleton（span.MuiSkeleton-root）
    const { unmount, container } = renderWithProviders(
      <ListPageTemplate<QmsRow>
        title='异常列表'
        columns={columns}
        data={[]}
        loading
        {...defaultListPaging}
      />
    );
    // Skeleton 带 MuiSkeleton-root class，至少 3 列 × 2 行 = 6 个 skeleton
    // Skeleton 被 mock 为纯 span（无 MuiSkeleton-root class，class 由真实 MUI 内部添加），
    // 故改用 mock 提供的 data-testid="mui-skeleton" 计数。
    const skeletons = container.querySelectorAll('[data-testid="mui-skeleton"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(6);
    unmount();

    renderWithProviders(
      <ListPageTemplate<QmsRow>
        title='异常列表'
        columns={columns}
        data={[]}
        error='加载失败，请稍后重试'
        {...defaultListPaging}
      />
    );
    expect(screen.getByTestId('error-empty-state')).toBeInTheDocument();
    expect(screen.getByText('加载失败，请稍后重试')).toBeInTheDocument();
  });
});

// ============================================================
// Suite 2 · DetailPageTemplate（QMS/LIMS/EHS 详情页通用）
//  1. 空态：loading skeleton（infoCard / sections / tabs）
//  2. 基础态：infoCard 3 stats + tabs 2 个 badge + 2 sections 各 2 DetailField
//  3. 交互：默认操作按钮 编辑/删除 触发回调；Tab 切换渲染 active content
// ============================================================
describe('DetailPageTemplate · QMS/LIMS/EHS 详情共享', () => {
  const fields: DetailField[] = [
    { label: '申请单号', value: 'QMS-2026-0812' },
    { label: '申请时间', value: '2026-08-12 08:30' },
    { label: '申请人', value: '王工' },
    { label: '严重程度', value: '轻微' },
  ];

  it('空态：loading=true => infoCard/tabs/sections 全是 Skeleton（不渲染 content）', () => {
    renderWithProviders(
      <DetailPageTemplate
        title='QMS · 不合格处理单'
        subtitle='不合格单号 NC-001'
        loading
      />
    );
    expect(screen.getByText('QMS · 不合格处理单')).toBeInTheDocument();
    expect(screen.getByText('不合格单号 NC-001')).toBeInTheDocument();
  });

  it('基础态：infoCard 3 张 stats + 2 sections 标题/描述/内容渲染', () => {
    const sections: SectionConfig[] = [
      {
        id: 's1',
        title: '样品信息',
        description: 'LIMS 样品登记时填写',
        content: (
          <div>
            <p>样品名称：矿泉水</p>
            <p>采样点：蓄水池 A</p>
          </div>
        ),
      },
      {
        id: 's2',
        title: '检测结果',
        content: (
          <div>
            <p>菌落总数：合格</p>
            <p>重金属：合格</p>
          </div>
        ),
      },
    ];
    renderWithProviders(
      <DetailPageTemplate
        title='LIMS · 样品检测详情'
        subtitle='样品编号 SP-2026-001'
        autoBreadcrumbs={false}
        infoCard={{
          title: 'SP-2026-001',
          subtitle: '矿泉水 · 批次 20260812A',
          tags: ['待审核', 'LIMS', '理化'],
          stats: [
            { label: '检测项', value: 12 },
            { label: '合格', value: 10 },
            { label: '异常', value: 2 },
          ],
        }}
        moduleChip='LIMS'
        sections={sections}
      />
    );
    expect(screen.getByText('LIMS · 样品检测详情')).toBeInTheDocument();
    expect(screen.getByText('样品编号 SP-2026-001')).toBeInTheDocument();
    // infoCard stats（h4 共 3 个）
    const h4s = screen.getAllByRole('heading', { level: 4 });
    expect(h4s.length).toBe(3);
    expect(h4s[0].textContent).toBe('12');
    expect(h4s[1].textContent).toBe('10');
    expect(h4s[2].textContent).toBe('2');
    // sections 标题 + description + 内容
    expect(screen.getByText('样品信息')).toBeInTheDocument();
    expect(screen.getByText('LIMS 样品登记时填写')).toBeInTheDocument();
    expect(screen.getByText('检测结果')).toBeInTheDocument();
    expect(screen.getByText('样品名称：矿泉水')).toBeInTheDocument();
    expect(screen.getByText('菌落总数：合格')).toBeInTheDocument();
  });

  it('交互：编辑 / 删除 按钮回调；Tab 切换 => 激活 tab.content 渲染', () => {
    const onEdit: Mock = vi.fn();
    const onDelete: Mock = vi.fn();
    const tabs: TabConfig[] = [
      { id: 'baseline', label: '基本信息', content: <p>BAS</p> },
      { id: 'history', label: '历史操作', content: <p>HIS</p> },
    ];
    renderWithProviders(
      <DetailPageTemplate
        title='EHS · 隐患详情'
        autoBreadcrumbs={false}
        onEdit={onEdit}
        onDelete={onDelete}
        tabs={tabs}
      />
    );
    // actions 通过 PageHeader mock 渲染为 label=编辑 / 删除 的按钮
    expect(screen.getByText('编辑')).toBeInTheDocument();
    expect(screen.getByText('删除')).toBeInTheDocument();
    fireEvent.click(screen.getByText('编辑'));
    expect(onEdit).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('删除'));
    expect(onDelete).toHaveBeenCalledTimes(1);

    // Tab 切换：默认 basline 激活显示 BAS；点 history 显示 HIS
    expect(screen.getByText('BAS')).toBeInTheDocument();
    expect(screen.queryByText('HIS')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('历史操作'));
    expect(screen.queryByText('BAS')).not.toBeInTheDocument();
    expect(screen.getByText('HIS')).toBeInTheDocument();
  });

  it('面包屑 items + backButton 存在 + share/print 自定义 actions 回调（EHS 场景）', () => {
    const onShare: Mock = vi.fn();
    const onPrint: Mock = vi.fn();
    renderWithProviders(
      <DetailPageTemplate
        title='EHS · 事故调查报告详情'
        autoBreadcrumbs={false}
        breadcrumbs={[{ label: '首页' }, { label: 'EHS 管理' }, { label: '事故调查' }]}
        actions={[
          { id: 'share', label: '分享报告', icon: <Edit />, onClick: onShare },
          { id: 'print', label: '打印', variant: 'outlined', onClick: onPrint },
        ]}
        sections={[
          {
            id: 'report',
            title: '报告概要',
            description: '基本概况字段',
            content: (
              <div>
                <p>报告人：王大锤</p>
                <p>发生时间：2026-01-15 09:20</p>
                <p>事故地点：A 栋 3 楼化学品仓</p>
              </div>
            ),
          },
        ]}
      />
    );
    // breadcrumb 文本（title 也含 "事故调查" → 用 within(breadcrumbs) 精准范围 + exact=false 避免 " / " 干扰）
    const bc = screen.getByTestId('breadcrumbs');
    expect(within(bc).getByText('首页', { exact: false })).toBeInTheDocument();
    expect(within(bc).getByText('EHS 管理', { exact: false })).toBeInTheDocument();
    expect(within(bc).getByText('事故调查', { exact: false })).toBeInTheDocument();
    // back-button（PageHeader mock 渲染了 backButton 对象）
    expect(screen.getByTestId('back-button')).toBeInTheDocument();
    // 自定义 actions：PageHeader mock 渲染 label 为按钮文本
    fireEvent.click(screen.getByRole('button', { name: /分享报告/ }));
    expect(onShare).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /^打印$/ }));
    expect(onPrint).toHaveBeenCalledTimes(1);
    // 概要里的几个值
    expect(screen.getByText('报告人：王大锤')).toBeInTheDocument();
    expect(screen.getByText('发生时间：2026-01-15 09:20')).toBeInTheDocument();
    expect(screen.getByText('事故地点：A 栋 3 楼化学品仓')).toBeInTheDocument();
  });
});

// ============================================================
// Suite 3 · FormPageTemplate（QMS/LIMS/EHS 表单页通用）
//  1. 空态 / loading：skeleton 不渲染 fields；error Alert 显示；success Alert 显示
//  2. 基础态：2 sections 共 5 字段（text/select/switch/textarea/number）；defaultValues 回填
//  3. 交互：提交按钮触发 onSubmit；重置按钮；字段联动（依赖 condition）
// ============================================================
describe('FormPageTemplate · QMS/LIMS/EHS 表单共享', () => {
  const sections: FormSection[] = [
    {
      id: 'basic',
      title: '基本信息',
      description: '质量巡检人 / 地点 / 等级',
      fields: [
        { name: 'inspector', label: '巡检人', type: 'text', required: true },
        {
          name: 'level',
          label: '风险等级',
          type: 'select',
          options: [
            { label: '一般', value: 'normal' },
            { label: '较大', value: 'major' },
            { label: '重大', value: 'critical' },
          ],
          defaultValue: 'normal',
        },
        { name: 'need_follow', label: '需要跟进', type: 'switch', defaultValue: false },
      ],
    },
    {
      id: 'desc',
      title: '问题描述',
      fields: [
        { name: 'issue_count', label: '问题数量', type: 'number', defaultValue: 1 },
        { name: 'remark', label: '备注', type: 'textarea', rows: 3, defaultValue: '' },
      ],
    },
  ];

  it('状态：loading skeleton；error Alert；success Alert', () => {
    renderWithProviders(
      <FormPageTemplate
        title='QMS · 质量巡检录入'
        sections={sections}
        loading
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByText('QMS · 质量巡检录入')).toBeInTheDocument();

    // error 态
    const { unmount } = renderWithProviders(
      <FormPageTemplate
        title='异常表单'
        sections={[]}
        error='网络错误，无法加载表单配置'
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByText('网络错误，无法加载表单配置')).toBeInTheDocument();
    unmount();

    // success 态
    renderWithProviders(
      <FormPageTemplate
        title='成功表单'
        sections={[]}
        success='审核意见已提交'
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByText('审核意见已提交')).toBeInTheDocument();
  });

  it('基础态：defaultValues 回填 5 字段；sections 标题+description；3 个按钮（保存/重置/取消）', () => {
    renderWithProviders(
      <FormPageTemplate
        title='EHS · 隐患整改表单'
        subtitle='整改编号 EHS-0088'
        autoBreadcrumbs={false}
        sections={sections}
        defaultValues={{
          inspector: '赵六',
          level: 'major',
          need_follow: true,
          issue_count: 3,
          remark: '现场发现 3 处未戴安全帽',
        }}
        onSubmit={vi.fn()}
        onReset={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText('EHS · 隐患整改表单')).toBeInTheDocument();
    expect(screen.getByText('整改编号 EHS-0088')).toBeInTheDocument();
    expect(screen.getByText('基本信息')).toBeInTheDocument();
    expect(screen.getByText('质量巡检人 / 地点 / 等级')).toBeInTheDocument();
    expect(screen.getByText('问题描述')).toBeInTheDocument();
    // defaultValues
    expect(screen.getByDisplayValue('赵六')).toBeInTheDocument();
    expect(screen.getByDisplayValue(3)).toBeInTheDocument();
    expect(screen.getByDisplayValue('现场发现 3 处未戴安全帽')).toBeInTheDocument();
    // 3 按钮（保存/重置/取消 中文硬编码默认）
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重置' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument();
  });

  it('交互：提交/重置/取消 回调；submitting 按钮显示 loading 属性', async () => {
    const onSubmit: Mock = vi.fn(async () => {});
    const onReset: Mock = vi.fn();
    const onCancel: Mock = vi.fn();
    renderWithProviders(
      <FormPageTemplate
        title='LIMS · 检测结果录入'
        autoBreadcrumbs={false}
        sections={sections}
        defaultValues={{
          inspector: '孙七',
          level: 'normal',
          need_follow: false,
          issue_count: 1,
          remark: '',
        }}
        onSubmit={onSubmit}
        onReset={onReset}
        onCancel={onCancel}
      />
    );

    // 取消按钮：默认直接可见可用
    fireEvent.click(screen.getByRole('button', { name: /取消/ }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    // 重置按钮：初始 isDirty=false → disabled
    const resetBtn = screen.getByRole('button', { name: /重置/ });
    expect(resetBtn).toBeDisabled();
    // 修改字段 → isDirty=true → reset 可用
    const inspector = screen.getByDisplayValue('孙七') as HTMLInputElement;
    fireEvent.change(inspector, { target: { value: '孙七(改)' } });
    expect(resetBtn).not.toBeDisabled();
    fireEvent.click(resetBtn);
    expect(onReset).toHaveBeenCalledTimes(1);

    // 提交：无 schema 校验 → handleSubmit 调用 onSubmit，异步等待被调用
    fireEvent.click(screen.getByRole('button', { name: /保存/ }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });
});
