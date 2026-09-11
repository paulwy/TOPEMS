/**
 * Tests for DynamicRouter.tsx
 *  - loading / empty-routes / static-route rendering
 *  - exported helpers: preloadRemoteModules, loadRemotePage, loadPluginFromManifest
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import {
  DynamicRouter,
  preloadRemoteModules,
  loadRemotePage,
  loadPluginFromManifest,
} from '../DynamicRouter';

// ─── mocks ──────────────────────────────────────────────────────────────────
vi.mock('react-router-dom', () => ({
  Route: ({ path, element }: { path: string; element: React.ReactElement }) => (
    <div
      data-testid='dr-route'
      data-path={path}
    >
      {element}
    </div>
  ),
  Routes: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid='dr-routes'>{children}</div>
  ),
  useLocation: () => ({ pathname: '/home' }),
}));

// ModuleLoadingFallback + PluginLoader class used only inside DynamicRouter.
vi.mock('../PluginLoader', () => ({
  ModuleLoadingFallback: () => <div data-testid='dr-fallback'>dr-loading</div>,
  PluginLoader: class {
    async loadManifest(url: string) {
      return { __manifestUrl: url };
    }
  },
}));

vi.mock('../eventBus', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
  ModuleEvents: { MODULE_LOADED: 'module-loaded', MODULE_ERROR: 'module-error' },
}));

const h = vi.hoisted(() => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  getAllRoutes: vi.fn(),
  getModuleByRoutePath: vi.fn(),
  getRemoteModules: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({ logger: h.logger }));

vi.mock('@/modules/registry', () => ({
  moduleRegistry: {
    getAllRoutes: (...args: unknown[]) => h.getAllRoutes(...args),
    getModuleByRoutePath: (...args: unknown[]) => h.getModuleByRoutePath(...args),
    getRemoteModules: (...args: unknown[]) => h.getRemoteModules(...args),
  },
}));

// webpack module-federation globals referenced by loadRemoteModule
beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as Record<string, unknown>).WebpackInitSharing = vi.fn().mockResolvedValue(undefined);
  (globalThis as Record<string, unknown>).WebpackShareScopes = { default: {} };
});

describe('DynamicRouter component', () => {
  it('renders an empty <Routes> when there are no routes', () => {
    // NOTE: getAllRoutes() is consumed synchronously in loadRoutes (no await),
    // so the mock must return a plain array, not a promise.
    h.getAllRoutes.mockReturnValue([]);
    render(<DynamicRouter />);
    expect(screen.getByTestId('dr-routes')).toBeInTheDocument();
    expect(screen.queryByTestId('dr-route')).not.toBeInTheDocument();
  });

  it('renders a static (non-remote) route with its lazy page component', async () => {
    const StaticPage = () => <div>static-page-content</div>;
    h.getAllRoutes.mockReturnValue([
      {
        path: '/static/a',
        componentName: 'A',
        component: () => Promise.resolve({ default: StaticPage }),
      },
    ]);
    // module has no remoteEntry => static branch
    h.getModuleByRoutePath.mockReturnValue({ entry: 'A', routes: [] });

    render(<DynamicRouter />);

    const routeEl = await screen.findByTestId('dr-route');
    expect(routeEl.getAttribute('data-path')).toBe('/static/a');
    expect(await screen.findByText('static-page-content')).toBeInTheDocument();
  });

  it('invokes moduleRegistry.getAllRoutes on mount', () => {
    h.getAllRoutes.mockReturnValue([]);
    render(<DynamicRouter />);
    expect(h.getAllRoutes).toHaveBeenCalledTimes(1);
  });
});

describe('exported helpers', () => {
  it('preloadRemoteModules resolves immediately when no remotes are registered', async () => {
    h.getRemoteModules.mockReturnValue([]);
    await expect(preloadRemoteModules()).resolves.toBeUndefined();
    expect(h.logger.info).not.toHaveBeenCalled();
  });

  it('loadRemotePage rejects when the remote container is missing on window', async () => {
    await expect(loadRemotePage('ghost-remote', './store')).rejects.toThrow(
      /Remote module "ghost-remote" not found/
    );
    expect(h.logger.error).toHaveBeenCalled();
  });

  it('loadPluginFromManifest fetches the manifest via a fresh PluginLoader', async () => {
    const result = await loadPluginFromManifest('https://cdn.example.com/plugin.json');
    await waitFor(() =>
      expect(result).toEqual({ __manifestUrl: 'https://cdn.example.com/plugin.json' })
    );
  });
});
