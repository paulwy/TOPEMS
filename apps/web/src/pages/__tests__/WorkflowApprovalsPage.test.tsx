import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import WorkflowApprovalsPage from '../workflow/WorkflowApprovalsPage';
import { approvalTaskApi } from '@/api/workflow/approval';

vi.mock('@/components/common', () => {
  const MockPageContainer = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children || 'MockPageContainer');
  const MockConfirmDialog = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children || 'MockConfirmDialog');
  return {
    PageContainer: MockPageContainer,
    ConfirmDialog: MockConfirmDialog,
    Grid: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('div', null, children),
  };
});

vi.mock('@/components/templates/ListPageTemplate', () => ({
  default: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children || 'MockListPageTemplate'),
}));

vi.mock('@/components/templates/CrudPage', () => {
  const MockCrudPage = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children || 'MockCrudPage');
  return {
    default: MockCrudPage,
    CrudPage: MockCrudPage,
  };
});

vi.mock('@/api/workflow/approval', () => ({
  approvalTaskApi: {
    listApprovalTasks: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [], total: 0 },
    }),
    getApprovalTask: vi.fn(),
    approveTask: vi.fn(),
    rejectTask: vi.fn(),
    delegateTask: vi.fn(),
    reassignTask: vi.fn(),
    claimTask: vi.fn(),
    unclaimTask: vi.fn(),
  },
}));

describe('WorkflowApprovalsPage', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <WorkflowApprovalsPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have approval task API methods defined', () => {
    expect(approvalTaskApi.listApprovalTasks).toBeDefined();
    expect(approvalTaskApi.approveTask).toBeDefined();
    expect(approvalTaskApi.rejectTask).toBeDefined();
  });
});
