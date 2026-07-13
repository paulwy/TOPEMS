import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { navigationRegistryV2 } from '@/lib/navigation/NavigationRegistryV2';
import { coreModuleNavConfigs } from '@/lib/navigation/modules';
import { useAuthStore } from '@/store';
import { ERP_PATHS } from '@/modules/erp/config';

vi.mock('@/store', () => ({
  useAuthStore: vi.fn(),
}));

const mockUseAuthStore = useAuthStore as vi.Mock;

describe('Navigation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      user: {
        roles: ['admin'],
        permissions: ['iam:read', 'workflow:read', 'hrm:read', 'document:read', 'notification:read'],
      },
    });
    coreModuleNavConfigs.forEach(config => {
      navigationRegistryV2.registerModule(config);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should register all core modules', () => {
    const modules = navigationRegistryV2.getAllModules();
    expect(modules.length).toBeGreaterThan(0);
    expect(modules.some(m => m.code === 'iam')).toBe(true);
    expect(modules.some(m => m.code === 'workflow')).toBe(true);
    expect(modules.some(m => m.code === 'notification')).toBe(true);
    expect(modules.some(m => m.code === 'doc')).toBe(true);
    expect(modules.some(m => m.code === 'hrm')).toBe(true);
    expect(modules.some(m => m.code === 'finance')).toBe(true);
    expect(modules.some(m => m.code === 'crm')).toBe(true);
    expect(modules.some(m => m.code === 'mes')).toBe(true);
    expect(modules.some(m => m.code === 'qms')).toBe(true);
    expect(modules.some(m => m.code === 'scm')).toBe(true);
    expect(modules.some(m => m.code === 'erp')).toBe(true);
    expect(modules.some(m => m.code === 'wms')).toBe(true);
    expect(modules.some(m => m.code === 'pm')).toBe(true);
  });

  it('should render navigation for ERP module', () => {
    render(
      <MemoryRouter initialEntries={[ERP_PATHS.dashboard]}>
        <Routes>
          <Route path={ERP_PATHS.dashboard} element={<div>ERP Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('ERP Dashboard')).toBeInTheDocument();
  });
});