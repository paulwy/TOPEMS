import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/__tests__/test-utils';

import WorkflowConfigPage from '../WorkflowConfigPage';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockRemove = vi.fn();
const mockEnable = vi.fn();
const mockDisable = vi.fn();

vi.mock('@/api/lowcode', () => ({
  lowcodeWorkflowsApi: {
    list: (...args: any[]) => mockList(...args),
    create: (...args: any[]) => mockCreate(...args),
    remove: (...args: any[]) => mockRemove(...args),
    enable: (...args: any[]) => mockEnable(...args),
    disable: (...args: any[]) => mockDisable(...args),
  },
  LowcodeWorkflow: {},
  LowcodeWorkflowTriggerType: {},
}));

vi.mock('@/components/common', () => ({
  PageContainer: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid='page-container'>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

const workflows = [
  { id: 'w1', app_id: 'crm', name: '客户自动分配', code: 'auto_assign', trigger: { type: 'record_create' }, nodes: [{ id: 'n1' }, { id: 'n2' }], status: 'enabled', updated_at: '2026-08-10' },
  { id: 'w2', app_id: 'crm', name: '回款提醒', code: 'payment_remind', trigger: { type: 'schedule' }, nodes: [{ id: 'n1' }], status: 'disabled', updated_at: '2026-08-11' },
];

describe('WorkflowConfigPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading', async () => {
    let resolvePromise: ((v: any) => void) | undefined;
    mockList.mockReturnValue(new Promise((res) => { resolvePromise = res; }));

    renderWithProviders(<WorkflowConfigPage />);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    resolvePromise?.({ data: { items: workflows } });
  });

  it('renders workflow rows', async () => {
    mockList.mockResolvedValue({ data: { items: workflows } });

    renderWithProviders(<WorkflowConfigPage />);

    await waitFor(() => {
      expect(screen.getByText('客户自动分配')).toBeInTheDocument();
    });
    expect(screen.getByText('auto_assign')).toBeInTheDocument();
    expect(screen.getByText('回款提醒')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    mockList.mockResolvedValue({ data: { items: [] } });

    renderWithProviders(<WorkflowConfigPage />);

    await waitFor(() => {
      expect(screen.getByText(/暂无工作流/)).toBeInTheDocument();
    });
  });

  it('shows error on API failure', async () => {
    mockList.mockRejectedValue(new Error('server error'));

    renderWithProviders(<WorkflowConfigPage />);

    await waitFor(() => {
      expect(screen.getByText(/server error/)).toBeInTheDocument();
    });
  });

  it('opens create dialog and validates required fields', async () => {
    mockList.mockResolvedValue({ data: { items: [] } });

    renderWithProviders(<WorkflowConfigPage />);

    fireEvent.click(await screen.findByRole('button', { name: '新建工作流' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('新建工作流');

    const createBtn = screen.getByRole('button', { name: '创建' });
    expect(createBtn).toBeDisabled();

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'crm' } });
    fireEvent.change(inputs[1], { target: { value: 'w_new' } });
    fireEvent.change(inputs[2], { target: { value: '新工作流' } });

    expect(createBtn).not.toBeDisabled();
  });

  it('toggle enable/disable triggers correct API', async () => {
    mockList.mockResolvedValue({ data: { items: workflows } });
    mockEnable.mockResolvedValue({});
    mockDisable.mockResolvedValue({});

    renderWithProviders(<WorkflowConfigPage />);

    await waitFor(() => {
      expect(screen.getByText('客户自动分配')).toBeInTheDocument();
    });

    const toggleBtns = screen.getAllByRole('button', { name: /(启用|禁用)/ });
    fireEvent.click(toggleBtns[0]);
    expect(mockDisable).toHaveBeenCalledWith('w1');

    fireEvent.click(toggleBtns[1]);
    expect(mockEnable).toHaveBeenCalledWith('w2');
  });
});
