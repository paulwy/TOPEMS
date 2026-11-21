import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import QmsCorrectiveActionPage from '@/components/qms/QmsCorrectiveActionPage';

vi.mock('@/components/templates/CrudPage', () => ({
  default: ({ schema, breadcrumbs }: any) => (
    <div data-testid='crud-page'>
      <div data-testid='schema-name'>{schema?.name}</div>
      <div data-testid='breadcrumbs'>{breadcrumbs?.length}</div>
    </div>
  ),
}));

vi.mock('@/schemas/qms', () => ({
  correctiveActionSchema: { name: 'correctiveAction' },
}));

vi.mock('@/api/qms', () => ({
  correctiveActionApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('QmsCorrectiveActionPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<QmsCorrectiveActionPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe(
      'correctiveAction'
    );
  });

  it('渲染 2 个面包屑', () => {
    render(<QmsCorrectiveActionPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('2');
  });
});
