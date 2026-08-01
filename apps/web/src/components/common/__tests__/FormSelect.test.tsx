import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { FormSelect } from '../FormSelect';
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

const sampleOptions = [
  { value: 'dev', label: '研发部' },
  { value: 'hr', label: '人力资源部' },
  { value: 'finance', label: '财务部' },
];

describe('FormSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders label', () => {
    renderWithProviders(
      <FormSelect
        name='department'
        label='所属部门'
        options={sampleOptions}
      />
    );
    // 标签文本同时出现在 InputLabel 和 notched outline legend 中
    const labels = screen.getAllByText('所属部门');
    expect(labels.length).toBeGreaterThan(0);
  });

  it('renders all option labels when opened', () => {
    renderWithProviders(
      <FormSelect
        name='department'
        label='所属部门'
        options={sampleOptions}
      />
    );
    // MUI Select 触发器使用 role="combobox"
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /所属部门/i }));
    sampleOptions.forEach((opt) => {
      expect(screen.getByText(opt.label)).toBeInTheDocument();
    });
  });

  it('renders placeholder when no value is selected', () => {
    renderWithProviders(
      <FormSelect
        name='department'
        label='所属部门'
        options={sampleOptions}
        placeholder='请选择部门'
      />
    );
    expect(screen.getByText('请选择部门')).toBeInTheDocument();
  });

  it('renders selected value label', () => {
    renderWithProviders(
      <FormSelect
        name='department'
        label='所属部门'
        options={sampleOptions}
        value='dev'
      />
    );
    expect(screen.getByText('研发部')).toBeInTheDocument();
  });

  it('calls onChange when an option is selected', () => {
    const handleChange = vi.fn();
    renderWithProviders(
      <FormSelect
        name='department'
        label='所属部门'
        options={sampleOptions}
        onChange={handleChange}
      />
    );
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /所属部门/i }));
    // Click the "人力资源部" option in the dropdown
    const option = screen.getByText('人力资源部');
    fireEvent.click(option);
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith('hr');
  });

  it('renders disabled state', () => {
    renderWithProviders(
      <FormSelect
        name='department'
        label='所属部门'
        options={sampleOptions}
        disabled
      />
    );
    const select = screen.getByRole('combobox', { name: /所属部门/i });
    expect(select).toHaveAttribute('aria-disabled', 'true');
  });

  it('renders error helper text when error is provided', () => {
    renderWithProviders(
      <FormSelect
        name='department'
        label='所属部门'
        options={sampleOptions}
        error='请选择一个部门'
      />
    );
    expect(screen.getByText('请选择一个部门')).toBeInTheDocument();
  });

  it('renders required indicator when required is true', () => {
    renderWithProviders(
      <FormSelect
        name='department'
        label='所属部门'
        options={sampleOptions}
        required
      />
    );
    // MUI FormControlLabel adds an asterisk for required fields
    expect(screen.getByText('所属部门')).toBeInTheDocument();
    const asterisk = screen.getByText('*');
    expect(asterisk).toBeInTheDocument();
  });

  it('renders multiple selected values joined by comma', () => {
    renderWithProviders(
      <FormSelect
        name='departments'
        label='关联部门'
        options={sampleOptions}
        multiple
        value={['dev', 'hr']}
      />
    );
    expect(screen.getByText('研发部, 人力资源部')).toBeInTheDocument();
  });
});
