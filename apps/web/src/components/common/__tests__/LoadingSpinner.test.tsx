import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithProviders(<LoadingSpinner />);
    expect(screen.getByText('LoadingSpinner')).toBeInTheDocument();
  });

  it('renders a div element', () => {
    const { container } = renderWithProviders(<LoadingSpinner />);
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('renders the component text content', () => {
    renderWithProviders(<LoadingSpinner />);
    expect(screen.getByText(/LoadingSpinner/)).toBeInTheDocument();
  });

  it('renders exactly one div element as stub', () => {
    const { container } = renderWithProviders(<LoadingSpinner />);
    expect(container.querySelectorAll('div')).toHaveLength(1);
  });

  it('does not crash when clicked (stub has no handlers)', () => {
    renderWithProviders(<LoadingSpinner />);
    const el = screen.getByText('LoadingSpinner');
    expect(() => fireEvent.click(el)).not.toThrow();
  });
});
