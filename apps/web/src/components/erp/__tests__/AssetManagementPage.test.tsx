import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import AssetManagementPage from '@/components/erp/AssetManagementPage';

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

vi.mock('@/schemas/erp/asset', () => ({
  assetSchema: { name: 'asset' },
}));

vi.mock('@/api/erp', () => ({
  assetApi: { list: vi.fn() },
}));

vi.mock('@/lib/reactQuery', () => ({
  QUERY_KEYS: { ERP: { ASSETS: 'assets' } },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: { items: [] } })),
}));

vi.mock('@mui/material', () => ({
  Box: ({ children }: any) => <div>{children}</div>,
  Typography: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('lucide-react', () => ({
  Building2: () => <div>icon</div>,
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('AssetManagementPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<AssetManagementPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe('asset');
  });

  it('渲染 3 个面包屑', () => {
    render(<AssetManagementPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('3');
  });
});
