import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import MaterialManagementPage from '@/components/erp/MaterialManagementPage';

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

vi.mock('@/schemas/erp/material', () => ({
  materialSchema: { name: 'material' },
}));

vi.mock('@/api/erp', () => ({
  erpApi: { materials: { list: vi.fn() } },
}));

vi.mock('@/lib/reactQuery', () => ({
  QUERY_KEYS: { ERP: { MATERIALS: 'materials' } },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: { items: [] } })),
}));

vi.mock('@mui/material', () => ({
  Box: ({ children }: any) => <div>{children}</div>,
  Typography: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('lucide-react', () => ({
  Package: () => <div>icon</div>,
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('MaterialManagementPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<MaterialManagementPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe('material');
  });

  it('渲染 3 个面包屑', () => {
    render(<MaterialManagementPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('3');
  });
});
