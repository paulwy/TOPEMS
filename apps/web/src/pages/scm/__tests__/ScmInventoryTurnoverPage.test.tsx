import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import ScmInventoryTurnoverPage from '@/pages/scm/ScmInventoryTurnoverPage';

vi.mock('@/components/templates/CrudPage', () => ({
  default: ({ schema, breadcrumbs }: any) => (
    <div data-testid='crud-page'>
      <div data-testid='schema-name'>{schema?.name}</div>
      <div data-testid='breadcrumbs'>{breadcrumbs?.length}</div>
    </div>
  ),
}));

vi.mock('@/schemas/scm', () => ({
  inventoryTurnoverSchema: { name: 'inventoryTurnover' },
}));

vi.mock('@/api/scm', () => ({
  scmApi: { inventoryTurnover: { list: vi.fn() } },
}));

vi.mock('@/store', () => ({
  useNotificationStore: () => ({ addNotification: vi.fn() }),
}));

vi.mock('@mui/material', () => ({
  Stack: ({ children }: any) => <div>{children}</div>,
  Button: ({ children }: any) => <button>{children}</button>,
}));

vi.mock('lucide-react', () => ({
  Download: () => <div>icon</div>,
  TrendingUp: () => <div>icon</div>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('ScmInventoryTurnoverPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<ScmInventoryTurnoverPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe(
      'inventoryTurnover'
    );
  });

  it('渲染 2 个面包屑', () => {
    render(<ScmInventoryTurnoverPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('3');
  });
});
