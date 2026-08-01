import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import { TouchButton } from '../TouchButton';

describe('TouchButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders button with children content', () => {
    renderWithProviders(<TouchButton>点击我</TouchButton>);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(screen.getByText('点击我')).toBeInTheDocument();
  });

  it('calls onClick when button is clicked', () => {
    const handleClick = vi.fn();
    renderWithProviders(<TouchButton onClick={handleClick}>按钮</TouchButton>);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn();
    renderWithProviders(
      <TouchButton
        onClick={handleClick}
        disabled
      >
        禁用按钮
      </TouchButton>
    );
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders with different button variants', () => {
    const { rerender } = renderWithProviders(<TouchButton variant='contained'>主要</TouchButton>);
    expect(screen.getByText('主要')).toBeInTheDocument();

    rerender(
      <React.Fragment>
        <TouchButton variant='outlined'>次要</TouchButton>
      </React.Fragment>
    );
    expect(screen.getByText('次要')).toBeInTheDocument();
  });

  it('renders ripple style element for touch feedback', () => {
    const { container } = renderWithProviders(<TouchButton>触摸</TouchButton>);
    // 组件渲染内联 style 标签用于 ripple 动画
    const styleTag = container.querySelector('style');
    expect(styleTag).not.toBeNull();
    expect(styleTag?.textContent).toContain('ripple-effect');
  });

  it('supports custom color prop', () => {
    renderWithProviders(<TouchButton color='secondary'>次要颜色</TouchButton>);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(screen.getByText('次要颜色')).toBeInTheDocument();
  });

  it('does not crash when clicked multiple times', () => {
    const handleClick = vi.fn();
    renderWithProviders(<TouchButton onClick={handleClick}>多次点击</TouchButton>);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(3);
  });
});
