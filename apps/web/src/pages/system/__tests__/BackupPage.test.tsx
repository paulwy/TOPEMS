import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, fireEvent } from '@/__tests__/test-utils';

import BackupPage from '../BackupPage';

vi.mock('lucide-react', () => {
  const icon =
    (_name: string) =>
    ({ size: _size }: { size?: number }) => <svg />;

  return {
    Download: icon('download'),
    Upload: icon('upload'),
    Trash2: icon('trash'),
    Clock: icon('clock'),
    FileText: icon('file-text'),
    Calendar: icon('calendar'),
    AlertCircle: icon('alert-circle'),
    Eye: icon('eye'),
    Package: icon('package'),
  };
});

vi.mock('@/components/common', () => ({
  PageContainer: ({ children, title }: any) => (
    <div>
      {title && <h1>{title}</h1>}
      {children}
    </div>
  ),
  Grid: ({ children }: any) => <div>{children}</div>,
  LoadingSpinner: () => <div>Loading...</div>,
  FormBuilder: () => <div>Form</div>,
}));

vi.mock('@topems/shared-components', () => ({
  ConfirmDialog: ({ isOpen, onClose, onConfirm }: any) =>
    isOpen ? (
      <div role="dialog" data-testid="confirm-dialog">
        <button data-testid="confirm-ok" onClick={onConfirm} />
        <button data-testid="confirm-close" onClick={onClose} />
      </div>
    ) : null,
}));

vi.mock('@/hooks', () => ({
  useConfirmDialog: () => ({
    confirmOpen: false,
    confirmConfig: null,
    openConfirm: vi.fn(),
    closeConfirm: vi.fn(),
  }),
}));

vi.mock('@/utils/errors', () => ({
  extractErrorMessage: vi.fn((_err: unknown, fallback: string) => fallback),
}));

vi.mock('@/utils/date', () => ({
  formatDateTime: vi.fn((dt: string) => dt),
}));

vi.mock('@/lib/reactQuery', () => ({
  QUERY_KEYS: {
    ADMIN: { BACKUP: ['admin', 'backup'] },
  },
}));

describe('BackupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title and create backup button', async () => {
    renderWithProviders(<BackupPage />);

    await waitFor(() => {
      expect(screen.getByText('数据备份与恢复')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /创建备份/ })).toBeInTheDocument();
    });
  });

  it('renders empty state when backup list is empty', async () => {
    renderWithProviders(<BackupPage />);

    await waitFor(() => {
      expect(screen.getByText('暂无备份记录')).toBeInTheDocument();
    });

    expect(screen.getByText('备份名称')).toBeInTheDocument();
    expect(screen.getByText('类型')).toBeInTheDocument();
    expect(screen.getByText('状态')).toBeInTheDocument();
  });

  it('opens create backup dialog with form fields when create button is clicked', async () => {
    renderWithProviders(<BackupPage />);

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /创建备份(?!中)/ }));
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '创建备份' })).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText(/weekly-backup/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('full')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '开始备份' })).toBeInTheDocument();
  });

  it('closes create backup dialog when cancel button is clicked', async () => {
    renderWithProviders(<BackupPage />);

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /创建备份(?!中)/ }));
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '创建备份' })).toBeInTheDocument();
    });

    const cancelButtons = screen.getAllByText('取消');
    fireEvent.click(cancelButtons[0]);

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: '创建备份' })
      ).not.toBeInTheDocument();
    });
  });
});
