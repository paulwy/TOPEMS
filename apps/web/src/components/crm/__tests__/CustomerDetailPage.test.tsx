import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import CustomerDetailPage from '@/components/crm/CustomerDetailPage';

vi.mock('@/components/templates', () => ({
  DetailPageTemplate: (props: any) => (
    <div data-testid='detail-page'>
      <span data-testid='tabs'>{props.tabs?.length ?? 0}</span>
    </div>
  ),
}));

vi.mock('@/api/crm', () => ({
  crmApi: {
    customers: { get: vi.fn(), delete: vi.fn(), update: vi.fn() },
    contacts: { list: vi.fn() },
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn() })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'test-id' }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/lib/reactQuery', () => ({
  QUERY_KEYS: {
    CRM: Object.assign(() => ['crm'], {
      CUSTOMER: (id: string) => ['crm', 'customer', id],
    }),
    AD_HOC: new Proxy({}, { get: (_t, key) => [String(key)] }),
  },
}));

vi.mock('@/store', () => ({ useNotificationStore: () => ({ addNotification: vi.fn() }) }));
vi.mock('@/i18n', () => ({ default: { t: (k: string) => k, exists: () => true } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('CustomerDetailPage', () => {
  it('渲染 DetailPageTemplate', () => {
    render(<CustomerDetailPage />);
    expect(document.querySelector('[data-testid="detail-page"]')).toBeTruthy();
  });
});
