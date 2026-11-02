import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { within } from '@testing-library/react';
import { renderWithProviders, screen } from '@/__tests__/test-utils';

import IntegrationDashboardPage from '../IntegrationDashboardPage';

// DashboardTemplate 为全局 mock：渲染 stat-card-<id>（含 title/value span）。
// 本页 stats 为硬编码，无需 mock api。
describe('IntegrationDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders active connections stat card with hardcoded value', () => {
    renderWithProviders(<IntegrationDashboardPage />);
    const card = screen.getByTestId('stat-card-active-connections');
    expect(within(card).getByText('活跃连接')).toBeInTheDocument();
    expect(within(card).getByText('12')).toBeInTheDocument();
  });

  it('renders success rate and error stat cards', () => {
    renderWithProviders(<IntegrationDashboardPage />);
    const success = screen.getByTestId('stat-card-success-rate');
    expect(within(success).getByText('成功率')).toBeInTheDocument();
    expect(within(success).getByText('98.5%')).toBeInTheDocument();

    const errors = screen.getByTestId('stat-card-errors');
    expect(within(errors).getByText('错误数')).toBeInTheDocument();
    expect(within(errors).getByText('23')).toBeInTheDocument();
  });
});
