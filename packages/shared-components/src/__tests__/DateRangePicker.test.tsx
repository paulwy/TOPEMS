import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateRangePicker } from '../components/DateRangePicker';

describe('DateRangePicker Component', () => {
  it('renders with placeholder', () => {
    render(<DateRangePicker />);
    expect(screen.getByPlaceholderText('选择日期范围')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(<DateRangePicker placeholder="请选择时间范围" />);
    expect(screen.getByPlaceholderText('请选择时间范围')).toBeInTheDocument();
  });

  it('displays selected date range', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');
    render(<DateRangePicker value={{ startDate, endDate }} />);
    expect(screen.getByDisplayValue('2024-01-01 ~ 2024-01-31')).toBeInTheDocument();
  });

  it('displays only start date when end date is null', () => {
    const startDate = new Date('2024-01-01');
    render(<DateRangePicker value={{ startDate, endDate: null }} />);
    expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument();
  });

  it('calls onChange when confirming date range', () => {
    const onChangeMock = vi.fn();
    render(<DateRangePicker onChange={onChangeMock} />);
    
    fireEvent.click(screen.getByPlaceholderText('选择日期范围'));
    fireEvent.click(screen.getByText('今天'));
    fireEvent.click(screen.getByText('确定'));
    
    expect(onChangeMock).toHaveBeenCalled();
  });

  it('calls onChange when clearing value', () => {
    const onChangeMock = vi.fn();
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');
    render(<DateRangePicker value={{ startDate, endDate }} onChange={onChangeMock} />);
    
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    
    expect(onChangeMock).toHaveBeenCalledWith({ startDate: null, endDate: null });
  });

  it('does not open when disabled', () => {
    render(<DateRangePicker disabled />);
    
    fireEvent.click(screen.getByPlaceholderText('选择日期范围'));
    
    expect(screen.queryByText('快速选择')).not.toBeInTheDocument();
  });

  it('renders with fullWidth', () => {
    const { container } = render(<DateRangePicker fullWidth />);
    const textField = container.querySelector('[class*="MuiTextField-root"]');
    expect(textField).toBeInTheDocument();
  });

  it('renders preset buttons', () => {
    render(<DateRangePicker />);
    
    fireEvent.click(screen.getByPlaceholderText('选择日期范围'));
    
    expect(screen.getByText('今天')).toBeInTheDocument();
    expect(screen.getByText('本周')).toBeInTheDocument();
    expect(screen.getByText('本月')).toBeInTheDocument();
  });

  it('supports custom presets', () => {
    const customPresets = [
      { label: '最近3天', days: 3 },
      { label: '最近7天', days: 7 },
    ];
    render(<DateRangePicker presets={customPresets} />);
    
    fireEvent.click(screen.getByPlaceholderText('选择日期范围'));
    
    expect(screen.getByText('最近3天')).toBeInTheDocument();
    expect(screen.getByText('最近7天')).toBeInTheDocument();
  });

  it('calls onChange when clicking preset', () => {
    const onChangeMock = vi.fn();
    render(<DateRangePicker onChange={onChangeMock} />);
    
    fireEvent.click(screen.getByPlaceholderText('选择日期范围'));
    fireEvent.click(screen.getByText('本周'));
    
    expect(onChangeMock).not.toHaveBeenCalled();
    
    fireEvent.click(screen.getByText('确定'));
    
    expect(onChangeMock).toHaveBeenCalled();
  });

  it('supports custom locale', () => {
    render(<DateRangePicker locale={{ placeholder: '请选择时间段' }} />);
    expect(screen.getByPlaceholderText('请选择时间段')).toBeInTheDocument();
  });
});
