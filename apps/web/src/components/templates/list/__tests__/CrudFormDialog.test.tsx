import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { CrudFormDialog } from '../CrudFormDialog';
import { renderWithProviders } from '@/__tests__/test-utils';
import type { ListPageCrudConfig } from '../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Mock @/components/common to avoid broken import chain via src/components/templates/PageHeader.tsx
vi.mock('@/components/common', () => ({
  FormDialog: ({ open, title, onClose, onSubmit, children, loading, ...rest }: any) => {
    if (!open) return null;
    return (
      <div data-testid='form-dialog'>
        <h2>{title}</h2>
        {children}
        <button onClick={onClose}>取消</button>
        <button
          onClick={onSubmit}
          disabled={loading}
        >
          {loading ? '处理中...' : '保存'}
        </button>
      </div>
    );
  },
  FormDrawer: ({ open, title, onClose, onSubmit, children, loading, ...rest }: any) => {
    if (!open) return null;
    return (
      <div data-testid='form-drawer'>
        <h2>{title}</h2>
        {children}
        <button onClick={onClose}>取消</button>
        <button
          onClick={onSubmit}
          disabled={loading}
        >
          {loading ? '处理中...' : '保存'}
        </button>
      </div>
    );
  },
}));

const mockCrud = {
  api: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  queryKey: 'test',
  entityName: '用户',
} as unknown as ListPageCrudConfig<any, any, any>;

describe('CrudFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when crud is undefined', () => {
    const { container } = renderWithProviders(
      <CrudFormDialog
        open
        mode='create'
        crud={undefined}
        submitting={false}
        formContent={<p>表单内容</p>}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders FormDialog in create mode with entity name', () => {
    renderWithProviders(
      <CrudFormDialog
        open
        mode='create'
        crud={mockCrud}
        submitting={false}
        formContent={<p>创建表单</p>}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
    expect(screen.getByText('创建表单')).toBeInTheDocument();
  });

  it('renders FormDialog in edit mode', () => {
    renderWithProviders(
      <CrudFormDialog
        open
        mode='edit'
        crud={mockCrud}
        submitting={false}
        formContent={<p>编辑表单</p>}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
    expect(screen.getByText('编辑表单')).toBeInTheDocument();
  });

  it('renders FormDialog in view mode', () => {
    renderWithProviders(
      <CrudFormDialog
        open
        mode='view'
        crud={mockCrud}
        submitting={false}
        formContent={<p>查看表单</p>}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByTestId('form-dialog')).toBeInTheDocument();
    expect(screen.getByText('查看表单')).toBeInTheDocument();
  });

  it('renders FormDrawer when editMode is drawer', () => {
    const drawerCrud = {
      ...mockCrud,
      editMode: 'drawer' as const,
      drawerWidth: 500,
      drawerAnchor: 'right' as const,
    };
    renderWithProviders(
      <CrudFormDialog
        open
        mode='edit'
        crud={drawerCrud}
        submitting={false}
        formContent={<p>抽屉表单</p>}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByTestId('form-drawer')).toBeInTheDocument();
    expect(screen.getByText('抽屉表单')).toBeInTheDocument();
  });

  it('calls onClose when dialog close is triggered', () => {
    const handleClose = vi.fn();
    renderWithProviders(
      <CrudFormDialog
        open
        mode='create'
        crud={mockCrud}
        submitting={false}
        formContent={<p>表单</p>}
        onClose={handleClose}
        onSubmit={vi.fn()}
      />
    );
    // Click the cancel button (取消)
    const cancelButton = screen.getByRole('button', { name: /取消/i });
    fireEvent.click(cancelButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('disables submit button when submitting is true', () => {
    renderWithProviders(
      <CrudFormDialog
        open
        mode='create'
        crud={mockCrud}
        submitting
        formContent={<p>表单</p>}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    const submitButton = screen.getByRole('button', { name: /处理中/i });
    expect(submitButton).toBeDisabled();
  });
});
