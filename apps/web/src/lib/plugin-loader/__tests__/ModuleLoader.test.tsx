/**
 * Tests for ModuleLoader.tsx
 *  - ModuleLoadingFallback / ModuleErrorFallback presentational fallbacks
 *  - ModuleLoader: success / loading / timeout / error branches + progress + custom fallback
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModuleLoader, ModuleLoadingFallback, ModuleErrorFallback } from '../ModuleLoader';
import { useModuleLoadingStore } from '@/store/moduleLoadingStore';

vi.mock('@/i18n', () => ({
  default: { t: (x: string) => x },
}));

vi.mock('../ModuleLoadingProgress', () => ({
  ModuleLoadingProgress: ({ moduleId }: { moduleId?: string }) => (
    <div data-testid='mocked-progress'>{`progress:${moduleId ?? 'overall'}`}</div>
  ),
}));

beforeEach(() => {
  useModuleLoadingStore.getState().reset();
});

describe('fallback components', () => {
  it('ModuleLoadingFallback renders plain spinner text by default', () => {
    render(<ModuleLoadingFallback />);
    expect(screen.getByText('lib.module_loader.k0')).toBeInTheDocument();
  });

  it('ModuleLoadingFallback renders progress widget when showProgress=true and progress exists', () => {
    useModuleLoadingStore.getState().setLoading('fb-mod');
    render(
      <ModuleLoadingFallback
        moduleId='fb-mod'
        showProgress={true}
      />
    );
    expect(screen.getByTestId('mocked-progress')).toHaveTextContent('progress:fb-mod');
  });

  it('ModuleErrorFallback renders title and optional error message', () => {
    const { rerender } = render(<ModuleErrorFallback />);
    expect(screen.getByText('lib.module_loader.k1')).toBeInTheDocument();
    rerender(<ModuleErrorFallback error={new Error('boom-module')} />);
    expect(screen.getByText('boom-module')).toBeInTheDocument();
  });
});

describe('ModuleLoader component', () => {
  it('renders the loaded component after both load paths complete', async () => {
    const LoadedComp = () => <div>module-ready</div>;
    const component = vi.fn(() => Promise.resolve({ default: LoadedComp }));
    render(
      <ModuleLoader
        component={component}
        moduleId='mod-ok'
      />
    );
    expect(await screen.findByText('module-ready')).toBeInTheDocument();
  });

  it('renders the default loading fallback while pending', () => {
    render(
      <ModuleLoader
        component={() => new Promise(() => {})}
        moduleId='mod-pending'
      />
    );
    expect(screen.getByText('lib.module_loader.k0')).toBeInTheDocument();
  });

  it('honors a custom fallback prop while the module is pending', () => {
    render(
      <ModuleLoader
        component={() => new Promise(() => {})}
        moduleId='mod-custom-fb'
        fallback={<div>custom-spinner</div>}
      />
    );
    expect(screen.getByText('custom-spinner')).toBeInTheDocument();
  });

  it('shows the progress variant fallback when showProgress is true', () => {
    render(
      <ModuleLoader
        component={() => new Promise(() => {})}
        moduleId='mod-progress'
        showProgress={true}
      />
    );
    expect(screen.getByTestId('mocked-progress')).toHaveTextContent('progress:mod-progress');
  });

  it('renders timeout UI (and unhealthy warning) when loading exceeds timeout', async () => {
    render(
      <ModuleLoader
        component={() => new Promise(() => {})}
        moduleId='mod-timeout'
        timeout={30}
      />
    );
    // timeout message uses i18n keys wrapped around the seconds value
    expect(await screen.findByText(/shared.module_loader.k0/)).toBeInTheDocument();
    expect(screen.getByText('lib.module_loader.k2')).toBeInTheDocument();
    // store flagged the module unhealthy => warning caption appears
    expect(screen.getByText('lib.module_loader.k3')).toBeInTheDocument();
  });

  it('renders error UI when the loader rejects', async () => {
    let calls = 0;
    // First call (React lazy) resolves so Suspense settles; the effect's second call
    // rejects, which the component catches and renders as the error branch.
    const component = vi.fn(() => {
      calls += 1;
      if (calls === 1) return Promise.resolve({ default: () => <div>early</div> });
      return Promise.reject(new Error('loader rejected'));
    });
    render(
      <ModuleLoader
        component={component}
        moduleId='mod-err'
      />
    );
    expect(await screen.findByText('loader rejected')).toBeInTheDocument();
    expect(screen.getByText('lib.module_loader.k2')).toBeInTheDocument();
  });
});
