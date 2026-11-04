import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import InventoryManagementPage from '@/pages/erp/InventoryManagementPage';

vi.mock('@/components/templates/CrudPage', () => ({
  default: ({ schema }: any) => (
    <div data-testid='crud-page'>
      <div data-testid='schema-name'>{schema?.name}</div>
    </div>
  ),
}));

vi.mock('@/components/templates/PageContainer', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/schemas/erp', () => ({
  inventorySchema: { name: 'inventory' },
}));

vi.mock('@/api/erp', () => ({
  erpApi: { inventory: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() } },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: { items: [] } })),
}));

vi.mock('@mui/material', () => ({
  Box: ({ children }: any) => <div>{children}</div>,
  Typography: ({ children }: any) => <span>{children}</span>,
  useTheme: () => ({ palette: { primary: { dark: '#000' }, background: { paper: '#fff' } } }),
}));

vi.mock('lucide-react', () => ({
  Package: () => <div>icon</div>,
  AlertTriangle: () => <div>icon</div>,
  DollarSign: () => <div>icon</div>,
  CheckCircle: () => <div>icon</div>,
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('InventoryManagementPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<InventoryManagementPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe('inventory');
  });
});
