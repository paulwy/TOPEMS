import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import CrmRfmPage from '@/pages/crm/CrmRfmPage';

vi.mock('@/components/templates/StatsPageTemplate', () => ({
  default: (props: any) => (
    <div data-testid='stats-page'>
      <span data-testid='stat-cards'>{props.statCards?.length ?? 0}</span>
      <span data-testid='charts'>{props.charts?.length ?? 0}</span>
      <span data-testid='tables'>{props.tables?.length ?? 0}</span>
    </div>
  ),
  StatsPageTemplate: (props: any) => (
    <div data-testid='stats-page'>
      <span data-testid='stat-cards'>{props.statCards?.length ?? 0}</span>
      <span data-testid='charts'>{props.charts?.length ?? 0}</span>
      <span data-testid='tables'>{props.tables?.length ?? 0}</span>
    </div>
  ),
}));

vi.mock('@/api/crm', () => ({
  rfmApi: { getSegments: vi.fn(), analyze: vi.fn() },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn() })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/lib/reactQuery', () => ({
  QUERY_KEYS: {
    CRM: Object.assign(() => ['crm'], {
      RFM: ['crm', 'rfm'],
    }),
  },
}));

vi.mock('@/store', () => ({ useNotificationStore: () => ({ addNotification: vi.fn() }) }));
vi.mock('@/utils/logger', () => ({ apiLogger: { error: vi.fn(), info: vi.fn() } }));
vi.mock('@/i18n', () => ({ default: { t: (k: string) => k, exists: () => true } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('CrmRfmPage', () => {
  it('渲染 StatsPageTemplate', () => {
    render(<CrmRfmPage />);
    expect(document.querySelector('[data-testid="stats-page"]')).toBeTruthy();
  });

  it('空数据时仍提供 4 个统计卡', () => {
    render(<CrmRfmPage />);
    expect(document.querySelector('[data-testid="stat-cards"]')?.textContent).toBe('4');
  });
});
