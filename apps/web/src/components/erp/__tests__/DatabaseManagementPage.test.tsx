import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import DatabaseManagementPage from '@/components/erp/DatabaseManagementPage';

vi.mock('@/components/templates', () => {
  const ListPage = (props: any) => (
    <div data-testid='list-page'>
      <span data-testid='title'>{props.header?.title}</span>
      <span data-testid='breadcrumbs'>{props.header?.breadcrumbs?.length ?? 0}</span>
    </div>
  );
  return { ListPageTemplate: ListPage, StatsPageTemplate: () => <div /> };
});

vi.mock('@/api/erp/database', () => {
  const makeApi = (): any =>
    new Proxy(function () {}, {
      get: (_t, key) => (key === 'then' ? undefined : makeApi()),
      apply: () => Promise.resolve({ success: true, data: [], total: 0 }),
    });
  return { databaseApi: makeApi() };
});

vi.mock('@/lib/reactQuery', () => {
  const keyProxy: any = new Proxy(
    function () {
      return ['k'];
    },
    {
      get: (t, p) => {
        if (p === 'then') return undefined;
        if (p === Symbol.iterator)
          return function* () {
            yield 'k';
          };
        return keyProxy;
      },
      apply: () => ['k'],
    }
  );
  return { QUERY_KEYS: keyProxy };
});

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn() })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock('@/store', () => ({ useNotificationStore: () => ({ addNotification: vi.fn() }) }));
vi.mock('@/i18n', () => ({ default: { t: (k: string) => k, exists: () => true } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('DatabaseManagementPage', () => {
  it('渲染 ListPageTemplate', () => {
    render(<DatabaseManagementPage />);
    expect(document.querySelector('[data-testid="list-page"]')).toBeTruthy();
  });
});
