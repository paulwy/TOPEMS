import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import DashboardPage from '../DashboardPage';

vi.mock('@/api/rd', () => ({
  rdApi: {
    getStatistics: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        total_projects: 12,
        total_formulas: 88,
        total_tasks: 567,
        total_experiments: 9,
        pending_projects: 2,
        in_progress_projects: 5,
        completed_projects: 4,
        cancelled_projects: 1,
        pending_experiments: 1,
        in_progress_experiments: 5,
        completed_experiments: 3,
      },
    }),
  },
}));

vi.mock('@/components/charts', () => ({
  LazyChart: () => <div data-testid='lazy-chart' />,
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders stat cards with mocked statistics values', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      const projects = screen.getByTestId('stat-card-research-projects');
      expect(projects).toHaveTextContent('项目');
      expect(projects).toHaveTextContent('12');
    });
    expect(screen.getByTestId('stat-card-document-count')).toHaveTextContent('88');
    expect(screen.getByTestId('stat-card-test-cases')).toHaveTextContent('567');
    expect(screen.getByTestId('stat-card-version-releases')).toHaveTextContent('9');
  });
});
