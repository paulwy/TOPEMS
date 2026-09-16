import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Select } from '../Select';

const options = [
  { value: 'active', label: '活跃' },
  { value: 'inactive', label: '不活跃' },
];

describe('Select', () => {
  it('renders with label', () => {
    render(
      <Select
        label='状态'
        options={options}
      />
    );

    expect(screen.getByText('状态')).toBeInTheDocument();
  });

  it('renders with options', () => {
    render(
      <Select
        label='状态'
        options={options}
      />
    );

    // 下拉框应该显示
    const selectElement = document.querySelector('select');
    expect(selectElement).toBeInTheDocument();
  });

  it('renders with placeholder', () => {
    render(
      <Select
        label='状态'
        options={options}
        placeholder='请选择状态'
      />
    );

    expect(screen.getByText('请选择状态')).toBeInTheDocument();
  });

  it('renders with disabled state', () => {
    render(
      <Select
        label='状态'
        options={options}
        disabled={true}
      />
    );

    const selectElement = document.querySelector('select');
    expect(selectElement).toBeDisabled();
  });
});
