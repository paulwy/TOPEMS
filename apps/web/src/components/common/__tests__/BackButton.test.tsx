import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BackButton from '../BackButton';
import { useBackNavigation } from '@/hooks';

vi.mock('@/hooks', () => ({
  useBackNavigation: vi.fn(),
}));

const mockGoBack = vi.fn();
const mockUseBackNavigation = useBackNavigation as vi.Mock;

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('BackButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBackNavigation.mockReturnValue({
      goBack: mockGoBack,
      hasFrom: false,
      from: null,
      fromFullPath: null,
      createNavigateState: vi.fn(),
    });
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

  it('should navigate to href when provided', () => {
    renderWithRouter(
      <BackButton
        href='/test-page'
        variant='text'
      />
    );
    const button = screen.getByRole('button', { name: /返回/i });
    fireEvent.click(button);
    expect(window.location.pathname).toBe('/test-page');
  });

  it('should call goBack with fallback when no onClick or href', () => {
    renderWithRouter(
      <BackButton
        fallback='/fallback-page'
        variant='text'
      />
    );
    const button = screen.getByRole('button', { name: /返回/i });
    fireEvent.click(button);
    expect(mockGoBack).toHaveBeenCalledWith('/fallback-page');
  });

  it('should render with tooltip wrapper when hasFrom is true', () => {
    mockUseBackNavigation.mockReturnValue({
      goBack: mockGoBack,
      hasFrom: true,
      from: { pathname: '/from-page' },
      fromFullPath: '/from-page',
      createNavigateState: vi.fn(),
    });
    renderWithRouter(<BackButton />);
    const button = screen.getByLabelText('返回');
    expect(button).toBeInTheDocument();
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
      <BrowserRouter>
        <BackButton size='large' />
      </BrowserRouter>
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
});
