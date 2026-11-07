import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import ScmOverviewPage from '@/pages/scm/ScmOverviewPage';

vi.mock('@/components/templates', () => ({
  DashboardTemplate: (props: any) => (
    <div data-testid='dashboard-template'>
      <span data-testid='stat-cards'>{props.statCards?.length ?? 0}</span>
    </div>
  ),
}));

vi.mock('@/components/charts', () => ({
  LazyChart: () => <div data-testid='lazy-chart' />,
}));

vi.mock('@/lib/reactQuery', () => ({
  QUERY_KEYS: {
    AD_HOC: new Proxy({}, { get: (_t, key) => [String(key)] }),
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn() })),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/module-configs/scm/config', () => ({ SCM_PATHS: { root: '/scm' } }));
vi.mock('@/i18n', () => ({ default: { t: (k: string) => k, exists: () => true } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('ScmOverviewPage', () => {
  it('渲染 DashboardTemplate', () => {
    render(<ScmOverviewPage />);
    expect(document.querySelector('[data-testid="dashboard-template"]')).toBeTruthy();
  });
});
