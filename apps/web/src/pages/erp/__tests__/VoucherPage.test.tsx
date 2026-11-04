import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import VoucherPage from '@/pages/erp/VoucherPage';

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

vi.mock('@/schemas/erp/voucher', () => ({
  voucherSchema: { name: 'voucher' },
}));

vi.mock('@/api/finance', () => ({
  voucherApi: { list: vi.fn() },
}));

vi.mock('@/schema', () => ({
  EntitySchema: class {},
}));

vi.mock('@/schema/schemaExtensions', () => ({
  SchemaExtensions: class {},
}));

vi.mock('@/lib/reactQuery', () => ({
  QUERY_KEYS: { AD_HOC: { ERP_VOUCHER_STATS_BASE: 'voucherStats' } },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: { total: 0, draft: 0, submitted: 0, approved: 0, posted: 0 },
    isPending: false,
  })),
}));

vi.mock('@mui/material', () => ({
  Box: ({ children }: any) => <div>{children}</div>,
  Typography: ({ children }: any) => <span>{children}</span>,
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('lucide-react', () => ({
  FileText: () => <div>icon</div>,
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('VoucherPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<VoucherPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe('voucher');
  });

  it('渲染 3 个面包屑', () => {
    render(<VoucherPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('3');
  });
});
