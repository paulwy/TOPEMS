import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import RsOverviewPage from '../RsOverviewPage';

vi.mock('@/components/charts', () => ({
  LazyChart: () => <div data-testid='lazy-chart' />,
}));

describe('RsOverviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders stat cards (project total, in-progress, bugs, commits, build, releases)', async () => {
    renderWithProviders(<RsOverviewPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stat-card-total-projects')).toBeInTheDocument();
    });
    expect(screen.getByTestId('stat-card-total-projects')).toHaveTextContent('项目总数');
    expect(screen.getByTestId('stat-card-total-projects')).toHaveTextContent('24');
    expect(screen.getByTestId('stat-card-in-progress')).toHaveTextContent('进行中');
    expect(screen.getByTestId('stat-card-bug-count')).toHaveTextContent('缺陷数');
    expect(screen.getByTestId('stat-card-code-commits')).toHaveTextContent('代码提交');
    expect(screen.getByTestId('stat-card-build-success')).toHaveTextContent('构建成功率');
    expect(screen.getByTestId('stat-card-releases')).toHaveTextContent('发布版本');
  });
});
