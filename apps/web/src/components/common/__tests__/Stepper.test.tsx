import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import Stepper from '../Stepper';

describe('Stepper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithProviders(<Stepper />);
    expect(screen.getByText('Stepper')).toBeInTheDocument();
  });

  it('renders a div element', () => {
    const { container } = renderWithProviders(<Stepper />);
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('renders the component text content', () => {
    renderWithProviders(<Stepper />);
    expect(screen.getByText(/Stepper/)).toBeInTheDocument();
  });

  it('renders exactly one div element as stub', () => {
    const { container } = renderWithProviders(<Stepper />);
    expect(container.querySelectorAll('div')).toHaveLength(1);
  });

  it('does not crash when clicked (stub has no handlers)', () => {
    renderWithProviders(<Stepper />);
    const el = screen.getByText('Stepper');
    expect(() => fireEvent.click(el)).not.toThrow();
  });
});
