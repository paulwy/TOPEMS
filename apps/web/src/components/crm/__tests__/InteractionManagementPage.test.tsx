import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import InteractionManagementPage from '@/components/crm/InteractionManagementPage';

vi.mock('@/components/templates/CrudPage', () => ({
  default: ({ schema, breadcrumbs }: any) => (
    <div data-testid='crud-page'>
      <div data-testid='schema-name'>{schema?.name}</div>
      <div data-testid='breadcrumbs'>{breadcrumbs?.length}</div>
    </div>
  ),
}));

vi.mock('@/schemas/crm', () => ({
  interactionSchema: { name: 'interaction', actions: ['detail', 'create', 'edit', 'delete'] },
}));

vi.mock('@/api/crm', () => ({
  interactionApi: { list: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('InteractionManagementPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<InteractionManagementPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe('interaction');
  });

  it('渲染 2 个面包屑', () => {
    render(<InteractionManagementPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('2');
  });
});
