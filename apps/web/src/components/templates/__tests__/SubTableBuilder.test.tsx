import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import { SubTableBuilder } from '../SubTableBuilder';
import type { NestedTableConfig } from '@/schema/schemaExtensions';
import type { SchemaField } from '@/schema/types';

const mockFields: SchemaField[] = [
  { name: 'name', label: 'Name', type: 'text' },
  { name: 'quantity', label: 'Quantity', type: 'number' },
];

const mockConfig: NestedTableConfig = {
  field: 'items',
  title: 'Order Details',
  columns: [
    { id: 'name', label: 'Name' },
    { id: 'quantity', label: 'Quantity' },
  ],
  fields: mockFields,
};

const mockValue = [
  { id: '1', name: 'Product A', quantity: 10 },
  { id: '2', name: 'Product B', quantity: 20 },
];

describe('SubTableBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders table title', () => {
    renderWithProviders(
      <SubTableBuilder
        config={mockConfig}
        value={mockValue}
        onChange={vi.fn()}
        mode='create'
      />
    );
    expect(screen.getByText('Order Details')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    renderWithProviders(
      <SubTableBuilder
        config={mockConfig}
        value={mockValue}
        onChange={vi.fn()}
        mode='create'
      />
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Quantity')).toBeInTheDocument();
  });

  it('renders row data', () => {
    renderWithProviders(
      <SubTableBuilder
        config={mockConfig}
        value={mockValue}
        onChange={vi.fn()}
        mode='create'
      />
    );
    expect(screen.getByText('Product A')).toBeInTheDocument();
    expect(screen.getByText('Product B')).toBeInTheDocument();
  });

  it('renders add button with default text', () => {
    renderWithProviders(
      <SubTableBuilder
        config={mockConfig}
        value={mockValue}
        onChange={vi.fn()}
        mode='create'
      />
    );
    expect(screen.getByRole('button', { name: /Add New Row/ })).toBeInTheDocument();
  });

  it('opens dialog with correct title when add button is clicked', () => {
    renderWithProviders(
      <SubTableBuilder
        config={mockConfig}
        value={mockValue}
        onChange={vi.fn()}
        mode='create'
      />
    );
    const addButton = screen.getByRole('button', { name: /Add New Row/ });
    fireEvent.click(addButton);
    expect(screen.getByText('Order Details - Add New Row')).toBeInTheDocument();
  });

  it('opens dialog when edit button is clicked', () => {
    const { container } = renderWithProviders(
      <SubTableBuilder
        config={mockConfig}
        value={mockValue}
        onChange={vi.fn()}
        mode='create'
      />
    );
    // Edit button is the first IconButton in the table body
    const iconButtons = container.querySelectorAll('.MuiIconButton-root');
    expect(iconButtons.length).toBeGreaterThanOrEqual(2);
    const editButton = iconButtons[0] as HTMLElement;
    fireEvent.click(editButton);
    expect(screen.getByText('Order Details - Edit Row')).toBeInTheDocument();
  });

  it('calls onChange with reduced array when delete button is clicked', () => {
    const handleChange = vi.fn();
    const { container } = renderWithProviders(
      <SubTableBuilder
        config={mockConfig}
        value={mockValue}
        onChange={handleChange}
        mode='create'
      />
    );
    // Delete button is the second IconButton (after edit) in the first row
    const iconButtons = container.querySelectorAll('.MuiIconButton-root');
    expect(iconButtons.length).toBeGreaterThanOrEqual(2);
    const deleteButton = iconButtons[1] as HTMLElement;
    fireEvent.click(deleteButton);
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith([mockValue[1]]);
  });

  it('renders empty state when value is empty', () => {
    renderWithProviders(
      <SubTableBuilder
        config={mockConfig}
        value={[]}
        onChange={vi.fn()}
        mode='create'
      />
    );
    expect(screen.getByText('No Data Available')).toBeInTheDocument();
  });

  it('does not render action buttons in view mode', () => {
    const { container } = renderWithProviders(
      <SubTableBuilder
        config={mockConfig}
        value={mockValue}
        onChange={vi.fn()}
        mode='view'
      />
    );
    // In view mode, no action column or add button
    expect(screen.queryByRole('button', { name: /Add New Row/ })).not.toBeInTheDocument();
    const iconButtons = container.querySelectorAll('.MuiIconButton-root');
    // No edit/delete icon buttons in view mode (but may have dialog close button)
    // The action column header "Actions" should not be rendered
    expect(screen.queryByText('Actions')).not.toBeInTheDocument();
  });
});
