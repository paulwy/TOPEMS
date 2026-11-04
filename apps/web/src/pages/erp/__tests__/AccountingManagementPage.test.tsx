import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import AccountingManagementPage from '@/pages/erp/AccountingManagementPage';

vi.mock('@/components/templates/CrudPage', () => ({
  default: ({ schema }: any) => (
    <div data-testid='crud-page'>
      <div data-testid='schema-name'>{schema?.name}</div>
    </div>
  ),
}));

vi.mock('@/components/common', () => ({
  PageContainer: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/schemas/finance', () => ({
  accountingSubjectSchema: { name: 'accountingSubject' },
  openingBalanceSchema: { name: 'openingBalance' },
}));

vi.mock('@/api/finance', () => ({
  accountingSubjectApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  openingBalanceApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

vi.mock('@tanstack/react-query', () => ({
  QueryCache: class {},
  MutationCache: class {},
  QueryClient: class {
    constructor() {
      this.defaultOptions = {};
      this.queryCache = { findAll: () => [] };
      this.mutationCache = {};
      this.invalidateQueries = vi.fn();
      this.getQueryData = vi.fn();
      this.setQueryData = vi.fn();
      this.refetchQueries = vi.fn();
    }
  },
  useQuery: vi.fn(() => ({ data: { items: [] } })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isLoading: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@mui/material', () => ({
  Box: ({ children }: any) => <div>{children}</div>,
  Tabs: ({ children }: any) => <div>{children}</div>,
  Tab: () => <div>tab</div>,
  Button: ({ children }: any) => <button>{children}</button>,
  useTheme: () => ({ palette: { primary: { main: '#000' } } }),
}));

vi.mock('lucide-react', () => ({
  FileSpreadsheet: () => <div>icon</div>,
  RefreshCw: () => <div>icon</div>,
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('AccountingManagementPage', () => {
  it('渲染页面不报错', () => {
    render(<AccountingManagementPage />);
    expect(document.body).toBeTruthy();
  });
});
