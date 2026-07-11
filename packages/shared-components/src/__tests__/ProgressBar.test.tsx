import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressBar from '../components/ProgressBar';

describe('ProgressBar Component', () => {
  it('renders linear progress bar with default props', () => {
    render(<ProgressBar value={50} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<ProgressBar value={50} label="完成进度" />);
    expect(screen.getByText('完成进度')).toBeInTheDocument();
  });

  it('renders with value display', () => {
    render(<ProgressBar value={75} showValue />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('renders with both label and value', () => {
    render(<ProgressBar value={50} label="完成进度" showValue />);
    expect(screen.getByText('完成进度')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders with custom max value', () => {
    render(<ProgressBar value={25} max={50} showValue />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('clamps value between 0 and 100', () => {
    render(<ProgressBar value={150} showValue />);
    expect(screen.getByText('100%')).toBeInTheDocument();

    render(<ProgressBar value={-10} showValue />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders circular variant', () => {
    const { container } = render(<ProgressBar value={50} variant="circular" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders circular variant with value display', () => {
    render(<ProgressBar value={60} variant="circular" showValue />);
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('renders segmented variant', () => {
    const { container } = render(<ProgressBar value={50} variant="segmented" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with different colors', () => {
    const colors = ['success', 'warning', 'error', 'gradient'] as const;
    colors.forEach((color) => {
      const { container, unmount } = render(<ProgressBar value={50} color={color} />);
      expect(container.firstChild).toBeInTheDocument();
      unmount();
    });
  });

  it('renders with different sizes', () => {
    const sizes = ['small', 'medium', 'large'] as const;
    sizes.forEach((size) => {
      const { container, unmount } = render(<ProgressBar value={50} size={size} />);
      expect(container.firstChild).toBeInTheDocument();
      unmount();
    });
  });

  it('renders with animation', () => {
    const { container } = render(<ProgressBar value={50} animated />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with stripes', () => {
    const { container } = render(<ProgressBar value={50} striped />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders segmented with custom segments', () => {
    const { container } = render(<ProgressBar value={30} variant="segmented" segments={5} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});