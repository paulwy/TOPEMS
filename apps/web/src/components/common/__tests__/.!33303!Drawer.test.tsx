import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import { Drawer } from '../Drawer';

describe('Drawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render children when open is false', () => {
    renderWithProviders(
      <Drawer
        open={false}
        onClose={vi.fn()}
      >
        <span data-testid='drawer-child'>抽屉内容</span>
      </Drawer>
    );
    expect(screen.queryByTestId('drawer-child')).not.toBeInTheDocument();
  });

  it('renders children when open is true', () => {
    renderWithProviders(
      <Drawer
        open
        onClose={vi.fn()}
      >
        <span data-testid='drawer-child'>抽屉内容</span>
      </Drawer>
    );
    expect(screen.getByTestId('drawer-child')).toBeInTheDocument();
    expect(screen.getByText('抽屉内容')).toBeInTheDocument();
  });

  it('displays title text when open', () => {
    renderWithProviders(
      <Drawer
        open
        onClose={vi.fn()}
