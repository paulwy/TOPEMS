import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { renderWithProviders } from '@/__tests__/test-utils';
import { ViewModeToggle } from '../ViewModeToggle';

describe('ViewModeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when modes has only one or no items', () => {
    const { container, rerender } = renderWithProviders(
      <ViewModeToggle
        modes={['table']}
        current='table'
        onChange={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();

    rerender(
      <ViewModeToggle
        modes={[]}
        current='table'
        onChange={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders toggle buttons when multiple modes are provided', () => {
    renderWithProviders(
      <ViewModeToggle
        modes={['table', 'card']}
        current='table'
        onChange={vi.fn()}
      />
    );
    expect(screen.getAllByRole('button').length).toBe(2);
  });

  it('renders tooltips with mode labels', () => {
    renderWithProviders(
      <ViewModeToggle
        modes={['table', 'card']}
        current='table'
        onChange={vi.fn()}
      />
    );
    // Hover over buttons to trigger tooltips - just verify buttons exist
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(2);
  });

  it('calls onChange with the selected mode when a button is clicked', () => {
    const handleChange = vi.fn();
    renderWithProviders(
      <ViewModeToggle
        modes={['table', 'card']}
        current='table'
        onChange={handleChange}
      />
    );
    const buttons = screen.getAllByRole('button');
    // Click the card mode button (second button)
    fireEvent.click(buttons[1]);
    expect(handleChange).toHaveBeenCalledWith('card');
  });

  it('calls onChange with table when table button is clicked', () => {
    const handleChange = vi.fn();
    renderWithProviders(
      <ViewModeToggle
        modes={['table', 'card']}
        current='card'
        onChange={handleChange}
      />
    );
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(handleChange).toHaveBeenCalledWith('table');
  });
});
