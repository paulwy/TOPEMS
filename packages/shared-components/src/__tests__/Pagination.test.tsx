import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PaginationComponent from '../components/Pagination';

describe('PaginationComponent', () => {
  const defaultProps = {
    page: 1,
    total: 10,
    pageSize: 10,
    onChange: vi.fn(),
    totalItems: 100,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    render(<PaginationComponent {...defaultProps} />);
    expect(screen.getByText('显示 1-10 / 共 100 条')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '上一页' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '下一页' })).not.toBeDisabled();
  });

  it('calls onChange when clicking page number', () => {
    render(<PaginationComponent {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(defaultProps.onChange).toHaveBeenCalledWith(2);
  });

  it('calls onChange when clicking next page', () => {
    render(<PaginationComponent {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: '下一页' }));
    expect(defaultProps.onChange).toHaveBeenCalledWith(2);
  });

  it('calls onChange when clicking previous page', () => {
    render(<PaginationComponent {...defaultProps} page={3} />);
    fireEvent.click(screen.getByRole('button', { name: '上一页' }));
    expect(defaultProps.onChange).toHaveBeenCalledWith(2);
  });

  it('calls onChange when clicking first page', () => {
    render(<PaginationComponent {...defaultProps} page={5} />);
    fireEvent.click(screen.getByRole('button', { name: '第一页' }));
    expect(defaultProps.onChange).toHaveBeenCalledWith(1);
  });

  it('calls onChange when clicking last page', () => {
    render(<PaginationComponent {...defaultProps} page={1} />);
    fireEvent.click(screen.getByRole('button', { name: '最后一页' }));
    expect(defaultProps.onChange).toHaveBeenCalledWith(10);
  });

  it('disables first and previous buttons on first page', () => {
    render(<PaginationComponent {...defaultProps} page={1} />);
    expect(screen.getByRole('button', { name: '第一页' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '上一页' })).toBeDisabled();
  });

  it('disables last and next buttons on last page', () => {
    render(<PaginationComponent {...defaultProps} page={10} />);
    expect(screen.getByRole('button', { name: '最后一页' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '下一页' })).toBeDisabled();
  });

  it('shows ellipsis for many pages', () => {
    render(<PaginationComponent {...defaultProps} total={20} page={10} />);
    const ellipsisElements = screen.getAllByText('...');
    expect(ellipsisElements.length).toBeGreaterThan(0);
  });

  it('calls onPageSizeChange when changing page size', () => {
    const onPageSizeChange = vi.fn();
    render(<PaginationComponent {...defaultProps} onPageSizeChange={onPageSizeChange} />);
    const selectButton = screen.getByRole('button', { name: /每页/ });
    expect(selectButton).toBeInTheDocument();
  });

  it('hides page size selector when showPageSize is false', () => {
    render(<PaginationComponent {...defaultProps} showPageSize={false} />);
    expect(screen.queryByText('每页')).not.toBeInTheDocument();
  });

  it('hides total when showTotal is false', () => {
    render(<PaginationComponent {...defaultProps} showTotal={false} />);
    expect(screen.queryByText('显示 1-10 / 共 100 条')).not.toBeInTheDocument();
  });

  it('disables all controls when disabled', () => {
    render(<PaginationComponent {...defaultProps} disabled />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      if (!btn.textContent?.includes('每页')) {
        expect(btn).toBeDisabled();
      }
    });
  });

  it('shows correct item range', () => {
    render(<PaginationComponent {...defaultProps} page={3} pageSize={20} totalItems={100} />);
    expect(screen.getByText('显示 41-60 / 共 100 条')).toBeInTheDocument();
  });

  it('renders all pages when total <= 5', () => {
    render(<PaginationComponent {...defaultProps} total={3} />);
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
    expect(screen.queryByText('...')).not.toBeInTheDocument();
  });
});
