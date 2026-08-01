import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import { StatusChip } from '../StatusChip';

const i18nMap: Record<string, string> = {
  'common.status_draft': '草稿',
  'common.status_pending': '待处理',
  'common.status_waiting': '等待中',
  'common.status_submitted': '已提交',
  'common.status_approved': '已通过',
  'common.status_confirmed': '已确认',
  'common.status_rejected': '已拒绝',
  'common.status_cancelled': '已取消',
  'common.status_completed': '已完成',
  'common.status_active': '启用中',
  'common.status_enabled': '已启用',
  'common.status_inactive': '未启用',
  'common.status_disabled': '已禁用',
  'common.status_suspended': '已暂停',
  'common.status_invited': '已邀请',
  'common.status_open': '开放中',
  'common.status_in_progress': '进行中',
  'common.status_processing': '处理中',
  'common.status_receiving': '接收中',
  'common.status_resolved': '已解决',
  'common.status_closed': '已关闭',
  'common.status_claimed': '已认领',
  'common.status_overdue': '已逾期',
  'common.status_expired': '已过期',
  'common.status_valid': '有效',
  'common.status_invalid': '无效',
  'common.status_paid': '已支付',
  'common.status_unpaid': '未支付',
  'common.status_partial': '部分支付',
  'common.status_shipped': '已发货',
  'common.status_delivered': '已送达',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => i18nMap[key] ?? key,
    i18n: {
      changeLanguage: vi.fn(),
    },
  }),
}));

describe('StatusChip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders status text for pending status', () => {
    renderWithProviders(<StatusChip status='pending' />);
    expect(screen.getByText('待处理')).toBeInTheDocument();
  });

  it('renders different status labels correctly', () => {
    const { rerender } = renderWithProviders(<StatusChip status='approved' />);
    expect(screen.getByText('已通过')).toBeInTheDocument();

    rerender(<StatusChip status='rejected' />);
    expect(screen.getByText('已拒绝')).toBeInTheDocument();

    rerender(<StatusChip status='completed' />);
    expect(screen.getByText('已完成')).toBeInTheDocument();
  });

  it('applies warning color for pending status', () => {
    renderWithProviders(<StatusChip status='pending' />);
    const chip = screen.getByText('待处理').closest('.MuiChip-root');
    expect(chip).toHaveClass('MuiChip-colorWarning');
  });

  it('applies success color for approved status', () => {
    renderWithProviders(<StatusChip status='approved' />);
    const chip = screen.getByText('已通过').closest('.MuiChip-root');
    expect(chip).toHaveClass('MuiChip-colorSuccess');
  });

  it('applies error color for rejected status', () => {
    renderWithProviders(<StatusChip status='rejected' />);
    const chip = screen.getByText('已拒绝').closest('.MuiChip-root');
    expect(chip).toHaveClass('MuiChip-colorError');
  });

  it('renders with size sm as small chip', () => {
    renderWithProviders(
      <StatusChip
        status='pending'
        size='sm'
      />
    );
    const chip = screen.getByText('待处理').closest('.MuiChip-root');
    expect(chip).toHaveClass('MuiChip-sizeSmall');
  });

  it('renders with size md as medium chip', () => {
    renderWithProviders(
      <StatusChip
        status='pending'
        size='md'
      />
    );
    const chip = screen.getByText('待处理').closest('.MuiChip-root');
    expect(chip).toHaveClass('MuiChip-sizeMedium');
  });

  it('renders custom mapping override', () => {
    renderWithProviders(
      <StatusChip
        status='custom_status'
        mapping={{ custom_status: { color: 'error', label: '自定义状态' } }}
      />
    );
    expect(screen.getByText('自定义状态')).toBeInTheDocument();
    const chip = screen.getByText('自定义状态').closest('.MuiChip-root');
    expect(chip).toHaveClass('MuiChip-colorError');
  });

  it('renders customLabel when provided', () => {
    renderWithProviders(
      <StatusChip
        status='pending'
        customLabel='自定义标签'
      />
    );
    expect(screen.getByText('自定义标签')).toBeInTheDocument();
  });
});
