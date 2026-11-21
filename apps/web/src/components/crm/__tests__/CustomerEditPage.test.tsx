import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import CustomerEditPage from '@/components/crm/CustomerEditPage';

vi.mock('@/components/templates/FormPageTemplate', () => ({
  default: (props: any) => (
    <div data-testid='form-page'>
      <span data-testid='sections'>{props.sections?.length ?? 0}</span>
    </div>
  ),
}));

vi.mock('@/api/crm', () => ({
  customerApi: { get: vi.fn(), update: vi.fn() },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn() })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/lib/reactQuery', () => ({
  QUERY_KEYS: {
    CRM: Object.assign(() => ['crm'], {
      CUSTOMER: (id: string) => ['crm', 'customer', id],
    }),
  },
  CACHE_DURATIONS: { MEDIUM: 30000, LONG: 60000 },
}));

vi.mock('@/hooks/useNotification', () => ({
  useNotification: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
  apiLogger: { error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/module-configs/crm/config', () => ({ CRM_PATHS: { customers: '/crm/customers' } }));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'test-id' }),
  useNavigate: () => vi.fn(),
}));

vi.mock('@/i18n', () => ({ default: { t: (k: string) => k, exists: () => true } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('CustomerEditPage', () => {
  it('渲染 FormPageTemplate 并传入表单分区', () => {
    render(<CustomerEditPage />);
    expect(document.querySelector('[data-testid="form-page"]')).toBeTruthy();
    expect(Number(document.querySelector('[data-testid="sections"]')?.textContent)).toBeGreaterThan(
      0
    );
  });
});
