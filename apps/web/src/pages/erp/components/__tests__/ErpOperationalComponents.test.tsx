import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import { DatabaseManagementBackups } from '../DatabaseManagementBackups';
import { DatabaseManagementStats } from '../DatabaseManagementStats';
import { DatabaseManagementTableList } from '../DatabaseManagementTableList';
import VoucherDetailTabs from '../VoucherDetailTabs';
import VoucherFilters from '../VoucherFilters';
import VoucherTable from '../VoucherTable';
import type { TableInfo } from '@/api/erp/database';
import type { FinancialVoucher, VoucherItem } from '@/api/erp/types';
import type { BackupRecord } from '../../hooks/useDatabaseManagement';
import type { VoucherManagementReturn } from '../../hooks/useVoucherManagement';

vi.mock('react-i18next', () => {
  const merge = (...objs: Record<string, string>[]) => Object.assign({}, ...objs);
  const i18nMap = merge(
    require('../../../../i18n/locales/zh/erp.json'),
    require('../../../../i18n/locales/zh/common.json'),
    require('../../../../i18n/locales/zh/components.json'),
    require('../../../../i18n/locales/zh/pages.json'),
    require('../../../../i18n/locales/zh/templates.json'),
    require('../../../../i18n/locales/zh/schemas.json')
  );
  return {
    useTranslation: () => ({
      t: (key: string) => i18nMap[key] ?? key,
      i18n: { language: 'zh' },
    }),
    initReactI18next: { type: '3rdParty', init: () => {} },
    Trans: ({ i18nKey, children }: { i18nKey?: string; children?: any }) =>
      i18nKey ? (i18nMap[i18nKey] ?? i18nKey) : children,
  };
});

vi.mock('@/i18n', () => {
  const merge = (...objs: Record<string, string>[]) => Object.assign({}, ...objs);
  const i18nMap = merge(
    require('../../../../i18n/locales/zh/erp.json'),
    require('../../../../i18n/locales/zh/common.json'),
    require('../../../../i18n/locales/zh/components.json'),
    require('../../../../i18n/locales/zh/pages.json'),
    require('../../../../i18n/locales/zh/templates.json'),
    require('../../../../i18n/locales/zh/schemas.json')
  );
  return {
    default: {
      t: (key: string) => i18nMap[key] ?? key,
      language: 'zh',
      on: () => {},
      use: () => ({ init: () => {} }),
      init: () => {},
    },
  };
});

vi.mock('lucide-react', () => {
  const icon =
    (name: string) =>
    ({ size: _size, sx: _sx, ...props }: Record<string, unknown>) => (
      <svg
        data-testid={`icon-${name}`}
        {...props}
      />
    );

  return {
    BookOpen: icon('book-open'),
    Check: icon('check'),
    Database: icon('database'),
    Download: icon('download'),
    Edit: icon('edit'),
    Eye: icon('eye'),
    FileText: icon('file-text'),
    Play: icon('play'),
    RefreshCw: icon('refresh'),
    Search: icon('search'),
    Table: icon('table'),
    Trash2: icon('trash'),
    Upload: icon('upload'),
  };
});

vi.mock('@/components/common', () => ({
  StatusBadge: ({ label, status, color }: { label: string; status: string; color?: string }) => (
    <span
      data-color={color}
      data-status={status}
    >
      {label}
    </span>
  ),
}));

const tables: TableInfo[] = [
  { table_name: 'financial_vouchers', table_type: 'BASE TABLE' },
  { table_name: 'accounting_subjects', table_type: 'VIEW' },
];

const backups: BackupRecord[] = [
  {
    id: 'backup-1',
    backup_name: 'backup_full_20260811',
    backup_type: 'full',
    filesize: '156.8 MB',
    status: 'success',
    created_at: '2026-08-11 02:00:00',
    created_by: 'system',
    remark: '每日全量备份',
  },
  {
    id: 'backup-2',
    backup_name: 'backup_incr_20260810',
    backup_type: 'incremental',
    filesize: '12.4 MB',
    status: 'failed',
    created_at: '2026-08-10 20:00:00',
    created_by: 'admin',
  },
];

const draftVoucher: FinancialVoucher = {
  id: 'voucher-1',
  voucher_number: '记-202608-001',
  voucher_date: '2026-08-11T00:00:00Z',
  period: '2026-08',
  summary: '采购入库',
  maker_name: '张三',
  checker_name: '李四',
  status: 'draft',
  total_debit: 1200,
  total_credit: 1200,
  created_at: '2026-08-11T00:00:00Z',
  updated_at: '2026-08-11T00:00:00Z',
};

const approvedVoucher: FinancialVoucher = {
  ...draftVoucher,
  id: 'voucher-2',
  voucher_number: '付-202608-002',
  status: 'approved',
  summary: '支付供应商货款',
};

const voucherItems: VoucherItem[] = [
  {
    id: 'item-1',
    voucher_id: 'voucher-1',
    line_number: 1,
    subject_code: '1403',
    subject_name: '原材料',
    summary: '采购原材料',
    debit_amount: 1200,
    credit_amount: 0,
    created_at: '2026-08-11T00:00:00Z',
    updated_at: '2026-08-11T00:00:00Z',
  },
  {
    id: 'item-2',
    voucher_id: 'voucher-1',
    line_number: 2,
    subject_code: '2202',
    subject_name: '应付账款',
    debit_amount: 0,
    credit_amount: 1200,
    created_at: '2026-08-11T00:00:00Z',
    updated_at: '2026-08-11T00:00:00Z',
  },
];

const createVoucherVm = (
  overrides: Partial<VoucherManagementReturn> = {}
): VoucherManagementReturn =>
  ({
    activeTab: 'all',
    searchQuery: '采购',
    statusFilter: '',
    voucherTypeFilter: '',
    periodFilter: '',
    page: 0,
    rowsPerPage: 10,
    showCreateModal: false,
    showDetailModal: true,
    currentVoucher: draftVoucher,
    deleteDialogOpen: false,
    deletingId: null,
    newVoucher: {
      voucher_number: '',
      voucher_date: '2026-08-11',
      period: '',
      voucher_type: '记',
      attachment_count: 0,
      summary: '',
      description: '',
      items: [],
    },
    vouchers: [draftVoucher, approvedVoucher],
    totalCount: 2,
    loading: false,
    subjects: [],
    voucherItems,
    stats: { total: 2, draft: 1, pending: 0, approved: 1, posted: 0 },
    tabs: [
      { value: 'all', label: '全部', count: 2 },
      { value: 'draft', label: '草稿', count: 1 },
    ],
    totalDebit: 1200,
    totalCredit: 1200,
    isBalanced: true,
    vouchersQuery: { refetch: vi.fn() },
    setActiveTab: vi.fn(),
    setSearchQuery: vi.fn(),
    setStatusFilter: vi.fn(),
    setVoucherTypeFilter: vi.fn(),
    setPeriodFilter: vi.fn(),
    setPage: vi.fn(),
    setRowsPerPage: vi.fn(),
    setShowCreateModal: vi.fn(),
    setShowDetailModal: vi.fn(),
    setDeleteDialogOpen: vi.fn(),
    setDeletingId: vi.fn(),
    setNewVoucher: vi.fn(),
    handleCreate: vi.fn(),
    handleAudit: vi.fn(),
    handlePost: vi.fn(),
    handleDelete: vi.fn(),
    confirmDelete: vi.fn(),
    resetForm: vi.fn(),
    addVoucherItem: vi.fn(),
    updateVoucherItem: vi.fn(),
    removeVoucherItem: vi.fn(),
    handleViewDetail: vi.fn(),
    handleTabChange: vi.fn(),
    handleExport: vi.fn(),
    handleClosePeriod: vi.fn(),
    formatCurrency: (amount: number) => `¥${amount.toLocaleString('zh-CN')}`,
    getStatusBadgeConfig: (status: string) => ({
      label: `status:${status}`,
      color: status === 'approved' ? 'success' : 'warning',
    }),
    getVoucherTypeConfig: (type: string) => ({
      label: `type:${type}`,
      color: 'primary',
    }),
    ...overrides,
  }) as unknown as VoucherManagementReturn;

describe('ERP 低依赖运营组件渲染测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('数据库统计卡渲染表数量和备份数量', () => {
    renderWithProviders(<DatabaseManagementStats stats={{ tableCount: 12, backupCount: 5 }} />);

    expect(screen.getByText('数据表数量')).toBeInTheDocument();
    expect(screen.getByText('可用备份')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByTestId('icon-table')).toBeInTheDocument();
    expect(screen.getByTestId('icon-download')).toBeInTheDocument();
  });
});
