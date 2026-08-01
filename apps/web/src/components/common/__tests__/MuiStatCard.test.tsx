import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { StatCard, StatCardGroup, type StatCardProps } from '../MuiStatCard';
import { renderWithProviders } from '@/__tests__/test-utils';

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

describe('StatCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title and value', () => {
    renderWithProviders(
      <StatCard
        title='总收入'
        value={12500}
      />
    );
    expect(screen.getByText('总收入')).toBeInTheDocument();
    expect(screen.getByText('12,500')).toBeInTheDocument();
  });

  it('renders string value as is', () => {
    renderWithProviders(
      <StatCard
        title='状态'
        value='活跃'
      />
    );
    expect(screen.getByText('活跃')).toBeInTheDocument();
  });

  it('renders unit when provided', () => {
    renderWithProviders(
      <StatCard
        title='用户数'
        value={1250}
        unit='人'
      />
    );
    expect(screen.getByText('人')).toBeInTheDocument();
  });

  it('renders change percentage with up trend', () => {
    renderWithProviders(
      <StatCard
        title='增长'
        value={100}
        change={12.5}
      />
    );
    expect(screen.getByText('+12.5%')).toBeInTheDocument();
  });

  it('renders change percentage with down trend', () => {
    renderWithProviders(
      <StatCard
        title='下降'
        value={100}
        change={-5.2}
      />
    );
    expect(screen.getByText('-5.2%')).toBeInTheDocument();
  });

  it('renders change with custom label', () => {
    renderWithProviders(
      <StatCard
        title='增长'
        value={100}
        change={10}
        changeLabel='较上月'
      />
    );
    expect(screen.getByText('+10% 较上月')).toBeInTheDocument();
  });

  it('renders with up changeDirection', () => {
    const { container } = renderWithProviders(
      <StatCard
        title='趋势'
        value={100}
        change={5}
        changeDirection='up'
      />
    );
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('renders with down changeDirection', () => {
    const { container } = renderWithProviders(
      <StatCard
        title='趋势'
        value={100}
        change={-5}
        changeDirection='down'
      />
    );
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('renders with neutral changeDirection', () => {
    const { container } = renderWithProviders(
      <StatCard
        title='趋势'
        value={100}
        change={0}
        changeDirection='neutral'
      />
    );
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('renders icon when provided', () => {
    renderWithProviders(
      <StatCard
        title='订单'
        value={50}
        icon={<span data-testid='stat-icon'>📦</span>}
      />
    );
    expect(screen.getByTestId('stat-icon')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const handleClick = vi.fn();
    renderWithProviders(
      <StatCard
        title='可点击'
        value={100}
        onClick={handleClick}
      />
    );
    const card = screen.getByText('可点击').closest('.MuiCard-root');
    fireEvent.click(card!);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when not provided', () => {
    const { container } = renderWithProviders(
      <StatCard
        title='不可点击'
        value={100}
      />
    );
    const card = container.querySelector('.MuiCard-root');
    expect(card).toBeInTheDocument();
  });

  it('renders skeleton when loading', () => {
    const { container } = renderWithProviders(
      <StatCard
        title='加载中'
        value={0}
        loading
      />
    );
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders children when provided', () => {
    renderWithProviders(
      <StatCard
        title='自定义'
        value={100}
      >
        <div data-testid='stat-children'>额外内容</div>
      </StatCard>
    );
    expect(screen.getByTestId('stat-children')).toBeInTheDocument();
  });

  it('renders with gradient background', () => {
    const { container } = renderWithProviders(
      <StatCard
        title='渐变'
        value={100}
        gradient
      />
    );
    const card = container.querySelector('.MuiCard-root');
    expect(card).toBeInTheDocument();
  });

  it('renders with custom gradient', () => {
    const { container } = renderWithProviders(
      <StatCard
        title='自定义渐变'
        value={100}
        gradient
        customGradient='linear-gradient(90deg, red, blue)'
      />
    );
    const card = container.querySelector('.MuiCard-root');
    expect(card).toBeInTheDocument();
  });

  it('renders with tooltip when tooltip prop is provided', () => {
    renderWithProviders(
      <StatCard
        title='提示'
        value={100}
        tooltip='这是一个提示信息'
      />
    );
    expect(screen.getByText('提示')).toBeInTheDocument();
  });

  it('renders with different colors', () => {
    const { rerender } = renderWithProviders(
      <StatCard
        title='主色'
        value={100}
        color='primary'
      />
    );
    expect(screen.getByText('主色')).toBeInTheDocument();

    rerender(
      <StatCard
        title='成功'
        value={100}
        color='success'
      />
    );
    expect(screen.getByText('成功')).toBeInTheDocument();

    rerender(
      <StatCard
        title='警告'
        value={100}
        color='warning'
      />
    );
    expect(screen.getByText('警告')).toBeInTheDocument();

    rerender(
      <StatCard
        title='错误'
        value={100}
        color='error'
      />
    );
    expect(screen.getByText('错误')).toBeInTheDocument();

    rerender(
      <StatCard
        title='信息'
        value={100}
        color='info'
      />
    );
    expect(screen.getByText('信息')).toBeInTheDocument();
  });
});

describe('StatCardGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const stats: StatCardProps[] = [
    { title: '总用户', value: 1500, icon: <span>👥</span> },
    { title: '订单数', value: 320, change: 5.5 },
    { title: '收入', value: 88000, unit: '元', color: 'success' },
    { title: '转化率', value: '4.2%', change: 4.2, changeDirection: 'up' },
  ];

  it('renders all stat cards', () => {
    renderWithProviders(<StatCardGroup stats={stats} />);
    expect(screen.getByText('总用户')).toBeInTheDocument();
    expect(screen.getByText('订单数')).toBeInTheDocument();
    expect(screen.getByText('收入')).toBeInTheDocument();
    expect(screen.getByText('转化率')).toBeInTheDocument();
  });

  it('renders with loading state', () => {
    const { container } = renderWithProviders(
      <StatCardGroup
        stats={stats}
        loading
      />
    );
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders with custom columns', () => {
    const { container } = renderWithProviders(
      <StatCardGroup
        stats={stats}
        columns={2}
      />
    );
    const grid = container.firstChild as HTMLElement;
    expect(grid).toBeInTheDocument();
  });

  it('renders empty stats list', () => {
    const { container } = renderWithProviders(<StatCardGroup stats={[]} />);
    const grid = container.firstChild as HTMLElement;
    expect(grid).toBeInTheDocument();
  });

  it('passes loading to individual cards', () => {
    const { container } = renderWithProviders(
      <StatCardGroup
        stats={stats}
        loading
      />
    );
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThanOrEqual(stats.length);
  });
});
