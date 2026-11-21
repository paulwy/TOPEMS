import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import ErpInventoryRedesignPage from '@/components/erp/ErpInventoryRedesignPage';

vi.mock('@/components/templates', () => {
  const ListPage = (props: any) => (
    <div data-testid='list-page'>
      <span data-testid='title'>{props.header?.title}</span>
      <span data-testid='breadcrumbs'>{props.header?.breadcrumbs?.length ?? 0}</span>
    </div>
  );
  return { ListPageTemplate: ListPage, StatsPageTemplate: () => <div /> };
});

vi.mock('@/api/erp/core/inventory', () => {
  const makeApi = (): any =>
    new Proxy(function () {}, {
      get: (_t, key) => (key === 'then' ? undefined : makeApi()),
      apply: () => Promise.resolve({ success: true, data: [], total: 0 }),
    });
  return { inventoryApi: makeApi() };
});

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn() })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('@/store', () => ({ useNotificationStore: () => ({ addNotification: vi.fn() }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('ErpInventoryRedesignPage', () => {
  it('空数据下可安全渲染', () => {
    expect(() => render(<ErpInventoryRedesignPage />)).not.toThrow();
  });
});
