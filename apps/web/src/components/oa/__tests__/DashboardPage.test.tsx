import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import DashboardPage from '@/components/oa/DashboardPage';

vi.mock('@/api/mobile/oa', () => ({
  oaApi: { getOaStats: vi.fn(), listMeetings: vi.fn() },
}));
vi.mock('@/api/erp/core', () => ({
  announcementApi: { list: vi.fn() },
  vehicleApi: { list: vi.fn() },
  documentApi: { list: vi.fn() },
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
  useQuery: vi.fn(() => ({ data: null, isLoading: false })),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('lucide-react', () => ({
  CalendarCheck: () => <div>icon</div>,
  ClipboardList: () => <div>icon</div>,
  Megaphone: () => <div>icon</div>,
  ArrowRight: () => <div>icon</div>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('OaDashboardPage', () => {
  it('渲染页面不报错', () => {
    render(<DashboardPage />);
    expect(document.body).toBeTruthy();
  });
});
