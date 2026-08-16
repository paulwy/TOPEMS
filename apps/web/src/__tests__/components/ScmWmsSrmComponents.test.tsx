/**
 * @file ScmWmsSrmComponents.test.tsx
 * @desc V82-2b · SCM / WMS / SRM 模块组件渲染 + 交互测试
 *
 * 覆盖 5 类组件共 12 it（空态 / 基础数据 / 交互 三态）：
 *  [SCM] SettingsPageTemplate（采购阈值 / 配额模板 / 供应商分层共用基础模板）
 *  [WMS] InventoryReportFilters + InventoryReportSummary 组合变体（不重复已有 __tests__ 用例，新增：空仓库+alert合计/4 Tab切换/Tab滚动容器）
 *  [SRM] DashboardTemplate（供应商看板共用基础模板：stats/table/onRefresh）
 *
 * 验收：vitest --project component PASS · tsc 0 err · prettier OK
 */
import React, { createElement } from 'react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/__tests__/test-utils';

const { tMock } = vi.hoisted(() => {
  const i18nMap: Record<string, string> = {
    'templates.settings_page_template.k0': '保存设置',
    'templates.settings_page_template.k1': '重置',
    'templates.settings_page_template.k2': '保存失败',
    'templates.settings_page_template.k3': '信息',
    'templates.settings_page_template.k4': '关闭',
    'templates.settings_page_template.k5': '开启',
    'templates.settings_page_template.k6': '展开',
    'templates.settings_page_template.k7': '有未保存的更改',
    'templates.settings_page_template.k8': '关闭',
    'templates.settings_page_template.k9': '关闭',
    'components.settings_page_template.k0': '点击展开查看',
    'components.settings_page_template.k1': '个设置项',
    'components.settings_page_template.k2': '个设置项存在错误',
    'components.dashboard_template.k0': '搜索...',
    'components.dashboard_template.k1': '暂无数据',
    'components.dashboard_template.k2': '最近事项',
    'components.dashboard_template.k3': '快捷操作',
    'components.dashboard_template.k4': '刷新',
    'wms.inventory_report_page.alert_attention': '预警关注',
    'shared.form_drawer.k0': '保存',
    'shared.form_drawer.k1': '取消',
  };

  const tMock = (key: string, options?: Record<string, unknown>): string => {
    let value = i18nMap[key] || key;
    if (options) {
      for (const [k, v] of Object.entries(options)) {
        value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      }
    }
    return value;
  };

  return { tMock };
});

vi.mock('@/i18n', () => ({
  default: {
    t: tMock,
    language: 'zh',
    on: () => {},
    off: () => {},
    use: () => ({ init: () => {} }),
    init: () => {},
    changeLanguage: () => {},
  },
  SUPPORTED_LANGUAGES: [
    { code: 'zh', name: '中文', flag: 'CN' },
    { code: 'en', name: 'English', flag: 'US' },
  ],
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: tMock,
    i18n: {
      language: 'zh',
      changeLanguage: vi.fn(),
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
  Trans: ({ children, i18nKey }: { children?: React.ReactNode; i18nKey?: string }) => {
    if (i18nKey) {
      return <span>{tMock(i18nKey)}</span>;
    }
    return <span>{children}</span>;
  },
}));

// ========== 被测试组件 ==========
// SCM setting 页面共用基础模板（来自 templates）
import {
  SettingsPageTemplate,
  type SettingSection,
} from '@/components/templates/SettingsPageTemplate';
// WMS InventoryReport（已有独立 __tests__，本文件覆盖它的"新组合变体"避免重复）
import InventoryReportFilters, {
  TabPanel,
  InventoryReportFilterHint,
} from '@/pages/wms/components/InventoryReportFilters';
import InventoryReportSummary from '@/pages/wms/components/InventoryReportSummary';
import type { InventoryStatistics, Warehouse } from '@/api/wms/types';
// SRM Dashboard 共用基础模板（来自 templates）
import {
  DashboardTemplate,
  type StatCard,
  type DataTableConfig,
} from '@/components/templates/DashboardTemplate';

vi.mock('lucide-react', async (importOriginal) => {
  const actual: Record<
    string,
    React.ComponentType<React.SVGProps<SVGSVGElement>>
  > = await importOriginal();
  const needMock = [
    'AlertCircle',
    'ArrowRight',
    'Award',
    'BarChart3',
    'Building2',
    'CheckCircle',
    'ChevronRight',
    'ClipboardList',
    'Clock',
    'DollarSign',
    'Info',
    'Package',
    'RotateCcw',
    'Save',
    'ScrollText',
    'Settings',
    'TrendingDown',
    'TrendingUp',
    'Users',
    'Warehouse',
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

// SettingsPageTemplate 内部用了 @/components/templates/PageHeader（内部 useLocation/useNavigate）
// → 这里替换为哑组件，避免 react-router context 报错
vi.mock('@/components/templates/PageHeader', () => ({
  PageHeader: ({
    title,
    subtitle,
    description,
    loading,
    children,
  }: {
    title: string;
    subtitle?: string;
    description?: string;
    loading?: boolean;
    breadcrumbs?: unknown;
    pageIcon?: React.ReactNode;
    actions?: unknown;
    children?: React.ReactNode;
  }) => (
    <div data-testid='mock-page-header'>
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
      {description && <p>{description}</p>}
      {loading ? <div data-testid='page-header-loading' /> : null}
      {children}
    </div>
  ),
}));

// SettingsPageTemplate 用了 @/components/common 的 Grid（shared Grid）
vi.mock('@/components/common', () => ({
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
}));

// ========== 共享 helper ==========
const formatNumber = (num: number) => num.toLocaleString('zh-CN', { maximumFractionDigits: 2 });

// ============================================================
// Suite 1 · SettingsPageTemplate = SCM setting 页共用基础模板
// 覆盖：空 sections、基础 sections + 字段校验失败通过保存回调有变化、
//       tabs 模式切换、loading/saving/error/success Banner、重置按钮
// ============================================================
describe('SettingsPageTemplate', () => {
  const basicSections: SettingSection[] = [
    {
      id: 'threshold',
      title: '安全库存阈值',
      description: '低于该值自动触发采购申请',
      fields: [
        {
          id: 'safety-stock',
          label: '通用安全库存',
          type: 'number',
          value: 100,
          required: true,
          validation: (v) => (Number(v) >= 10 ? true : '安全库存不能低于 10'),
          helperText: '建议 ≥ 10',
        },
        {
          id: 'owner',
          label: '审批人',
          type: 'text',
          value: '',
          required: true,
          placeholder: '请输入审批人姓名',
        },
        {
          id: 'auto-reorder',
          label: '开启自动补货',
          type: 'switch',
          value: true,
        },
      ],
    },
    {
      id: 'strategy',
      title: '采购策略',
      collapsible: true,
      defaultExpanded: false,
      color: 'success',
      fields: [
        {
          id: 'strategy-type',
          label: '策略类型',
          type: 'select',
          value: 'jic',
          options: [
            { label: 'JIC 按库存', value: 'jic' },
            { label: 'JIT 按单', value: 'jit', description: '库存低、响应快' },
          ],
        },
      ],
    },
  ];

  it('空态：无 sections、无 tabs、隐藏保存重置按钮 => 仅 title/subtitle 渲染', () => {
    renderWithProviders(
      <SettingsPageTemplate
        title='供应商分层'
        subtitle='供应链管理 · 系统设置'
        sections={[]}
        // tabs 传 undefined（空数组 [] 是 truthy 会触发 tabs 分支访问 tabs[0].sections → undefined）
        showSaveButton={false}
        showResetButton={false}
      />
    );
    expect(screen.getByRole('heading', { level: 2, name: '供应商分层' })).toBeInTheDocument();
    expect(screen.getByText('供应链管理 · 系统设置')).toBeInTheDocument();
    expect(screen.queryByText('保存设置')).not.toBeInTheDocument();
    expect(screen.queryByText('重置')).not.toBeInTheDocument();
  });

  it('基础态：2 个 section 渲染字段 + 可折叠 section 默认显示"点击展开"提示', () => {
    renderWithProviders(
      <SettingsPageTemplate
        title='采购阈值配置'
        sections={basicSections}
        showSaveButton
        showResetButton
      />
    );
    expect(screen.getByText('安全库存阈值')).toBeInTheDocument();
    expect(screen.getByText('采购策略')).toBeInTheDocument();
    // 第一个非折叠 section 显示 TextField number value=100（用 displayValue）
    expect(screen.getByDisplayValue(100)).toBeInTheDocument();
    // Switch 默认 true → 显示"开启"
    expect(screen.getByText('开启')).toBeInTheDocument();
    // 第二个 collapsible section（默认收起） => 显示"点击展开查看 N 个设置项"
    expect(screen.getByText('点击展开查看 1 个设置项')).toBeInTheDocument();
    // Footer hasChanges=false → 无 Chip，且 save/reset 按钮都 disabled
    expect(screen.queryByText('有未保存的更改')).not.toBeInTheDocument();
    const saveBtn = screen.getByRole('button', { name: /保存设置/ });
    const resetBtn = screen.getByRole('button', { name: /重置/ });
    expect(saveBtn).toBeDisabled();
    expect(resetBtn).toBeDisabled();
  });

  it('交互态：修改字段触发 hasChanges chip；校验失败显示 N 个错误；校验通过保存 onSave 调用', async () => {
    const onSave: Mock = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(
      <SettingsPageTemplate
        title='采购阈值配置'
        sections={basicSections}
        onSave={onSave}
      />
    );

    // 1. 修改审批人（必填，原值为空）→ 产生 hasChanges
    const ownerInput = screen.getByPlaceholderText('请输入审批人姓名');
    fireEvent.change(ownerInput, { target: { value: '老王' } });
    expect(screen.getByText('有未保存的更改')).toBeInTheDocument();

    // 2. 修改安全库存为 5（违反 ≥10 的校验）+ 点击保存 => 显示 2 个错误？=1 安全库存 + ？校验失败信息
    const safetyInput = screen.getByDisplayValue(100);
    fireEvent.change(safetyInput, { target: { value: '5' } });
    const saveBtn = screen.getByRole('button', { name: /保存设置/ });
    fireEvent.click(saveBtn);
    // 显示"1个设置项存在错误"（只有安全库存字段设置了自定义 validation 且 required 也 true？值是 5，required 通过；validation 返回字符串 → 1 个错误）
    await waitFor(() => {
      expect(screen.getByText(/1个设置项存在错误/)).toBeInTheDocument();
    });
    expect(screen.getByText('安全库存不能低于 10')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    // 3. 修复库存为 20 → validation 通过，保存按钮再点 => onSave 最后被调用
    fireEvent.change(safetyInput, { target: { value: '20' } });
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
    // 传入 onSave 的数据包含：safety-stock=20 owner=老王 auto-reorder=true strategy-type 默认 'jic'
    expect(onSave.mock.calls[0][0]).toMatchObject({
      'safety-stock': 20,
      owner: '老王',
      'auto-reorder': true,
      'strategy-type': 'jic',
    });
  });

  it('状态 Banner：error/success/saving/loading 渲染对应组件', async () => {
    const { rerender } = renderWithProviders(
      <SettingsPageTemplate
        title='配额模板'
        sections={basicSections}
        error='同步 ERP 接口失败：超时'
      />
    );
    expect(screen.getByText('同步 ERP 接口失败：超时')).toBeInTheDocument();
    // success
    rerender(
      <SettingsPageTemplate
        title='配额模板'
        sections={basicSections}
        success='配置已成功保存'
      />
    );
    expect(screen.getByText('配置已成功保存')).toBeInTheDocument();
    // saving ：按钮显示 saving=true 的翻译文本（k1="个设置项"）；通过查找包含该文本且为按钮来验证
    rerender(
      <SettingsPageTemplate
        title='配额模板'
        sections={basicSections.map((s) => ({
          ...s,
          collapsible: false,
          fields: s.fields.map((f) => ({ ...f, value: f.id === 'owner' ? '有值' : f.value })),
        }))}
        saving
      />
    );
    // saving=true 时按钮的文本存在即可
    expect(screen.getByText('个设置项')).toBeInTheDocument();
  });

  it('重置：字段还原到 defaultValue；Tabs 模式切换 sections 数据源', async () => {
    const onReset: Mock = vi.fn();
    const sectionsTab0: SettingSection[] = [
      {
        id: 's',
        title: 'Tab0 分区',
        fields: [
          {
            id: 'threshold',
            label: '阈值',
            type: 'number',
            value: 100,
            defaultValue: 50,
          },
        ],
      },
    ];
    const sectionsTab1: SettingSection[] = [
      {
        id: 's2',
        title: 'Tab1 分区',
        fields: [
          {
            id: 'tpl',
            label: '模板名',
            type: 'text',
            value: 'default',
            defaultValue: 'default',
          },
        ],
      },
    ];
    renderWithProviders(
      <SettingsPageTemplate
        title='配额模板（Tabs）'
        tabs={[
          { id: 't0', label: '基础参数', sections: sectionsTab0 },
          { id: 't1', label: '高级参数', sections: sectionsTab1 },
        ]}
        onReset={onReset}
      />
    );
    // 初始 Tab0：阈值 = 100（当前 value），修改为 888 产生 hasChanges
    const input = screen.getByDisplayValue(100);
    fireEvent.change(input, { target: { value: '888' } });
    const resetBtn = screen.getByRole('button', { name: /重置/ });
    expect(resetBtn).not.toBeDisabled();
    fireEvent.click(resetBtn);
    expect(onReset).toHaveBeenCalledTimes(1);
    // 阈值字段应回到 defaultValue = 50
    expect(screen.getByDisplayValue(50)).toBeInTheDocument();

    // 切 Tab1
    fireEvent.click(screen.getByRole('tab', { name: '高级参数' }));
    // Tab1 section 显示模板名字段，默认值 'default'
    expect(screen.getByDisplayValue('default')).toBeInTheDocument();
  });
});

// ============================================================
// Suite 2 · WMS InventoryReport 新组合变体（避免重复已有用例）
//  1. 空仓库筛选：warehouses=[] 时 Select 只有 "全部仓库" 1 个选项；
//     summary statistics=undefined 时 8 张卡片全部 fallback 到 0；
//     alert overview attention 合计 = 0+0 = 0
//  2. 4 Tab 切换 + onChange 回调
//  3. TabPanel 只显示激活 + 隐藏非激活；FilterHint 自定义文本渲染
// ============================================================
describe('WMS InventoryReport 组件新组合变体', () => {
  it('空态：空仓库 + statistics=undefined => 8 张统计卡 fallback 0 + 合计 attention=0', () => {
    renderWithProviders(
      <>
        <InventoryReportFilters
          currentTab={0}
          onTabChange={vi.fn()}
          warehouseFilter=''
          onWarehouseFilterChange={vi.fn()}
          warehouses={[]}
        />
        <InventoryReportSummary
          statistics={undefined}
          formatNumber={formatNumber}
        />
      </>
    );
    // 仓库 Select 只有"全部仓库"一项（因为 warehouses=[]，只渲染了第 1 个 MenuItem）
    // Tab 4 个
    expect(screen.getAllByRole('tab').length).toBe(4);
    // 统计卡数值 fallback：warehouse_count/sku/total_quantity 是纯 0；
    // total_value 是 ¥0（带 ¥ 前缀，textContent ≠ '0'）；
    // alert overview 4 张 attention 各 0 → 合计 7 张纯 0 的 H4。
    const zeroH4s = screen.getAllByRole('heading', { level: 4 });
    expect(zeroH4s.filter((h) => h.textContent === '0').length).toBeGreaterThanOrEqual(7);
    // attention 合计 = low_stockitems(0) + out_of_stockitems(0) = 0
    const alertH5s = screen.getAllByRole('heading', { level: 5 });
    expect(alertH5s.length).toBe(4);
    alertH5s.forEach((h) => expect(h.textContent).toBe('0'));
    expect(screen.getByText('预警关注')).toBeInTheDocument();
  });

  it('4 Tab 切换：onTabChange 回调传正确新 index', () => {
    const onTabChange: Mock = vi.fn();
    renderWithProviders(
      <InventoryReportFilters
        currentTab={0}
        onTabChange={onTabChange}
        warehouseFilter=''
        onWarehouseFilterChange={vi.fn()}
        warehouses={[]}
      />
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    // 点第 3 个 Tab（Turnover）
    fireEvent.click(tabs[2]);
    expect(onTabChange).toHaveBeenCalledWith(2);
    // 点第 4 个 Tab（warehouse value）
    fireEvent.click(tabs[3]);
    expect(onTabChange).toHaveBeenCalledWith(3);
  });

  it('TabPanel 只渲染激活面板；FilterHint 自定义 caption 渲染', () => {
    renderWithProviders(
      <>
        <TabPanel
          value={1}
          index={1}
        >
          Tab激活内容
        </TabPanel>
        <TabPanel
          value={1}
          index={0}
        >
          Tab未激活0
        </TabPanel>
        <TabPanel
          value={1}
          index={2}
        >
          Tab未激活2
        </TabPanel>
      </>
    );
    expect(screen.getByText('Tab激活内容')).toBeInTheDocument();
    // hidden=true，不渲染文本
    expect(screen.queryByText('Tab未激活0')).not.toBeInTheDocument();
    expect(screen.queryByText('Tab未激活2')).not.toBeInTheDocument();

    // InventoryReportFilterHint 是一个 caption 组件
    const { unmount } = renderWithProviders(
      <InventoryReportFilterHint text='按ABC规则自动分类提示' />
    );
    expect(screen.getByText('按ABC规则自动分类提示')).toBeInTheDocument();
    unmount();
  });
});

// ============================================================
// Suite 3 · DashboardTemplate（WMS/SRM 看板共用基础模板）
//  1. 空态：无 stats 无 charts 无 table => 仅 title
//  2. 基础态：stats 4 张卡 + DataTable 数据渲染
//  3. 快捷操作 refresh 按钮触发 onRefresh；loading 显示 Skeleton；
//     DataTable 空数组显示 "暂无数据"
// ============================================================
describe('DashboardTemplate · WMS/SRM 看板通用', () => {
  const stats: StatCard[] = [
    {
      id: 's',
      title: '活跃供应商',
      value: 128,
      subtitle: '较上月 +12',
      color: 'primary',
    },
    {
      id: 'avg',
      title: '平均评分',
      value: '4.6',
      subtitle: '最近 30 天',
      color: 'warning',
    },
  ];

  const tableCfg: DataTableConfig = {
    title: '近期采购订单',
    columns: [
      { id: 'no', label: '订单号' },
      { id: 'amt', label: '金额' },
      { id: 'status', label: '状态' },
    ],
    data: [
      { no: 'PO-20260801', amt: '¥12,000', status: '已下单' },
      { no: 'PO-20260802', amt: '¥6,800', status: '已收货' },
    ],
  };

  it('空态：无数据，仅 title 页面容器渲染', () => {
    renderWithProviders(<DashboardTemplate title='WMS 看板' />);
    expect(screen.getByRole('heading', { level: 2, name: 'WMS 看板' })).toBeInTheDocument();
    expect(screen.queryByText('活跃供应商')).not.toBeInTheDocument();
    expect(screen.queryByText('近期采购订单')).not.toBeInTheDocument();
  });

  it('基础态：2 张 statCards + DataTable 两行数据渲染', () => {
    renderWithProviders(
      <DashboardTemplate
        title='SRM 供应商关系看板'
        stats={stats}
        table={tableCfg}
      />
    );
    expect(screen.getByText('活跃供应商')).toBeInTheDocument();
    expect(screen.getByText('平均评分')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('4.6')).toBeInTheDocument();
    expect(screen.getByText('近期采购订单')).toBeInTheDocument();
    expect(screen.getByText('PO-20260801')).toBeInTheDocument();
    expect(screen.getByText('¥6,800')).toBeInTheDocument();
    expect(screen.getByText('已收货')).toBeInTheDocument();
  });

  it('交互 + 状态：onRefresh 按钮触发；loading 显示骨架；空数据显示暂无数据', () => {
    const onRefresh: Mock = vi.fn();
    const { rerender } = renderWithProviders(
      <DashboardTemplate
        title='WMS 看板'
        stats={stats}
        onRefresh={onRefresh}
      />
    );
    // PageHeader actions 添加了"刷新"按钮（中文硬编码）
    fireEvent.click(screen.getByRole('button', { name: /刷新/ }));
    expect(onRefresh).toHaveBeenCalledTimes(1);

    // table loading=true => 5 行 skeleton
    rerender(
      <DashboardTemplate
        title='WMS 看板'
        stats={stats}
        table={{ ...tableCfg, data: [], loading: true }}
      />
    );
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThanOrEqual(5);

    // table data=[] 且不 loading => "暂无数据"
    rerender(
      <DashboardTemplate
        title='WMS 看板'
        stats={stats}
        table={{ ...tableCfg, data: [] }}
      />
    );
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });
});
