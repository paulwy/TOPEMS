import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { StatusBadge, DEFAULT_STATUS_MAP } from '@topems/shared-components';
import { renderWithProviders } from '@/__tests__/test-utils';

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: unknown) =>
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
  useAuthStore: vi.fn((selector?: unknown) =>
    selector
      ? selector({
          user: null,
        })
      : {
          user: null,
        }
  ),
}));

describe('StatusBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders default status badge with label', () => {
    renderWithProviders(<StatusBadge status='active' />);
    expect(screen.getByText('启用')).toBeInTheDocument();
  });

  it('renders with different status values from DEFAULT_STATUS_MAP', () => {
    const { rerender } = renderWithProviders(<StatusBadge status='pending' />);
    expect(screen.getByText('待处理')).toBeInTheDocument();

    rerender(<StatusBadge status='approved' />);
    expect(screen.getByText('已批准')).toBeInTheDocument();

    rerender(<StatusBadge status='rejected' />);
    expect(screen.getByText('已拒绝')).toBeInTheDocument();

    rerender(<StatusBadge status='draft' />);
    expect(screen.getByText('草稿')).toBeInTheDocument();

    rerender(<StatusBadge status='processing' />);
    expect(screen.getByText('处理中')).toBeInTheDocument();

    rerender(<StatusBadge status='success' />);
    expect(screen.getByText('成功')).toBeInTheDocument();

    rerender(<StatusBadge status='warning' />);
    expect(screen.getByText('警告')).toBeInTheDocument();

    rerender(<StatusBadge status='error' />);
    expect(screen.getByText('错误')).toBeInTheDocument();

    rerender(<StatusBadge status='info' />);
    expect(screen.getByText('信息')).toBeInTheDocument();
  });

  it('renders with custom statusMap', () => {
    const customMap = {
      custom_status: { label: '自定义状态', color: 'info' as const },
    };
    renderWithProviders(
      <StatusBadge
        status='custom_status'
        statusMap={customMap}
      />
    );
    expect(screen.getByText('自定义状态')).toBeInTheDocument();
  });

  it('renders with custom label prop', () => {
    renderWithProviders(
      <StatusBadge
        status='active'
