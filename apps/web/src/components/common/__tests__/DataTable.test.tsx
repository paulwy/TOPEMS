import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '../DataTable';
import { useNotificationStore, useAuthStore } from '@/store';
import { useExportData } from '@/hooks/useDataTable';

vi.mock('react-i18next', () => {
  const i18nMap: Record<string, string> = {
    'components.data_table.k0': '搜索...',
    'components.data_table.k1': '刷新',
    'components.data_table.k2': '导出',
    'components.data_table.k3': '列设置',
    'components.data_table.k4': '条记录',
    'components.data_table.k5': '取消选择',
    'components.data_table.k6': '重置列配置',
    'components.data_table.k7': '展开',
    'components.data_table.k8': '加载中...',
    'components.data_table.k9': '每页',
    'components.data_table.k10': '上一页',
    'components.data_table.k11': '下一页',
    'components.data_table.k12': '重置',
    'components.data_table.k13': '应用筛选',
    'shared.data_table.k0': '展开',
    'shared.data_table.k1': '新建',
    'shared.data_table.k2': '暂无数据',
    'shared.data_table.k3': '保存成功',
    'shared.data_table.k4': '数据已成功更新',
    'shared.data_table.k5': '导出成功',
    'shared.data_table.csv_6': '数据已成功导出为 CSV 文件',
    'shared.data_table.k7': '导出失败',
    'shared.data_table.k8': '导出过程中发生错误',
    'shared.data_table.k9': '导出成功',
    'shared.data_table.excel_10': '数据已成功导出为 Excel 文件',
    'shared.data_table.k11': '导出失败',
    'shared.data_table.k12': '导出过程中发生错误',
    'shared.data_table.csv_13': '导出 CSV',
    'shared.data_table.excel_14': '导出 Excel',
    'shared.data_table.k15': '展开',
    'shared.data_table.k16': '保存',
    'shared.data_table.k17': '关闭',
    'shared.data_table.k18': '展开',
    'shared.data_table.k19': '展开',
    'shared.data_table.k20': '高级筛选',
    'shared.data_table.k21': '全部',
    'shared.data_table.k22': '暂无数据',
    'components.common.dataTable.k3': '已选择',
    'components.common.dataTable.k4': '显示/隐藏列',
    'components.common.dataTable.k5': '条记录',
    'components.common.dataTable.k6': '第 {{v0}} / {{v1}} 页',
  };
  const t = (key: string, vars?: Record<string, unknown>): string => {
    let result = i18nMap[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        result = result.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      });
    }
    return result;
  };
  return {
    useTranslation: (ns?: string | string[]) => ({
      t,
      i18n: {
        changeLanguage: vi.fn(),
        language: 'zh',
      },
    }),
    initReactI18next: {
      type: '3rdParty',
      init: vi.fn(),
    },
    Trans: ({ children }: any) => children,
  };
});

vi.mock('@/i18n', () => {
  const i18nMap: Record<string, string> = {
    'components.data_table.k0': '搜索...',
    'components.data_table.k1': '刷新',
    'components.data_table.k2': '导出',
    'components.data_table.k3': '列设置',
    'components.data_table.k4': '条记录',
    'components.data_table.k5': '取消选择',
    'components.data_table.k6': '重置列配置',
    'components.data_table.k7': '展开',
    'components.data_table.k8': '加载中...',
    'components.data_table.k9': '每页',
    'components.data_table.k10': '上一页',
    'components.data_table.k11': '下一页',
    'components.data_table.k12': '重置',
    'components.data_table.k13': '应用筛选',
    'shared.data_table.k0': '展开',
    'shared.data_table.k1': '新建',
    'shared.data_table.k2': '暂无数据',
    'shared.data_table.k3': '保存成功',
    'shared.data_table.k4': '数据已成功更新',
    'shared.data_table.k5': '导出成功',
    'shared.data_table.csv_6': '数据已成功导出为 CSV 文件',
    'shared.data_table.k7': '导出失败',
    'shared.data_table.k8': '导出过程中发生错误',
    'shared.data_table.k9': '导出成功',
    'shared.data_table.excel_10': '数据已成功导出为 Excel 文件',
    'shared.data_table.k11': '导出失败',
    'shared.data_table.k12': '导出过程中发生错误',
    'shared.data_table.csv_13': '导出 CSV',
    'shared.data_table.excel_14': '导出 Excel',
    'shared.data_table.k15': '展开',
    'shared.data_table.k16': '保存',
    'shared.data_table.k17': '关闭',
    'shared.data_table.k18': '展开',
    'shared.data_table.k19': '展开',
    'shared.data_table.k20': '高级筛选',
    'shared.data_table.k21': '全部',
    'shared.data_table.k22': '暂无数据',
    'components.common.dataTable.k3': '已选择',
    'components.common.dataTable.k4': '显示/隐藏列',
    'components.common.dataTable.k5': '条记录',
    'components.common.dataTable.k6': '第 {{v0}} / {{v1}} 页',
  };
  const t = (key: string, vars?: Record<string, unknown>): string => {
    let result = i18nMap[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        result = result.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      });
    }
    return result;
  };
  return {
    default: {
      t,
      language: 'zh',
      changeLanguage: vi.fn(),
    },
  };
});

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
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
  useAuthStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          user: null,
        })
      : {
          user: null,
        }
  ),
}));

vi.mock('@/hooks/useDataTable', () => ({
  useExportData: vi.fn(),
}));

const mockAddNotification = vi.fn();
const mockUseAppStore = useNotificationStore as vi.Mock;
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
