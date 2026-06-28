import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { EmptyState } from '../EmptyState';

vi.mock('@/store', () => ({ useAppStore: vi.fn() }));

describe('EmptyState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders default empty state with title', () => {
    render(<EmptyState title='暂无数据' />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  it('renders with description', () => {
    render(
      <EmptyState
        title='暂无数据'
        description='当前列表为空'
      />
    );
    expect(screen.getByText('当前列表为空')).toBeInTheDocument();
  });

  it('renders action button and calls onAction', () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title='暂无数据'
        action={{ label: '添加数据', onClick: handleAction }}
      />
    );
    const button = screen.getByRole('button', { name: '添加数据' });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('renders action button with deprecated actionLabel/onAction props', () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title='暂无数据'
        actionLabel='添加'
        onAction={handleAction}
      />
    );
    const button = screen.getByRole('button', { name: '添加' });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('renders in compact mode', () => {
    const { container } = render(
      <EmptyState
        title='暂无数据'
        compact
      />
    );
    const wrapper = container.firstChild as HTMLElement;
    // compact mode uses py: 4 instead of py: 8
    expect(wrapper).toBeInTheDocument();
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  it('renders custom icon', () => {
    render(
      <EmptyState
        title='暂无数据'
        icon={<span data-testid='custom-icon'>ICON</span>}
      />
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders with emoji', () => {
    render(
      <EmptyState
        title='暂无数据'
        emoji='🔍'
      />
    );
    expect(screen.getByText('🔍')).toBeInTheDocument();
  });

  it('has role="status" and aria-live="polite" (a11y)', () => {
    render(<EmptyState title='暂无数据' />);
    const statusBox = screen.getByRole('status');
    expect(statusBox).toBeInTheDocument();
    expect(statusBox).toHaveAttribute('aria-live', 'polite');
  });

  it('icon container has aria-hidden="true"', () => {
    render(<EmptyState title='暂无数据' />);
    const iconContainer = screen.getByText('📋').closest('div[aria-hidden="true"]');
    expect(iconContainer).toBeInTheDocument();
    expect(iconContainer).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not render action button when action is not provided', () => {
    render(<EmptyState title='暂无数据' />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <EmptyState title='暂无数据'>
        <div data-testid='child-content'>子内容</div>
      </EmptyState>
    );
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('子内容')).toBeInTheDocument();
  });

  it('renders with left alignment', () => {
    const { container } = render(
      <EmptyState
        title='暂无数据'
        align='left'
      />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toBeInTheDocument();
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });
});
