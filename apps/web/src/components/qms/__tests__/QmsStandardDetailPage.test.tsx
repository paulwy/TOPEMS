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

// 部分 mock：保留真实导出（Navigate 等），只替换页面用到的 hook。
// 全量替换会导致 report/config.ts 里的 createElement(Navigate, ...) 取不到组件。
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ id: 'test-id' }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@/store', () => ({ useNotificationStore: () => ({ addNotification: vi.fn() }) }));
vi.mock('@/i18n', () => ({ default: { t: (k: string) => k, exists: () => true } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('QmsStandardDetailPage', () => {
  it('空数据下可安全渲染', () => {
    expect(() => render(<QmsStandardDetailPage />)).not.toThrow();
  });
});
