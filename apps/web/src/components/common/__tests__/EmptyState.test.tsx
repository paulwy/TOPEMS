/**
 * EmptyState component — 空状态组件测试
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { EmptyState, ListEmptyState, SearchEmptyState } from '@topems/shared-components';

describe('EmptyState', () => {
  it('renders title text', () => {
    render(<EmptyState title='No Data' />);
    expect(screen.getByText('No Data')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <EmptyState
        title='Empty'
        description='Nothing here'
      />
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('does not render description when omitted', () => {
    const { container } = render(<EmptyState title='Empty' />);
    // No body2 text besides title
    expect(container.querySelectorAll('p').length).toBe(0);
  });

  it('renders action button with correct label', () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title='Empty'
        action={{ label: 'Add Item', onClick }}
      />
    );
    const btn = screen.getByRole('button', { name: /Add Item/i });
    expect(btn).toBeInTheDocument();
  });

  it('renders emoji icon when provided', () => {
    render(
      <EmptyState
        title='Empty'
        emoji='📦'
      />
    );
    expect(screen.getByText('📦')).toBeInTheDocument();
  });

  it('renders custom icon when provided', () => {
    render(
      <EmptyState
        title='Empty'
        icon={<span data-testid='custom-icon'>icon</span>}
      />
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('falls back to default Info icon when no icon/emoji', () => {
    const { container } = render(<EmptyState title='Empty' />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it('uses legacy actionLabel/onAction for backward compatibility', () => {
    render(
      <EmptyState
        title='Empty'
        actionLabel='Legacy Action'
        onAction={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /Legacy Action/i })).toBeInTheDocument();
  });

  it('has role="status" for accessibility', () => {
    render(<EmptyState title='Empty' />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('ListEmptyState preset', () => {
  it('renders default title and description', () => {
    render(<ListEmptyState />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
    expect(screen.getByText('当前列表为空，没有可显示的内容')).toBeInTheDocument();
  });

  it('renders custom title and action', () => {
    render(
      <ListEmptyState
        title='Custom'
        actionLabel='Create'
        onAction={vi.fn()}
      />
    );
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create/i })).toBeInTheDocument();
  });
});

describe('SearchEmptyState preset', () => {
  it('renders with keyword', () => {
    render(<SearchEmptyState keyword='test' />);
    expect(screen.getByText(/未找到与.*test.*相关的内容/)).toBeInTheDocument();
  });

  it('renders clear button when onClear is provided', () => {
    render(<SearchEmptyState onClear={vi.fn()} />);
    expect(screen.getByRole('button', { name: /清除搜索/i })).toBeInTheDocument();
  });
});
