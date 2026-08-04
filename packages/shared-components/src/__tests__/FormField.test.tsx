import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormField } from '../components/FormField';

describe('FormField Component', () => {
  it('renders with name and label', () => {
    render(<FormField name="username" label="用户名" />);
    expect(screen.getByLabelText('用户名')).toBeInTheDocument();
  });

  it('renders with compact size by default', () => {
    render(<FormField name="email" label="邮箱" />);
    const input = screen.getByLabelText('邮箱');
    expect(input).toBeInTheDocument();
  });

  it('renders with non-compact size', () => {
    render(<FormField name="email" label="邮箱" compact={false} size="medium" />);
    const input = screen.getByLabelText('邮箱');
    expect(input).toBeInTheDocument();
  });

  it('renders with small size', () => {
    render(<FormField name="phone" label="电话" size="small" />);
    const input = screen.getByLabelText('电话');
    expect(input).toBeInTheDocument();
  });

  it('renders with required attribute', () => {
    const { container } = render(<FormField name="password" label="密码" required />);
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('required');
  });

  it('renders with disabled attribute', () => {
    render(<FormField name="readonly" label="只读字段" disabled />);
    const input = screen.getByLabelText('只读字段');
    expect(input).toBeDisabled();
  });

  it('renders with placeholder', () => {
    render(<FormField name="search" label="搜索" placeholder="请输入搜索内容" />);
    const input = screen.getByLabelText('搜索');
    expect(input).toHaveAttribute('placeholder', '请输入搜索内容');
  });

  it('renders with helper text', () => {
    render(<FormField name="hint" label="提示字段" helperText="这是一段提示文字" />);
    expect(screen.getByText('这是一段提示文字')).toBeInTheDocument();
  });

  it('renders with error state', () => {
    render(<FormField name="error" label="错误字段" error helperText="输入有误" />);
    expect(screen.getByText('输入有误')).toBeInTheDocument();
  });

  it('renders with different types', () => {
    render(<FormField name="password" label="密码" type="password" />);
    const input = screen.getByLabelText('密码');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('renders with multiline', () => {
    render(<FormField name="textarea" label="多行文本" multiline rows={4} />);
    const textarea = screen.getByLabelText('多行文本');
    expect(textarea).toHaveAttribute('rows', '4');
  });

  it('renders with defaultValue', () => {
    render(<FormField name="default" label="默认值" defaultValue="默认内容" />);
    const input = screen.getByLabelText('默认值');
    expect(input).toHaveValue('默认内容');
  });

  it('renders with sx styles', () => {
    const { container } = render(<FormField name="styled" label="样式字段" sx={{ width: '100%' }} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});