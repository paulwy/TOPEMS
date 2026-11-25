import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import DashboardPage from '@/components/asset/DashboardPage';

vi.mock('@/api/asset/asset', () => ({
  assetApi: { list: vi.fn() },
  fixedAssetApi: { list: vi.fn() },
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
  useQuery: vi.fn(() => ({ data: 0, isLoading: false })),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('lucide-react', () => ({
  Package: () => <div>icon</div>,
  Boxes: () => <div>icon</div>,
  ArrowRight: () => <div>icon</div>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('AssetDashboardPage', () => {
  it('渲染页面不报错', () => {
    render(<DashboardPage />);
    expect(document.body).toBeTruthy();
  });
});
