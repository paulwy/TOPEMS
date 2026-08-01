import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { EditCell } from '../EditCell';
import { renderWithProviders } from '@/__tests__/test-utils';
import type { ColumnDef } from '../types';

describe('EditCell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders text input by default when no inlineEdit type specified', () => {
    const column: ColumnDef<any> = { id: 'name' };
    renderWithProviders(
      <EditCell
        column={column}
        value='test value'
        onChange={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('test value')).toBeInTheDocument();
  });

  it('renders select when inlineEdit type is select', () => {
    const column: ColumnDef<any> = {
      id: 'status',
      inlineEdit: {
        type: 'select',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ],
      },
    };
    renderWithProviders(
      <EditCell
        column={column}
        value='active'
        onChange={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    // The select should display the selected value
    expect(screen.getByDisplayValue('active')).toBeInTheDocument();
  });

  it('renders number input when inlineEdit type is number', () => {
    const column: ColumnDef<any> = {
      id: 'count',
      inlineEdit: { type: 'number' },
    };
    renderWithProviders(
      <EditCell
        column={column}
        value={42}
        onChange={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('42')).toBeInTheDocument();
  });

  it('renders checkbox when inlineEdit type is checkbox', () => {
    const column: ColumnDef<any> = {
      id: 'enabled',
      inlineEdit: { type: 'checkbox' },
    };
    renderWithProviders(
      <EditCell
        column={column}
        value={true}
        onChange={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('renders date input when inlineEdit type is date', () => {
    const column: ColumnDef<any> = {
      id: 'date',
      inlineEdit: { type: 'date' },
    };
    renderWithProviders(
      <EditCell
        column={column}
        value='2024-01-15'
        onChange={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument();
  });

  it('calls onChange when text input value changes', () => {
    const handleChange = vi.fn();
    const column: ColumnDef<any> = { id: 'name' };
    renderWithProviders(
      <EditCell
        column={column}
        value='initial'
        onChange={handleChange}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const input = screen.getByDisplayValue('initial');
    fireEvent.change(input, { target: { value: 'updated' } });
    expect(handleChange).toHaveBeenCalledWith('updated');
  });

  it('calls onSave when Enter key is pressed', () => {
    const handleSave = vi.fn();
    const column: ColumnDef<any> = { id: 'name' };
    renderWithProviders(
      <EditCell
        column={column}
        value='test'
        onChange={vi.fn()}
        onSave={handleSave}
        onCancel={vi.fn()}
      />
    );
    const input = screen.getByDisplayValue('test');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(handleSave).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Escape key is pressed', () => {
    const handleCancel = vi.fn();
    const column: ColumnDef<any> = { id: 'name' };
    renderWithProviders(
      <EditCell
        column={column}
        value='test'
        onChange={vi.fn()}
        onSave={vi.fn()}
        onCancel={handleCancel}
      />
    );
    const input = screen.getByDisplayValue('test');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onChange with checked value for checkbox', () => {
    const handleChange = vi.fn();
    const column: ColumnDef<any> = {
      id: 'enabled',
      inlineEdit: { type: 'checkbox' },
    };
    renderWithProviders(
      <EditCell
        column={column}
        value={false}
        onChange={handleChange}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(handleChange).toHaveBeenCalledWith(true);
  });
});
