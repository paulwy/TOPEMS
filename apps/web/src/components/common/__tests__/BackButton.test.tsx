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
        label='返回列表'
      />
    );
    const button = screen.getByRole('button', { name: /返回列表/i });
    expect(button).toBeInTheDocument();
  });

  it('should render outlined variant', () => {
    renderWithRouter(
      <BackButton
        variant='outlined'
        label='返回'
      />
    );
    const button = screen.getByRole('button', { name: /返回/i });
    expect(button).toBeInTheDocument();
  });

  it('should call onClick when provided', () => {
    const handleClick = vi.fn();
    renderWithRouter(
      <BackButton
        onClick={handleClick}
        variant='text'
      />
    );
    const button = screen.getByRole('button', { name: /返回/i });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should call onBack when provided', () => {
    const handleBack = vi.fn();
    renderWithRouter(
      <BackButton
        onBack={handleBack}
        variant='text'
      />
    );
    const button = screen.getByRole('button', { name: /返回/i });
    fireEvent.click(button);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('should render with custom tooltip wrapper when provided', () => {
    renderWithRouter(<BackButton tooltip='自定义提示' />);
    const button = screen.getByLabelText('返回');
    expect(button).toBeInTheDocument();
  });

  it('should render with different sizes', () => {
    const { rerender } = renderWithRouter(<BackButton size='small' />);
    let button = screen.getByLabelText('返回');
    expect(button).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <BackButton size='large' />
      </MemoryRouter>
    );
    button = screen.getByLabelText('返回');
    expect(button).toBeInTheDocument();
  });

  it('should render with custom label in text variant', () => {
    renderWithRouter(
      <BackButton
        variant='text'
        label='上一页'
      />
    );
    const button = screen.getByRole('button', { name: /上一页/i });
    expect(button).toBeInTheDocument();
  });

  it('should render without router context (fallback mode)', () => {
    render(<BackButton variant='text' />);
    const button = screen.getByRole('button', { name: /返回/i });
    expect(button).toBeInTheDocument();
  });
});
