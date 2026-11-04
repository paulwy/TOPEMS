import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import SupplierAdmissionPage from '@/pages/scm/SupplierAdmissionPage';

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

vi.mock('@/schemas/scm', () => ({
  supplierAdmissionSchema: { name: 'supplierAdmission' },
}));

vi.mock('@/api/scm', () => ({
  scmApi: { supplierAdmissions: {} },
}));

vi.mock('@topems/shared-components', () => ({
  ConfirmDialog: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(() => ({ mutate: vi.fn() })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/store', () => ({
  useNotificationStore: () => ({ addNotification: vi.fn() }),
}));

vi.mock('@/utils/logger', () => ({
  apiLogger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/reactQuery', () => ({
  QUERY_KEYS: {},
}));

vi.mock('lucide-react', () => ({
  Send: () => <div>icon</div>,
  Check: () => <div>icon</div>,
  XCircle: () => <div>icon</div>,
  UserCheck: () => <div>icon</div>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('SupplierAdmissionPage', () => {
  it('渲染 CrudPage 并传入正确的 schema', () => {
    render(<SupplierAdmissionPage />);
    expect(document.querySelector('[data-testid="schema-name"]')?.textContent).toBe(
      'supplierAdmission'
    );
  });
});
