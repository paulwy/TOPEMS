import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import ReceivablePayablePage from '@/pages/erp/ReceivablePayablePage';

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
  receivableSchema: { name: 'receivable' },
  payableSchema: { name: 'payable' },
}));

vi.mock('@/api/finance', () => ({
  receivableApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  payableApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
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
  useTheme: () => ({ palette: { primary: { main: '#000' } } }),
}));

vi.mock('lucide-react', () => ({
  ArrowUpRight: () => <div>icon</div>,
  ArrowDownRight: () => <div>icon</div>,
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('ReceivablePayablePage', () => {
  it('渲染页面不报错', () => {
    render(<ReceivablePayablePage />);
    expect(document.body).toBeTruthy();
  });
});
