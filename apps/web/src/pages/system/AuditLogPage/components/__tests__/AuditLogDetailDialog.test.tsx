import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import AuditLogDetailDialog from '../AuditLogDetailDialog';
import type { AuditLog } from '@/api/system';

vi.mock('lucide-react', () => {
  const icon =
    (_name: string) =>
    ({ size: _size }: { size?: number }) => <svg />;

  return {
    FileText: icon('file-text'),
    X: icon('x'),
  };
});

const sampleLog: AuditLog = {
  id: 'log-1',
  user_id: 'u-1',
  user_name: 'admin',
  action: 'login',
  entity_type: 'user',
  entity_id: '1',
  status: 'success',
  ip_address: '192.168.1.1',
  request_details: { path: '/api/login', method: 'POST' },
  response_details: { status: 200 },
  error_message: null,
  duration_ms: 120,
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-15T10:30:00Z',
} as AuditLog;

const errorLog: AuditLog = {
  id: 'log-2',
  user_id: 'u-2',
  user_name: 'john',
  action: 'delete',
  entity_type: 'order',
  entity_id: '42',
  status: 'error',
  ip_address: '10.0.0.5',
  request_details: null,
  response_details: null,
  error_message: 'Permission denied',
  duration_ms: 50,
  created_at: '2024-01-15T11:00:00Z',
  updated_at: '2024-01-15T11:00:00Z',
} as AuditLog;

describe('AuditLogDetailDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseProps = {
    open: true,
    onClose: vi.fn(),
    getStatusBadge: (status: string) => <span data-testid={`badge-${status}`}>{status}</span>,
    formatAction: (action: string) => `FORMATTED:${action}`,
  };

  it('does not render dialog content when currentLog is null', () => {
    renderWithProviders(
      <AuditLogDetailDialog
        {...baseProps}
        currentLog={null}
      />
    );

    expect(document.querySelector('[role="dialog"]')).toBeInTheDocument();
    expect(screen.queryByText('system.auditPage.basic_info')).not.toBeInTheDocument();
  });

  it('renders basic info and user info sections when currentLog is provided', () => {
    renderWithProviders(
      <AuditLogDetailDialog
        {...baseProps}
        currentLog={sampleLog}
      />
    );

    expect(screen.getByText('system.auditPage.basic_info')).toBeInTheDocument();
    expect(screen.getByText('system.auditPage.user_info')).toBeInTheDocument();
    expect(screen.getByText('log-1')).toBeInTheDocument();
    expect(screen.getByText('FORMATTED:login')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByTestId('badge-success')).toBeInTheDocument();
    expect(screen.getByText('u-1')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
    expect(screen.getByText('120ms')).toBeInTheDocument();
  });

  it('renders request_details and response_details as JSON pre blocks', () => {
    renderWithProviders(
      <AuditLogDetailDialog
        {...baseProps}
        currentLog={sampleLog}
      />
    );

    expect(screen.getByText('system.auditPage.request_details')).toBeInTheDocument();
    expect(screen.getByText('system.auditPage.response_details')).toBeInTheDocument();
    expect(screen.getByText(/\/api\/login/)).toBeInTheDocument();
    expect(screen.getByText(/POST/)).toBeInTheDocument();
    expect(screen.getByText(/200/)).toBeInTheDocument();
  });

  it('renders error section when error_message is present', () => {
    renderWithProviders(
      <AuditLogDetailDialog
        {...baseProps}
        currentLog={errorLog}
      />
    );

    expect(screen.getByText('system.auditPage.error_info')).toBeInTheDocument();
    expect(screen.getByText('Permission denied')).toBeInTheDocument();
    expect(screen.queryByText('system.auditPage.request_details')).not.toBeInTheDocument();
  });

  it('calls onClose when the X icon button is clicked', () => {
    const onClose = vi.fn();

    renderWithProviders(
      <AuditLogDetailDialog
        {...baseProps}
        onClose={onClose}
        currentLog={sampleLog}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the action button with close label is clicked', () => {
    const onClose = vi.fn();

    renderWithProviders(
      <AuditLogDetailDialog
        {...baseProps}
        onClose={onClose}
        currentLog={sampleLog}
      />
    );

    fireEvent.click(screen.getByText('system.action.close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders "-" for empty entity_id when not present', () => {
    const logWithoutEntityId: AuditLog = {
      ...sampleLog,
      entity_id: undefined as unknown as string,
    };

    renderWithProviders(
      <AuditLogDetailDialog
        {...baseProps}
        currentLog={logWithoutEntityId}
      />
    );

    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });
});
