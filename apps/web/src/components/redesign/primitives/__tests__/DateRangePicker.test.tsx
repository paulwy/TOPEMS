import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { DateRangePicker } from '../DateRangePicker';

describe('DateRangePicker', () => {
  it('renders with placeholder', () => {
    render(
      <DateRangePicker
        startPlaceholder='开始日期'
        endPlaceholder='结束日期'
      />
    );

    expect(screen.getByPlaceholderText('开始日期')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('结束日期')).toBeInTheDocument();
  });

  it('renders with value', () => {
    render(<DateRangePicker value={{ start: '2024-01-01', end: '2024-01-31' }} />);

    expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2024-01-31')).toBeInTheDocument();
  });

  it('renders with disabled state', () => {
    render(<DateRangePicker disabled={true} />);

    const inputs = document.querySelectorAll('input');
    inputs.forEach((input) => {
      expect(input).toBeDisabled();
    });
  });
});
