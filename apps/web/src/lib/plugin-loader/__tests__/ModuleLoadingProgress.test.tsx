/**
 * Tests for ModuleLoadingProgress.tsx
 *  - ModuleLoadingProgress: per-module + overall progress rendering, size/stroke props
 *  - ModuleLoadingOverlay: full-screen overlay wrapper
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModuleLoadingProgress, ModuleLoadingOverlay } from '../ModuleLoadingProgress';
import { useModuleLoadingStore } from '@/store/moduleLoadingStore';

vi.mock('@/i18n', () => ({
  default: { t: (x: string) => x },
}));

beforeEach(() => {
  useModuleLoadingStore.getState().reset();
});

describe('ModuleLoadingProgress', () => {
  it('renders 0% when the module has never been registered', () => {
    render(<ModuleLoadingProgress moduleId='never-seen' />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders the per-module progress from the store', () => {
    useModuleLoadingStore.getState().setLoading('mp-mod');
    useModuleLoadingStore.getState().setProgress('mp-mod', 45);
    render(<ModuleLoadingProgress moduleId='mp-mod' />);
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('renders overall (total) progress when no moduleId is given', () => {
    useModuleLoadingStore.getState().setLoading('mp-total');
    useModuleLoadingStore.getState().setProgress('mp-total', 60);
    render(<ModuleLoadingProgress />);
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('renders two SVG circles for the track and the progress arc', () => {
    const { container } = render(
      <ModuleLoadingProgress
        moduleId='mp-svg'
        size={80}
        strokeWidth={6}
      />
    );
    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(2);
    // stroke-dasharray derived from circumference must be numeric
    const progressCircle = circles[1] as SVGCircleElement;
    expect(Number(progressCircle.getAttribute('stroke-dasharray'))).toBeGreaterThan(0);
  });

  it('honors size and strokeWidth props', () => {
    const { container } = render(
      <ModuleLoadingProgress
        moduleId='mp-size'
        size={120}
        strokeWidth={10}
      />
    );
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('120');
    expect(svg.getAttribute('height')).toBe('120');
  });

  it('shows a module name label when moduleId is provided', () => {
    useModuleLoadingStore.getState().setLoading('mp-label');
    render(
      <ModuleLoadingProgress
        moduleId='mp-label'
        showEstimatedTime={false}
      />
    );
    // label = i18n prefix + moduleId + suffix keys
    expect(screen.getByText(/mp-label/)).toBeInTheDocument();
  });

  it('does not crash when showEstimatedTime is disabled', () => {
    useModuleLoadingStore.getState().setLoading('mp-no-et');
    useModuleLoadingStore.getState().setProgress('mp-no-et', 30);
    render(
      <ModuleLoadingProgress
        moduleId='mp-no-et'
        showEstimatedTime={false}
      />
    );
    expect(screen.getByText('30%')).toBeInTheDocument();
  });
});

describe('ModuleLoadingOverlay', () => {
  it('renders a fixed overlay containing the progress component', () => {
    useModuleLoadingStore.getState().setLoading('mp-overlay');
    useModuleLoadingStore.getState().setProgress('mp-overlay', 80);
    const { container } = render(<ModuleLoadingOverlay moduleId='mp-overlay' />);
    expect(screen.getByText('80%')).toBeInTheDocument();
    const fixedBox = container.querySelector('div');
    expect(fixedBox).toBeTruthy();
  });
});
