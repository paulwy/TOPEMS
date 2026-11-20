import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import BankAccountPage from '@/pages/erp/BankAccountPage';

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

vi.mock('@/schemas/erp/bankAccount', () => ({
  bankAccountSchema: { name: 'bankAccount' },
}));

vi.mock('@/api/erp', () => ({
  bankAccountApi: { list: vi.fn() },
}));

vi.mock('@/lib/reactQuery', () => ({
  QUERY_KEYS: { ERP: { BANK_ACCOUNTS: 'bankAccounts' } },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: { items: [] } })),
}));

vi.mock('@mui/material', () => ({
  Box: ({ children }: any) => <div>{children}</div>,
  Typography: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('lucide-react', () => ({
  Landmark: () => <div>icon</div>,
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('BankAccountPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<BankAccountPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe('bankAccount');
  });

  it('渲染 3 个面包屑', () => {
    render(<BankAccountPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('3');
  });
});
