import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import ScmPurchaseItemPage from '@/pages/scm/ScmPurchaseItemPage';

vi.mock('@/components/templates/CrudPage', () => ({
  default: ({ schema, breadcrumbs }: any) => (
    <div data-testid='crud-page'>
      <div data-testid='schema-name'>{schema?.name}</div>
      <div data-testid='breadcrumbs'>{breadcrumbs?.length}</div>
    </div>
  ),
}));

vi.mock('@/schemas/scm', () => ({
  purchaseItemSchema: { name: 'purchaseItem' },
}));

vi.mock('@/api/scm', () => ({
  scmApi: { purchaseItems: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() } },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('ScmPurchaseItemPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<ScmPurchaseItemPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe('purchaseItem');
  });

  it('渲染 2 个面包屑', () => {
    render(<ScmPurchaseItemPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('2');
  });
});
