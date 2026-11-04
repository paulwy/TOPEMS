import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import MesQualityPage from '@/pages/mes/MesQualityPage';

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

vi.mock('@/schemas/mes', () => ({
  qualitySchema: { name: 'quality' },
}));

vi.mock('@/api/mes', () => ({
  qualityApi: {
    listInspections: vi.fn(),
    createInspection: vi.fn(),
    updateInspection: vi.fn(),
    deleteInspection: vi.fn(),
  },
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('MesQualityPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<MesQualityPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe('quality');
  });

  it('渲染 2 个面包屑', () => {
    render(<MesQualityPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('2');
  });
});
