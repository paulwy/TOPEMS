/**
 * Tests for MicroFrontendLoader.tsx
 *  - loading / error rendering branches
 *  - retry button presence
 *  - preloadRemoteModule helper (success / failure)
 *
 * NOTE: the source captures `containerRef.current` inside mount effect. On the
 * first commit loading=true so the container div is not yet mounted; the
 * success-mount path bails out on the null container in jsdom. We therefore
 * cover every reachable render branch + the module-level preload helper, which
 * does not depend on the React container ref.
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MicroFrontendLoader, preloadRemoteModule } from '../MicroFrontendLoader';

const h = vi.hoisted(() => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  emit: vi.fn(),
  isDev: vi.fn(() => true),
  VITEDeploymentMode: vi.fn(() => 'module-federation'),
}));

vi.mock('@/utils/logger', () => ({ logger: h.logger }));

vi.mock('../eventBus', () => ({
  eventBus: { emit: h.emit },
  ModuleEvents: { MODULE_LOADED: 'module-loaded', MODULE_ERROR: 'module-error' },
}));

vi.mock('@/config/env', () => ({
  isDev: h.isDev,
  VITEDeploymentMode: h.VITEDeploymentMode,
}));

vi.mock('@/i18n', () => ({
  default: { t: (x: string) => x },
}));

vi.mock('lucide-react', () => ({
  AlertTriangle: () => <svg data-testid='alert-triangle' />,
  RefreshCw: () => <span data-testid='refresh-icon' />,
}));

declare global {
  interface Window {
    WebpackInitSharing?: () => Promise<void>;
    WebpackShareScopes?: { default: Record<string, unknown> };
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  h.isDev.mockReturnValue(true);
  h.VITEDeploymentMode.mockReturnValue('module-federation');
  (globalThis as Record<string, unknown>).WebpackInitSharing = vi.fn().mockResolvedValue(undefined);
  window.WebpackShareScopes = { default: {} };
});

afterEach(() => {
  Object.keys(window).forEach((key) => {
    if (key.startsWith('mf-')) delete (window as unknown as Record<string, unknown>)[key];
  });
});

const setupRemote = (name: string, mount: () => void, unmount: () => void) => {
  (window as unknown as Record<string, unknown>)[name] = {
    init: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(() => Promise.resolve(() => Promise.resolve({ mount, unmount }))),
  };
};

const staticMode = () => {
  h.isDev.mockReturnValue(false);
  h.VITEDeploymentMode.mockReturnValue('static');
};

describe('MicroFrontendLoader - render branches', () => {
  it('shows the default loading spinner while the remote is pending', () => {
    setupRemote('mf-pending', vi.fn(), vi.fn());
    render(
      <MicroFrontendLoader
        remoteName='mf-pending'
        remoteModule='./p'
      />
    );
    expect(screen.getByText(/lib.pluginLoader.k0/)).toBeInTheDocument();
  });

  it('honors a custom fallback prop while loading', () => {
    setupRemote('mf-cf', vi.fn(), vi.fn());
    render(
      <MicroFrontendLoader
        remoteName='mf-cf'
        fallback={<div>custom-mf-fallback</div>}
      />
    );
    expect(screen.getByText('custom-mf-fallback')).toBeInTheDocument();
  });

  it('renders error UI with retry button when remote fails to load', async () => {
    staticMode();
    const onError = vi.fn();
    render(
      <MicroFrontendLoader
        remoteName='mf-missing'
        onError={onError}
      />
    );

    expect(await screen.findByText(/No valid remote entry for mf-missing/)).toBeInTheDocument();
    expect(screen.getByTestId('alert-triangle')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(h.emit).toHaveBeenCalledWith('module-error', {
      moduleId: 'mf-missing',
      error: expect.any(Error),
    });
  });

  it('retry button click does not crash the component', async () => {
    staticMode();
    render(<MicroFrontendLoader remoteName='mf-retry' />);
    const button = await screen.findByRole('button');
    act(() => button.click());
    // handleRetry resets state to loading; the error UI is unmounted
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('preloadRemoteModule', () => {
  it('returns true when the remote loads successfully', async () => {
    setupRemote('mf-preload-ok', vi.fn(), vi.fn());
    const ok = await preloadRemoteModule('mf-preload-ok', './bootstrap');
    expect(ok).toBe(true);
  });

  it('returns false (without throwing) when the remote is unavailable', async () => {
    staticMode();
    const ok = await preloadRemoteModule('mf-preload-bad', './bootstrap');
    expect(ok).toBe(false);
    expect(h.logger.warn).toHaveBeenCalled();
  });

  it('logs an info line on successful preload', async () => {
    setupRemote('mf-preload-log', vi.fn(), vi.fn());
    await preloadRemoteModule('mf-preload-log', './bootstrap');
    expect(h.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Preloaded remote: mf-preload-log')
    );
  });
});
