import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { MobileCardView } from '../MobileCardView';
import { renderWithProviders } from '@/__tests__/test-utils';
import type { ColumnDef } from '../types';

interface TestRow {
  id: string;
  name: string;
  status: string;
  count: number;
}

const columns: ColumnDef<TestRow>[] = [
  { id: 'name', label: '名称' },
  { id: 'status', label: '状态' },
  { id: 'count', label: '数量' },
];

const data: TestRow[] = [
  { id: '1', name: '项目一', status: '活跃', count: 10 },
  { id: '2', name: '项目二', status: '停用', count: 5 },
];

describe('MobileCardView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing with data', () => {
    renderWithProviders(
      <MobileCardView
        data={data}
        emptyMessage='暂无数据'
        getRowId={(row) => row.id}
        selectedIds={new Set()}
        visibleColumns={columns}
        mobileCardTitleKey='name'
      />
    );
    // With mobileCardTitleKey='name', name is used as title and excluded from display fields
    expect(screen.getAllByText('项目一').length).toBeGreaterThan(0);
    expect(screen.getAllByText('项目二').length).toBeGreaterThan(0);
  });

  it('renders skeleton loading state when loading is true', () => {
    const { container } = renderWithProviders(
      <MobileCardView
        data={[]}
        loading
        emptyMessage='暂无数据'
        getRowId={(row) => row.id}
        selectedIds={new Set()}
        visibleColumns={columns}
      />
    );
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('renders empty message when data is empty', () => {
    renderWithProviders(
      <MobileCardView
        data={[]}
        emptyMessage='暂无数据'
        getRowId={(row) => row.id}
        selectedIds={new Set()}
        visibleColumns={columns}
      />
    );
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  it('renders custom card content via mobileCardRender', () => {
    renderWithProviders(
      <MobileCardView
        data={data}
        emptyMessage='暂无数据'
        getRowId={(row) => row.id}
        selectedIds={new Set()}
        visibleColumns={columns}
        mobileCardRender={(row) => (
          <div data-testid={`custom-card-${row.id}`}>{row.name} - 自定义</div>
        )}
      />
    );
    expect(screen.getByTestId('custom-card-1')).toBeInTheDocument();
    expect(screen.getByText('项目一 - 自定义')).toBeInTheDocument();
  });

  it('calls onRowClick when a card is clicked', () => {
    const handleRowClick = vi.fn();
    renderWithProviders(
      <MobileCardView
        data={data}
        emptyMessage='暂无数据'
        getRowId={(row) => row.id}
        selectedIds={new Set()}
        visibleColumns={columns}
        mobileCardTitleKey='name'
        onRowClick={handleRowClick}
      />
    );
    // Click on the card title
    const titles = screen.getAllByText('项目一');
    fireEvent.click(titles[0]);
    expect(handleRowClick).toHaveBeenCalledWith(data[0]);
  });

  it('calls onSelectRow when checkbox is clicked', () => {
    const handleSelectRow = vi.fn();
    renderWithProviders(
      <MobileCardView
        data={data}
        emptyMessage='暂无数据'
        getRowId={(row) => row.id}
        selectedIds={new Set()}
        visibleColumns={columns}
        onSelectRow={handleSelectRow}
      />
    );
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(handleSelectRow).toHaveBeenCalledWith(data[0]);
  });

  it('renders field labels from column definitions', () => {
    renderWithProviders(
      <MobileCardView
        data={data}
        emptyMessage='暂无数据'
        getRowId={(row) => row.id}
        selectedIds={new Set()}
        visibleColumns={columns}
        mobileCardTitleKey='name'
        mobileCardDisplayFields={['status', 'count']}
      />
    );
    // With 2 rows, each label appears twice
    expect(screen.getAllByText('状态').length).toBeGreaterThan(0);
    expect(screen.getAllByText('数量').length).toBeGreaterThan(0);
  });

  it('shows row action button when hasRowActions and onRowActionClick are provided', () => {
    const handleRowActionClick = vi.fn();
    renderWithProviders(
      <MobileCardView
        data={data}
        emptyMessage='暂无数据'
        getRowId={(row) => row.id}
        selectedIds={new Set()}
        visibleColumns={columns}
        hasRowActions
        onRowActionClick={handleRowActionClick}
      />
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
