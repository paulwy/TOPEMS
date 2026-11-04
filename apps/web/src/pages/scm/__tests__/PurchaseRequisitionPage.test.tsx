import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import PurchaseRequisitionPage from '@/pages/scm/PurchaseRequisitionPage';

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
  purchaseRequisitionSchema: { name: 'purchaseRequisition' },
}));

vi.mock('@/schema', () => ({
  EntitySchema: class {},
}));

vi.mock('@/schema/schemaExtensions', () => ({
  SchemaExtensions: class {},
}));

vi.mock('@/api/scm', () => ({
  scmApi: { purchaseRequisitions: {} },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('PurchaseRequisitionPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<PurchaseRequisitionPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe(
      'purchaseRequisition'
    );
  });

  it('渲染 2 个面包屑', () => {
    render(<PurchaseRequisitionPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('2');
  });
});
