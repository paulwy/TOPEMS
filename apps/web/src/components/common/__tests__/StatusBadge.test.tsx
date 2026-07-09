import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { StatusBadge, DEFAULT_STATUS_MAP } from '@topems/shared-components';
import { renderWithProviders } from '@/__tests__/test-utils';

vi.mock('@/store', () => ({ useAppStore: vi.fn() }));

describe('StatusBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders default status badge with label', () => {
    renderWithProviders(<StatusBadge status='active' />);
    expect(screen.getByText('启用')).toBeInTheDocument();
  });

  it('renders with different status values from DEFAULT_STATUS_MAP', () => {
    const { rerender } = renderWithProviders(<StatusBadge status='pending' />);
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
    renderWithProviders(
      <StatusBadge
        status='custom_status'
        statusMap={customMap}
      />
    );
    expect(screen.getByText('自定义状态')).toBeInTheDocument();
  });

  it('renders with custom label prop', () => {
    renderWithProviders(
      <StatusBadge
        status='active'
        label='自定义标签'
      />
    );
    expect(screen.getByText('自定义标签')).toBeInTheDocument();
  });

  it('calls onClick when clickable and clicked', () => {
    const handleClick = vi.fn();
    renderWithProviders(
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
    renderWithProviders(
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
    renderWithProviders(
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
    const { rerender } = renderWithProviders(
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
    const { rerender } = renderWithProviders(
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
    const { container } = renderWithProviders(
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
    renderWithProviders(<StatusBadge status='unknown_status' />);
    expect(screen.getByText('unknown_status')).toBeInTheDocument();
  });

  it('renders with custom render function', () => {
    const customRender = vi.fn((config) => <span data-testid='custom'>{config.label}</span>);
    renderWithProviders(
      <StatusBadge
        status='active'
        render={customRender}
      />
    );
    expect(customRender).toHaveBeenCalled();
    expect(screen.getByTestId('custom')).toHaveTextContent('启用');
  });

  it('renders without chip when useChip is false', () => {
    renderWithProviders(
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
