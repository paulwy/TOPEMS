import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import BudgetManagementPage from '@/pages/erp/BudgetManagementPage';

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

vi.mock('@/schemas/erp', () => ({
  budgetSchema: { name: 'budget' },
  expenseSchema: { name: 'expense' },
}));

vi.mock('@/api/finance', () => ({
  budgetApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  expenseApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
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
  Wallet: () => <div>icon</div>,
  Receipt: () => <div>icon</div>,
  AlertTriangle: () => <div>icon</div>,
  Clock: () => <div>icon</div>,
  CheckCircle: () => <div>icon</div>,
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('BudgetManagementPage', () => {
  it('渲染页面不报错', () => {
    render(<BudgetManagementPage />);
    expect(document.body).toBeTruthy();
  });
});
