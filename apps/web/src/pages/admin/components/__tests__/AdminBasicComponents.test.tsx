import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DictionaryHeader from '../DictionaryHeader';
import DictionaryExportModal from '../DictionaryExportModal';
import DictionaryImportModal from '../DictionaryImportModal';
import InviteMemberDialog from '../InviteMemberDialog';
import TenantMembersTab from '../TenantMembersTab';
import { tenantApi } from '@/api/tenant';
import type { TenantUser } from '@/api/tenant/types';

const mockCrudPage = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('lucide-react', () => ({
  Book: () => <span data-testid='book-icon' />,
  Plus: () => <span data-testid='plus-icon' />,
  UserPlus: () => <span data-testid='user-plus-icon' />,
}));

vi.mock('@/components/common', () => ({
  BackButton: ({ href }: { href: string }) => <a href={href}>back</a>,
}));

vi.mock('@/routes/dashboard', () => ({
  DASHBOARD_PATHS: {
    dashboard: '/dashboard',
  },
}));

vi.mock('@/components/templates/CrudPage', () => ({
  default: (props: Record<string, unknown>) => {
    mockCrudPage(props);
    return <div data-testid='crud-page'>{props.headerContent as React.ReactNode}</div>;
  },
}));

vi.mock('@/schemas/admin', () => ({
  tenantUserSchema: { name: 'tenantUserSchema' },
}));

vi.mock('@/api/tenant', () => ({
  tenantApi: {
    updateMemberRole: vi.fn().mockResolvedValue({}),
    removeMember: vi.fn().mockResolvedValue({}),
  },
}));

describe('Admin dictionary components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dictionary header and handles create action', () => {
    const onCreateClick = vi.fn();
    render(<DictionaryHeader onCreateClick={onCreateClick} />);

    expect(screen.getByText('字典管理')).toBeInTheDocument();
    expect(screen.getByText('管理系统中的字典类型与字典项，供各业务模块引用')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'back' })).toHaveAttribute('href', '/dashboard');

    fireEvent.click(screen.getByRole('button', { name: '新建字典' }));

    expect(onCreateClick).toHaveBeenCalledTimes(1);
  });

  it('renders export modal and triggers close/export callbacks', () => {
    const onClose = vi.fn();
    const onExport = vi.fn();
    render(
      <DictionaryExportModal
        open
        onClose={onClose}
        onExport={onExport}
      />
    );

    expect(screen.getByText('导出字典项')).toBeInTheDocument();
    expect(screen.getByText('将字典项导出为 JSON 文件，便于备份与迁移。')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    fireEvent.click(screen.getByRole('button', { name: '导出' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('keeps import action disabled without file and reports selected file', () => {
    const onImport = vi.fn();
    const onFileChange = vi.fn();
    const { rerender } = render(
      <DictionaryImportModal
        open
        importFile={null}
        onClose={vi.fn()}
        onImport={onImport}
        onFileChange={onFileChange}
      />
    );

    const importButton = screen.getByRole('button', {
      name: '导入',
    });
    expect(importButton).toBeDisabled();

    const file = new File(['{"items":[]}'], 'dictionary.json', { type: 'application/json' });
    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] },
    });

    expect(onFileChange).toHaveBeenCalledWith(file);

    rerender(
      <DictionaryImportModal
        open
        importFile={file}
        onClose={vi.fn()}
        onImport={onImport}
        onFileChange={onFileChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '导入' }));

    expect(onImport).toHaveBeenCalledTimes(1);
  });
});

describe('Tenant member components', () => {
  const users: TenantUser[] = [
    {
      id: 'user-1',
      user_id: 'account-1',
      tenant_id: 'tenant-1',
      email: 'member@example.com',
      role: 'member',
      status: 'active',
      joined_at: '2024-01-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tenant member header and delegates list/update/delete adapter calls', async () => {
    const onInviteClick = vi.fn();
    render(
      <TenantMembersTab
        users={users}
        tenantId='tenant-1'
        onInviteClick={onInviteClick}
      />
    );

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(screen.getByText('成员管理')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '添加成员' }));

    const props = mockCrudPage.mock.calls[0][0];
    await expect(props.apiAdapter.list()).resolves.toEqual({ data: users, total: 1 });
    await props.apiAdapter.update('user-1', { role: 'admin' });
    await props.apiAdapter.delete('user-1');

    expect(onInviteClick).toHaveBeenCalledTimes(1);
    expect(props.schema).toEqual({ name: 'tenantUserSchema' });
    expect(tenantApi.updateMemberRole).toHaveBeenCalledWith('tenant-1', 'user-1', {
      role: 'admin',
    });
    expect(tenantApi.removeMember).toHaveBeenCalledWith('tenant-1', 'user-1');
  });

  it('skips tenant member mutation APIs when tenant id is missing', async () => {
    render(
      <TenantMembersTab
        users={users}
        onInviteClick={vi.fn()}
      />
    );

    const props = mockCrudPage.mock.calls[0][0];
    await props.apiAdapter.update('user-1', { role: 'admin' });
    await props.apiAdapter.delete('user-1');

    expect(tenantApi.updateMemberRole).not.toHaveBeenCalled();
    expect(tenantApi.removeMember).not.toHaveBeenCalled();
  });

  it('renders invite dialog and updates email, role and actions', () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    const onFormChange = vi.fn();

    render(
      <InviteMemberDialog
        open
        inviteForm={{ email: 'old@example.com', role: 'member' }}
        onClose={onClose}
        onSubmit={onSubmit}
        onFormChange={onFormChange}
      />
    );

    fireEvent.change(screen.getByLabelText('邮箱地址'), {
      target: { value: 'new@example.com' },
    });
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: '管理员' }));
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    fireEvent.click(screen.getByRole('button', { name: '发送邀请' }));

    expect(onFormChange).toHaveBeenCalledWith({ email: 'new@example.com', role: 'member' });
    expect(onFormChange).toHaveBeenCalledWith({ email: 'old@example.com', role: 'admin' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
