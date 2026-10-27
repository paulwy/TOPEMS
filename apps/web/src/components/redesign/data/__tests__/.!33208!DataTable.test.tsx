import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { DataTable, type DataTableColumn } from '../DataTable';

interface TestRow {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

const columns: DataTableColumn<TestRow>[] = [
  {
    key: 'name',
    header: '姓名',
  },
  {
    key: 'status',
    header: '状态',
    render: (row) => row.status,
  },
];

const data: TestRow[] = [
  { id: '1', name: '张三', status: 'active' },
  { id: '2', name: '李四', status: 'inactive' },
];

describe('DataTable', () => {
  it('renders table with data', () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        rowKey='id'
      />
    );

    expect(screen.getByText('姓名')).toBeInTheDocument();
    expect(screen.getByText('状态')).toBeInTheDocument();
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('李四')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        rowKey='id'
        loading={true}
      />
    );

