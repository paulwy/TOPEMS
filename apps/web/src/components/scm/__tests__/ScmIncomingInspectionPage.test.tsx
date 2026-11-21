import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import ScmIncomingInspectionPage from '@/components/scm/ScmIncomingInspectionPage';

vi.mock('@/components/templates/CrudPage', () => ({
  default: ({ schema, breadcrumbs }: any) => (
    <div data-testid='crud-page'>
      <div data-testid='schema-name'>{schema?.name}</div>
      <div data-testid='breadcrumbs'>{breadcrumbs?.length}</div>
    </div>
  ),
}));

vi.mock('@/schemas/scm', () => ({
  incomingInspectionSchema: { name: 'incomingInspection' },
}));

vi.mock('@/api/scm', () => ({
  scmApi: {
    incomingInspections: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/store/notificationStore', () => ({
  useNotificationStore: () => ({ addNotification: vi.fn() }),
}));

vi.mock('lucide-react', () => ({
  CheckCircle: () => <div>icon</div>,
  XCircle: () => <div>icon</div>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('ScmIncomingInspectionPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<ScmIncomingInspectionPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe(
      'incomingInspection'
    );
  });

  it('渲染 2 个面包屑', () => {
    render(<ScmIncomingInspectionPage />);
    expect(document.querySelector('[data-testid="breadcrumbs"]')?.textContent).toBe('2');
  });
});
