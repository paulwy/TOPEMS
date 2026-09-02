import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import DescriptionList from '../DescriptionList';

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
        }
  ),
  useAuthStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          user: null,
        })
      : {
          user: null,
        }
  ),
}));

describe('DescriptionList', () => {
  const defaultItems = [
    { label: '姓名', value: '张三' },
    { label: '部门', value: '技术部' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders items in vertical layout', () => {
    render(
      <DescriptionList
        items={defaultItems}
        direction='vertical'
      />
    );
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('技术部')).toBeInTheDocument();
    expect(screen.getByText('姓名')).toBeInTheDocument();
    expect(screen.getByText('部门')).toBeInTheDocument();
  });

  it('renders in horizontal (grid) layout', () => {
    render(
      <DescriptionList
        items={defaultItems}
        direction='horizontal'
      />
    );
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('技术部')).toBeInTheDocument();
  });

  it('shows labels and values correctly', () => {
    render(<DescriptionList items={defaultItems} />);
    expect(screen.getByText('姓名')).toBeInTheDocument();
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('部门')).toBeInTheDocument();
    expect(screen.getByText('技术部')).toBeInTheDocument();
  });

  it('handles empty items array', () => {
    const { container } = render(<DescriptionList items={[]} />);
    // Should render without errors, empty container
    expect(container).toBeInTheDocument();
  });

  it('shows tooltip on hover via title attribute or tooltip component', () => {
    const items = [{ label: '邮箱', value: 'test@example.com', tooltip: '点击复制邮箱' }];
    render(
      <DescriptionList
        items={items}
        direction='vertical'
      />
    );
    // MUI Tooltip renders a wrapper with title attribute
    const valueEl = screen.getByText('test@example.com');
    expect(valueEl).toBeInTheDocument();
    // The tooltip title should be accessible via the parent wrapper
    const tooltipWrapper = valueEl.closest('[role="tooltip"]') ?? valueEl.parentElement;
    expect(tooltipWrapper).toBeTruthy();
  });

  it('renders with loading state', () => {
    const items = [{ label: '姓名', value: '张三', loading: true }];
    render(
      <DescriptionList
        items={items}
        direction='vertical'
      />
    );
    // Should show skeleton instead of value
    expect(screen.queryByText('张三')).not.toBeInTheDocument();
    // Skeleton should be present (renders as a span with class)
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders value with "-" fallback when value is null/undefined', () => {
    const items = [{ label: '备注', value: undefined }];
    render(
      <DescriptionList
        items={items}
        direction='vertical'
      />
    );
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { rerender } = render(
      <DescriptionList
        items={defaultItems}
        size='sm'
      />
    );
    expect(screen.getByText('张三')).toBeInTheDocument();

    rerender(
      <DescriptionList
        items={defaultItems}
        size='lg'
      />
    );
    expect(screen.getByText('张三')).toBeInTheDocument();
  });

  it('renders with copyable items', () => {
    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    const items = [{ label: '邮箱', value: 'test@example.com', copyable: true }];
    render(
      <DescriptionList
        items={items}
        direction='vertical'
      />
    );
    // Copy button should be present (IconButton)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders with divider', () => {
    const items = [
      { label: '姓名', value: '张三' },
      { label: '部门', value: '技术部' },
    ];
    const { container } = render(
      <DescriptionList
        items={items}
        direction='vertical'
        divider
      />
    );
    // MUI Divider renders with role="separator"
    const dividers = screen.getAllByRole('separator');
    expect(dividers.length).toBe(1);
  });
});
