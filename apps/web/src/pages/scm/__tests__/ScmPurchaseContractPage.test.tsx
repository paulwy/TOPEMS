import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import ScmPurchaseContractPage from '@/pages/scm/ScmPurchaseContractPage';

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

vi.mock('@/schemas/scm', () => ({
  purchaseContractWizardSchema: { name: 'purchaseContractWizard' },
}));

vi.mock('@/api/scm', () => ({
  scmApi: { purchaseContracts: {} },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('ScmPurchaseContractPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<ScmPurchaseContractPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe(
      'purchaseContractWizard'
    );
  });

  it('渲染 2 个面包屑', () => {
    render(<ScmPurchaseContractPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('2');
  });
});
