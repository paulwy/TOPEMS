import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { FilterBar } from '../FilterBar';

vi.mock('@/store', () => ({ useAppStore: vi.fn() }));

const defaultFilters = [
  {
    id: 'status',
    label: '状态',
    type: 'select' as const,
    options: [
      { label: '启用', value: 'active' },
      { label: '禁用', value: 'inactive' },
    ],
  },
  {
    id: 'keyword',
    label: '关键词',
    type: 'text' as const,
    placeholder: '搜索关键词',
  },
  {
    id: 'date',
    label: '日期',
    type: 'date' as const,
  },
];

/** MUI outlined variants render label text in both <label> and <fieldset><legend><span> */
function expectLabelExists(labelText: string) {
  const elements = screen.getAllByText(labelText);
  expect(elements.length).toBeGreaterThanOrEqual(1);
}

describe('FilterBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with filters', () => {
    render(<FilterBar filters={defaultFilters} />);
    expect(screen.getByText('筛选条件')).toBeInTheDocument();
  });

  it('shows filter inputs', () => {
    render(<FilterBar filters={defaultFilters} />);
    expectLabelExists('状态');
    expectLabelExists('关键词');
    expectLabelExists('日期');
  });

  it('toggles collapse/expand', () => {
    render(
      <FilterBar
        filters={defaultFilters}
        collapsible
      />
    );
    // Verify filter label exists while expanded
    expectLabelExists('状态');

    // Find the collapse toggle button
    const toggleButton = screen.getByRole('button', { name: '收起筛选' });
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggleButton);

    // After collapsing, the expand button should now show
    const expandButton = screen.getByRole('button', { name: '展开筛选' });
    expect(expandButton).toBeInTheDocument();
    expect(expandButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows active filter count', () => {
    const filters = [
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        defaultValue: '',
        options: [{ label: '启用', value: 'active' }],
      },
      {
        id: 'keyword',
        label: '关键词',
        type: 'text' as const,
        defaultValue: '',
      },
    ];
    const { container } = render(<FilterBar filters={filters} />);
    // No active filters initially
    expect(screen.queryByText('1')).not.toBeInTheDocument();

    // Simulate changing the select value via its hidden input
    const selectInput = container.querySelector('input[aria-hidden="true"]');
    fireEvent.change(selectInput!, { target: { value: 'active' } });

    // Active filter count chip should appear
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('resets filters when reset button clicked', () => {
    const handleReset = vi.fn();
    const filters = [
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        defaultValue: '',
        options: [{ label: '启用', value: 'active' }],
      },
    ];
    const { container } = render(
      <FilterBar
        filters={filters}
        onReset={handleReset}
      />
    );

    // Set a filter value via the hidden input
    const selectInput = container.querySelector('input[aria-hidden="true"]');
    fireEvent.change(selectInput!, { target: { value: 'active' } });

    // Click reset button
    const resetButton = screen.getByRole('button', { name: '重置筛选' });
    fireEvent.click(resetButton);

    expect(handleReset).toHaveBeenCalledTimes(1);
  });

  it('has aria-expanded on toggle button', () => {
    render(
      <FilterBar
        filters={defaultFilters}
        collapsible
        defaultExpanded
      />
    );
    const toggleButton = screen.getByRole('button', { name: '收起筛选' });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggleButton);

    const expandButton = screen.getByRole('button', { name: '展开筛选' });
    expect(expandButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders with search button', () => {
    const handleSearch = vi.fn();
    render(
      <FilterBar
        filters={defaultFilters}
        onSearch={handleSearch}
      />
    );
    const searchButton = screen.getByRole('button', { name: '搜索' });
    expect(searchButton).toBeInTheDocument();
  });

  it('calls onFilterChange when filter value changes', () => {
    const handleChange = vi.fn();
    const filters = [
      {
        id: 'keyword',
        label: '关键词',
        type: 'text' as const,
        defaultValue: '',
      },
    ];
    const { container } = render(
      <FilterBar
        filters={filters}
        onFilterChange={handleChange}
      />
    );

    // Find the TextField's input directly
    const input = container.querySelector('input');
    fireEvent.change(input!, { target: { value: 'test' } });
    expect(handleChange).toHaveBeenCalledWith({ keyword: 'test' });
  });

  it('renders number type filter', () => {
    const filters = [
      {
        id: 'amount',
        label: '金额',
        type: 'number' as const,
      },
    ];
    render(<FilterBar filters={filters} />);
    expectLabelExists('金额');
  });

  it('renders multiselect type filter', () => {
    const filters = [
      {
        id: 'tags',
        label: '标签',
        type: 'multiselect' as const,
        options: [
          { label: 'A', value: 'a' },
          { label: 'B', value: 'b' },
        ],
      },
    ];
    render(<FilterBar filters={filters} />);
    expectLabelExists('标签');
  });

  it('renders without collapsible toggle when collapsible is false', () => {
    render(
      <FilterBar
        filters={defaultFilters}
        collapsible={false}
      />
    );
    expect(screen.queryByRole('button', { name: '收起筛选' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '展开筛选' })).not.toBeInTheDocument();
  });

  it('starts collapsed when defaultExpanded is false', () => {
    render(
      <FilterBar
        filters={defaultFilters}
        collapsible
        defaultExpanded={false}
      />
    );
    // When collapsed, the expand button should be shown with aria-expanded="false"
    const expandButton = screen.getByRole('button', { name: '展开筛选' });
    expect(expandButton).toBeInTheDocument();
    expect(expandButton).toHaveAttribute('aria-expanded', 'false');
  });
});
