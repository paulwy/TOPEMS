import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import CrmDashboardPage from '@/components/crm/CrmDashboardPage';

vi.mock('@/api/crm', () => ({
  crmAnalyticsApi: { getOverview: vi.fn(), getFunnel: vi.fn(), getForecast: vi.fn() },
}));

vi.mock('@tanstack/react-query', () => ({
  QueryCache: class {},
  MutationCache: class {},
  QueryClient: class {
    constructor() {
      this.defaultOptions = {};
      this.queryCache = { findAll: () => [] };
      this.mutationCache = {};
      this.invalidateQueries = vi.fn();
    }
  },
  useQuery: vi.fn(() => ({ data: {}, isLoading: false })),
}));

vi.mock('@mui/material', () => ({
  Box: ({ children }: any) => <div>{children}</div>,
  MenuItem: ({ children }: any) => <div>{children}</div>,
  Select: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('lucide-react', () => ({
  Target: () => <div>icon</div>,
  TrendingUp: () => <div>icon</div>,
  Users: () => <div>icon</div>,
  DollarSign: () => <div>icon</div>,
  Package: () => <div>icon</div>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('CrmDashboardPage', () => {
  it('渲染页面不报错', () => {
    render(<CrmDashboardPage />);
    expect(document.body).toBeTruthy();
  });
});
