import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import QmsNonconformanceRedesignPage from '@/components/qms/QmsNonconformanceRedesignPage';

vi.mock('@/components/redesign', () => {
  const Stub = () => <div data-testid='redesign-stub' />;
  return {
    Badge: Stub,
    Button: Stub,
    Card: Stub,
    Drawer: Stub,
    Input: Stub,
    ListPageTemplate: (props: any) => (
      <div data-testid='list-page'>
        <span data-testid='title'>{props.header?.title}</span>
        <span data-testid='breadcrumbs'>{props.header?.breadcrumbs?.length ?? 0}</span>
      </div>
    ),
    Modal: Stub,
    Pagination: Stub,
    Select: Stub,
    StatTile: Stub,
    Tabs: Stub,
    ToastContainer: Stub,
  };
});

vi.mock('@/api/qms/issue', () => {
  const makeApi = (): any =>
    new Proxy(function () {}, {
      get: (_t, key) => (key === 'then' ? undefined : makeApi()),
      apply: () => Promise.resolve({ success: true, data: [] }),
    });
  return { issueApi: makeApi() };
});

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn() })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/store', () => ({ useNotificationStore: () => ({ addNotification: vi.fn() }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('QmsNonconformanceRedesignPage', () => {
  it('渲染 ListPageTemplate', () => {
    render(<QmsNonconformanceRedesignPage />);
    expect(document.querySelector('[data-testid="list-page"]')).toBeTruthy();
  });
});
