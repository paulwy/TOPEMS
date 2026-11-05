import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import FinancialAnalysisPage from '@/pages/erp/FinancialAnalysisPage';

vi.mock('@/components/templates/StatsPageTemplate', () => ({
  default: (props: any) => (
    <div data-testid='stats-page'>
      <span data-testid='stat-cards'>{props.statCards?.length ?? 0}</span>
      <span data-testid='charts'>{props.charts?.length ?? 0}</span>
    </div>
  ),
  StatsPageTemplate: (props: any) => (
    <div data-testid='stats-page'>
      <span data-testid='stat-cards'>{props.statCards?.length ?? 0}</span>
      <span data-testid='charts'>{props.charts?.length ?? 0}</span>
    </div>
  ),
}));

vi.mock('@/api/finance', () => {
  const makeApi = (): any =>
    new Proxy(function () {}, {
      get: (_t, key) => (key === 'then' ? undefined : makeApi()),
      apply: () => Promise.resolve({ success: true, data: null }),
    });
  return { financeReportApi: makeApi() };
});

vi.mock('@/lib/reactQuery', () => {
  const keyProxy: any = new Proxy(
    function () {
      return ['k'];
    },
    {
      get: (t, p) => {
        if (p === 'then') return undefined;
        if (p === Symbol.iterator)
          return function* () {
            yield 'k';
          };
        return keyProxy;
      },
      apply: () => ['k'],
    }
  );
  return { QUERY_KEYS: keyProxy, CACHE_DURATIONS: { SHORT: 5000, MEDIUM: 30000, LONG: 60000 } };
});

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: undefined,
    isPending: false,
    isLoading: false,
    refetch: vi.fn(),
  })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/store', () => ({ useNotificationStore: () => ({ addNotification: vi.fn() }) }));
vi.mock('@/utils/logger', () => ({ apiLogger: { error: vi.fn(), info: vi.fn() } }));
vi.mock('@/i18n', () => ({ default: { t: (k: string) => k, exists: () => true } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('FinancialAnalysisPage', () => {
  it('渲染 StatsPageTemplate', () => {
    render(<FinancialAnalysisPage />);
    expect(document.querySelector('[data-testid="stats-page"]')).toBeTruthy();
  });
});
