import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import ActionButton from '../ActionButton';

describe('ActionButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithProviders(<ActionButton />);
    expect(screen.getByText('ActionButton')).toBeInTheDocument();
  });

  it('renders a div element', () => {
    const { container } = renderWithProviders(<ActionButton />);
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('renders the component text content', () => {
    renderWithProviders(<ActionButton />);
    expect(screen.getByText(/ActionButton/)).toBeInTheDocument();
  });

  it('renders exactly one div element as stub', () => {
    const { container } = renderWithProviders(<ActionButton />);
    expect(container.querySelectorAll('div')).toHaveLength(1);
  });

  it('does not crash when clicked (stub has no handlers)', () => {
    renderWithProviders(<ActionButton />);
    const el = screen.getByText('ActionButton');
    expect(() => fireEvent.click(el)).not.toThrow();
  });
});
