import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import AuditLogDetailDialog from '../AuditLogDetailDialog';
import type { AuditLog } from '@/api/system';

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
    expect(screen.queryByText('基本信息')).not.toBeInTheDocument();
  });
});
