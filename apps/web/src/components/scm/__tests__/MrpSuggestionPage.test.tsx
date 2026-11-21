import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import MrpSuggestionPage from '@/components/scm/MrpSuggestionPage';

vi.mock('@/components/templates/CrudPage', () => ({
  default: ({ schema, breadcrumbs }: any) => (
    <div data-testid='crud-page'>
      <div data-testid='schema-name'>{schema?.name}</div>
      <div data-testid='breadcrumbs'>{breadcrumbs?.length}</div>
    </div>
  ),
}));

vi.mock('@/schemas/scm', () => ({
  mrpSuggestionSchema: { name: 'mrpSuggestion' },
  mrpMaterialSummarySchema: { name: 'mrpMaterialSummary' },
}));

vi.mock('@/api/scm', () => ({
  scmApi: {
    mrpSuggestions: { list: vi.fn(), accept: vi.fn(), reject: vi.fn() },
    mrpMaterialSummary: { list: vi.fn() },
  },
}));

vi.mock('@/store', () => ({
  useNotificationStore: () => ({ addNotification: vi.fn() }),
}));

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock('@topems/shared-components', () => ({
  ConfirmDialog: () => <div data-testid='confirm-dialog' />,
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key, exists: () => true },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('MrpSuggestionPage', () => {
  it('渲染 CrudPage 并传入 mrpSuggestion schema', () => {
    render(<MrpSuggestionPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe(
      'mrpSuggestion'
    );
  });

  it('渲染 2 个面包屑', () => {
    render(<MrpSuggestionPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('2');
  });
});
