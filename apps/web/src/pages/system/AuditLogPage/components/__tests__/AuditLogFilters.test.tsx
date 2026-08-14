import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import AuditLogFilters from '../AuditLogFilters';
import type { AuditLogFilters as AuditLogFiltersType } from '../../hooks/useAuditLog';

vi.mock('lucide-react', () => {
  const icon =
    (_name: string) =>
    ({ size: _size }: { size?: number }) => <svg />;

  return {
    Search: icon('search'),
    Calendar: icon('calendar'),
    X: icon('x'),
  };
});

const defaultFilters: AuditLogFiltersType = {
  searchQuery: '',
  userFilter: '',
  actionFilter: '',
  entityTypeFilter: '',
  statusFilter: '',
  startDate: '',
  endDate: '',
};

describe('AuditLogFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search field, 4 selects and 2 datetime fields', () => {
    renderWithProviders(
      <AuditLogFilters
        filters={defaultFilters}
        updateFilter={vi.fn()}
        clearFilters={vi.fn()}
        uniqueUsers={['admin', 'john']}
        uniqueActions={['login', 'create']}
        uniqueEntityTypes={['user', 'order']}
        formatAction={(a) => a}
      />
    );

    const inputs = document.querySelectorAll('input');
    expect(inputs.length).toBe(7);
    expect(inputs[0].getAttribute('type')).toBe('text');
    expect(inputs[0].getAttribute('placeholder')).toBe('system.auditPage.search_placeholder');

    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes.length).toBe(4);

    const dateInputs = document.querySelectorAll('input[type="datetime-local"]');
    expect(dateInputs.length).toBe(2);
  });

  it('calls updateFilter on search input change', () => {
    const updateFilter = vi.fn();

    renderWithProviders(
      <AuditLogFilters
        filters={defaultFilters}
        updateFilter={updateFilter}
        clearFilters={vi.fn()}
        uniqueUsers={[]}
        uniqueActions={[]}
        uniqueEntityTypes={[]}
        formatAction={(a) => a}
      />
    );

    fireEvent.change(document.querySelector('input[type="text"]')!, { target: { value: 'error' } });

    expect(updateFilter).toHaveBeenCalledWith('searchQuery', 'error');
  });

  it('renders clear button only when there are active filters and calls clearFilters on click', () => {
    const clearFilters = vi.fn();

    const { rerender } = renderWithProviders(
      <AuditLogFilters
        filters={defaultFilters}
        updateFilter={vi.fn()}
        clearFilters={clearFilters}
        uniqueUsers={[]}
        uniqueActions={[]}
        uniqueEntityTypes={[]}
        formatAction={(a) => a}
      />
    );

    expect(screen.queryByText('system.action.clear_filter')).not.toBeInTheDocument();

    rerender(
      <AuditLogFilters
        filters={{ ...defaultFilters, userFilter: 'admin' }}
        updateFilter={vi.fn()}
        clearFilters={clearFilters}
        uniqueUsers={['admin']}
        uniqueActions={[]}
        uniqueEntityTypes={[]}
        formatAction={(a) => a}
      />
    );

    fireEvent.click(screen.getByText('system.action.clear_filter'));
    expect(clearFilters).toHaveBeenCalledTimes(1);
  });

  it('renders all status options when status combobox is opened', () => {
    renderWithProviders(
      <AuditLogFilters
        filters={defaultFilters}
        updateFilter={vi.fn()}
        clearFilters={vi.fn()}
        uniqueUsers={[]}
        uniqueActions={[]}
        uniqueEntityTypes={[]}
        formatAction={(a) => a}
      />
    );

    const comboboxes = screen.getAllByRole('combobox');
    const statusComboBox = comboboxes[3];

    fireEvent.mouseDown(statusComboBox);

    expect(screen.getByRole('option', { name: 'system.status.success' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'system.status.failed' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'system.status.error' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'system.status.warning' })).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'system.status.partial_success' })
    ).toBeInTheDocument();
  });

  it('calls updateFilter when date range fields change', () => {
    const updateFilter = vi.fn();

    renderWithProviders(
      <AuditLogFilters
        filters={defaultFilters}
        updateFilter={updateFilter}
        clearFilters={vi.fn()}
        uniqueUsers={[]}
        uniqueActions={[]}
        uniqueEntityTypes={[]}
        formatAction={(a) => a}
      />
    );

    const dateInputs = document.querySelectorAll('input[type="datetime-local"]');
    fireEvent.change(dateInputs[0], {
      target: { value: '2024-01-01T00:00' },
    });
    fireEvent.change(dateInputs[1], {
      target: { value: '2024-12-31T23:59' },
    });

    expect(updateFilter).toHaveBeenCalledWith('startDate', '2024-01-01T00:00');
    expect(updateFilter).toHaveBeenCalledWith('endDate', '2024-12-31T23:59');
  });

  it('renders unique user and action options from props with formatAction applied', () => {
    renderWithProviders(
      <AuditLogFilters
        filters={defaultFilters}
        updateFilter={vi.fn()}
        clearFilters={vi.fn()}
        uniqueUsers={['alice', 'bob']}
        uniqueActions={['login', 'logout']}
        uniqueEntityTypes={['user']}
        formatAction={(a) => `FORMATTED:${a}`}
      />
    );

    const comboboxes = screen.getAllByRole('combobox');
    fireEvent.mouseDown(comboboxes[0]);
    expect(screen.getByRole('option', { name: 'alice' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'bob' })).toBeInTheDocument();

    fireEvent.mouseDown(comboboxes[1]);
    expect(screen.getByRole('option', { name: 'FORMATTED:login' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'FORMATTED:logout' })).toBeInTheDocument();
  });
});
