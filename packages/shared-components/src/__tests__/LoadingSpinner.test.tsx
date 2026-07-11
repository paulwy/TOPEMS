import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner, LoadingOverlay, SkeletonLoader } from '../components/LoadingSpinner';

describe('LoadingSpinner Component', () => {
  it('renders with default size', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with small size', () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveStyle({ width: '16px' });
    expect(svg).toHaveStyle({ height: '16px' });
  });

  it('renders with medium size', () => {
    const { container } = render(<LoadingSpinner size="md" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveStyle({ width: '24px' });
    expect(svg).toHaveStyle({ height: '24px' });
  });

  it('renders with large size', () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveStyle({ width: '32px' });
    expect(svg).toHaveStyle({ height: '32px' });
  });

  it('has loading animation', () => {
    const { container } = render(<LoadingSpinner />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveStyle({ animation: 'spin 1s linear infinite' });
  });

  it('has aria-label', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByLabelText('Loading');
    expect(spinner).toBeInTheDocument();
  });
});

describe('LoadingOverlay Component', () => {
  it('renders children when not loading', () => {
    render(<LoadingOverlay isLoading={false}>
      <div data-testid="content">内容</div>
    </LoadingOverlay>);
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders overlay when loading', () => {
    render(<LoadingOverlay isLoading={true}>
      <div data-testid="content">内容</div>
    </LoadingOverlay>);
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders with loading message', () => {
    render(<LoadingOverlay isLoading={true} message="加载中...">
      <div data-testid="content">内容</div>
    </LoadingOverlay>);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('renders large spinner in overlay', () => {
    const { container } = render(<LoadingOverlay isLoading={true}>
      <div data-testid="content">内容</div>
    </LoadingOverlay>);
    const svg = container.querySelector('svg');
    expect(svg).toHaveStyle({ width: '32px' });
    expect(svg).toHaveStyle({ height: '32px' });
  });
});

describe('SkeletonLoader Component', () => {
  it('renders skeleton loader', () => {
    const { container } = render(<SkeletonLoader />);
    const div = container.firstChild;
    expect(div).toHaveStyle({ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' });
    expect(div).toHaveStyle({ borderRadius: '8px' });
  });
});