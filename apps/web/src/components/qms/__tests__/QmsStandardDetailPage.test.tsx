import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import QmsStandardDetailPage from '@/components/qms/QmsStandardDetailPage';

vi.mock('@/components/templates', () => ({
  DetailPageTemplate: (props: any) => (
    <div data-testid='detail-page'>
      <span data-testid='tabs'>{props.tabs?.length ?? 0}</span>
    </div>
  ),
}));

vi.mock('@/api/qms', () => {
  const makeApi = (): any =>
    new Proxy(function () {}, {
      get: (_t, key) => (key === 'then' ? undefined : makeApi()),
      apply: () => Promise.resolve({ success: true, data: null }),
    });
  return { qmsApi: makeApi() };
});

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn() })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/lib/reactQuery', () => ({
  QUERY_KEYS: {
    QMS: Object.assign(() => ['qms'], {
      STANDARD: (id: string) => ['qms', 'standard', id],
      STANDARD_REVISIONS: (id: string) => ['qms', 'standard-revisions', id],
      STANDARDS: ['qms', 'standards'],
    }),
  },
  CACHE_DURATIONS: { SHORT: 5000, MEDIUM: 30000, LONG: 60000 },
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'test-id' }),
  useNavigate: () => vi.fn(),
}));

vi.mock('@/store', () => ({ useNotificationStore: () => ({ addNotification: vi.fn() }) }));
vi.mock('@/i18n', () => ({ default: { t: (k: string) => k, exists: () => true } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('QmsStandardDetailPage', () => {
  it('空数据下可安全渲染', () => {
    expect(() => render(<QmsStandardDetailPage />)).not.toThrow();
  });
});
