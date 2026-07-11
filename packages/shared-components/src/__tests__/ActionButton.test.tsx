import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActionButton } from '../components/ActionButton';

describe('ActionButton Component', () => {
  it('renders with label', () => {
    render(<ActionButton label="测试按钮" />);
    expect(screen.getByText('测试按钮')).toBeInTheDocument();
  });

  it('handles click event', () => {
    const handleClick = jest.fn();
    render(<ActionButton label="点击我" onClick={handleClick} />);
    fireEvent.click(screen.getByText('点击我'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables button when disabled prop is true', () => {
    const handleClick = jest.fn();
    render(<ActionButton label="禁用按钮" disabled onClick={handleClick} />);
    fireEvent.click(screen.getByText('禁用按钮'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows loading state when loading prop is true', () => {
    render(<ActionButton label="加载中" loading />);
    expect(screen.queryByText('加载中')).not.toBeInTheDocument();
  });

  it('disables button when loading', () => {
    const handleClick = jest.fn();
    render(<ActionButton label="加载中" loading onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders with different variants', () => {
    render(<ActionButton label="主按钮" variant="primary" />);
    expect(screen.getByText('主按钮')).toBeInTheDocument();

    render(<ActionButton label="次按钮" variant="secondary" />);
    expect(screen.getByText('次按钮')).toBeInTheDocument();

    render(<ActionButton label="成功按钮" variant="success" />);
    expect(screen.getByText('成功按钮')).toBeInTheDocument();

    render(<ActionButton label="警告按钮" variant="warning" />);
    expect(screen.getByText('警告按钮')).toBeInTheDocument();

    render(<ActionButton label="危险按钮" variant="danger" />);
    expect(screen.getByText('危险按钮')).toBeInTheDocument();

    render(<ActionButton label="文字按钮" variant="text" />);
    expect(screen.getByText('文字按钮')).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    render(<ActionButton label="小按钮" size="small" />);
    expect(screen.getByText('小按钮')).toBeInTheDocument();

    render(<ActionButton label="中按钮" size="medium" />);
    expect(screen.getByText('中按钮')).toBeInTheDocument();

    render(<ActionButton label="大按钮" size="large" />);
    expect(screen.getByText('大按钮')).toBeInTheDocument();
  });

  it('renders with icon', () => {
    const icon = <span data-testid="icon">图标</span>;
    render(<ActionButton label="带图标" icon={icon} />);
    expect(screen.getByText('带图标')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders icon at end position', () => {
    const icon = <span data-testid="icon">图标</span>;
    render(<ActionButton label="图标在后面" icon={icon} iconPosition="end" />);
    expect(screen.getByText('图标在后面')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders with tooltip', () => {
    render(<ActionButton label="带提示" tooltip="这是一个工具提示" />);
    expect(screen.getByText('带提示')).toBeInTheDocument();
  });

  it('renders full width', () => {
    const { container } = render(<ActionButton label="全宽按钮" fullWidth />);
    expect(container.firstChild).toHaveStyle({ width: '100%' });
  });

  it('renders with submit type', () => {
    render(<ActionButton label="提交按钮" type="submit" />);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('renders with reset type', () => {
    render(<ActionButton label="重置按钮" type="reset" />);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'reset');
  });
});