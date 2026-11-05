import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import QmsIssueDetailPage from '@/pages/qms/QmsIssueDetailPage';

vi.mock('@/components/templates', () => ({
  DetailPageTemplate: (props: any) => (
    <div data-testid='detail-page'>
      <span data-testid='tabs'>{props.tabs?.length ?? 0}</span>
    </div>
  ),
}));

vi.mock('@/api/qms/issue', () => {
  const makeApi = (): any =>
    new Proxy(function () {}, {
      get: (_t, key) => (key === 'then' ? undefined : makeApi()),
      apply: () => Promise.resolve({ success: true, data: null }),
    });
  return { issueApi: makeApi() };
});
vi.mock('@/api/qms/improvement', () => {
  const makeApi = (): any =>
    new Proxy(function () {}, {
      get: (_t, key) => (key === 'then' ? undefined : makeApi()),
      apply: () => Promise.resolve({ success: true, data: null }),
    });
  return { improvementApi: makeApi() };
});
vi.mock('@/api/qms/eightD', () => {
  const makeApi = (): any =>
    new Proxy(function () {}, {
      get: (_t, key) => (key === 'then' ? undefined : makeApi()),
      apply: () => Promise.resolve({ success: true, data: null }),
    });
  return { eightDApi: makeApi() };
});

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'test-id' }),
  useNavigate: () => vi.fn(),
}));

vi.mock('@/store', () => ({ useNotificationStore: () => ({ addNotification: vi.fn() }) }));
vi.mock('@/i18n', () => ({ default: { t: (k: string) => k, exists: () => true } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('QmsIssueDetailPage', () => {
  it('空数据下可安全渲染', () => {
    expect(() => render(<QmsIssueDetailPage />)).not.toThrow();
  });
});
