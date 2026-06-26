import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '../DataTable';
import { useAppStore } from '@/store';
import { useExportData } from '@/hooks/useDataTable';

vi.mock('@/store', () => ({
  useAppStore: vi.fn(),
}));

vi.mock('@/hooks/useDataTable', () => ({
  useExportData: vi.fn(),
}));

const mockAddNotification = vi.fn();
const mockUseAppStore = useAppStore as vi.Mock;
const mockUseExportData = useExportData as vi.Mock;

interface TestData {
  id: string;
  name: string;
  email: string;
  status: string;
}

const mockData: TestData[] = [
  { id: '1', name: '张三', email: 'zhangsan@example.com', status: 'active' },
  { id: '2', name: '李四', email: 'lisi@example.com', status: 'inactive' },
  { id: '3', name: '王五', email: 'wangwu@example.com', status: 'active' },
];

const columns: ColumnDef<TestData>[] = [
  {
    accessorKey: 'name',
    header: '姓名',
  },
  {
    accessorKey: 'email',
    header: '邮箱',
  },
  {
    accessorKey: 'status',
    header: '状态',
  },
];

describe('DataTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppStore.mockReturnValue({
      addNotification: mockAddNotification,
    });
    mockUseExportData.mockReturnValue({
      exportToCSV: vi.fn().mockReturnValue({ success: true }),
      exportToExcel: vi.fn().mockReturnValue({ success: true }),
    });
  });

  it('should render table with data', () => {
    render(
      <DataTable
        columns={columns}
        data={mockData}
        enablePagination={false}
        showSearch={false}
        showExport={false}
      />
    );
    expect(screen.getByText('姓名')).toBeInTheDocument();
    expect(screen.getByText('邮箱')).toBeInTheDocument();
    expect(screen.getByText('状态')).toBeInTheDocument();
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('李四')).toBeInTheDocument();
    expect(screen.getByText('王五')).toBeInTheDocument();
  });

  it('should render empty message when no data', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        enablePagination={false}
        emptyMessage='暂无数据'
        showSearch={false}
        showExport={false}
      />
    );
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  it('should render search box when showSearch and searchKey are provided', () => {
    render(
      <DataTable
        columns={columns}
        data={mockData}
        showSearch={true}
        searchKey='name'
        enablePagination={false}
        showExport={false}
      />
    );
    const searchInput = screen.getByPlaceholderText('搜索...');
    expect(searchInput).toBeInTheDocument();
  });

  it('should render create button when showCreate and onCreate are provided', () => {
    const handleCreate = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={mockData}
        showCreate={true}
        onCreate={handleCreate}
        enablePagination={false}
        showSearch={false}
        showExport={false}
      />
    );
    const createButton = screen.getByRole('button', { name: /新建/i });
    expect(createButton).toBeInTheDocument();
  });

  it('should call onCreate when create button is clicked', () => {
    const handleCreate = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={mockData}
        showCreate={true}
        onCreate={handleCreate}
        enablePagination={false}
        showSearch={false}
        showExport={false}
      />
    );
    const createButton = screen.getByRole('button', { name: /新建/i });
    fireEvent.click(createButton);
    expect(handleCreate).toHaveBeenCalledTimes(1);
  });

  it('should render selection checkboxes when showSelection is true', () => {
    render(
      <DataTable
        columns={columns}
        data={mockData}
        showSelection={true}
        enablePagination={false}
        showSearch={false}
        showExport={false}
      />
    );
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(1);
  });

  it('should call onRowClick when row is clicked', () => {
    const handleRowClick = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={mockData}
        onRowClick={handleRowClick}
        enablePagination={false}
        showSearch={false}
        showExport={false}
      />
    );
    const rows = screen.getAllByRole('row');
    const dataRow = rows[1];
    fireEvent.click(dataRow);
    expect(handleRowClick).toHaveBeenCalledTimes(1);
  });

  it('should render loading state when loading is true', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        loading={true}
        enablePagination={false}
        showSearch={false}
        showExport={false}
      />
    );
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('should render refresh button when onRefresh is provided', () => {
    const handleRefresh = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={mockData}
        showRefresh={true}
        onRefresh={handleRefresh}
        enablePagination={false}
        showSearch={false}
        showExport={false}
      />
    );
    const refreshButton = screen.getByRole('button', { name: /刷新/i });
    expect(refreshButton).toBeInTheDocument();
  });

  it('should call onRefresh when refresh button is clicked', () => {
    const handleRefresh = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={mockData}
        showRefresh={true}
        onRefresh={handleRefresh}
        enablePagination={false}
        showSearch={false}
        showExport={false}
      />
    );
    const refreshButton = screen.getByRole('button', { name: /刷新/i });
    fireEvent.click(refreshButton);
    expect(handleRefresh).toHaveBeenCalledTimes(1);
  });
});
