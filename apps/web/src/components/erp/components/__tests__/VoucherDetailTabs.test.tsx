import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import VoucherDetailTabs from '@/components/erp/components/VoucherDetailTabs';

vi.mock('@/i18n', () => ({
  default: { t: (x: string) => x, language: 'zh' },
}));

const currentVoucher = {
  id: 'v1',
  voucher_number: 'AC-2024-0001',
  voucher_date: '2024-01-15T00:00:00Z',
  period: '2024-01',
  summary: '一月采购款',
  total_debit: 1000,
  total_credit: 1000,
  maker_name: '张三',
  checker_name: '王五',
  status: 'draft',
};

const voucherItems = [
  {
    id: 'i1',
    line_number: 1,
    subject_code: '1001',
    subject_name: '库存现金',
    summary: '借方发生额',
    debit_amount: 1000,
    credit_amount: 0,
  },
  {
    id: 'i2',
    line_number: 2,
    subject_code: '2202',
    subject_name: '应付账款',
    summary: '贷方发生额',
    debit_amount: 0,
    credit_amount: 1000,
  },
];

const makeVm = (overrides: Record<string, unknown> = {}) => ({
  showDetailModal: true,
  setShowDetailModal: vi.fn(),
  currentVoucher,
  voucherItems,
  formatCurrency: (n?: number | null) => `¥${(n ?? 0).toLocaleString('zh-CN')}`,
  getStatusBadgeConfig: (s: string) => ({ label: s, color: 'default' }),
  ...overrides,
});

describe('VoucherDetailTabs（erp 组件补测）', () => {
  it('打开时渲染凭证头信息与分录明细', () => {
    render(<VoucherDetailTabs {...(makeVm() as never)} />);
    expect(screen.getByText('erp.voucher_mgmt.label.voucher_detail')).toBeInTheDocument();
    expect(screen.getByText('AC-2024-0001')).toBeInTheDocument();
    expect(screen.getByText('2024-01-15')).toBeInTheDocument();
    expect(screen.getByText('一月采购款')).toBeInTheDocument();
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('王五')).toBeInTheDocument();
    // 分录行
    expect(screen.getByText('1001')).toBeInTheDocument();
    expect(screen.getByText('库存现金')).toBeInTheDocument();
    expect(screen.getByText('2202')).toBeInTheDocument();
    expect(screen.getByText('应付账款')).toBeInTheDocument();
    // 借贷合计（分录 debit 1000 + debit_total + credit_total 多处）
    expect(screen.getAllByText('¥1,000').length).toBeGreaterThanOrEqual(3);
  });

  it('关闭时（showDetailModal=false）不渲染对话框内容', () => {
    render(<VoucherDetailTabs {...(makeVm({ showDetailModal: false }) as never)} />);
    expect(screen.queryByText('erp.voucher_mgmt.label.voucher_detail')).not.toBeInTheDocument();
  });

  it('点击关闭按钮触发 setShowDetailModal(false)', () => {
    const vm = makeVm();
    render(<VoucherDetailTabs {...(vm as never)} />);
    fireEvent.click(screen.getByText('erp.voucher_mgmt.label.close'));
    expect(vm.setShowDetailModal).toHaveBeenCalledWith(false);
  });

  it('无当前凭证时不渲染详情区', () => {
    render(<VoucherDetailTabs {...(makeVm({ currentVoucher: null }) as never)} />);
    expect(screen.queryByText('AC-2024-0001')).not.toBeInTheDocument();
    expect(screen.getByText('erp.voucher_mgmt.label.close')).toBeInTheDocument();
  });
});
