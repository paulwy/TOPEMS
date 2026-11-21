import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import ReturnListPage from '@/components/crm/ReturnListPage';

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

vi.mock('@/schemas/crm', () => ({
  returnSchema: { name: 'return' },
}));

vi.mock('@/api/crm', () => ({
  returnsApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('ReturnListPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<ReturnListPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe('return');
  });

  it('渲染 2 个面包屑', () => {
    render(<ReturnListPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('2');
  });
});
