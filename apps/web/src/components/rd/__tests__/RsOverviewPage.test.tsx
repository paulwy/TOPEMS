import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import RsOverviewPage from '../RsOverviewPage';

vi.mock('@/api/rd', () => ({
  projectApi: {
    listProjects: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      data: {
        projects: [
          { id: 'P1', status: 'in_progress' },
          { id: 'P2', status: 'active' },
          { id: 'P3', status: 'done' },
        ],
        total: 24,
      },
    }),
  },
  bugApi: {
    listBugs: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      data: { bugs: [{ id: 'B1', severity: 'high' }], total: 67 },
    }),
  },
  buildApi: {
    listBuilds: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      data: {
        builds: [
          { id: 'D1', status: 'success' },
          { id: 'D2', status: 'passed' },
          { id: 'D3', status: 'failed' },
          { id: 'D4', status: 'success' },
        ],
        total: 8,
      },
    }),
  },
}));

vi.mock('@/components/charts', () => ({
  LazyChart: () => <div data-testid='lazy-chart' />,
}));

describe('RsOverviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders stat cards from RD list endpoints', async () => {
    renderWithProviders(<RsOverviewPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stat-card-total-projects')).toHaveTextContent('24');
    });
    expect(screen.getByTestId('stat-card-total-projects')).toHaveTextContent('项目总数');
    expect(screen.getByTestId('stat-card-in-progress')).toHaveTextContent('2');
    expect(screen.getByTestId('stat-card-bug-count')).toHaveTextContent('67');
    expect(screen.getByTestId('stat-card-builds')).toHaveTextContent('8');
    expect(screen.getByTestId('stat-card-build-success')).toHaveTextContent('75.0%');
  });
});
