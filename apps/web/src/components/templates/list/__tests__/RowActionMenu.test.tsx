import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { RowActionMenu } from '../RowActionMenu';
import { renderWithProviders } from '@/__tests__/test-utils';
import type { RowAction } from '../types';

interface TestRow {
  id: string;
  name: string;
}

const selectedRow: TestRow = { id: '1', name: '测试项目' };

describe('RowActionMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when actions array is empty or undefined', () => {
    const { container, rerender } = renderWithProviders(
      <table>
        <tbody>
          <tr>
            <td>
              <RowActionMenu
                anchorEl={null}
                open={false}
                selectedRow={selectedRow}
                actions={undefined}
                onClose={vi.fn()}
                onAction={vi.fn()}
              />
            </td>
          </tr>
        </tbody>
      </table>
    );
    expect(container.querySelector('[role="menu"]')).not.toBeInTheDocument();

    rerender(
      <table>
        <tbody>
          <tr>
            <td>
              <RowActionMenu
                anchorEl={null}
                open={false}
                selectedRow={selectedRow}
                actions={[]}
                onClose={vi.fn()}
                onAction={vi.fn()}
              />
            </td>
          </tr>
        </tbody>
      </table>
    );
    expect(container.querySelector('[role="menu"]')).not.toBeInTheDocument();
  });

  it('renders menu items when actions are provided and menu is open', () => {
    const actions: RowAction<TestRow>[] = [{ label: '编辑' }, { label: '删除' }];
    const anchorEl = document.createElement('div');
    document.body.appendChild(anchorEl);
    renderWithProviders(
      <RowActionMenu
        anchorEl={anchorEl}
        open
        selectedRow={selectedRow}
        actions={actions}
        onClose={vi.fn()}
        onAction={vi.fn()}
      />
    );
    expect(screen.getByText('编辑')).toBeInTheDocument();
    expect(screen.getByText('删除')).toBeInTheDocument();
  });

  it('calls onAction with the correct action when a menu item is clicked', () => {
    const handleAction = vi.fn();
    const actions: RowAction<TestRow>[] = [
      { label: '编辑', onClick: vi.fn() },
      { label: '删除', onClick: vi.fn() },
    ];
    const anchorEl = document.createElement('div');
    document.body.appendChild(anchorEl);
    renderWithProviders(
      <RowActionMenu
        anchorEl={anchorEl}
        open
        selectedRow={selectedRow}
        actions={actions}
        onClose={vi.fn()}
        onAction={handleAction}
      />
    );
    fireEvent.click(screen.getByText('删除'));
    expect(handleAction).toHaveBeenCalledWith(actions[1]);
  });

  it('filters actions based on show function', () => {
    const actions: RowAction<TestRow>[] = [
      { label: '编辑' },
      { label: '删除', show: (row) => row.name === '隐藏' },
    ];
    const anchorEl = document.createElement('div');
    document.body.appendChild(anchorEl);
    renderWithProviders(
      <RowActionMenu
        anchorEl={anchorEl}
        open
        selectedRow={selectedRow}
        actions={actions}
        onClose={vi.fn()}
        onAction={vi.fn()}
      />
    );
    expect(screen.getByText('编辑')).toBeInTheDocument();
    expect(screen.queryByText('删除')).not.toBeInTheDocument();
  });

  it('renders action icons when provided', () => {
    const actions: RowAction<TestRow>[] = [
      {
        label: '编辑',
        icon: <span data-testid='edit-icon'>✏️</span>,
      },
    ];
    const anchorEl = document.createElement('div');
    document.body.appendChild(anchorEl);
    renderWithProviders(
      <RowActionMenu
        anchorEl={anchorEl}
        open
        selectedRow={selectedRow}
        actions={actions}
        onClose={vi.fn()}
        onAction={vi.fn()}
      />
    );
    expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
  });
});
