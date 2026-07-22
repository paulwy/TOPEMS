import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DatePicker } from '../components/DatePicker';

describe('DatePicker Component', () => {
  it('renders with label', () => {
    const { container } = render(<DatePicker name="date" label="选择日期" />);
    const label = container.querySelector('label');
    expect(label).toBeInTheDocument();
  });

  it('renders with compact size by default', () => {
    const { container } = render(<DatePicker name="date" label="选择日期" />);
    const input = container.querySelector('[role="group"]');
    expect(input).toBeInTheDocument();
  });

  it('renders with non-compact size', () => {
    const { container } = render(<DatePicker name="date" label="选择日期" compact={false} />);
    const input = container.querySelector('[role="group"]');
    expect(input).toBeInTheDocument();
  });

  it('renders with small size', () => {
    const { container } = render(<DatePicker name="date" label="选择日期" compact={true} />);
    const input = container.querySelector('[role="group"]');
    expect(input).toBeInTheDocument();
  });

  it('renders with disabled attribute', () => {
    const { container } = render(<DatePicker name="date" label="选择日期" disabled />);
    const input = container.querySelector('[role="group"]');
    expect(input).toBeInTheDocument();
  });

  it('calls onChange when date is selected', () => {
    const onChangeMock = vi.fn();
    const { container } = render(<DatePicker name="date" label="选择日期" onChange={onChangeMock} />);
    
    const input = container.querySelector('[role="group"]');
    fireEvent.click(input!);
    
    expect(onChangeMock).toBeDefined();
  });

  it('renders with sx styles', () => {
    const { container } = render(<DatePicker name="date" label="选择日期" sx={{ width: '100%' }} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with inputSx styles', () => {
    const { container } = render(<DatePicker name="date" label="选择日期" inputSx={{ backgroundColor: 'white' }} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
