import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import CRMSalesFunnelPage from '@/pages/crm/CRMSalesFunnelPage';

vi.mock('@/components/templates', () => ({
  StatsPageTemplate: (props: any) => (
    <div data-testid='stats-page'>
      <span data-testid='stat-cards'>{props.statCards?.length ?? 0}</span>
      <span data-testid='charts'>{props.charts?.length ?? 0}</span>
    </div>
  ),
}));
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

vi.mock('@/api/crm', () => ({
  crmAnalyticsApi: { getFunnel: vi.fn() },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn() })),
}));

vi.mock('@/store', () => ({ useNotificationStore: () => ({ addNotification: vi.fn() }) }));
vi.mock('@/i18n', () => ({ default: { t: (k: string) => k, exists: () => true } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('CRMSalesFunnelPage', () => {
  it('渲染 StatsPageTemplate', () => {
    render(<CRMSalesFunnelPage />);
    expect(document.querySelector('[data-testid="stats-page"]')).toBeTruthy();
  });

  it('空数据时仍生成统计卡与图表配置', () => {
    render(<CRMSalesFunnelPage />);
    expect(
      Number(document.querySelector('[data-testid="stat-cards"]')?.textContent)
    ).toBeGreaterThan(0);
    expect(Number(document.querySelector('[data-testid="charts"]')?.textContent)).toBeGreaterThan(
      0
    );
  });
});
