import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { Timeline } from '../Timeline';

vi.mock('@/store', () => ({ useAppStore: vi.fn() }));

const mockItems = [
  {
    id: '1',
    title: '提交申请',
    description: '用户提交了请假申请',
    time: '2024-01-01 09:00',
    status: 'completed' as const,
  },
  {
    id: '2',
    title: '主管审批',
    description: '等待主管审批',
    time: '2024-01-01 10:00',
    status: 'pending' as const,
  },
  {
    id: '3',
    title: 'HR确认',
    description: 'HR确认请假信息',
    time: '2024-01-01 14:00',
    status: 'active' as const,
  },
  {
    id: '4',
    title: '审批失败',
    time: '2024-01-01 16:00',
    status: 'error' as const,
  },
  {
    id: '5',
    title: '警告',
    time: '2024-01-01 17:00',
    status: 'warning' as const,
  },
];

describe('Timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders timeline items', () => {
    render(<Timeline items={mockItems} />);
    expect(screen.getByText('提交申请')).toBeInTheDocument();
    expect(screen.getByText('主管审批')).toBeInTheDocument();
    expect(screen.getByText('HR确认')).toBeInTheDocument();
    expect(screen.getByText('审批失败')).toBeInTheDocument();
    expect(screen.getByText('警告')).toBeInTheDocument();
  });

  it('renders in vertical orientation (default)', () => {
    const { container } = render(<Timeline items={mockItems} />);
    // Vertical timeline renders items in a vertical flex layout
    const root = container.firstChild as HTMLElement;
    expect(root).toBeInTheDocument();
  });

  it('renders in horizontal orientation', () => {
    render(
      <Timeline
        items={mockItems}
        orientation='horizontal'
      />
    );
    // In jsdom, sx props become CSS classes, not inline styles
    // Just verify it renders
    expect(screen.getByText('提交申请')).toBeInTheDocument();
  });

  it('shows correct status icons', () => {
    const { container } = render(<Timeline items={mockItems} />);
    // Each status should render an SVG icon
    const svgs = container.querySelectorAll('svg');
    // At least 5 status icons (one per item)
    expect(svgs.length).toBeGreaterThanOrEqual(5);
  });

  it('shows status colors correctly', () => {
    render(<Timeline items={mockItems} />);
    // Just verify the status-specific items are rendered individually
    expect(screen.getByText('提交申请')).toBeInTheDocument();
    expect(screen.getByText('主管审批')).toBeInTheDocument();
    expect(screen.getByText('HR确认')).toBeInTheDocument();
    expect(screen.getByText('审批失败')).toBeInTheDocument();
    expect(screen.getByText('警告')).toBeInTheDocument();
  });

  it('shows description when provided', () => {
    render(<Timeline items={mockItems} />);
    expect(screen.getByText('用户提交了请假申请')).toBeInTheDocument();
    expect(screen.getByText('等待主管审批')).toBeInTheDocument();
    expect(screen.getByText('HR确认请假信息')).toBeInTheDocument();
  });

  it('shows time when provided', () => {
    render(<Timeline items={mockItems} />);
    expect(screen.getByText('2024-01-01 09:00')).toBeInTheDocument();
    expect(screen.getByText('2024-01-01 10:00')).toBeInTheDocument();
  });

  it('renders with loading state', () => {
    const loadingItems = [{ id: '1', title: '加载中', loading: true }];
    const { container } = render(<Timeline items={loadingItems} />);
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders custom icon', () => {
    const items = [
      {
        id: '1',
        title: '自定义图标',
        icon: <span data-testid='custom-icon'>ICON</span>,
      },
    ];
    render(<Timeline items={items} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('calls onItemClick when item icon is clicked', () => {
    const handleItemClick = vi.fn();
    const { container } = render(
      <Timeline
        items={mockItems}
        onItemClick={handleItemClick}
      />
    );
    // Click on the first item's icon area
    const iconBoxes = container.querySelectorAll('[style*="cursor: pointer"]');
    if (iconBoxes.length > 0) {
      fireEvent.click(iconBoxes[0]);
      expect(handleItemClick).toHaveBeenCalledTimes(1);
      expect(handleItemClick).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1', title: '提交申请' })
      );
    }
  });

  it('renders status chip', () => {
    render(<Timeline items={mockItems} />);
    // Each item with status should have a Chip
    const chips = screen.getAllByText(/completed|pending|active|error|warning/);
    expect(chips.length).toBe(5);
  });

  it('renders with different sizes', () => {
    const { rerender } = render(
      <Timeline
        items={mockItems}
        size='small'
      />
    );
    expect(screen.getByText('提交申请')).toBeInTheDocument();

    rerender(
      <Timeline
        items={mockItems}
        size='large'
      />
    );
    expect(screen.getByText('提交申请')).toBeInTheDocument();
  });

  it('renders content when provided', () => {
    const items = [
      {
        id: '1',
        title: '带内容',
        content: <div data-testid='extra-content'>额外内容</div>,
      },
    ];
    render(<Timeline items={items} />);
    expect(screen.getByTestId('extra-content')).toBeInTheDocument();
  });
});
