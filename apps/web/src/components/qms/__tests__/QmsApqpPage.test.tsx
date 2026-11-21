import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import QmsApqpPage from '@/components/qms/QmsApqpPage';

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

vi.mock('@/schemas/qms/apqp', () => ({
  apqpSchema: { name: 'apqp' },
}));

vi.mock('@/api/qms', () => ({
  qmsApi: {
    listApqpProjects: vi.fn(),
    createApqpProject: vi.fn(),
    updateApqpProject: vi.fn(),
    deleteApqpProject: vi.fn(),
  },
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('QmsApqpPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<QmsApqpPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe('apqp');
  });

  it('渲染 2 个面包屑', () => {
    render(<QmsApqpPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('2');
  });
});
