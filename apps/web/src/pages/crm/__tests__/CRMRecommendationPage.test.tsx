import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import CRMRecommendationPage from '@/pages/crm/CRMRecommendationPage';

vi.mock('@/components/templates/CrudPage', () => ({
  default: ({ schema, breadcrumbs }: any) => (
    <div data-testid='crud-page'>
      <div data-testid='schema-name'>{schema?.name}</div>
      <div data-testid='breadcrumbs'>{breadcrumbs?.length}</div>
    </div>
  ),
}));

vi.mock('@/schemas/crm', () => ({
  recommendationSchema: { name: 'recommendation' },
}));

vi.mock('@/api/crm', () => ({
  crmApi: {
    customerRecommendation: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
  crmAnalyticsApi: { getRecommendation: vi.fn() },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn() })),
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key, exists: () => true },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('CRMRecommendationPage', () => {
  it('渲染 CrudPage 并传入 recommendation schema', () => {
    render(<CRMRecommendationPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe(
      'recommendation'
    );
  });

  it('渲染 3 个面包屑', () => {
    render(<CRMRecommendationPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('3');
  });
});
