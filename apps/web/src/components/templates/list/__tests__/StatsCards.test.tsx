import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { StatsCards } from '../StatsCards';
import { renderWithProviders } from '@/__tests__/test-utils';

describe('StatsCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when cards array is empty', () => {
    const { container, rerender } = renderWithProviders(<StatsCards cards={[]} />);
    expect(container.firstChild).toBeNull();

    rerender(<StatsCards cards={undefined as any} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders without crashing with cards', () => {
    renderWithProviders(<StatsCards cards={[{ key: 'total', label: '总数', value: 100 }]} />);
    expect(screen.getByText('总数')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders multiple cards', () => {
    renderWithProviders(
      <StatsCards
        cards={[
          { key: 'total', label: '总数', value: 100 },
          { key: 'active', label: '活跃', value: 50 },
          { key: 'inactive', label: '停用', value: 50 },
        ]}
      />
    );
    expect(screen.getByText('总数')).toBeInTheDocument();
    expect(screen.getByText('活跃')).toBeInTheDocument();
    expect(screen.getByText('停用')).toBeInTheDocument();
  });

  it('renders string values', () => {
    renderWithProviders(<StatsCards cards={[{ key: 'status', label: '状态', value: '正常' }]} />);
    expect(screen.getByText('正常')).toBeInTheDocument();
  });

  it('renders undefined value as empty', () => {
    renderWithProviders(<StatsCards cards={[{ key: 'empty', label: '空值', value: undefined }]} />);
    expect(screen.getByText('空值')).toBeInTheDocument();
  });

  it('renders cards with different colors', () => {
    const { container } = renderWithProviders(
      <StatsCards
        cards={[
          { key: 'success', label: '成功', value: 10, color: 'success' },
          { key: 'error', label: '失败', value: 5, color: 'error' },
          { key: 'warning', label: '警告', value: 3, color: 'warning' },
        ]}
      />
    );
    // All cards should be rendered
    expect(screen.getByText('成功')).toBeInTheDocument();
    expect(screen.getByText('失败')).toBeInTheDocument();
    expect(screen.getByText('警告')).toBeInTheDocument();
    // Should render Paper components
    expect(container.querySelectorAll('.MuiPaper-root').length).toBe(3);
  });
});
