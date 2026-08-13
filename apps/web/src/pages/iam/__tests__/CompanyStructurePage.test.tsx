import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import CompanyStructurePage from '../CompanyStructurePage';

const mockMutate = vi.fn();

vi.mock('@/hooks/useConsolidation', () => ({
  useCompanyRelations: vi.fn(),
  useCompanyTree: vi.fn(),
  useDeleteCompanyRelation: vi.fn(),
}));

vi.mock('@/hooks', () => ({
  useConfirmDialog: vi.fn(() => ({
    confirmOpen: false,
    confirmConfig: null,
    openConfirm: vi.fn(),
    closeConfirm: vi.fn(),
  })),
}));

vi.mock('@/components/common', () => ({
  PageContainer: ({ children, title, subtitle }: any) => (
    <div data-testid='page-container'>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {children}
    </div>
  ),
}));

vi.mock('@/components/common/DataTable', () => ({
  DataTable: ({ columns, data }: any) => (
    <div data-testid='data-table'>
      <span data-testid='data-table-row-count'>{data?.length || 0}</span>
      {data?.map((row: any) => (
        <div key={row.id} data-testid={`row-${row.id}`}>
          {row.parent_company_name} → {row.child_company_name}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@topems/shared-components', () => ({
  ConfirmDialog: ({ isOpen, title, message, onClose, onConfirm }: any) => {
    if (!isOpen) return null;
    return (
      <div role='dialog' data-testid='confirm-dialog'>
        <h2>{title}</h2>
        <p>{message}</p>
        <button onClick={onConfirm}>确认</button>
        <button onClick={onClose}>取消</button>
      </div>
    );
  },
}));

vi.mock('lucide-react', async (importOriginal) => {
  const actual: any = await importOriginal();
  const React = require('react');
  const mockIcon =
    (name: string) =>
    ({ size: _s, color: _c, ...rest }: any = {}) =>
      React.createElement('svg', { 'data-testid': `icon-${name}`, ...rest });
  const allKeys = Object.keys(actual).filter(
    (k) => k[0] === k[0].toUpperCase() && k !== 'default',
  );
  const out: Record<string, any> = {};
  for (const k of allKeys) {
    out[k] = mockIcon(k);
  }
  return out;
});

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn(() => ({
    notifications: [],
    addNotification: vi.fn(),
    removeNotification: vi.fn(),
    clearNotifications: vi.fn(),
  })),
}));

import {
  useCompanyRelations,
  useCompanyTree,
  useDeleteCompanyRelation,
} from '@/hooks/useConsolidation';

describe('CompanyStructurePage', () => {
  const relations = [
    {
      id: 'rel-1',
      parent_company_name: '母公司 A',
      parent_company_code: 'PA',
      child_company_name: '子公司 B',
      child_company_code: 'CB',
      relation_type: 'subsidiary',
      ownership_percentage: 80,
      control_percentage: 100,
      effective_date: '2025-01-01',
      status: 'active',
    },
    {
      id: 'rel-2',
      parent_company_name: '母公司 A',
      parent_company_code: 'PA',
      child_company_name: '联营公司 C',
      child_company_code: 'CC',
      relation_type: 'associate',
      ownership_percentage: 30,
      control_percentage: 30,
      effective_date: '2025-03-15',
      status: 'active',
    },
  ];

  const tree = {
    id: 'pa',
    name: '母公司 A',
    code: 'PA',
    is_parent: true,
    relation_type: undefined,
    ownership_percentage: 100,
    children: [
      {
        id: 'cb',
        name: '子公司 B',
        code: 'CB',
        is_parent: false,
        relation_type: 'subsidiary',
        ownership_percentage: 80,
      },
      {
        id: 'cc',
        name: '联营公司 C',
        code: 'CC',
        is_parent: false,
        relation_type: 'associate',
        ownership_percentage: 30,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMutate.mockReset();
    (useCompanyRelations as any).mockReturnValue({
      data: { data: relations },
      isLoading: false,
    });
    (useCompanyTree as any).mockReturnValue({ data: { data: tree }, isLoading: false });
    (useDeleteCompanyRelation as any).mockReturnValue({ mutate: mockMutate });
  });

  it('renders page container with title and subtitle', () => {
    renderWithProviders(<CompanyStructurePage />);

    expect(screen.getByTestId('page-container')).toBeInTheDocument();
    expect(screen.getByText('公司架构管理')).toBeInTheDocument();
    expect(screen.getByText('管理母子公司关系，用于多公司合并报表')).toBeInTheDocument();
  });

  it('renders architecture tree with root node', () => {
    renderWithProviders(<CompanyStructurePage />);

    expect(screen.getByText('母公司 A')).toBeInTheDocument();
    expect(screen.getByText('(PA)')).toBeInTheDocument();
    expect(screen.getByText('持股 100%')).toBeInTheDocument();
  });

  it('tree nodes are collapsed by default (children hidden)', () => {
    renderWithProviders(<CompanyStructurePage />);

    expect(screen.queryByText('子公司 B')).not.toBeInTheDocument();
    expect(screen.queryByText('联营公司 C')).not.toBeInTheDocument();
  });

  it('renders relations table when switching to relations tab', () => {
    renderWithProviders(<CompanyStructurePage />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThanOrEqual(2);

    fireEvent.click(tabs[1]);

    expect(screen.getByTestId('data-table')).toBeInTheDocument();
    expect(screen.getByTestId('data-table-row-count')).toHaveTextContent('2');
    expect(screen.getByText('母公司 A → 子公司 B')).toBeInTheDocument();
    expect(screen.getByText('母公司 A → 联营公司 C')).toBeInTheDocument();
  });

  it('shows loading state for tree view', () => {
    (useCompanyTree as any).mockReturnValue({ data: undefined, isLoading: true });

    renderWithProviders(<CompanyStructurePage />);

    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('shows empty state when no tree data', () => {
    (useCompanyTree as any).mockReturnValue({ data: { data: null }, isLoading: false });

    renderWithProviders(<CompanyStructurePage />);

    expect(screen.getByText('暂无公司架构数据')).toBeInTheDocument();
  });

  it('renders statistics cards by relation type with counts', () => {
    renderWithProviders(<CompanyStructurePage />);

    expect(screen.getByText('子公司')).toBeInTheDocument();
    expect(screen.getByText('联营公司')).toBeInTheDocument();
    expect(screen.getByText('分公司')).toBeInTheDocument();
    expect(screen.getByText('合营公司')).toBeInTheDocument();
    expect(screen.getByText('使用提示')).toBeInTheDocument();
  });

  it('shows search field and accepts input', () => {
    renderWithProviders(<CompanyStructurePage />);

    const searchInputs = screen.getAllByRole('textbox');
    expect(searchInputs.length).toBeGreaterThan(0);

    fireEvent.change(searchInputs[0], { target: { value: '母公司' } });
    expect(searchInputs[0]).toHaveValue('母公司');
  });
});
