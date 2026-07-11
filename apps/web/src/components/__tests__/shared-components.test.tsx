import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, DEFAULT_STATUS_MAP } from '@topems/shared-components';

describe('StatusBadge', () => {
  it('should render with default status', () => {
    render(<StatusBadge status='active' />);
    expect(screen.getByText('启用')).toBeInTheDocument();
  });

  it('should render with custom label', () => {
    render(
      <StatusBadge
        status='active'
        label='激活'
      />
    );
    expect(screen.getByText('激活')).toBeInTheDocument();
  });

  it('should render with custom statusMap', () => {
    render(
      <StatusBadge
        status='custom'
        statusMap={{ custom: { label: '自定义', color: 'success' } }}
      />
    );
    expect(screen.getByText('自定义')).toBeInTheDocument();
  });

  it('should render icon when showIcon is true', () => {
    render(
      <StatusBadge
        status='active'
        showIcon
      />
    );
    expect(screen.getByText('启用')).toBeInTheDocument();
  });

  it('should render with different sizes', () => {
    const { container } = render(
      <div>
        <StatusBadge
          status='active'
          size='sm'
        />
        <StatusBadge
          status='active'
          size='md'
        />
        <StatusBadge
          status='active'
          size='lg'
        />
      </div>
    );
    const chips = container.querySelectorAll('.MuiChip-root');
    expect(chips).toHaveLength(3);
  });

  it('should render with different variants', () => {
    const { container } = render(
      <div>
        <StatusBadge
          status='active'
          variant='filled'
        />
        <StatusBadge
          status='active'
          variant='outlined'
        />
        <StatusBadge
          status='active'
          variant='soft'
        />
      </div>
    );
    const chips = container.querySelectorAll('.MuiChip-root');
    expect(chips).toHaveLength(3);
  });

  it('should be clickable when clickable is true', () => {
    const handleClick = vi.fn();
    render(
      <StatusBadge
        status='active'
        clickable
        onClick={handleClick}
      />
    );
    screen.getByText('启用').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not be clickable when disabled', () => {
    const handleClick = vi.fn();
    render(
      <StatusBadge
        status='active'
        clickable
        onClick={handleClick}
        disabled
      />
    );
    screen.getByText('启用').click();
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should render without Chip when useChip is false', () => {
    const { container } = render(
      <StatusBadge
        status='active'
        useChip={false}
      />
    );
    const chips = container.querySelectorAll('[role="button"]');
    expect(chips).toHaveLength(0);
    expect(screen.getByText('启用')).toBeInTheDocument();
  });

  it('should use custom render function', () => {
    const customRender = vi.fn((config) => <span data-testid='custom'>{config.label}</span>);
    render(
      <StatusBadge
        status='active'
        render={customRender}
      />
    );
    expect(screen.getByTestId('custom')).toHaveTextContent('启用');
    expect(customRender).toHaveBeenCalled();
  });

  it('should render unknown status with default config', () => {
    render(<StatusBadge status='unknown_status' />);
    expect(screen.getByText('unknown_status')).toBeInTheDocument();
  });
});

describe('DEFAULT_STATUS_MAP', () => {
  it('should have common statuses defined', () => {
    expect(DEFAULT_STATUS_MAP.active).toBeDefined();
    expect(DEFAULT_STATUS_MAP.inactive).toBeDefined();
    expect(DEFAULT_STATUS_MAP.pending).toBeDefined();
    expect(DEFAULT_STATUS_MAP.approved).toBeDefined();
    expect(DEFAULT_STATUS_MAP.rejected).toBeDefined();
  });

  it('should have HRM statuses defined', () => {
    expect(DEFAULT_STATUS_MAP.employee_active).toBeDefined();
    expect(DEFAULT_STATUS_MAP.employee_inactive).toBeDefined();
    expect(DEFAULT_STATUS_MAP.employee_probation).toBeDefined();
    expect(DEFAULT_STATUS_MAP.employee_pending).toBeDefined();
  });

  it('should have CRM statuses defined', () => {
    expect(DEFAULT_STATUS_MAP.customer_active).toBeDefined();
    expect(DEFAULT_STATUS_MAP.customer_inactive).toBeDefined();
    expect(DEFAULT_STATUS_MAP.customer_blocked).toBeDefined();
    expect(DEFAULT_STATUS_MAP.customer_potential).toBeDefined();
  });

  it('should have workflow statuses defined', () => {
    expect(DEFAULT_STATUS_MAP.workflow_draft).toBeDefined();
    expect(DEFAULT_STATUS_MAP.workflow_pending).toBeDefined();
    expect(DEFAULT_STATUS_MAP.workflow_approved).toBeDefined();
    expect(DEFAULT_STATUS_MAP.workflow_rejected).toBeDefined();
  });

  it('should have finance statuses defined', () => {
    expect(DEFAULT_STATUS_MAP.finance_draft).toBeDefined();
    expect(DEFAULT_STATUS_MAP.finance_pending).toBeDefined();
    expect(DEFAULT_STATUS_MAP.finance_approved).toBeDefined();
    expect(DEFAULT_STATUS_MAP.finance_posted).toBeDefined();
  });
});
