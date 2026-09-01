import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, fireEvent } from '@/__tests__/test-utils';

import BackupPage from '../BackupPage';

vi.mock('react-i18next', () => {
  const merge = (...objs: Record<string, string>[]) => Object.assign({}, ...objs);
  const i18nMap = merge(
    require('../../../i18n/locales/zh/common.json'),
    require('../../../i18n/locales/zh/system.json'),
    require('../../../i18n/locales/zh/components.json'),
    require('../../../i18n/locales/zh/pages.json'),
    require('../../../i18n/locales/zh/templates.json')
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
    require('../../../i18n/locales/zh/common.json'),
    require('../../../i18n/locales/zh/system.json'),
    require('../../../i18n/locales/zh/components.json'),
    require('../../../i18n/locales/zh/pages.json'),
    require('../../../i18n/locales/zh/templates.json')
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
      <div
        role='dialog'
        data-testid='confirm-dialog'
      >
        <button
          data-testid='confirm-ok'
          onClick={onConfirm}
        />
        <button
          data-testid='confirm-close'
          onClick={onClose}
        />
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
});
