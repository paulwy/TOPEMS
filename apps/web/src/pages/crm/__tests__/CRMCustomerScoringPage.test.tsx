import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import CRMCustomerScoringPage from '@/pages/crm/CRMCustomerScoringPage';

vi.mock('@/components/templates/CrudPage', () => ({
  default: ({ schema, breadcrumbs }: any) => (
    <div data-testid='crud-page'>
      <div data-testid='schema-name'>{schema?.name}</div>
      <div data-testid='breadcrumbs'>{breadcrumbs?.length}</div>
    </div>
  ),
}));

vi.mock('@/schemas/crm', () => ({
  customerScoringSchema: { name: 'customerScoring' },
}));

vi.mock('@/api/crm', () => ({
  crmApi: {
    customerScoring: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    customers: { list: vi.fn() },
  },
  crmAnalyticsApi: { getScoring: vi.fn() },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn() })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/store', () => ({
  useNotificationStore: () => ({ addNotification: vi.fn() }),
}));

vi.mock('@/utils/logger', () => ({
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/module-configs/crm/config', () => ({
  CRM_PATHS: { root: '/crm' },
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key, exists: () => true },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('CRMCustomerScoringPage', () => {
  it('渲染 CrudPage 并传入 customerScoring schema', () => {
    render(<CRMCustomerScoringPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe(
      'customerScoring'
    );
  });

  it('渲染 3 个面包屑', () => {
    render(<CRMCustomerScoringPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('3');
  });
});
