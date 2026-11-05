import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import CRMCustomerSegmentationPage from '@/pages/crm/CRMCustomerSegmentationPage';

vi.mock('@/components/templates/CrudPage', () => ({
  default: ({ schema, breadcrumbs }: any) => (
    <div data-testid='crud-page'>
      <div data-testid='schema-name'>{schema?.name}</div>
      <div data-testid='breadcrumbs'>{breadcrumbs?.length}</div>
    </div>
  ),
}));

vi.mock('@/schemas/crm', () => ({
  customerSegmentationSchema: { name: 'customerSegmentation' },
}));

vi.mock('@/api/crm', () => ({
  crmApi: {
    customerSegmentation: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
  crmAnalyticsApi: { getSegmentation: vi.fn() },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn() })),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/modules/crm/config', () => ({
  CRM_PATHS: { root: '/crm' },
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key, exists: () => true },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('CRMCustomerSegmentationPage', () => {
  it('渲染 CrudPage 并传入 customerSegmentation schema', () => {
    render(<CRMCustomerSegmentationPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe(
      'customerSegmentation'
    );
  });

  it('渲染 3 个面包屑', () => {
    render(<CRMCustomerSegmentationPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('3');
  });
});
