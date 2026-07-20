import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Cascader } from '../components/Cascader';

const testOptions = [
  {
    value: 'province1',
    label: '省份1',
    children: [
      {
        value: 'city1',
        label: '城市1',
        children: [
          { value: 'district1', label: '区1' },
          { value: 'district2', label: '区2' },
        ],
      },
      { value: 'city2', label: '城市2' },
    ],
  },
  {
    value: 'province2',
    label: '省份2',
    children: [{ value: 'city3', label: '城市3' }],
  },
  {
    value: 'province3',
    label: '省份3',
    disabled: true,
  },
];

describe('Cascader Component', () => {
  it('renders with placeholder', () => {
    render(<Cascader options={testOptions} placeholder="请选择地区" />);
    expect(screen.getByPlaceholderText('请选择地区')).toBeInTheDocument();
  });

  it('renders with default placeholder', () => {
    render(<Cascader options={testOptions} />);
    expect(screen.getByPlaceholderText('请选择')).toBeInTheDocument();
  });

  it('displays selected value', () => {
    render(<Cascader options={testOptions} value={['province1', 'city1', 'district1']} />);
    expect(screen.getByDisplayValue('省份1 / 城市1 / 区1')).toBeInTheDocument();
  });

  it('displays partial selected path', () => {
    render(<Cascader options={testOptions} value={['province1']} />);
    expect(screen.getByDisplayValue('省份1')).toBeInTheDocument();
  });

  it('calls onChange when selecting a leaf option', () => {
    const onChangeMock = vi.fn();
    render(<Cascader options={testOptions} onChange={onChangeMock} />);
    
    fireEvent.click(screen.getByPlaceholderText('请选择'));
    fireEvent.click(screen.getByText('省份1'));
    fireEvent.click(screen.getByText('城市1'));
    fireEvent.click(screen.getByText('区1'));
    
    expect(onChangeMock).toHaveBeenCalledWith(['province1', 'city1', 'district1']);
  });

  it('calls onChange when selecting a non-leaf option without children', () => {
    const onChangeMock = vi.fn();
    render(<Cascader options={testOptions} onChange={onChangeMock} />);
    
    fireEvent.click(screen.getByPlaceholderText('请选择'));
    fireEvent.click(screen.getByText('省份1'));
    fireEvent.click(screen.getByText('城市2'));
    
    expect(onChangeMock).toHaveBeenCalledWith(['province1', 'city2']);
  });

  it('does not call onChange for disabled option', () => {
    const onChangeMock = vi.fn();
    render(<Cascader options={testOptions} onChange={onChangeMock} />);
    
    fireEvent.click(screen.getByPlaceholderText('请选择'));
    fireEvent.click(screen.getByText('省份3'));
    
    expect(onChangeMock).not.toHaveBeenCalled();
  });

  it('calls onChange when clearing value', () => {
    const onChangeMock = vi.fn();
    render(<Cascader options={testOptions} value={['province1']} onChange={onChangeMock} />);
    
    const chip = screen.getByRole('button');
    fireEvent.click(chip);
    
    expect(onChangeMock).toHaveBeenCalledWith([]);
  });

  it('does not open when disabled', () => {
    const onChangeMock = vi.fn();
    render(<Cascader options={testOptions} disabled onChange={onChangeMock} />);
    
    fireEvent.click(screen.getByPlaceholderText('请选择'));
    
    expect(screen.queryByText('省份1')).not.toBeInTheDocument();
  });

  it('renders with fullWidth', () => {
    const { container } = render(<Cascader options={testOptions} fullWidth />);
    const textField = container.querySelector('[class*="MuiTextField-root"]');
    expect(textField).toBeInTheDocument();
  });

  it('supports custom locale', () => {
    render(<Cascader options={testOptions} locale={{ placeholder: '请选择区域' }} />);
    expect(screen.getByPlaceholderText('请选择区域')).toBeInTheDocument();
  });
});
