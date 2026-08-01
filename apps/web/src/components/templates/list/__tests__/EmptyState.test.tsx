import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { ListEmptyState } from '../EmptyState';
import { renderWithProviders } from '@/__tests__/test-utils';

vi.mock('@topems/shared-components', () => ({
  EmptyState: ({ title, description, action, icon }: any) => (
    <div data-testid='empty-state'>
      {icon}
      <span>{title}</span>
      <span>{description}</span>
      {action && <button onClick={action.onClick}>{action.label}</button>}
    </div>
  ),
  ErrorEmptyState: ({ error, onRetry }: any) => (
    <div data-testid='error-empty-state'>
      <span>{error}</span>
      {onRetry && <button onClick={onRetry}>重试</button>}
    </div>
  ),
}));

describe('ListEmptyState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeletons when loading is true', () => {
    const { container } = renderWithProviders(
      <table>
        <tbody>
          <ListEmptyState
            colSpan={3}
            loading
            emptyMessage='暂无数据'
            visibleColumnCount={2}
          />
        </tbody>
      </table>
    );
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('renders error state when error is provided', () => {
    renderWithProviders(
      <table>
        <tbody>
          <ListEmptyState
            colSpan={3}
            error='加载失败'
            emptyMessage='暂无数据'
            onRefresh={vi.fn()}
            visibleColumnCount={2}
          />
        </tbody>
      </table>
    );
    expect(screen.getByTestId('error-empty-state')).toBeInTheDocument();
    expect(screen.getByText('加载失败')).toBeInTheDocument();
  });

  it('renders empty state with default message when not loading and no error', () => {
    renderWithProviders(
      <table>
        <tbody>
          <ListEmptyState
            colSpan={3}
            emptyMessage='暂无数据'
            visibleColumnCount={2}
          />
        </tbody>
      </table>
    );
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('renders empty state with custom empty message', () => {
    renderWithProviders(
      <table>
        <tbody>
          <ListEmptyState
            colSpan={3}
            emptyMessage='暂无数据'
            visibleColumnCount={2}
          />
        </tbody>
      </table>
    );
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  it('renders action button when emptyActionButton is provided', () => {
    const handleClick = vi.fn();
    renderWithProviders(
      <table>
        <tbody>
          <ListEmptyState
            colSpan={3}
            emptyMessage='暂无数据'
            emptyActionButton={{
              label: '新增',
              onClick: handleClick,
            }}
            visibleColumnCount={2}
          />
        </tbody>
      </table>
    );
    const button = screen.getByRole('button', { name: '新增' });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders skeletons with selectable column when selectable is true', () => {
    const { container } = renderWithProviders(
      <table>
        <tbody>
          <ListEmptyState
            colSpan={3}
            loading
            emptyMessage='暂无数据'
            selectable
            visibleColumnCount={2}
          />
        </tbody>
      </table>
    );
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });
});
