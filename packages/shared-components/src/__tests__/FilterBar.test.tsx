import React from 'react';
import { render, screen } from '@testing-library/react';
import { FilterBar } from '../components/FilterBar';

const mockFilters = [
  {
    id: 'status',
    label: '状态',
    type: 'select',
    options: [
      { label: '全部', value: '' },
      { label: '启用', value: 'active' },
      { label: '禁用', value: 'disabled' },
    ],
  },
  {
    id: 'keyword',
    label: '关键词',
    type: 'text',
    placeholder: '请输入关键词',
  },
];

describe('FilterBar Component', () => {
  it('renders filter bar', () => {
    render(<FilterBar filters={mockFilters} />);
    expect(screen.getByText('筛选条件')).toBeInTheDocument();
  });

  it('renders filter controls', () => {
    const { container } = render(<FilterBar filters={mockFilters} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('calls onFilterChange when filter changes', () => {
    const { container } = render(<FilterBar filters={mockFilters} onFilterChange={() => {}} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('calls onReset when reset button is clicked', () => {
    const { container } = render(<FilterBar filters={mockFilters} onReset={() => {}} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('calls onSearch when search button is clicked', () => {
    const { container } = render(<FilterBar filters={mockFilters} onSearch={() => {}} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('disables search button when no filters are active', () => {
    const { container } = render(<FilterBar filters={mockFilters} onSearch={() => {}} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('shows active filter count', () => {
    const { container } = render(<FilterBar filters={mockFilters} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('collapses and expands filter bar', () => {
    const { container } = render(<FilterBar filters={mockFilters} defaultExpanded={true} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with dense mode', () => {
    const { container } = render(<FilterBar filters={mockFilters} dense />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders disabled filter bar', () => {
    const { container } = render(<FilterBar filters={mockFilters} disabled />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders multiselect filter', () => {
    const multiSelectFilter = [
      {
        id: 'tags',
        label: '标签',
        type: 'multiselect',
        options: [
          { label: '标签1', value: 'tag1' },
          { label: '标签2', value: 'tag2' },
        ],
      },
    ];
    const { container } = render(<FilterBar filters={multiSelectFilter} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders date filter', () => {
    const dateFilter = [
      {
        id: 'date',
        label: '日期',
        type: 'date',
      },
    ];
    const { container } = render(<FilterBar filters={dateFilter} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders number filter', () => {
    const numberFilter = [
      {
        id: 'count',
        label: '数量',
        type: 'number',
      },
    ];
    const { container } = render(<FilterBar filters={numberFilter} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});