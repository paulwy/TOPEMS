/**
 * Tests for PluginLoader.tsx
 *  - PluginLoader class (loading state machine, manifest validation, dependencies, caching)
 *  - ModuleLoadingFallback / ModuleErrorFallback presentational components
 *  - ModuleLoader (lazy wrapper), PluginRouteWrapper, PluginLoaderProvider React components
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import {
  PluginLoader,
  pluginLoader,
  ModuleLoadingFallback,
  ModuleErrorFallback,
  ModuleLoader,
  PluginRouteWrapper,
  PluginLoaderProvider,
} from '../PluginLoader';
import type { PluginManifest } from '../PluginLoader';

vi.mock('@/i18n', () => ({
  default: { t: (x: string) => x },
}));

const makeManifest = (overrides: Partial<PluginManifest> = {}): PluginManifest => ({
  pluginCode: 'test-plugin',
  version: '1.0.0',
  name: 'Test Plugin',
  description: 'desc',
  icon: '',
  routes: [],
  menus: [],
  permissions: [],
  dependencies: [],
  frontend: {
    type: 'module-federation',
    entry: 'https://cdn.example.com/remoteEntry.js',
  },
  ...overrides,
});

describe('PluginLoader class', () => {
  let loader: PluginLoader;

  beforeEach(() => {
    loader = new PluginLoader({ maxRetries: 1 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies defaults when no options are given', () => {
    const l = new PluginLoader();
    expect(l).toBeInstanceOf(PluginLoader);
    expect(typeof l.emitter.emit).toBe('function');
  });

  it('loadPlugin succeeds: transitions to running and emits lifecycle events', async () => {
    vi.spyOn(loader, 'loadBundle').mockResolvedValue({});
    const onInstalling = vi.fn();
    const onRunning = vi.fn();
    loader.emitter.on('pluginInstalling', onInstalling);
    loader.emitter.on('pluginRunning', onRunning);

    const info = await loader.loadPlugin('ok-plugin', makeManifest({ pluginCode: 'ok-plugin' }));

    expect(info.status).toBe('running');
    expect(info.version).toBe('1.0.0');
    expect(info.loadedAt).toBeInstanceOf(Date);
    expect(info.retryCount).toBe(0);
    // NOTE: the emitted pluginInfo object is mutated in place as status
    // transitions, so we can only assert identity/order after the fact.
    expect(onInstalling).toHaveBeenCalledTimes(1);
    expect(onInstalling.mock.calls[0][0]).toBe('ok-plugin');
    expect(onRunning).toHaveBeenCalledTimes(1);
    expect(onRunning.mock.calls[0][0]).toBe('ok-plugin');
    expect(loader.getPluginInfo('ok-plugin')?.status).toBe('running');
  });

  it('loadPlugin rejects invalid manifest (missing pluginCode/version)', async () => {
    const bad = makeManifest({ pluginCode: '', version: '' });
    await expect(loader.loadPlugin('', bad)).rejects.toThrow('Invalid plugin manifest');
    expect(loader.getPluginInfo('')?.status).toBe('error');
  });

  it('loadPlugin throws when a dependency is not running', async () => {
    const manifest = makeManifest({ pluginCode: 'dep-plugin', dependencies: ['missing-dep'] });
    await expect(loader.loadPlugin('dep-plugin', manifest)).rejects.toThrow(
      'Missing dependencies: missing-dep'
    );
    expect(loader.getPluginInfo('dep-plugin')?.status).toBe('error');
  });

  it('loadPlugin returns the already-running plugin without reloading', async () => {
    vi.spyOn(loader, 'loadBundle').mockResolvedValue({});
    const manifest = makeManifest({ pluginCode: 'cached-plugin' });
    const first = await loader.loadPlugin('cached-plugin', manifest);
    const second = await loader.loadPlugin('cached-plugin', manifest);
    expect(second).toBe(first);
  });

  it('loadModule caches modules and does not call the loader twice', async () => {
    const comp = vi.fn(() => Promise.resolve({ default: () => null }));
    const a = await loader.loadModule(comp, 'mod-1');
    const b = await loader.loadModule(comp, 'mod-1');
    expect(a).toBe(b);
    expect(comp).toHaveBeenCalledTimes(1);
  });

  it('unloadPlugin marks the plugin uninstalling and removes it', async () => {
    vi.spyOn(loader, 'loadBundle').mockResolvedValue({});
    const onUninstalled = vi.fn();
    loader.emitter.on('pluginUninstalled', onUninstalled);
    await loader.loadPlugin('unload-me', makeManifest({ pluginCode: 'unload-me' }));

    loader.unloadPlugin('unload-me');

    expect(loader.getPluginInfo('unload-me')).toBeUndefined();
    expect(onUninstalled).toHaveBeenCalledWith('unload-me');
  });

  it('loadAllPlugins skips failing manifests and returns only successes', async () => {
    vi.spyOn(loader, 'loadBundle')
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('boom'));
    const results = await loader.loadAllPlugins([
      makeManifest({ pluginCode: 'good' }),
      makeManifest({ pluginCode: 'bad' }),
    ]);
    expect(results).toHaveLength(1);
    expect(results[0].code).toBe('good');
  });

  it('reloadPlugin throws when the plugin is unknown', async () => {
    await expect(loader.reloadPlugin('nope')).rejects.toThrow('Plugin nope not found');
  });

  it('getLoadingStatus / getAllPlugins reflect loaded state', async () => {
    vi.spyOn(loader, 'loadBundle').mockResolvedValue({});
    await loader.loadPlugin('list-me', makeManifest({ pluginCode: 'list-me' }));
    expect(Object.keys(loader.getLoadingStatus())).toContain('list-me');
    expect(loader.getAllPlugins().map((p) => p.code)).toContain('list-me');
  });

  it('loadManifest parses JSON from fetch and throws on non-ok responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ pluginCode: 'remote', version: '2' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const manifest = await loader.loadManifest('https://cdn.example.com/manifest.json');
    expect(manifest.pluginCode).toBe('remote');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://cdn.example.com/manifest.json',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );

    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(loader.loadManifest('https://x/bad.json')).rejects.toThrow(/404/);
  });
});

describe('Presentational fallback components', () => {
  it('ModuleLoadingFallback renders loading text', () => {
    render(<ModuleLoadingFallback />);
    expect(screen.getByText('lib.plugin_loader.k0')).toBeInTheDocument();
  });

  it('ModuleErrorFallback renders title without error, and message when error is given', () => {
    const { rerender } = render(<ModuleErrorFallback />);
    expect(screen.getByText('lib.plugin_loader.k1')).toBeInTheDocument();
    expect(screen.queryByText(/something broke/)).not.toBeInTheDocument();

    rerender(<ModuleErrorFallback error={new Error('something broke')} />);
    expect(screen.getByText('something broke')).toBeInTheDocument();
  });
});

describe('ModuleLoader (lazy wrapper from PluginLoader.tsx)', () => {
  it('renders the lazily loaded component after suspense', async () => {
    const LazyComp = () => <div>lazy-loaded-content</div>;
    render(<ModuleLoader component={() => Promise.resolve({ default: LazyComp })} />);
    expect(await screen.findByText('lazy-loaded-content')).toBeInTheDocument();
  });

  it('honors a custom fallback prop', () => {
    render(
      <ModuleLoader
        component={() => new Promise(() => {})}
        fallback={<div>custom-fallback</div>}
      />
    );
    expect(screen.getByText('custom-fallback')).toBeInTheDocument();
  });
});

describe('PluginRouteWrapper', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the loaded module component on success', async () => {
    const RouteComp = () => <div>route-component-here</div>;
    vi.spyOn(pluginLoader, 'loadModule').mockResolvedValue({ default: RouteComp });
    render(
      <PluginRouteWrapper
        routePath='/route-a'
        component={() => Promise.resolve({})}
      />
    );
    expect(await screen.findByText('route-component-here')).toBeInTheDocument();
  });

  it('renders ModuleErrorFallback when loadModule rejects', async () => {
    vi.spyOn(pluginLoader, 'loadModule').mockRejectedValue(new Error('route load boom'));
    render(
      <PluginRouteWrapper
        routePath='/route-b'
        component={() => Promise.resolve({})}
      />
    );
    expect(await screen.findByText('route load boom')).toBeInTheDocument();
    expect(screen.getByText('lib.plugin_loader.k1')).toBeInTheDocument();
  });

  it('shows the default loading fallback while loading', () => {
    vi.spyOn(pluginLoader, 'loadModule').mockReturnValue(new Promise(() => {}));
    render(
      <PluginRouteWrapper
        routePath='/route-c'
        component={() => Promise.resolve({})}
      />
    );
    expect(screen.getByText('lib.plugin_loader.k0')).toBeInTheDocument();
  });
});

describe('PluginLoaderProvider', () => {
  const PLUGINS = [makeManifest({ pluginCode: 'provider-plugin' })];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children directly when no plugins are supplied', () => {
    render(
      <PluginLoaderProvider>
        <span>child-node</span>
      </PluginLoaderProvider>
    );
    expect(screen.getByText('child-node')).toBeInTheDocument();
  });

  it('renders children after all plugins finish loading', async () => {
    vi.spyOn(pluginLoader, 'loadPlugin').mockResolvedValue({
      code: 'provider-plugin',
      name: 'P',
      version: '1',
      status: 'running',
    });
    render(
      <PluginLoaderProvider plugins={PLUGINS}>
        <span>provider-children</span>
      </PluginLoaderProvider>
    );
    expect(await screen.findByText('provider-children')).toBeInTheDocument();
  });

  it('shows an error alert for failed plugins but still renders children', async () => {
    vi.spyOn(pluginLoader, 'loadPlugin').mockRejectedValue(new Error('install exploded'));
    render(
      <PluginLoaderProvider plugins={PLUGINS}>
        <span>still-children</span>
      </PluginLoaderProvider>
    );
    expect(await screen.findByText(/install exploded/)).toBeInTheDocument();
    expect(screen.getByText('still-children')).toBeInTheDocument();
  });
});
