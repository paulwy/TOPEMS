import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FormField from '../FormField';

describe('FormField', () => {
  it('should render with name and label', () => {
    render(
      <FormField
        name='username'
        label='用户名'
      />
    );
    const input = screen.getByLabelText('用户名');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('name', 'username');
  });

  it('should render with default value', () => {
    render(
      <FormField
        name='username'
        label='用户名'
        defaultValue='testuser'
      />
    );
    const input = screen.getByLabelText('用户名') as HTMLInputElement;
    expect(input.value).toBe('testuser');
  });

  it('should call onChange when value changes', () => {
    const handleChange = vi.fn();
    render(
      <FormField
        name='username'
        label='用户名'
        onChange={handleChange}
      />
    );
    const input = screen.getByLabelText('用户名');
    fireEvent.change(input, { target: { value: 'newvalue' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('should render with helper text', () => {
    render(
      <FormField
        name='username'
        label='用户名'
        helperText='请输入用户名'
      />
    );
    expect(screen.getByText('请输入用户名')).toBeInTheDocument();
  });

  it('should render error state with error message', () => {
    render(
      <FormField
        name='username'
        label='用户名'
        error={true}
        helperText='用户名不能为空'
      />
    );
    const input = screen.getByLabelText('用户名');
    expect(input).toBeInTheDocument();
    expect(screen.getByText('用户名不能为空')).toBeInTheDocument();
  });

  it('should render disabled state', () => {
    render(
      <FormField
        name='username'
        label='用户名'
        disabled={true}
      />
    );
    const input = screen.getByLabelText('用户名');
    expect(input).toBeDisabled();
  });

  it('should render required field', () => {
    render(
      <FormField
        name='username'
        label='用户名'
        required={true}
      />
    );
    const input = screen.getByRole('textbox', { name: /用户名/ });
    expect(input).toBeRequired();
  });

  it('should render with placeholder', () => {
    render(
      <FormField
        name='username'
        label='用户名'
        placeholder='请输入用户名'
      />
    );
    const input = screen.getByPlaceholderText('请输入用户名');
    expect(input).toBeInTheDocument();
  });

  it('should render with different types', () => {
    render(
      <FormField
        name='password'
        label='密码'
        type='password'
      />
    );
    const input = screen.getByLabelText('密码') as HTMLInputElement;
    expect(input.type).toBe('password');
  });

  it('should render in compact mode by default', () => {
    render(
      <FormField
        name='username'
        label='用户名'
      />
    );
    const input = screen.getByLabelText('用户名');
    expect(input).toBeInTheDocument();
  });

  it('should render with custom size when compact is false', () => {
    render(
      <FormField
        name='username'
        label='用户名'
        compact={false}
        size='medium'
      />
    );
    const input = screen.getByLabelText('用户名');
    expect(input).toBeInTheDocument();
  });

  it('should render with multiline', () => {
    render(
      <FormField
        name='description'
        label='描述'
        multiline={true}
        rows={4}
      />
    );
    const textarea = screen.getByLabelText('描述');
    expect(textarea).toBeInTheDocument();
  });
});
