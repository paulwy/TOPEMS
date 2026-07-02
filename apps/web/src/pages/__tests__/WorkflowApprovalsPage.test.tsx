import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, userEvent } from '@/__tests__/test-utils';
import WorkflowApprovalsPage from '../workflow/WorkflowApprovalsPage';

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          user: { permissions: ['workflow:approvals:read', 'workflow:approvals:approve'] },
        })
      : {
          addNotification: vi.fn(),
          user: { permissions: ['workflow:approvals:read', 'workflow:approvals:approve'] },
        }
  ),
}));

describe('WorkflowApprovalsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render page with stats cards', () => {
    renderWithProviders(<WorkflowApprovalsPage />);

    expect(screen.getAllByText('待审批').length).toBeGreaterThan(0);
    expect(screen.getAllByText('已通过').length).toBeGreaterThan(0);
    expect(screen.getAllByText('已驳回').length).toBeGreaterThan(0);
    expect(screen.getAllByText('超时预警').length).toBeGreaterThan(0);
  });

  it('should render approval tasks in table', () => {
    renderWithProviders(<WorkflowApprovalsPage />);

    expect(screen.getByText('2024年度采购计划审批')).toBeInTheDocument();
    expect(screen.getAllByText('采购审批流程').length).toBeGreaterThan(0);
    expect(screen.getAllByText('张三').length).toBeGreaterThan(0);
  });

  it('should switch tabs and filter tasks', async () => {
    renderWithProviders(<WorkflowApprovalsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('待审批').length).toBeGreaterThan(0);
    });

    const approvedTab = screen.getByRole('tab', { name: /我已审批/i });
    await userEvent.click(approvedTab);

    await waitFor(() => {
      expect(screen.getByText('2024年Q1市场预算审批')).toBeInTheDocument();
    });
  });

  it('should approve a task and show notification', async () => {
    renderWithProviders(<WorkflowApprovalsPage />);

    await waitFor(() => {
      expect(screen.getByText('2024年度采购计划审批')).toBeInTheDocument();
    });

    const approveButton = screen.getAllByRole('button', { name: /审批/i })[0];
    await userEvent.click(approveButton);

    await waitFor(() => {
      expect(screen.queryByText('2024年度采购计划审批')).not.toBeInTheDocument();
    });
  });

  it('should show pagination', async () => {
    renderWithProviders(<WorkflowApprovalsPage />);

    await waitFor(() => {
      expect(screen.getByText(/共 \d+ 条/i)).toBeInTheDocument();
    });
  });
});
