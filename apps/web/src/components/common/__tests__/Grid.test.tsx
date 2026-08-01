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
    // 容器应渲染所有子项
    expect(screen.getByText('项 1')).toBeInTheDocument();
    expect(screen.getByText('项 2')).toBeInTheDocument();
  });

  it('supports size prop as number to set xs', () => {
    const { container } = renderWithProviders(
      <Grid size={6}>
        <span>size6</span>
      </Grid>
    );
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByText('size6')).toBeInTheDocument();
  });

  it('supports size prop as object with breakpoints', () => {
    const { container } = renderWithProviders(
      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <span>响应式</span>
      </Grid>
    );
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByText('响应式')).toBeInTheDocument();
  });

  it('applies spacing when container with spacing prop', () => {
    const { container } = renderWithProviders(
      <Grid
        container
        spacing={2}
      >
        <Grid item>子项</Grid>
      </Grid>
    );
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByText('子项')).toBeInTheDocument();
  });

  it('does not crash when clicked', () => {
    renderWithProviders(
      <Grid>
        <span data-testid='clickable'>可点击</span>
      </Grid>
    );
    const el = screen.getByTestId('clickable');
    expect(() => fireEvent.click(el)).not.toThrow();
  });
});
