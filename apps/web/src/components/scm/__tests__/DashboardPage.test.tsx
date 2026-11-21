import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import DashboardPage from '@/components/scm/DashboardPage';

vi.mock('@/components/templates', () => ({
  DashboardTemplate: (props: any) => (
    <div data-testid='dashboard-template'>
      <span data-testid='stat-cards'>{props.statCards?.length ?? 0}</span>
    </div>
  ),
}));

vi.mock('@/api/scm', () => {
  const makeApi = (): any =>
    new Proxy(function () {}, {
      get: (_t, key) => (key === 'then' ? undefined : makeApi()),
      apply: () => Promise.resolve({ success: true, data: null }),
    });
  return { scmApi: makeApi(), scmAnalyticsApi: makeApi() };
});

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: undefined,
    isPending: false,
    isLoading: false,
    refetch: vi.fn(),
  })),
  QueryCache: vi.fn(),
  MutationCache: vi.fn(),
  QueryClient: vi.fn(),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/i18n', () => ({ default: { t: (k: string) => k, exists: () => true } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('ScmDashboardPage', () => {
  it('渲染 DashboardTemplate', () => {
    render(<DashboardPage />);
    expect(document.querySelector('[data-testid="dashboard-template"]')).toBeTruthy();
  });
});
