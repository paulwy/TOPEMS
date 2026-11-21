import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import CrmForecastAlgorithmPage from '@/components/crm/CrmForecastAlgorithmPage';

vi.mock('@/components/templates', () => ({
  StatsPageTemplate: (props: any) => (
    <div data-testid='stats-page'>
      <span data-testid='stat-cards'>{props.statCards?.length ?? 0}</span>
    </div>
  ),
}));

vi.mock('@/api/crm', () => ({
  forecastApi: { getMethods: vi.fn(), predict: vi.fn(), evaluate: vi.fn() },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn() })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('@/lib/reactQuery', () => ({
  QUERY_KEYS: {
    CRM: Object.assign(() => ['crm'], {
      FORECAST_ALGORITHM: ['crm', 'forecast-algorithm'],
    }),
  },
}));

vi.mock('@/store', () => ({ useNotificationStore: () => ({ addNotification: vi.fn() }) }));
vi.mock('@/utils/logger', () => ({ apiLogger: { error: vi.fn(), info: vi.fn() } }));
vi.mock('@/i18n', () => ({ default: { t: (k: string) => k, exists: () => true } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('CrmForecastAlgorithmPage', () => {
  it('渲染 StatsPageTemplate', () => {
    render(<CrmForecastAlgorithmPage />);
    expect(document.querySelector('[data-testid="stats-page"]')).toBeTruthy();
  });
});
