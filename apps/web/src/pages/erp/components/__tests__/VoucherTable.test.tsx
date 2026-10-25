import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import VoucherTable from '@/pages/erp/components/VoucherTable';

vi.mock('@/i18n', () => ({
  default: { t: (x: string) => x, language: 'zh' },
}));

const voucherDraft = {
  id: 'v1',
  voucher_number: 'AC-2024-0001',
  voucher_date: '2024-01-15T00:00:00Z',
  period: '2024-01',
  summary: '一月采购款',
  total_debit: 1000,
  total_credit: 1000,
  maker_name: '张三',
  status: 'draft',
};

const voucherApproved = {
  id: 'v2',
  voucher_number: 'AC-2024-0002',
  voucher_date: '2024-02-10T00:00:00Z',
  period: '2024-02',
  summary: '二月销售款',
  total_debit: 500,
  total_credit: 500,
  maker_name: '李四',
  status: 'approved',
};

const makeVm = (overrides: Record<string, unknown> = {}) => ({
  loading: false,
  vouchers: [voucherDraft, voucherApproved],
  totalCount: 2,
  page: 0,
  rowsPerPage: 10,
  setPage: vi.fn(),
  setRowsPerPage: vi.fn(),
  handleViewDetail: vi.fn(),
  handleAudit: vi.fn(),
  handlePost: vi.fn(),
  handleDelete: vi.fn(),
  formatCurrency: (n?: number | null) => `¥${(n ?? 0).toLocaleString('zh-CN')}`,
  getStatusBadgeConfig: (s: string) => ({ label: s, color: 'default' }),
  getVoucherTypeConfig: (t: string) => ({ label: t, color: 'default' }),
  ...overrides,
});

describe('VoucherTable（erp 组件补测）', () => {
  it('渲染表头与两行凭证数据（draft + approved）', () => {
    render(<VoucherTable {...(makeVm() as never)} />);
    // 表头
    expect(screen.getByText('erp.voucher_mgmt.label.voucher_number')).toBeInTheDocument();
    expect(screen.getByText('erp.voucher_mgmt.label.debit_amount')).toBeInTheDocument();
    expect(screen.getByText('erp.voucher_mgmt.label.credit_amount')).toBeInTheDocument();
    // 行数据
    expect(screen.getByText('AC-2024-0001')).toBeInTheDocument();
    expect(screen.getByText('2024-01-15')).toBeInTheDocument();
    expect(screen.getByText('一月采购款')).toBeInTheDocument();
    expect(screen.getAllByText('¥1,000')).toHaveLength(2); // debit + credit 两列
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('AC-2024-0002')).toBeInTheDocument();
    expect(screen.getByText('2024-02-10')).toBeInTheDocument();
    expect(screen.getByText('李四')).toBeInTheDocument();
  });

  it('按状态渲染操作按钮：draft 含编辑/删除，approved 含过账且无删除', () => {
    render(<VoucherTable {...(makeVm() as never)} />);
    // draft 行：查看/编辑/审核/删除
    expect(screen.getAllByLabelText('erp.voucher_table.k0')).toHaveLength(2); // 两行都有查看
    expect(screen.getByLabelText('erp.voucher_table.k1')).toBeInTheDocument(); // 编辑（仅 draft）
    expect(screen.getByLabelText('erp.voucher_table.k2')).toBeInTheDocument(); // 审核（draft）
    expect(screen.getByLabelText('erp.voucher_table.k4')).toBeInTheDocument(); // 删除（draft）
    expect(screen.getByLabelText('erp.voucher_table.k3')).toBeInTheDocument(); // 过账（approved）
  });

  it('交互回调：查看/审核/过账/删除 均触发对应 handler', () => {
    const vm = makeVm();
    render(<VoucherTable {...(vm as never)} />);
    fireEvent.click(screen.getAllByLabelText('erp.voucher_table.k0')[0]);
    expect(vm.handleViewDetail).toHaveBeenCalledWith(voucherDraft);

    fireEvent.click(screen.getByLabelText('erp.voucher_table.k2'));
    expect(vm.handleAudit).toHaveBeenCalledWith(voucherDraft);

    fireEvent.click(screen.getByLabelText('erp.voucher_table.k3'));
    expect(vm.handlePost).toHaveBeenCalledWith(voucherApproved);

    fireEvent.click(screen.getByLabelText('erp.voucher_table.k4'));
    expect(vm.handleDelete).toHaveBeenCalledWith('v1');
  });

  it('分页切换触发 setPage', () => {
    const vm = makeVm({ totalCount: 25 });
    render(<VoucherTable {...(vm as never)} />);
    fireEvent.click(screen.getByTitle('Go to next page'));
    expect(vm.setPage).toHaveBeenCalledWith(1);
  });

  it('空数据显示提示文案', () => {
    render(<VoucherTable {...(makeVm({ vouchers: [], totalCount: 0 }) as never)} />);
    expect(screen.getByText('erp.voucher_mgmt.message.no_voucher_data')).toBeInTheDocument();
  });

  it('加载态显示进度指示器', () => {
    render(<VoucherTable {...(makeVm({ loading: true }) as never)} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
