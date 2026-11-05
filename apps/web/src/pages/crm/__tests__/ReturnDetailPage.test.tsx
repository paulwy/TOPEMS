import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import ReturnDetailPage from '@/pages/crm/ReturnDetailPage';

vi.mock('@/components/templates', () => ({
  DetailPageTemplate: (props: any) => (
    <div data-testid='detail-page'>
      <span data-testid='sections'>{props.sections?.length ?? 0}</span>
    </div>
  ),
}));

vi.mock('@/api/crm', () => ({
  crmApi: {
    returns: {
      get: vi.fn(),
      listItems: vi.fn(),
      getFinanceStatus: vi.fn(),
      getInventoryStatus: vi.fn(),
      delete: vi.fn(),
      approve: vi.fn(),
      reject: vi.fn(),
      receive: vi.fn(),
      complete: vi.fn(),
      cancel: vi.fn(),
    },
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
}));

vi.mock('@/lib/reactQuery', () => ({
  QUERY_KEYS: {
    CRM: Object.assign(() => ['crm'], {
      RETURN: (id: string) => ['crm', 'return', id],
      RETURN_ITEMS: (id: string) => ['crm', 'return-items', id],
      RETURN_FINANCE_STATUS: (id: string) => ['crm', 'return-finance', id],
      RETURN_INVENTORY_STATUS: (id: string) => ['crm', 'return-inventory', id],
      CUSTOMERS: ['crm', 'customers'],
    }),
  },
}));

vi.mock('@/store', () => ({ useNotificationStore: () => ({ addNotification: vi.fn() }) }));
vi.mock('@/i18n', () => ({ default: { t: (k: string) => k, exists: () => true } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('ReturnDetailPage', () => {
  it('渲染 DetailPageTemplate', () => {
    render(<ReturnDetailPage />);
    expect(document.querySelector('[data-testid="detail-page"]')).toBeTruthy();
  });
});
