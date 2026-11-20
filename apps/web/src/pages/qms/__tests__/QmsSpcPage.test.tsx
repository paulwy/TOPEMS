import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import QmsSpcPage from '@/pages/qms/QmsSpcPage';

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
  spcSchema: { name: 'spc' },
}));

vi.mock('@/api/qms', () => ({
  spcApi: {
    listSpcCharts: vi.fn(),
    createSpcChart: vi.fn(),
    updateSpcChart: vi.fn(),
    deleteSpcChart: vi.fn(),
  },
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('QmsSpcPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<QmsSpcPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe('spc');
  });

  it('渲染 2 个面包屑', () => {
    render(<QmsSpcPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('2');
  });
});
