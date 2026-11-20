import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import QmsQualityCostPage from '@/pages/qms/QmsQualityCostPage';

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

vi.mock('@/schemas/qms', () => ({
  qualityCostSchema: { name: 'qualityCost' },
}));

vi.mock('@/api/qms', () => ({
  qualityCostApi: {
    listQualityCosts: vi.fn(),
    createQualityCost: vi.fn(),
    updateQualityCost: vi.fn(),
    deleteQualityCost: vi.fn(),
  },
}));

vi.mock('@/theme/tokens', () => ({
  designTokens: {},
}));

vi.mock('@mui/material', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  Box: ({ children }: any) => <div>{children}</div>,
  Typography: ({ children }: any) => <div>{children}</div>,
  useTheme: () => ({}),
}));

vi.mock('lucide-react', () => ({
  DollarSign: () => <div>icon</div>,
  TrendingDown: () => <div>icon</div>,
  AlertTriangle: () => <div>icon</div>,
  CheckCircle: () => <div>icon</div>,
  BarChart3: () => <div>icon</div>,
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('QmsQualityCostPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<QmsQualityCostPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe('qualityCost');
  });

  it('渲染 2 个面包屑', () => {
    render(<QmsQualityCostPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('2');
  });
});
