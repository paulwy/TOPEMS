import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BackButton } from '@topems/shared-components';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe('BackButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with default props', () => {
    renderWithRouter(<BackButton />);
    const button = screen.getByLabelText('返回');
    expect(button).toBeInTheDocument();
  });

  it('should render icon variant by default', () => {
    renderWithRouter(<BackButton />);
    const iconButton = screen.getByRole('button', { name: /返回/i });
    expect(iconButton).toBeInTheDocument();
  });

  it('should render text variant', () => {
    renderWithRouter(
      <BackButton
        variant='text'
