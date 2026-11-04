import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import ScmPriceComparisonPage from '@/pages/scm/ScmPriceComparisonPage';

vi.mock('@/components/templates/CrudPage', () => ({
  default: ({ schema, breadcrumbs }: any) => (
    <div data-testid='crud-page'>
      <div data-testid='schema-name'>{schema?.name}</div>
      <div data-testid='breadcrumbs'>{breadcrumbs?.length}</div>
    </div>
  ),
}));

vi.mock('@/schema/crudPageAdapter', () => ({
  createCrudPageAdapter: vi.fn(() => ({})),
}));

vi.mock('@/schemas/scm', () => ({
  priceComparisonSchema: { name: 'priceComparison' },
}));

vi.mock('@/api/scm', () => ({
  scmApi: { priceComparisons: {} },
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/store/notificationStore', () => ({
  useNotificationStore: () => ({ addNotification: vi.fn() }),
}));

vi.mock('lucide-react', () => ({
  CheckCircle: () => <div>icon</div>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('ScmPriceComparisonPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<ScmPriceComparisonPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe(
      'priceComparison'
    );
  });

  it('渲染 2 个面包屑', () => {
    render(<ScmPriceComparisonPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('2');
  });
});
