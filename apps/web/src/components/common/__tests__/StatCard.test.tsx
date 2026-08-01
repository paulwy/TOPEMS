import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import { StatCardBase, MetricCard } from '../StatCard';

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector
      ? selector({ addNotification: vi.fn(), notifications: [] })
      : { addNotification: vi.fn(), notifications: [] }
  ),
  useAuthStore: vi.fn((selector?: any) => (selector ? selector({ user: null }) : { user: null })),
}));

describe('StatCardBase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title and value', () => {
    renderWithProviders(
      <StatCardBase
        title='总收入'
        value='12,500'
      />
    );
    expect(screen.getByText('总收入')).toBeInTheDocument();
    expect(screen.getByText('12,500')).toBeInTheDocument();
  });

  it('renders numeric value when animate is false', () => {
    renderWithProviders(
      <StatCardBase
        title='用户数'
        value={12500}
        animate={false}
      />
    );
    expect(screen.getByText('用户数')).toBeInTheDocument();
    // When animate is false, the raw number value is rendered (no toLocaleString formatting)
    expect(screen.getByText('12500')).toBeInTheDocument();
  });

  it('renders unit when provided', () => {
    renderWithProviders(
      <StatCardBase
        title='订单数'
        value='320'
        unit='单'
      />
    );
    expect(screen.getByText('单')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    renderWithProviders(
      <StatCardBase
        title='订单'
        value='50'
        icon={<span data-testid='stat-icon'>📦</span>}
      />
    );
    expect(screen.getByTestId('stat-icon')).toBeInTheDocument();
  });

  it('renders positive change with up trend', () => {
    renderWithProviders(
      <StatCardBase
        title='增长'
        value='100'
        change={12.5}
      />
    );
    expect(screen.getByText('+12.5%')).toBeInTheDocument();
  });

  it('renders negative change with down trend', () => {
    renderWithProviders(
      <StatCardBase
        title='下降'
        value='100'
        change={-5.2}
      />
    );
    expect(screen.getByText('-5.2%')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const handleClick = vi.fn();
    const { container } = renderWithProviders(
      <StatCardBase
        title='可点击'
        value='100'
        onClick={handleClick}
      />
    );
    const card = container.firstChild as HTMLElement;
    expect(card).toBeTruthy();
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders subtitle when provided', () => {
    renderWithProviders(
      <StatCardBase
        title='收入'
        value='1000'
        subtitle='较上月'
      />
    );
    expect(screen.getByText('较上月')).toBeInTheDocument();
  });
});

describe('MetricCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title and value', () => {
    renderWithProviders(
      <MetricCard
        title='指标'
        value='500'
      />
    );
    expect(screen.getByText('指标')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('renders with sparkline data without crashing', () => {
    renderWithProviders(
      <MetricCard
        title='趋势'
        value='100'
        sparklineData={[10, 20, 30, 40, 50]}
      />
    );
    expect(screen.getByText('趋势')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders with target progress props without crashing', () => {
    renderWithProviders(
      <MetricCard
        title='目标'
        value='100'
        showTargetProgress
        targetProgress={75}
      />
    );
    expect(screen.getByText('目标')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });
});
