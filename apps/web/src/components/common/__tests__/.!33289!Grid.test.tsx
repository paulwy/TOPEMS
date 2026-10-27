import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import { Grid } from '../Grid';

describe('Grid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children content', () => {
    renderWithProviders(
      <Grid>
        <span data-testid='grid-child'>子元素</span>
      </Grid>
    );
    expect(screen.getByTestId('grid-child')).toBeInTheDocument();
  });

  it('renders as item by default (non-container)', () => {
    const { container } = renderWithProviders(
      <Grid>
        <div>内容</div>
      </Grid>
    );
    const box = container.firstChild;
    expect(box).not.toBeNull();
  });

  it('renders as container with grid display when container prop is true', () => {
    const { container } = renderWithProviders(
      <Grid container>
        <Grid item>项 1</Grid>
        <Grid item>项 2</Grid>
      </Grid>
    );
    const root = container.firstChild as HTMLElement;
    expect(root).not.toBeNull();
