import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import VoucherFilters from '@/pages/erp/components/VoucherFilters';

vi.mock('@/i18n', () => ({
  default: { t: (x: string) => x, language: 'zh' },
}));

const makeVm = (overrides: Record<string, unknown> = {}) => ({
  activeTab: 'all',
  handleTabChange: vi.fn(),
  tabs: [
    { value: 'all', label: '全部', count: 2 },
    { value: 'draft', label: '草稿', count: 1 },
  ],
  searchQuery: '',
  setSearchQuery: vi.fn(),
  voucherTypeFilter: '',
  setVoucherTypeFilter: vi.fn(),
  periodFilter: '',
  setPeriodFilter: vi.fn(),
  setPage: vi.fn(),
  vouchersQuery: { refetch: vi.fn() },
  ...overrides,
});

describe('VoucherFilters（erp 组件补测）', () => {
  it('渲染 tabs（label + 计数）与搜索框、刷新按钮', () => {
    render(<VoucherFilters {...(makeVm() as never)} />);
    expect(screen.getByText('全部')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('草稿')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('erp.voucher_mgmt.label.search_placeholder')
    ).toBeInTheDocument();
    expect(screen.getByText('erp.voucher_mgmt.label.refresh')).toBeInTheDocument();
  });

  it('输入搜索词触发 setSearchQuery', () => {
    const vm = makeVm();
    render(<VoucherFilters {...(vm as never)} />);
    fireEvent.change(screen.getByPlaceholderText('erp.voucher_mgmt.label.search_placeholder'), {
      target: { value: '采购' },
    });
    expect(vm.setSearchQuery).toHaveBeenCalledWith('采购');
  });

  it('切换 tab 触发 handleTabChange', () => {
    const vm = makeVm();
    render(<VoucherFilters {...(vm as never)} />);
    fireEvent.click(screen.getByText('草稿'));
    expect(vm.handleTabChange).toHaveBeenCalled();
  });

  it('点击刷新触发 refetch', () => {
    const vm = makeVm();
    render(<VoucherFilters {...(vm as never)} />);
    fireEvent.click(screen.getByText('erp.voucher_mgmt.label.refresh'));
    expect(vm.vouchersQuery.refetch).toHaveBeenCalled();
  });

  it('选择凭证类型过滤触发 setVoucherTypeFilter 并重置分页', () => {
    const vm = makeVm();
    render(<VoucherFilters {...(vm as never)} />);
    fireEvent.mouseDown(screen.getAllByRole('combobox')[0]);
    const option = screen.getByText('erp.voucher_mgmt.voucher_type.payment');
    fireEvent.click(option);
    expect(vm.setVoucherTypeFilter).toHaveBeenCalled();
    expect(vm.setPage).toHaveBeenCalledWith(0);
  });
});
