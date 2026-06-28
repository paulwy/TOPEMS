import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConfirmDialog from '../ConfirmDialog';
import { useAppStore } from '@/store';

vi.mock('@/store', () => ({
  useAppStore: vi.fn(),
}));

const mockAddNotification = vi.fn();
const mockUseAppStore = useAppStore as vi.Mock;

describe('ConfirmDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppStore.mockReturnValue({
      addNotification: mockAddNotification,
    });
  });

  it('should not render when isOpen is false', () => {
    render(
      <ConfirmDialog
        isOpen={false}
        onClose={vi.fn()}
        title='Test Dialog'
        message='Test message'
      />
    );
    expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        title='Test Dialog'
        message='Test message'
      />
    );
    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should render confirm and cancel buttons by default', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        title='Test'
        message='Test'
        onConfirm={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /确认/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /取消/i })).toBeInTheDocument();
  });

  it('should call onClose when cancel button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={handleClose}
        title='Test'
        message='Test'
        onConfirm={vi.fn()}
      />
    );
    const cancelButton = screen.getByRole('button', { name: /取消/i });
    fireEvent.click(cancelButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should call onConfirm when confirm button is clicked', async () => {
    const handleConfirm = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={handleClose}
        title='Test'
        message='Test'
        onConfirm={handleConfirm}
      />
    );
    const confirmButton = screen.getByRole('button', { name: /确认/i });
    fireEvent.click(confirmButton);
    await waitFor(() => {
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });
  });

  it('should show custom button labels', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        title='Test'
        message='Test'
        onConfirm={vi.fn()}
        confirmLabel='确定'
        cancelLabel='撤销'
      />
    );
    expect(screen.getByRole('button', { name: /确定/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /撤销/i })).toBeInTheDocument();
  });

  it('should not show cancel button for alert type', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        title='Alert'
        message='Alert message'
        type='alert'
      />
    );
    expect(screen.queryByRole('button', { name: /取消/i })).not.toBeInTheDocument();
  });

  it('should not show cancel button for success type', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        title='Success'
        message='Success message'
        type='success'
      />
    );
    expect(screen.queryByRole('button', { name: /取消/i })).not.toBeInTheDocument();
  });

  it('should show close button when showCloseButton is true', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        title='Test'
        message='Test'
        showCloseButton={true}
      />
    );
    const closeButtons = screen.getAllByRole('button');
    const hasCloseButton = closeButtons.some((btn) => btn.querySelector('svg') !== null);
    expect(hasCloseButton).toBe(true);
  });

  it('should disable confirm button when disabled is true', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        title='Test'
        message='Test'
        onConfirm={vi.fn()}
        disabled={true}
      />
    );
    const confirmButton = screen.getByRole('button', { name: /确认/i });
    expect(confirmButton).toBeDisabled();
  });

  it('should render custom buttons when provided', () => {
    const customOnClick = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        title='Test'
        message='Test'
        buttons={[
          { label: '选项A', onClick: customOnClick, primary: true },
          { label: '选项B', onClick: vi.fn() },
        ]}
      />
    );
    expect(screen.getByRole('button', { name: /选项A/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /选项B/i })).toBeInTheDocument();
  });

  it('should show success icon when showSuccessIcon is true', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        title='Success'
        message='Operation successful'
        type='success'
        showSuccessIcon={true}
      />
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
  });
});
