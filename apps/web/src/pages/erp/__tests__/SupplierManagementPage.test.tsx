import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import SupplierManagementPage from '@/pages/erp/SupplierManagementPage';

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

vi.mock('@/schemas/erp/supplier', () => ({
  supplierSchema: { name: 'supplier' },
}));

vi.mock('@/api/erp', () => ({
  erpApi: { suppliers: {} },
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('SupplierManagementPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<SupplierManagementPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe('supplier');
  });

  it('渲染 3 个面包屑', () => {
    render(<SupplierManagementPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('3');
  });
});
