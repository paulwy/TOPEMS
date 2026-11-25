import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import DashboardPage from '@/components/iam/DashboardPage';

vi.mock('@/api/iam/user', () => ({
  userApi: { listUsers: vi.fn() },
}));
vi.mock('@/api/iam/role', () => ({
  roleApi: { listRoles: vi.fn() },
}));
vi.mock('@/api/iam/permission', () => ({
  permissionApi: { listPermissions: vi.fn() },
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
  Users: () => <div>icon</div>,
  ShieldCheck: () => <div>icon</div>,
  KeyRound: () => <div>icon</div>,
  ArrowRight: () => <div>icon</div>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('IamDashboardPage', () => {
  it('渲染页面不报错', () => {
    render(<DashboardPage />);
    expect(document.body).toBeTruthy();
  });
});
