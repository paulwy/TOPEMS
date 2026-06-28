import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import {
  StatusBadge,
  EmployeeStatusBadge,
  AttendanceStatusBadge,
  LeaveStatusBadge,
  PayrollStatusBadge,
  PerformanceStatusBadge,
  CustomerStatusBadge,
  OpportunityStatusBadge,
  ProjectStatusBadge,
  WorkflowStatusBadge,
  FinanceStatusBadge,
  ModuleStatusBadge,
  DEFAULT_STATUS_MAP,
} from '../StatusBadge';

vi.mock('@/store', () => ({ useAppStore: vi.fn() }));

describe('StatusBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders default status badge with label', () => {
    render(<StatusBadge status='active' />);
    expect(screen.getByText('启用')).toBeInTheDocument();
  });

  it('renders with different status values from DEFAULT_STATUS_MAP', () => {
    const { rerender } = render(<StatusBadge status='pending' />);
    expect(screen.getByText('待处理')).toBeInTheDocument();

    rerender(<StatusBadge status='approved' />);
    expect(screen.getByText('已批准')).toBeInTheDocument();

    rerender(<StatusBadge status='rejected' />);
    expect(screen.getByText('已拒绝')).toBeInTheDocument();

    rerender(<StatusBadge status='draft' />);
    expect(screen.getByText('草稿')).toBeInTheDocument();

    rerender(<StatusBadge status='processing' />);
    expect(screen.getByText('处理中')).toBeInTheDocument();

    rerender(<StatusBadge status='success' />);
    expect(screen.getByText('成功')).toBeInTheDocument();

    rerender(<StatusBadge status='warning' />);
    expect(screen.getByText('警告')).toBeInTheDocument();

    rerender(<StatusBadge status='error' />);
    expect(screen.getByText('错误')).toBeInTheDocument();

    rerender(<StatusBadge status='info' />);
    expect(screen.getByText('信息')).toBeInTheDocument();
  });

  it('renders with custom statusMap', () => {
    const customMap = {
      custom_status: { label: '自定义状态', color: 'info' as const },
    };
    render(
      <StatusBadge
        status='custom_status'
        statusMap={customMap}
      />
    );
    expect(screen.getByText('自定义状态')).toBeInTheDocument();
  });

  it('renders with custom label prop', () => {
    render(
      <StatusBadge
        status='active'
        label='自定义标签'
      />
    );
    expect(screen.getByText('自定义标签')).toBeInTheDocument();
  });

  it('calls onClick when clickable and clicked', () => {
    const handleClick = vi.fn();
    render(
      <StatusBadge
        status='active'
        clickable
        onClick={handleClick}
      />
    );
    const chip = screen.getByText('启用').closest('[role="button"]') ?? screen.getByText('启用');
    fireEvent.click(chip);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(
      <StatusBadge
        status='active'
        clickable
        onClick={handleClick}
        disabled
      />
    );
    const chip = screen.getByText('启用');
    fireEvent.click(chip);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not call onClick when not clickable', () => {
    const handleClick = vi.fn();
    render(
      <StatusBadge
        status='active'
        onClick={handleClick}
      />
    );
    const chip = screen.getByText('启用');
    fireEvent.click(chip);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders with different sizes (sm, md, lg)', () => {
    const { rerender } = render(
      <StatusBadge
        status='active'
        size='sm'
      />
    );
    // MUI Chip does not expose a "chip" role; use class selector instead
    let chip = screen.getByText('启用').closest('.MuiChip-root');
    expect(chip).toBeTruthy();

    rerender(
      <StatusBadge
        status='active'
        size='md'
      />
    );
    chip = screen.getByText('启用').closest('.MuiChip-root');
    expect(chip).toBeTruthy();

    rerender(
      <StatusBadge
        status='active'
        size='lg'
      />
    );
    chip = screen.getByText('启用').closest('.MuiChip-root');
    expect(chip).toBeTruthy();
  });

  it('renders with different variants (filled, outlined, soft)', () => {
    const { rerender } = render(
      <StatusBadge
        status='active'
        variant='filled'
      />
    );
    // MUI Chip does not expose a "chip" role; use class selector instead
    let chip = screen.getByText('启用').closest('.MuiChip-root');
    expect(chip).toBeTruthy();

    rerender(
      <StatusBadge
        status='active'
        variant='outlined'
      />
    );
    chip = screen.getByText('启用').closest('.MuiChip-root');
    expect(chip).toBeTruthy();

    rerender(
      <StatusBadge
        status='active'
        variant='soft'
      />
    );
    chip = screen.getByText('启用').closest('.MuiChip-root');
    expect(chip).toBeTruthy();
  });

  it('shows icon when showIcon is true', () => {
    const { container } = render(
      <StatusBadge
        status='active'
        showIcon
      />
    );
    // The icon should be rendered inside the chip (SVG element from lucide-react)
    const svgs = container.querySelectorAll('svg');
    // At least one SVG icon should be present (the status icon inside the chip)
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it('renders with unknown status using fallback label', () => {
    render(<StatusBadge status='unknown_status' />);
    expect(screen.getByText('unknown_status')).toBeInTheDocument();
  });

  it('renders with custom render function', () => {
    const customRender = vi.fn((config) => <span data-testid='custom'>{config.label}</span>);
    render(
      <StatusBadge
        status='active'
        render={customRender}
      />
    );
    expect(customRender).toHaveBeenCalled();
    expect(screen.getByTestId('custom')).toHaveTextContent('启用');
  });

  it('renders without chip when useChip is false', () => {
    render(
      <StatusBadge
        status='active'
        useChip={false}
      />
    );
    expect(screen.getByText('启用')).toBeInTheDocument();
    // MUI Chip uses .MuiChip-root class, not a "chip" role
    expect(document.querySelector('.MuiChip-root')).not.toBeInTheDocument();
  });
});

describe('Typed Sub-components', () => {
  it('EmployeeStatusBadge renders correctly', () => {
    render(<EmployeeStatusBadge status='employeeactive' />);
    expect(screen.getByText('在职')).toBeInTheDocument();
  });

  it('AttendanceStatusBadge renders correctly', () => {
    render(<AttendanceStatusBadge status='attendance_late' />);
    expect(screen.getByText('迟到')).toBeInTheDocument();
  });

  it('LeaveStatusBadge renders correctly', () => {
    render(<LeaveStatusBadge status='leave_approved' />);
    expect(screen.getByText('已批准')).toBeInTheDocument();
  });

  it('PayrollStatusBadge renders correctly', () => {
    render(<PayrollStatusBadge status='payroll_paid' />);
    expect(screen.getByText('已发放')).toBeInTheDocument();
  });

  it('PerformanceStatusBadge renders correctly', () => {
    render(<PerformanceStatusBadge status='performance_completed' />);
    expect(screen.getByText('已完成')).toBeInTheDocument();
  });

  it('CustomerStatusBadge renders correctly', () => {
    render(<CustomerStatusBadge status='customeractive' />);
    expect(screen.getByText('活跃')).toBeInTheDocument();
  });

  it('OpportunityStatusBadge renders correctly', () => {
    render(<OpportunityStatusBadge status='opportunity_won' />);
    expect(screen.getByText('已成交')).toBeInTheDocument();
  });

  it('ProjectStatusBadge renders correctly', () => {
    render(<ProjectStatusBadge status='project_completed' />);
    expect(screen.getByText('已完成')).toBeInTheDocument();
  });

  it('WorkflowStatusBadge renders correctly', () => {
    render(<WorkflowStatusBadge status='workflow_approved' />);
    expect(screen.getByText('已通过')).toBeInTheDocument();
  });

  it('FinanceStatusBadge renders correctly', () => {
    render(<FinanceStatusBadge status='finance_posted' />);
    expect(screen.getByText('已记账')).toBeInTheDocument();
  });

  it('ModuleStatusBadge renders correctly', () => {
    render(<ModuleStatusBadge status='online' />);
    expect(screen.getByText('上线')).toBeInTheDocument();
  });
});
