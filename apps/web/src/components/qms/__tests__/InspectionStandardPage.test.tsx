import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import InspectionStandardPage from '@/components/qms/InspectionStandardPage';

vi.mock('@/api/qms/inspectionStandard', () => {
  const makeApi = (): any =>
    new Proxy(function () {}, {
      get: (_t, key) => (key === 'then' ? undefined : makeApi()),
      apply: () => Promise.resolve({ success: true, data: [] }),
    });
  return {
    inspectionItemApi: makeApi(),
    inspectionPlanApi: makeApi(),
    samplingPlanApi: makeApi(),
  };
});

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn() })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/store', () => ({ useNotificationStore: () => ({ addNotification: vi.fn() }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('InspectionStandardPage', () => {
  it('空数据下可安全渲染', () => {
    expect(() => render(<InspectionStandardPage />)).not.toThrow();
  });
});
