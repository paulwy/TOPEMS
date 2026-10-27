import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import DepartmentSelect, { Department } from '../DepartmentSelect';

const i18nMap = vi.hoisted(
  () =>
    ({
      'components.department_select.k0': '选择部门',
      'components.department_select.k1': '清除',
      'components.department_select.k2': '暂无部门',
    }) as Record<string, string>
);

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
