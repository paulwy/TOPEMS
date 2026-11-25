import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import DashboardPage from '@/components/plugin/DashboardPage';

vi.mock('@/api/plugin/marketplace', () => ({
  marketplaceApi: { getSummary: vi.fn() },
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
  Puzzle: () => <div>icon</div>,
  Tags: () => <div>icon</div>,
  ArrowRight: () => <div>icon</div>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('PluginDashboardPage', () => {
  it('渲染页面不报错', () => {
    render(<DashboardPage />);
    expect(document.body).toBeTruthy();
  });
});
