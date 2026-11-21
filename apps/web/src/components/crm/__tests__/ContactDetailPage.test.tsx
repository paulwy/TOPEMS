import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import ContactDetailPage from '@/components/crm/ContactDetailPage';

vi.mock('@/components/templates', () => ({
  DetailPageTemplate: (props: any) => (
    <div data-testid='detail-page'>
      <span data-testid='sections'>{props.sections?.length ?? 0}</span>
    </div>
  ),
}));

vi.mock('@/api/crm', () => ({
  crmApi: {
    contacts: { get: vi.fn(), delete: vi.fn(), update: vi.fn() },
    customers: { list: vi.fn() },
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
      CONTACT: (id: string) => ['crm', 'contact', id],
      CUSTOMER: (id: string) => ['crm', 'customer', id],
      CONTACTS: ['crm', 'contacts'],
    }),
  },
}));

vi.mock('@/store', () => ({ useNotificationStore: () => ({ addNotification: vi.fn() }) }));
vi.mock('@/i18n', () => ({ default: { t: (k: string) => k, exists: () => true } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('ContactDetailPage', () => {
  it('渲染 DetailPageTemplate', () => {
    render(<ContactDetailPage />);
    expect(document.querySelector('[data-testid="detail-page"]')).toBeTruthy();
  });
});
