import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import UserSelect from '../UserSelect';

describe('UserSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithProviders(<UserSelect />);
    expect(screen.getByText('UserSelect')).toBeInTheDocument();
  });

  it('renders a div element', () => {
    const { container } = renderWithProviders(<UserSelect />);
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('renders the component text content', () => {
    renderWithProviders(<UserSelect />);
    expect(screen.getByText(/UserSelect/)).toBeInTheDocument();
  });

  it('renders exactly one div element as stub', () => {
    const { container } = renderWithProviders(<UserSelect />);
    expect(container.querySelectorAll('div')).toHaveLength(1);
  });

  it('does not crash when clicked (stub has no handlers)', () => {
    renderWithProviders(<UserSelect />);
    const el = screen.getByText('UserSelect');
    expect(() => fireEvent.click(el)).not.toThrow();
  });
});
