import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { ListPagination } from '../Pagination';
import { renderWithProviders } from '@/__tests__/test-utils';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('ListPagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithProviders(
      <ListPagination
        page={0}
        pageSize={10}
        total={100}
        onPageChange={vi.fn()}
      />
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('displays total count in the pagination info', () => {
    renderWithProviders(
      <ListPagination
        page={0}
        pageSize={10}
        total={50}
        onPageChange={vi.fn()}
      />
    );
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it('calls onPageSizeChange when page size selector changes', () => {
    const handlePageSizeChange = vi.fn();
    renderWithProviders(
      <ListPagination
        page={0}
        pageSize={10}
        total={100}
        onPageChange={vi.fn()}
        onPageSizeChange={handlePageSizeChange}
      />
    );
    const select = screen.getByRole('combobox');
    fireEvent.mouseDown(select);
    // Click on the "20" option in the dropdown
    const option20 = screen.getByRole('option', { name: '20' });
    fireEvent.click(option20);
    expect(handlePageSizeChange).toHaveBeenCalledWith(20);
  });

  it('renders rows per page options', () => {
    renderWithProviders(
      <ListPagination
        page={0}
        pageSize={10}
        total={100}
        onPageChange={vi.fn()}
      />
    );
    const select = screen.getByRole('combobox');
    fireEvent.mouseDown(select);
    // Verify all default page size options exist
    expect(screen.getByRole('option', { name: '10' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '20' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '50' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '100' })).toBeInTheDocument();
  });

  it('calls onPageChange when next page button is clicked', () => {
    const handlePageChange = vi.fn();
    renderWithProviders(
      <ListPagination
        page={0}
        pageSize={10}
        total={100}
        onPageChange={handlePageChange}
      />
    );
    // Find the next page button (chevron right)
    const buttons = screen.getAllByRole('button');
    // The last button should be the next page button
    const nextButton = buttons[buttons.length - 1];
    fireEvent.click(nextButton);
    expect(handlePageChange).toHaveBeenCalled();
  });
});
