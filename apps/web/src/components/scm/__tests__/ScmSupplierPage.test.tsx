import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import ScmSupplierPage from '@/components/scm/ScmSupplierPage';

vi.mock('@/components/templates/CrudPage', () => ({
  default: ({ schema, breadcrumbs }: any) => (
    <div data-testid='crud-page'>
      <div data-testid='schema-name'>{schema?.name}</div>
      <div data-testid='breadcrumbs'>{breadcrumbs?.length}</div>
    </div>
  ),
}));

vi.mock('@/schema-dsl/crudPageAdapter', () => ({
  createCrudPageAdapter: vi.fn(() => ({})),
}));

vi.mock('@/schemas/scm', () => ({
  supplierSchema: { name: 'supplier' },
}));

vi.mock('@/api/scm', () => ({
  scmApi: { suppliers: {} },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('ScmSupplierPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<ScmSupplierPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe('supplier');
  });

  it('渲染 2 个面包屑', () => {
    render(<ScmSupplierPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('2');
  });
});
