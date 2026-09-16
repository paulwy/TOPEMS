import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Input } from '../Input';

describe('Input', () => {
  it('renders with placeholder', () => {
    render(<Input placeholder='请输入内容' />);

    expect(screen.getByPlaceholderText('请输入内容')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(
      <Input
        label='用户名'
        placeholder='请输入用户名'
      />
    );

    expect(screen.getByText('用户名')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument();
  });

  it('renders with error', () => {
    render(<Input error='用户名不能为空' />);

    expect(screen.getByText('用户名不能为空')).toBeInTheDocument();
  });

  it('renders with disabled state', () => {
    render(<Input disabled={true} />);

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });
});
