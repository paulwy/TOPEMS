import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import QmsFmeaDetailPage from '@/pages/qms/QmsFmeaDetailPage';

vi.mock('@/components/templates', () => ({
  DetailPageTemplate: (props: any) => (
    <div data-testid='detail-page'>
      <span data-testid='tabs'>{props.tabs?.length ?? 0}</span>
    </div>
  ),
}));

vi.mock('@/api/qms/fmea', () => {
  const makeApi = (): any =>
    new Proxy(function () {}, {
      get: (_t, key) => (key === 'then' ? undefined : makeApi()),
      apply: () => Promise.resolve({ success: true, data: null }),
    });
  return { fmeaApi: makeApi() };
});

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'test-id' }),
  useNavigate: () => vi.fn(),
}));

vi.mock('@/store', () => ({ useNotificationStore: () => ({ addNotification: vi.fn() }) }));
vi.mock('@/i18n', () => ({ default: { t: (k: string) => k, exists: () => true } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('QmsFmeaDetailPage', () => {
  it('空数据下可安全渲染', () => {
    expect(() => render(<QmsFmeaDetailPage />)).not.toThrow();
  });
});
