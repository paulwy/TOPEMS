import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { BatchConfirmDialog, BatchProgressDialog } from '../BatchDialogs';
import { renderWithProviders } from '@/__tests__/test-utils';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('BatchConfirmDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    renderWithProviders(
      <BatchConfirmDialog
        open
        actionLabel='删除'
        selectedCount={3}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    // actionLabel appears in both title and confirm button
    expect(screen.getAllByText(/删除/).length).toBeGreaterThan(0);
  });

  it('renders selected count and action label in content', () => {
    renderWithProviders(
      <BatchConfirmDialog
        open
        actionLabel='导出'
        selectedCount={5}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getAllByText(/导出/).length).toBeGreaterThan(0);
  });

  it('calls onCancel when cancel button is clicked', () => {
    const handleCancel = vi.fn();
    renderWithProviders(
      <BatchConfirmDialog
        open
        actionLabel='删除'
        selectedCount={1}
        onCancel={handleCancel}
        onConfirm={vi.fn()}
      />
    );
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const handleConfirm = vi.fn();
    renderWithProviders(
      <BatchConfirmDialog
        open
        actionLabel='删除'
        selectedCount={1}
        onCancel={vi.fn()}
        onConfirm={handleConfirm}
      />
    );
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('BatchProgressDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    renderWithProviders(
      <BatchProgressDialog
        open
        actionLabel='处理'
        processed={5}
        total={10}
        isCancelled={false}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/5\/10/)).toBeInTheDocument();
  });

  it('renders cancelled state when isCancelled is true', () => {
    renderWithProviders(
      <BatchProgressDialog
        open
        actionLabel='处理'
        processed={3}
        total={10}
        isCancelled
        onCancel={vi.fn()}
      />
    );
    // When cancelled, the progress text is replaced with a cancelled message
    expect(screen.queryByText(/3\/10/)).not.toBeInTheDocument();
  });

  it('shows cancel button when not cancelled', () => {
    const handleCancel = vi.fn();
    renderWithProviders(
      <BatchProgressDialog
        open
        actionLabel='处理'
        processed={2}
        total={10}
        isCancelled={false}
        onCancel={handleCancel}
      />
    );
    const cancelButton = screen.getByRole('button');
    fireEvent.click(cancelButton);
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('hides cancel button when cancelled', () => {
    renderWithProviders(
      <BatchProgressDialog
        open
        actionLabel='处理'
        processed={2}
        total={10}
        isCancelled
        onCancel={vi.fn()}
      />
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('handles zero total without error', () => {
    renderWithProviders(
      <BatchProgressDialog
        open
        actionLabel='处理'
        processed={0}
        total={0}
        isCancelled={false}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/0\/0/)).toBeInTheDocument();
  });
});
