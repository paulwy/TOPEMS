import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import ContactManagementPage from '@/pages/crm/ContactManagementPage';

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

vi.mock('@/schemas/crm/contact', () => ({
  contactSchema: { name: 'contact' },
}));

vi.mock('@/api/crm', () => ({
  crmApi: { contacts: {} },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('ContactManagementPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<ContactManagementPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe('contact');
  });

  it('渲染 3 个面包屑', () => {
    render(<ContactManagementPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('3');
  });
});
