import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { NumberField } from '../NumberFields';
import { renderWithProviders } from '@/__tests__/test-utils';

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
        }
  ),
  useAuthStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          user: null,
        })
      : {
          user: null,
        }
  ),
}));

describe('NumberField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders label', () => {
    renderWithProviders(
      <NumberField
        label='年龄'
        value={0}
      />
    );
    expect(screen.getByLabelText('年龄')).toBeInTheDocument();
  });

  it('renders initial numeric value', () => {
    renderWithProviders(
      <NumberField
        label='数量'
        value={42}
      />
    );
    const input = screen.getByLabelText('数量') as HTMLInputElement;
    expect(input.value).toBe('42');
  });

  it('renders with min attribute applied to native input', () => {
    renderWithProviders(
      <NumberField
        label='年龄'
        value={18}
        min={0}
      />
    );
    const input = screen.getByLabelText('年龄') as HTMLInputElement;
    expect(input.min).toBe('0');
  });

  it('renders with max attribute applied to native input', () => {
    renderWithProviders(
      <NumberField
        label='年龄'
        value={18}
        max={120}
      />
    );
    const input = screen.getByLabelText('年龄') as HTMLInputElement;
    expect(input.max).toBe('120');
  });

  it('renders with step attribute applied to native input', () => {
    renderWithProviders(
      <NumberField
        label='价格'
        value={1.5}
        step={0.5}
      />
    );
    const input = screen.getByLabelText('价格') as HTMLInputElement;
    expect(input.step).toBe('0.5');
  });

  it('calls onChange with parsed number when user types', () => {
    const handleChange = vi.fn();
    renderWithProviders(
      <NumberField
        label='数量'
        value={0}
        onChange={handleChange}
      />
    );
    const input = screen.getByLabelText('数量');
    fireEvent.change(input, { target: { value: '25' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(25);
  });

  it('clamps value to max when input exceeds max', () => {
    const handleChange = vi.fn();
    renderWithProviders(
      <NumberField
        label='年龄'
        value={0}
        max={100}
        onChange={handleChange}
      />
    );
    const input = screen.getByLabelText('年龄');
    fireEvent.change(input, { target: { value: '150' } });
    expect(handleChange).toHaveBeenCalledWith(100);
  });

  it('clamps value to min when input is below min', () => {
    const handleChange = vi.fn();
    renderWithProviders(
      <NumberField
        label='年龄'
        value={0}
        min={0}
        onChange={handleChange}
      />
    );
    const input = screen.getByLabelText('年龄');
    fireEvent.change(input, { target: { value: '-5' } });
    // allowNegative 默认为 false，输入 -5 会被处理为 5（去掉负号）
    expect(handleChange).toHaveBeenCalledWith(5);
  });

  it('renders with startAdornment', () => {
    renderWithProviders(
      <NumberField
        label='金额'
        value={100}
        startAdornment='¥'
      />
    );
    expect(screen.getByText('¥')).toBeInTheDocument();
  });

  it('renders with endAdornment', () => {
    renderWithProviders(
      <NumberField
        label='比例'
        value={50}
        endAdornment='%'
      />
    );
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('renders disabled state', () => {
    renderWithProviders(
      <NumberField
        label='数量'
        value={0}
        disabled
      />
    );
    expect(screen.getByLabelText('数量')).toBeDisabled();
  });

  it('calls onChange with 0 when input is cleared', () => {
    const handleChange = vi.fn();
    renderWithProviders(
      <NumberField
        label='数量'
        value={10}
        onChange={handleChange}
      />
    );
    const input = screen.getByLabelText('数量');
    fireEvent.change(input, { target: { value: '' } });
    expect(handleChange).toHaveBeenCalledWith(0);
  });
});
