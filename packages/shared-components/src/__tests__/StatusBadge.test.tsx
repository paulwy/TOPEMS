import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusBadge, DEFAULT_STATUS_MAP } from '../components/StatusBadge';

describe('StatusBadge Component', () => {
  it('renders with default status', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('启用')).toBeInTheDocument();
  });

  it('renders custom label', () => {
    render(<StatusBadge status="active" label="自定义标签" />);
    expect(screen.getByText('自定义标签')).toBeInTheDocument();
  });

  it('renders with custom statusMap', () => {
    const customMap = {
      custom: { label: '自定义', color: 'success' },
    };
    render(<StatusBadge status="custom" statusMap={customMap} />);
    expect(screen.getByText('自定义')).toBeInTheDocument();
  });

  it('renders icon when showIcon is true', () => {
    render(<StatusBadge status="active" showIcon />);
    expect(screen.getByText('启用')).toBeInTheDocument();
  });

  it('handles click event when clickable', () => {
    const handleClick = vi.fn();
    render(<StatusBadge status="active" clickable onClick={handleClick} />);
    fireEvent.click(screen.getByText('启用'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not handle click when disabled', () => {
    const handleClick = vi.fn();
    render(<StatusBadge status="active" clickable onClick={handleClick} disabled />);
    fireEvent.click(screen.getByText('启用'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders with different sizes', () => {
    const { container } = render(<StatusBadge status="active" size="sm" />);
    expect(container.firstChild).toHaveStyle({ height: '24px' });
  });

  it('renders with different variants', () => {
    render(<StatusBadge status="active" variant="outlined" />);
    expect(screen.getByText('启用')).toBeInTheDocument();
  });

  it('renders without Chip when useChip is false', () => {
    render(<StatusBadge status="active" useChip={false} />);
    expect(screen.getByText('启用')).toBeInTheDocument();
  });

  it('uses custom render function', () => {
    const customRender = vi.fn(() => <span data-testid="custom">自定义渲染</span>);
    render(<StatusBadge status="active" render={customRender} />);
    expect(customRender).toHaveBeenCalled();
    expect(screen.getByTestId('custom')).toBeInTheDocument();
  });

  it('renders unknown status with default values', () => {
    render(<StatusBadge status="unknown_status" />);
    expect(screen.getByText('unknown_status')).toBeInTheDocument();
  });

  it('renders HRM statuses correctly', () => {
    render(<StatusBadge status="employee_active" />);
    expect(screen.getByText('在职')).toBeInTheDocument();

    render(<StatusBadge status="employee_inactive" />);
    expect(screen.getByText('离职')).toBeInTheDocument();
  });

  it('renders CRM statuses correctly', () => {
    render(<StatusBadge status="customer_active" />);
    expect(screen.getByText('活跃')).toBeInTheDocument();
  });

  it('renders project statuses correctly', () => {
    render(<StatusBadge status="project_active" />);
    expect(screen.getByText('进行中')).toBeInTheDocument();
  });

  it('renders workflow statuses correctly', () => {
    render(<StatusBadge status="workflow_approved" />);
    expect(screen.getByText('已通过')).toBeInTheDocument();
  });

  it('renders finance statuses correctly', () => {
    render(<StatusBadge status="finance_posted" />);
    expect(screen.getByText('已记账')).toBeInTheDocument();
  });

  it('DEFAULT_STATUS_MAP contains all expected statuses', () => {
    expect(DEFAULT_STATUS_MAP.active).toBeDefined();
    expect(DEFAULT_STATUS_MAP.pending).toBeDefined();
    expect(DEFAULT_STATUS_MAP.approved).toBeDefined();
    expect(DEFAULT_STATUS_MAP.rejected).toBeDefined();
  });
});