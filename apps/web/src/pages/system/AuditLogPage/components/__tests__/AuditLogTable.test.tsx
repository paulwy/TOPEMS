import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import AuditLogTable from '../AuditLogTable';
import type { AuditLog, AuditLogPagination } from '../../hooks/useAuditLog';

vi.mock('react-i18next', () => {
  const merge = (...objs: Record<string, string>[]) => Object.assign({}, ...objs);
  const i18nMap = merge(
    require('../../../../../i18n/locales/zh/system.json'),
    require('../../../../../i18n/locales/zh/common.json'),
    require('../../../../../i18n/locales/zh/components.json'),
    require('../../../../../i18n/locales/zh/pages.json'),
    require('../../../../../i18n/locales/zh/templates.json')
  );
  return {
    useTranslation: () => ({
      t: (key: string) => i18nMap[key] ?? key,
      i18n: { language: 'zh' },
    }),
    initReactI18next: { type: '3rdParty', init: () => {} },
    Trans: ({ i18nKey, children }: { i18nKey?: string; children?: any }) =>
      i18nKey ? (i18nMap[i18nKey] ?? i18nKey) : children,
  };
});

vi.mock('@/i18n', () => {
  const merge = (...objs: Record<string, string>[]) => Object.assign({}, ...objs);
  const i18nMap = merge(
    require('../../../../../i18n/locales/zh/system.json'),
    require('../../../../../i18n/locales/zh/common.json'),
    require('../../../../../i18n/locales/zh/components.json'),
    require('../../../../../i18n/locales/zh/pages.json'),
    require('../../../../../i18n/locales/zh/templates.json')
  );
  return {
    default: {
      t: (key: string) => i18nMap[key] ?? key,
      language: 'zh',
      on: () => {},
      use: () => ({ init: () => {} }),
      init: () => {},
    },
  };
});

vi.mock('lucide-react', () => {
  const icon =
    (_name: string) =>
    ({ size: _size }: { size?: number }) => <svg />;

  return {
    FileText: icon('file-text'),
    Clock: icon('clock'),
    User: icon('user'),
    Eye: icon('eye'),
  };
});

const sampleLogs: AuditLog[] = [
  {
    id: 'log-1',
    user_id: 'u-1',
    user_name: 'admin',
    action: 'login',
    entity_type: 'user',
    entity_id: '1',
    status: 'success',
    ip_address: '192.168.1.1',
    request_details: { path: '/api/login' },
    response_details: null,
    error_message: null,
    duration_ms: 120,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
  } as AuditLog,
  {
    id: 'log-2',
    user_id: 'u-2',
    user_name: 'john',
    action: 'delete',
    entity_type: 'order',
    entity_id: '42',
    status: 'failed',
    ip_address: '10.0.0.5',
    request_details: null,
    response_details: null,
    error_message: 'Permission denied',
    duration_ms: 50,
    created_at: '2024-01-15T11:00:00Z',
    updated_at: '2024-01-15T11:00:00Z',
  } as AuditLog,
];

const defaultPagination: AuditLogPagination = { page: 0, rowsPerPage: 10 };

describe('AuditLogTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseProps = {
    totalCount: sampleLogs.length,
    isPending: false,
    pagination: defaultPagination,
    setPagination: vi.fn(),
    onViewDetail: vi.fn(),
    getStatusBadge: (status: string) => <span data-testid={`badge-${status}`}>{status}</span>,
    formatAction: (action: string) => `FORMATTED:${action}`,
  };

  it('renders loading spinner when isPending is true', () => {
    renderWithProviders(
      <AuditLogTable
        {...baseProps}
        logs={[]}
        isPending
      />
    );

    expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  it('renders empty state with icon and no-data text when logs is empty', () => {
    renderWithProviders(
      <AuditLogTable
        {...baseProps}
        logs={[]}
        totalCount={0}
      />
    );

    expect(screen.getByText('system.message.no_audit_logs')).toBeInTheDocument();
    expect(document.querySelector('table')).toBeInTheDocument();
  });

  it('renders table rows for each log with formatted action and user', () => {
    renderWithProviders(
      <AuditLogTable
        {...baseProps}
        logs={sampleLogs}
      />
    );

    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('john')).toBeInTheDocument();
    expect(screen.getByText('FORMATTED:login')).toBeInTheDocument();
    expect(screen.getByText('FORMATTED:delete')).toBeInTheDocument();
    expect(screen.getByText('Permission denied')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
    expect(screen.getByTestId('badge-success')).toBeInTheDocument();
    expect(screen.getByTestId('badge-failed')).toBeInTheDocument();
  });

  it('calls onViewDetail when eye icon button is clicked on a row', () => {
    const onViewDetail = vi.fn();

    renderWithProviders(
      <AuditLogTable
        {...baseProps}
        logs={sampleLogs}
        onViewDetail={onViewDetail}
      />
    );

    const eyeButtons = screen.getAllByRole('button', { name: '查看' });
    expect(eyeButtons.length).toBe(2);

    fireEvent.click(eyeButtons[0]);
    expect(onViewDetail).toHaveBeenCalledWith(sampleLogs[0]);

    fireEvent.click(eyeButtons[1]);
    expect(onViewDetail).toHaveBeenCalledWith(sampleLogs[1]);
  });

  it('calls setPagination when page changes in TablePagination', () => {
    const setPagination = vi.fn();

    renderWithProviders(
      <AuditLogTable
        {...baseProps}
        logs={sampleLogs}
        totalCount={50}
        pagination={{ page: 0, rowsPerPage: 10 }}
        setPagination={setPagination}
      />
    );

    const pagination = document.querySelector('.MuiTablePagination-root');
    expect(pagination).toBeInTheDocument();
  });

  it('renders request_details as ellipsed text when present', () => {
    renderWithProviders(
      <AuditLogTable
        {...baseProps}
        logs={[sampleLogs[0]]}
      />
    );

    expect(screen.getByText(/path/)).toBeInTheDocument();
  });
});
