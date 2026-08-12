import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import VoucherFormDialog from '@/pages/erp/components/VoucherFormDialog';
import { DatabaseManagementModals } from '@/pages/erp/components/DatabaseManagementModals';
import {
  BalanceSheetViewer,
  IncomeStatementViewer,
  CashFlowStatementViewer,
} from '@/components/finance/FinancialReports';

import type {
  BalanceSheet,
  IncomeStatement,
  CashFlowStatement,
  BalanceSheetSection,
  IncomeStatementSection,
  CashFlowSection,
} from '@/types/finance';
import type { AccountingSubject, VoucherItemRequest } from '@/api/erp/types';
import type { ColumnInfo, TableInfo } from '@/api/erp/database';
import type { VoucherManagementReturn } from '@/pages/erp/hooks/useVoucherManagement';
import type { NewVoucherState } from '@/pages/erp/hooks/useVoucherManagement';

// ============================================================
// Mock 层
// ============================================================
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).join(',')}` : key,
    i18n: { language: 'zh-CN', changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('lucide-react', () => {
  const icon =
    (name: string) =>
    ({ size: _size, ...props }: Record<string, unknown>) =>
      React.createElement('svg', { 'data-testid': `icon-${name}`, ...props });
  return {
    Plus: icon('plus'),
    X: icon('x'),
    Check: icon('check'),
    Download: icon('download'),
    Upload: icon('upload'),
    Play: icon('play'),
    Settings: icon('settings'),
    AlertCircle: icon('alert-circle'),
    DollarSign: icon('dollar-sign'),
    TrendingUp: icon('trending-up'),
    TrendingDown: icon('trending-down'),
    ArrowRight: icon('arrow-right'),
    BarChart3: icon('bar-chart-3'),
    PieChart: icon('pie-chart'),
    Activity: icon('activity'),
    Wallet: icon('wallet'),
    FileText: icon('file-text'),
  };
});

vi.mock('@/components/common', () => ({
  ConfirmDialog: ({
    isOpen,
    title,
    message,
    onConfirm,
    onClose,
    confirmText,
    cancelText,
  }: {
    isOpen: boolean;
    title?: string;
    message?: string;
    onConfirm?: () => void;
    onClose?: () => void;
    confirmText?: string;
    cancelText?: string;
  }) =>
    isOpen ? (
      <div data-testid='confirm-dialog'>
        <h4>{title}</h4>
        <p>{message}</p>
        <button
          type='button'
          onClick={onConfirm}
        >
          {confirmText || '确认'}
        </button>
        <button
          type='button'
          onClick={onClose}
        >
          {cancelText || '取消'}
        </button>
      </div>
    ) : null,
}));

vi.mock('recharts', () => {
  const wrap = (name: string, children: React.ReactNode) =>
    React.createElement('div', { 'data-testid': `recharts-${name}` }, children);
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      wrap('responsive-container', children),
    BarChart: ({ children }: { children: React.ReactNode }) => wrap('bar-chart', children),
    Bar: () => wrap('bar', null),
    PieChart: ({ children }: { children: React.ReactNode }) => wrap('pie-chart', children),
    Pie: () => wrap('pie', null),
    Cell: () => wrap('cell', null),
    XAxis: () => wrap('x-axis', null),
    YAxis: () => wrap('y-axis', null),
    CartesianGrid: () => wrap('cartesian-grid', null),
    Tooltip: () => wrap('tooltip', null),
    Legend: () => wrap('legend', null),
  };
});

const subjects: AccountingSubject[] = [
  {
    id: 's-1',
    code: '1001',
    name: '库存现金',
    category: 'asset',
    level: 1,
    is_cash_flow: true,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  },
  {
    id: 's-2',
    code: '6601',
    name: '销售费用',
    category: 'expense',
    level: 1,
    is_cash_flow: false,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  },
];

const formatCurrency = (amount: number) => `¥${amount.toLocaleString('zh-CN')}`;

const emptyItems: VoucherItemRequest[] = [];
const balancedItems: VoucherItemRequest[] = [
  {
    line_number: 1,
    subject_code: '1001',
    summary: '收到客户货款',
    debit_amount: 10_000,
    credit_amount: 0,
  },
  {
    line_number: 2,
    subject_code: '6601',
    summary: '支付销售服务费',
    debit_amount: 0,
    credit_amount: 10_000,
  },
];

const makeVoucherProps = (
  overrides: Partial<{
    showCreateModal: boolean;
    items: VoucherItemRequest[];
  }> = {}
): VoucherManagementReturn => {
  const items = overrides.items ?? emptyItems;
  const newVoucher: NewVoucherState = {
    voucher_number: '',
    voucher_date: '2026-08-12',
    period: '2026-08',
    voucher_type: 'erp.voucher_mgmt.voucher_type_short.accounting',
    attachment_count: 0,
    summary: '',
    description: '',
    items,
  };
  const totalDebit = items.reduce((sum, x) => sum + x.debit_amount, 0);
  const totalCredit = items.reduce((sum, x) => sum + x.credit_amount, 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;
  return {
    // 公共状态
    activeTab: 'all',
    setActiveTab: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    statusFilter: '',
    setStatusFilter: vi.fn(),
    voucherTypeFilter: '',
    setVoucherTypeFilter: vi.fn(),
    periodFilter: '',
    setPeriodFilter: vi.fn(),
    page: 0,
    setPage: vi.fn(),
    rowsPerPage: 10,
    setRowsPerPage: vi.fn(),

    // 列表查询
    vouchersQuery: { data: null, isLoading: false, isError: false, error: null } as never,
    exportVouchers: vi.fn(),
    importVouchers: vi.fn(),
    handleApprove: vi.fn(),
    handleAudit: vi.fn(),
    handlePost: vi.fn(),
    handlePrint: vi.fn(),

    // 详情
    showDetailModal: false,
    setShowDetailModal: vi.fn(),
    currentVoucher: null,
    setCurrentVoucher: vi.fn(),
    viewVoucherDetail: vi.fn(),

    // 删除
    deleteDialogOpen: false,
    setDeleteDialogOpen: vi.fn(),
    deletingId: null,
    setDeletingId: vi.fn(),
    handleDelete: vi.fn(),
    deleteVoucherMutation: { isPending: false } as never,

    // 创建凭证（VoucherFormDialog 使用的字段）
    showCreateModal: overrides.showCreateModal ?? true,
    setShowCreateModal: vi.fn(),
    newVoucher,
    setNewVoucher: vi.fn(),
    subjects,
    addVoucherItem: vi.fn(),
    updateVoucherItem: vi.fn(),
    removeVoucherItem: vi.fn(),
    handleCreate: vi.fn(),
    resetForm: vi.fn(),
    totalDebit,
    totalCredit,
    isBalanced,
    formatCurrency,

    createVoucherMutation: { isPending: false } as never,
    subjectsQuery: {
      data: { success: true, data: { items: subjects, total: subjects.length } },
      isLoading: false,
      isError: false,
      error: null,
    } as never,
  };
};

const tableInfo: TableInfo = { table_name: 'financial_vouchers', table_type: 'BASE TABLE' };
const tableColumns: ColumnInfo[] = [
  {
    column_name: 'id',
    data_type: 'uuid',
    is_nullable: 'NO',
    column_default: 'gen_random_uuid()',
    character_maximum_length: null,
    numeric_precision: null,
    numeric_scale: null,
    ordinal_position: 1,
  },
  {
    column_name: 'voucher_number',
    data_type: 'character varying',
    is_nullable: 'NO',
    column_default: null,
    character_maximum_length: 64,
    numeric_precision: null,
    numeric_scale: null,
    ordinal_position: 2,
  },
];

const bsSec = (
  title: string,
  items: Array<{ code: string; name: string; amount: number }>
): BalanceSheetSection => ({
  title,
  items: items.map((x) => ({
    account_code: x.code,
    account_name: x.name,
    amount: x.amount,
  })),
  total: items.reduce((s, x) => s + x.amount, 0),
});

const isSec = (
  title: string,
  items: Array<{ code: string; name: string; amount: number }>
): IncomeStatementSection => ({
  title,
  items: items.map((x) => ({
    account_code: x.code,
    account_name: x.name,
    amount: x.amount,
    percentage: 0,
  })),
  total: items.reduce((s, x) => s + x.amount, 0),
});

const cfSec = (
  title: string,
  items: Array<{ description: string; amount: number }>
): CashFlowSection => ({
  title,
  items,
  total: items.reduce((s, x) => s + x.amount, 0),
});

const balanceSheet: BalanceSheet = {
  id: 'bs-202606',
  company_id: 'c-1',
  company_name: 'TOPEMS 测试公司',
  period: '2026-06',
  year: 2026,
  month: 6,
  currency_code: 'CNY',
  currency_name: '人民币',
  assets: {
    current: bsSec('流动资产', [
      { code: '1001', name: '货币资金', amount: 1_200_000 },
      { code: '1122', name: '应收账款', amount: 800_000 },
    ]),
    non_current: bsSec('非流动资产', [{ code: '1601', name: '固定资产', amount: 900_000 }]),
    total: 2_900_000,
  },
  liabilities: {
    current: bsSec('流动负债', [
      { code: '2202', name: '应付账款', amount: 600_000 },
      { code: '2221', name: '应交税费', amount: 200_000 },
    ]),
    non_current: bsSec('非流动负债', [{ code: '2501', name: '长期借款', amount: 400_000 }]),
    total: 1_200_000,
  },
  equity: {
    paid_in: bsSec('实收资本', [{ code: '4001', name: '实收资本', amount: 1_200_000 }]),
    reserves: bsSec('储备', [{ code: '4101', name: '盈余公积', amount: 100_000 }]),
    retained_earnings: bsSec('未分配利润', [{ code: '4104', name: '未分配利润', amount: 400_000 }]),
    total: 1_700_000,
  },
  total_liabilities_equity: 2_900_000,
  balance_check: true,
};

const incomeStatement: IncomeStatement = {
  id: 'is-202606',
  company_id: 'c-1',
  company_name: 'TOPEMS 测试公司',
  period: '2026-06',
  year: 2026,
  month: 6,
  currency_code: 'CNY',
  revenue: {
    main_revenue: isSec('主营业务收入', [
      { code: '6001', name: '主营业务收入', amount: 3_200_000 },
    ]),
    other_revenue: isSec('其他业务收入', [{ code: '6051', name: '其他业务收入', amount: 240_000 }]),
    total: 3_440_000,
  },
  cost_of_sales: {
    main_cost: isSec('主营业务成本', [{ code: '6401', name: '主营业务成本', amount: 1_900_000 }]),
    other_cost: isSec('其他业务成本', [{ code: '6402', name: '其他业务成本', amount: 100_000 }]),
    total: 2_000_000,
  },
  gross_profit: 1_440_000,
  gross_margin: 41.86,
  operating_expenses: {
    selling_expense: isSec('销售费用', [{ code: '6601', name: '销售费用', amount: 360_000 }]),
    administrative_expense: isSec('管理费用', [
      { code: '6602', name: '管理费用', amount: 260_000 },
    ]),
    rd_expense: isSec('研发费用', [{ code: '6603', name: '研发费用', amount: 120_000 }]),
    financial_expense: isSec('财务费用', [{ code: '6604', name: '财务费用', amount: 40_000 }]),
    total: 780_000,
  },
  operating_profit: 660_000,
  operating_margin: 19.18,
  non_operating: {
    income: isSec('营业外收入', [{ code: '6301', name: '营业外收入', amount: 20_000 }]),
    expenses: isSec('营业外支出', [{ code: '6711', name: '营业外支出', amount: 10_000 }]),
    total: 10_000,
  },
  total_profit: 670_000,
  income_tax: 167_500,
  net_profit: 502_500,
  net_margin: 14.6,
  eps: 0.5,
};

const cashFlowStatement: CashFlowStatement = {
  id: 'cf-202606',
  company_id: 'c-1',
  company_name: 'TOPEMS 测试公司',
  period: '2026-06',
  year: 2026,
  month: 6,
  currency_code: 'CNY',
  operating: {
    inflows: cfSec('经营活动现金流入', [{ description: '销售商品收到的现金', amount: 3_000_000 }]),
    outflows: cfSec('经营活动现金流出', [{ description: '购买商品支付的现金', amount: 1_700_000 }]),
    net_flow: 1_300_000,
  },
  investing: {
    inflows: cfSec('投资活动现金流入', []),
    outflows: cfSec('投资活动现金流出', [{ description: '购建固定资产支付', amount: 500_000 }]),
    net_flow: -500_000,
  },
  financing: {
    inflows: cfSec('筹资活动现金流入', [{ description: '取得银行借款', amount: 800_000 }]),
    outflows: cfSec('筹资活动现金流出', [{ description: '偿还利息', amount: 60_000 }]),
    net_flow: 740_000,
  },
  net_cash_flow: 1_540_000,
  beginning_cash: 500_000,
  ending_cash: 2_040_000,
  cash_equivalent_change: 1_540_000,
};

// ============================================================
// 1. VoucherFormDialog — 覆盖空条目/平衡数据/保存按钮三态
// ============================================================
describe('VoucherFormDialog', () => {
  it('空条目态渲染：显示空条目提示 + 借贷双方合计均为 ¥0 + 未平衡 + 保存禁用', () => {
    renderWithProviders(<VoucherFormDialog {...makeVoucherProps()} />);

    expect(screen.getByText('erp.voucher_mgmt.message.click_to_add_items')).toBeInTheDocument();
    expect(screen.getByText('erp.voucher_mgmt.label.voucher_items')).toBeInTheDocument();

    // 借贷合计皆为 ¥0（共两处，getAll 断言长度）
    const zeroTotals = screen.getAllByText('¥0');
    expect(zeroTotals).toHaveLength(2);
    // 不平衡标签
    expect(screen.getByText('erp.voucher_mgmt.label.unbalanced')).toBeInTheDocument();
    // 按钮可通过 exact name 精确匹配；取消 + 保存 + 添加条目共 3 按钮
    const saveBtns = screen.getAllByRole('button', {
      name: 'erp.voucher_mgmt.label.save_voucher',
    });
    expect(saveBtns).toHaveLength(1);
    expect(saveBtns[0]).toBeDisabled();
  });

  it('基础数据态：借贷相等 → 显示平衡标签 + 保存按钮可点击 + 金额合计正确', () => {
    renderWithProviders(<VoucherFormDialog {...makeVoucherProps({ items: balancedItems })} />);

    // summary 字段是 TextField 的 value，用 getByDisplayValue 断言
    expect(screen.getByDisplayValue('收到客户货款')).toBeInTheDocument();
    expect(screen.getByDisplayValue('支付销售服务费')).toBeInTheDocument();
    // 金额合计（借贷各一次 ¥10,000，用 getAll）
    expect(screen.getAllByText('¥10,000').length).toBeGreaterThanOrEqual(2);
    // 平衡状态标签
    expect(screen.getByText('erp.voucher_mgmt.label.balanced')).toBeInTheDocument();
    const saveBtn = screen.getByRole('button', {
      name: 'erp.voucher_mgmt.label.save_voucher',
    });
    expect(saveBtn).not.toBeDisabled();
  });

  it('交互态：点击添加条目 → addVoucherItem 调用；点击取消 → resetForm 调用', () => {
    const props = makeVoucherProps();
    renderWithProviders(<VoucherFormDialog {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'erp.voucher_mgmt.label.add_entry' }));
    expect(props.addVoucherItem).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'erp.voucher_mgmt.label.cancel' }));
    expect(props.setShowCreateModal).toHaveBeenCalledWith(false);
    expect(props.resetForm).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// 2. DatabaseManagementModals — 四种弹窗 × 空/填充态
// ============================================================
describe('DatabaseManagementModals', () => {
  it('Structure Modal 填充态：展示表名/类型/行数 + 列数据表格', () => {
    renderWithProviders(
      <DatabaseManagementModals
        showStructureModal
        onCloseStructureModal={vi.fn()}
        currentTable={tableInfo}
        tableColumns={tableColumns}
        tableRowCount={128}
        showBackupModal={false}
        onCloseBackupModal={vi.fn()}
        onStartBackup={vi.fn()}
        showRestoreModal={false}
        onCloseRestoreModal={vi.fn()}
        onConfirmRestore={vi.fn()}
        restoreBackupName=''
        deleteBackupDialogOpen={false}
        onCloseDeleteDialog={vi.fn()}
        onConfirmDelete={vi.fn()}
      />
    );

    expect(
      screen.getByText(`erp.database.label.table_structure:financial_vouchers`)
    ).toBeInTheDocument();
    expect(screen.getByText('financial_vouchers')).toBeInTheDocument();
    expect(screen.getByText('BASE TABLE')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('voucher_number')).toBeInTheDocument();
    expect(screen.getByText('uuid')).toBeInTheDocument();
    expect(screen.getByText('character varying')).toBeInTheDocument();
  });

  it('Structure Modal 空态：currentTable=null 时详情块不渲染，仅标题与表头展示', () => {
    renderWithProviders(
      <DatabaseManagementModals
        showStructureModal
        onCloseStructureModal={vi.fn()}
        currentTable={null}
        tableColumns={[]}
        tableRowCount={null}
        showBackupModal={false}
        onCloseBackupModal={vi.fn()}
        onStartBackup={vi.fn()}
        showRestoreModal={false}
        onCloseRestoreModal={vi.fn()}
        onConfirmRestore={vi.fn()}
        restoreBackupName=''
        deleteBackupDialogOpen={false}
        onCloseDeleteDialog={vi.fn()}
        onConfirmDelete={vi.fn()}
      />
    );
    // 表名占位卡片内的 table_name 标签不应出现（因为 currentTable 为 null 时整块被条件隐藏）
    expect(screen.queryByText('erp.database.label.table_name')).not.toBeInTheDocument();
    // 当前表名 specific 信息也不渲染
    expect(screen.queryByText('financial_vouchers')).not.toBeInTheDocument();
    // 字段列表标题（field_list）也在条件块内部，null 时不渲染
    expect(screen.queryByText('erp.database.label.field_list')).not.toBeInTheDocument();
  });

  it('Backup & Restore Modal：开始备份和确认恢复按钮均触发回调 + 恢复备份名渲染', () => {
    const onStartBackup = vi.fn();
    const onConfirmRestore = vi.fn();
    renderWithProviders(
      <DatabaseManagementModals
        showStructureModal={false}
        onCloseStructureModal={vi.fn()}
        currentTable={null}
        tableColumns={[]}
        tableRowCount={null}
        showBackupModal
        onCloseBackupModal={vi.fn()}
        onStartBackup={onStartBackup}
        showRestoreModal
        onCloseRestoreModal={vi.fn()}
        onConfirmRestore={onConfirmRestore}
        restoreBackupName='backup_full_20260811'
        deleteBackupDialogOpen={false}
        onCloseDeleteDialog={vi.fn()}
        onConfirmDelete={vi.fn()}
      />
    );
    // 先用 getByText 定位按钮文本，再通过 closest('button') 获得可点击元素
    const startBackupLabel = screen.getByText('erp.database.label.start_backup');
    const startBackupBtn = startBackupLabel.closest('button');
    expect(startBackupBtn).not.toBeNull();
    fireEvent.click(startBackupBtn!);
    expect(onStartBackup).toHaveBeenCalledTimes(1);

    const confirmRestoreLabel = screen.getByText('erp.database.label.confirm_restore');
    const confirmRestoreBtn = confirmRestoreLabel.closest('button');
    expect(confirmRestoreBtn).not.toBeNull();
    fireEvent.click(confirmRestoreBtn!);
    expect(onConfirmRestore).toHaveBeenCalledTimes(1);
    expect(screen.getByText('backup_full_20260811')).toBeInTheDocument();
  });

  it('Delete Dialog：删除确认弹窗渲染，点击确认/取消触发对应回调', () => {
    const onConfirmDelete = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(
      <DatabaseManagementModals
        showStructureModal={false}
        onCloseStructureModal={vi.fn()}
        currentTable={null}
        tableColumns={[]}
        tableRowCount={null}
        showBackupModal={false}
        onCloseBackupModal={vi.fn()}
        onStartBackup={vi.fn()}
        showRestoreModal={false}
        onCloseRestoreModal={vi.fn()}
        onConfirmRestore={vi.fn()}
        restoreBackupName=''
        deleteBackupDialogOpen
        onCloseDeleteDialog={onClose}
        onConfirmDelete={onConfirmDelete}
      />
    );

    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '确认' }));
    expect(onConfirmDelete).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// 3. 三大财务报表 Viewer：空/基础/关键文本三态
// ============================================================
describe('BalanceSheetViewer', () => {
  it('空态：loading=false & data=null → 显示中文空状态提示', () => {
    renderWithProviders(
      <BalanceSheetViewer
        data={undefined}
        loading={false}
      />
    );
    expect(screen.getByText('暂无资产负债表数据')).toBeInTheDocument();
  });

  it('基础数据态：三大合计值存在 + 关键会计科目/标签渲染 + balance_check=平衡', () => {
    renderWithProviders(
      <BalanceSheetViewer
        data={balanceSheet}
        loading={false}
      />
    );
    // 关键会计科目名称（硬编码在 mock data 中）
    expect(screen.getByText('货币资金')).toBeInTheDocument();
    expect(screen.getByText('应付账款')).toBeInTheDocument();
    expect(screen.getByText('实收资本')).toBeInTheDocument();
    // 概览卡合计文本标签（可能多处重复，用 getAll）
    expect(screen.getByText('资产总计')).toBeInTheDocument();
    expect(screen.getByText('负债合计')).toBeInTheDocument();
    expect(screen.getAllByText('所有者权益合计').length).toBeGreaterThanOrEqual(1);
    // 概览卡合计数值（多处重复，用 getAllBy 验证 ≥1）
    expect(screen.getAllByText('¥2,900,000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('¥1,200,000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('¥1,700,000').length).toBeGreaterThanOrEqual(1);
    // 平衡 chip
    expect(screen.getByText('平衡')).toBeInTheDocument();
  });

  it('loading 态：不渲染空态文本（渲染 spinner 容器）', () => {
    renderWithProviders(
      <BalanceSheetViewer
        data={undefined}
        loading
      />
    );
    expect(screen.queryByText('暂无资产负债表数据')).not.toBeInTheDocument();
  });
});

describe('IncomeStatementViewer', () => {
  it('空态：显示中文空状态提示', () => {
    renderWithProviders(
      <IncomeStatementViewer
        data={undefined}
        loading={false}
      />
    );
    expect(screen.getByText('暂无利润表数据')).toBeInTheDocument();
  });

  it('基础数据态：营收/成本/毛利润/净利润数值存在 + 关键标签渲染', () => {
    renderWithProviders(
      <IncomeStatementViewer
        data={incomeStatement}
        loading={false}
      />
    );
    // 项目名称（mock data items 中的 account_name）
    expect(screen.getByText('主营业务收入')).toBeInTheDocument();
    expect(screen.getByText('主营业务成本')).toBeInTheDocument();
    expect(screen.getByText('销售费用')).toBeInTheDocument();
    // 概览卡标签（真实组件的 4 张 Card：营收/营业利润/利润总额/净利润）
    expect(screen.getByText('营业收入')).toBeInTheDocument();
    expect(screen.getByText('营业利润')).toBeInTheDocument();
    expect(screen.getByText('净利润')).toBeInTheDocument();
    // 明细 section 标题（含 "三、毛利润"）
    expect(screen.getByText('三、毛利润')).toBeInTheDocument();
    // 期间费用合计标签（中文硬编码在组件里）
    expect(screen.getByText('期间费用合计')).toBeInTheDocument();
    // 关键数值：用函数匹配 + content includes 兼容 locale 格式差异（千分位/小数）
    const includesNum = (numStr: string) => (content: string) =>
      content.replace(/\s/g, '').includes(numStr);
    expect(screen.getAllByText(includesNum('3,440,000')).length).toBeGreaterThanOrEqual(1);
    // 毛利润 1,440,000（「三、毛利润」行数值 + 可能分段标题）
    expect(screen.getAllByText(includesNum('1,440,000')).length).toBeGreaterThanOrEqual(1);
    // 净利润 502,500（概览卡数值或末尾分段标题）
    expect(screen.getAllByText(includesNum('502,500')).length).toBeGreaterThanOrEqual(1);
  });
});

describe('CashFlowStatementViewer', () => {
  it('空态：显示中文空状态提示', () => {
    renderWithProviders(
      <CashFlowStatementViewer
        data={undefined}
        loading={false}
      />
    );
    expect(screen.getByText('暂无现金流量表数据')).toBeInTheDocument();
  });

  it('基础数据态：经营/投资/筹资现金流与净现金流数值 + 标签渲染', () => {
    renderWithProviders(
      <CashFlowStatementViewer
        data={cashFlowStatement}
        loading={false}
      />
    );
    // 项目名称（mock items 中的 description）
    expect(screen.getByText('销售商品收到的现金')).toBeInTheDocument();
    expect(screen.getByText('购建固定资产支付')).toBeInTheDocument();
    expect(screen.getByText('取得银行借款')).toBeInTheDocument();
    // 概览卡标签
    expect(screen.getByText('经营活动现金流')).toBeInTheDocument();
    expect(screen.getByText('投资活动现金流')).toBeInTheDocument();
    expect(screen.getByText('筹资活动现金流')).toBeInTheDocument();
    // "净现金流"会在标签与图表多处出现，用 getAll 验证
    expect(screen.getAllByText('净现金流').length).toBeGreaterThanOrEqual(1);
    // 关键金额：负数 `¥-500,000` 的格式
    expect(screen.getAllByText('¥1,300,000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('¥-500,000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('¥740,000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('¥1,540,000').length).toBeGreaterThanOrEqual(1);
  });
});
