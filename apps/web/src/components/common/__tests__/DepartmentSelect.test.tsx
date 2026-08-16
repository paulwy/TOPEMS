import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import DepartmentSelect, { Department } from '../DepartmentSelect';

const i18nMap = vi.hoisted(() => ({
  'components.department_select.k0': '选择部门',
  'components.department_select.k1': '清除',
  'components.department_select.k2': '暂无部门',
} as Record<string, string>));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options && typeof options === 'object') {
        let result = i18nMap[key] ?? key;
        for (const [k, v] of Object.entries(options)) {
          result = result.replace(`{{${k}}}`, String(v));
        }
        return result;
      }
      return i18nMap[key] ?? key;
    },
    i18n: { language: 'zh-CN', changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string, options?: Record<string, unknown>) => {
      if (options && typeof options === 'object') {
        let result = i18nMap[key] ?? key;
        for (const [k, v] of Object.entries(options)) {
          result = result.replace(`{{${k}}}`, String(v));
        }
        return result;
      }
      return i18nMap[key] ?? key;
    },
  },
}));

const sampleDepartments: Department[] = [
  {
    id: 'dept-1',
    name: '技术部',
    children: [
      { id: 'dept-1-1', name: '前端组', parentId: 'dept-1' },
      { id: 'dept-1-2', name: '后端组', parentId: 'dept-1' },
    ],
  },
  {
    id: 'dept-2',
    name: '市场部',
  },
];

describe('DepartmentSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the select field with default placeholder', () => {
    renderWithProviders(
      <DepartmentSelect
        onChange={vi.fn()}
        departments={sampleDepartments}
      />
    );
    expect(screen.getByPlaceholderText('选择部门')).toBeInTheDocument();
  });

  it('renders custom placeholder when provided', () => {
    renderWithProviders(
      <DepartmentSelect
        onChange={vi.fn()}
        placeholder='请选择部门'
        departments={sampleDepartments}
      />
    );
    expect(screen.getByPlaceholderText('请选择部门')).toBeInTheDocument();
  });

  it('opens the menu and lists departments when clicked', () => {
    renderWithProviders(
      <DepartmentSelect
        onChange={vi.fn()}
        departments={sampleDepartments}
      />
    );
    const trigger = screen.getByPlaceholderText('选择部门');
    fireEvent.click(trigger);

    expect(screen.getByText('技术部')).toBeInTheDocument();
    expect(screen.getByText('市场部')).toBeInTheDocument();
  });

  it('calls onChange with selected department when a department is clicked', () => {
    const handleChange = vi.fn();
    renderWithProviders(
      <DepartmentSelect
        onChange={handleChange}
        departments={sampleDepartments}
      />
    );
    fireEvent.click(screen.getByPlaceholderText('选择部门'));
    fireEvent.click(screen.getByText('市场部'));

    expect(handleChange).toHaveBeenCalledTimes(1);
    const selected = handleChange.mock.calls[0][0] as Department;
    expect(selected.id).toBe('dept-2');
    expect(selected.name).toBe('市场部');
  });

  it('does not open menu when disabled', () => {
    const handleChange = vi.fn();
    renderWithProviders(
      <DepartmentSelect
        onChange={handleChange}
        disabled
        departments={sampleDepartments}
      />
    );
    const trigger = screen.getByPlaceholderText('选择部门');
    fireEvent.click(trigger);

    // Menu should not be open: department names should not appear in menu
    expect(screen.queryByText('市场部')).not.toBeInTheDocument();
  });

  it('displays selected value when value prop is provided', () => {
    renderWithProviders(
      <DepartmentSelect
        onChange={vi.fn()}
        departments={sampleDepartments}
        value={{ id: 'dept-2', name: '市场部' }}
      />
    );
    const trigger = screen.getByDisplayValue('市场部');
    expect(trigger).toBeInTheDocument();
  });

  it('shows loading indicator when loading is true', () => {
    renderWithProviders(
      <DepartmentSelect
        onChange={vi.fn()}
        loading
        departments={[]}
      />
    );
    fireEvent.click(screen.getByPlaceholderText('选择部门'));
    // CircularProgress role is status
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows empty hint when there are no departments', () => {
    renderWithProviders(
      <DepartmentSelect
        onChange={vi.fn()}
        departments={[]}
      />
    );
    fireEvent.click(screen.getByPlaceholderText('选择部门'));
    expect(screen.getByText('暂无部门')).toBeInTheDocument();
  });
});
