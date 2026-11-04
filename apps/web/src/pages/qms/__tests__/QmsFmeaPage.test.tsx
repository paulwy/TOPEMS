import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import QmsFmeaPage from '@/pages/qms/QmsFmeaPage';

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

vi.mock('@/schemas/qms', () => ({
  fmeaSchema: { name: 'fmea' },
}));

vi.mock('@/api/qms', () => ({
  fmeaApi: {
    listFmeaAnalyses: vi.fn(),
    createFmeaAnalysis: vi.fn(),
    updateFmeaAnalysis: vi.fn(),
    deleteFmeaAnalysis: vi.fn(),
  },
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('QmsFmeaPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<QmsFmeaPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe('fmea');
  });

  it('渲染 2 个面包屑', () => {
    render(<QmsFmeaPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('2');
  });
});
