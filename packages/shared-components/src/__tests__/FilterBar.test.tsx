import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
    render(<FilterBar filters={mockFilters} />);
    expect(screen.getByLabelText('状态')).toBeInTheDocument();
    expect(screen.getByLabelText('关键词')).toBeInTheDocument();
  });

  it('calls onFilterChange when filter changes', () => {
    const handleFilterChange = jest.fn();
    render(<FilterBar filters={mockFilters} onFilterChange={handleFilterChange} />);
    
    const select = screen.getByLabelText('状态');
    fireEvent.change(select, { target: { value: 'active' } });
    
    expect(handleFilterChange).toHaveBeenCalled();
  });

  it('calls onReset when reset button is clicked', () => {
    const handleReset = jest.fn();
    render(<FilterBar filters={mockFilters} onReset={handleReset} />);
    
    fireEvent.click(screen.getByLabelText('重置筛选'));
    expect(handleReset).toHaveBeenCalledTimes(1);
  });

  it('calls onSearch when search button is clicked', () => {
    const handleSearch = jest.fn();
    const filtersWithValue = [
      { ...mockFilters[0], value: 'active' },
      mockFilters[1],
    ];
    render(<FilterBar filters={filtersWithValue} onSearch={handleSearch} />);
    
    fireEvent.click(screen.getByText('搜索'));
    expect(handleSearch).toHaveBeenCalledTimes(1);
  });

  it('disables search button when no filters are active', () => {
    const handleSearch = jest.fn();
    render(<FilterBar filters={mockFilters} onSearch={handleSearch} />);
    
    const searchButton = screen.getByText('搜索');
    expect(searchButton).toBeDisabled();
  });

  it('shows active filter count', () => {
    const filtersWithValue = [
      { ...mockFilters[0], value: 'active' },
      mockFilters[1],
    ];
    render(<FilterBar filters={filtersWithValue} />);
    
    const chip = screen.getByRole('status');
    expect(chip).toHaveTextContent('1');
  });

  it('collapses and expands filter bar', () => {
    const { container } = render(<FilterBar filters={mockFilters} defaultExpanded={true} />);
    
    fireEvent.click(screen.getByLabelText('收起筛选'));
    const collapse = container.querySelector('.MuiCollapse-container');
    expect(collapse).toHaveStyle({ height: '0px' });
    
    fireEvent.click(screen.getByLabelText('展开筛选'));
  });

  it('renders with dense mode', () => {
    const { container } = render(<FilterBar filters={mockFilters} dense />);
    const paper = container.firstChild;
    expect(paper).toHaveStyle({ padding: '6px' });
  });

  it('renders disabled filter bar', () => {
    render(<FilterBar filters={mockFilters} disabled />);
    const select = screen.getByLabelText('状态');
    expect(select).toBeDisabled();
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
    render(<FilterBar filters={multiSelectFilter} />);
    expect(screen.getByLabelText('标签')).toBeInTheDocument();
  });

  it('renders date filter', () => {
    const dateFilter = [
      {
        id: 'date',
        label: '日期',
        type: 'date',
      },
    ];
    render(<FilterBar filters={dateFilter} />);
    expect(screen.getByLabelText('日期')).toBeInTheDocument();
  });

  it('renders number filter', () => {
    const numberFilter = [
      {
        id: 'count',
        label: '数量',
        type: 'number',
      },
    ];
    render(<FilterBar filters={numberFilter} />);
    expect(screen.getByLabelText('数量')).toBeInTheDocument();
  });
});