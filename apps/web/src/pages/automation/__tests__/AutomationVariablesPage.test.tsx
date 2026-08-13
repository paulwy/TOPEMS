import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/__tests__/test-utils';

import AutomationVariablesPage from '../AutomationVariablesPage';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockRemove = vi.fn();
const mockReveal = vi.fn();

vi.mock('@/api/automation', () => ({
  automationVariablesApi: {
    list: (...args: any[]) => mockList(...args),
    create: (...args: any[]) => mockCreate(...args),
    remove: (...args: any[]) => mockRemove(...args),
    reveal: (...args: any[]) => mockReveal(...args),
  },
  AutomationVariable: {},
  AutomationVariableScope: {},
}));

vi.mock('@/components/common', () => ({
  PageContainer: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid='page-container'>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

const variables = [
  { key: 'api_endpoint', value: 'https://api.example.com', scope: 'global', rule_id: '', description: 'API 基础地址', updated_at: '2026-08-10' },
  { key: 'smtp_password', value: '******', scope: 'rule', rule_id: 'rule-001', description: 'SMTP 密码', updated_at: '2026-08-11' },
];

describe('AutomationVariablesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading', async () => {
    let resolvePromise: ((v: any) => void) | undefined;
    mockList.mockReturnValue(new Promise((res) => { resolvePromise = res; }));

    renderWithProviders(<AutomationVariablesPage />);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    resolvePromise?.({ data: { items: variables } });
  });

  it('renders variable rows with key and scope', async () => {
    mockList.mockResolvedValue({ data: { items: variables } });

    renderWithProviders(<AutomationVariablesPage />);

    await waitFor(() => {
      expect(screen.getByText('api_endpoint')).toBeInTheDocument();
    });
    expect(screen.getByText('smtp_password')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    mockList.mockResolvedValue({ data: { items: [] } });

    renderWithProviders(<AutomationVariablesPage />);

    await waitFor(() => {
      expect(screen.getByText(/暂无变量/)).toBeInTheDocument();
    });
  });

  it('shows error on API failure', async () => {
    mockList.mockRejectedValue(new Error('unauthorized'));

    renderWithProviders(<AutomationVariablesPage />);

    await waitFor(() => {
      expect(screen.getByText(/unauthorized/)).toBeInTheDocument();
    });
  });

  it('opens create dialog with title', async () => {
    mockList.mockResolvedValue({ data: { items: [] } });

    renderWithProviders(<AutomationVariablesPage />);

    fireEvent.click(await screen.findByRole('button', { name: '新建变量' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('新建环境变量');
  });

  it('delete triggers remove API', async () => {
    mockList.mockResolvedValue({ data: { items: variables } });
    mockRemove.mockResolvedValue({});

    renderWithProviders(<AutomationVariablesPage />);

    await waitFor(() => {
      expect(screen.getByText('api_endpoint')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: '删除' })[0]);
    expect(mockRemove).toHaveBeenCalledWith('api_endpoint');
  });
});
