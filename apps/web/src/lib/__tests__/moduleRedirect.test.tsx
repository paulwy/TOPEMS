import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { ModRootRedirect } from '../moduleRedirect';

// ── Mock external dependencies ─────────────────────────────────────────────
const mockLoadModuleConfig = vi.hoisted(() => vi.fn());

vi.mock('@/routes/v2', () => ({
  loadModuleConfig: mockLoadModuleConfig,
}));

vi.mock('@/components/PageLoader', () => ({
  default: () => <div data-testid='page-loader'>Loading...</div>,
}));

vi.mock('@/pages/shared/NotFoundPage', () => ({
  default: () => <div data-testid='not-found'>404 Not Found</div>,
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock i18n (already in setup-core but explicit for clarity)
vi.mock('@/i18n', () => ({
  default: { t: (x: string) => x },
}));

function renderWithRoute(mod?: string) {
  const path = mod ? `/${mod}` : '/';
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path='/:mod'
          element={<ModRootRedirect />}
        />
        <Route
          path='/'
          element={<div>Home</div>}
        />
        <Route
          path='/crm/dashboard'
          element={<div>Crm Dashboard</div>}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ModRootRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show PageLoader while loading', () => {
    // Never resolves
    mockLoadModuleConfig.mockReturnValue(new Promise(() => {}));
    renderWithRoute('crm');
    expect(screen.getByTestId('page-loader')).toBeInTheDocument();
  });

  it('should redirect to first route when module config resolves with routes', async () => {
    mockLoadModuleConfig.mockResolvedValue({
      routes: [{ path: '/crm/dashboard' }],
    });
    renderWithRoute('crm');
    await waitFor(() => {
      expect(screen.getByText('Crm Dashboard')).toBeInTheDocument();
    });
  });

  it('should render NotFoundPage when no mod param is present', () => {
    renderWithRoute();
    // With no :mod param, the route "/" renders "Home"
    // But to test the no-mod case directly, we render ModRootRedirect at "/"
    // Actually, let's test it differently — the component uses useParams which returns { mod: undefined }
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path='/'
            element={<ModRootRedirect />}
          />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('not-found')).toBeInTheDocument();
  });

  it('should render NotFoundPage when loadModuleConfig rejects', async () => {
    mockLoadModuleConfig.mockRejectedValue(new Error('Module not found'));
    renderWithRoute('nonexistent');
    await waitFor(() => {
      expect(screen.getByTestId('not-found')).toBeInTheDocument();
    });
  });

  it('should render NotFoundPage when module config has no routes', async () => {
    mockLoadModuleConfig.mockResolvedValue({ routes: [] });
    renderWithRoute('crm');
    await waitFor(() => {
      expect(screen.getByTestId('not-found')).toBeInTheDocument();
    });
  });

  it('should render NotFoundPage when module config is null', async () => {
    mockLoadModuleConfig.mockResolvedValue(null);
    renderWithRoute('crm');
    await waitFor(() => {
      expect(screen.getByTestId('not-found')).toBeInTheDocument();
    });
  });
});
