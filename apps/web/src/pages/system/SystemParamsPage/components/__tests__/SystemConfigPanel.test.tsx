import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import SystemConfigPanel from '../SystemConfigPanel';

vi.mock('react-i18next', () => {
  const merge = (...objs: Record<string, string>[]) => Object.assign({}, ...objs);
  const i18nMap = merge(
    require('../../../../../i18n/locales/zh/system.json'),
    require('../../../../../i18n/locales/zh/common.json'),
    require('../../../../../i18n/locales/zh/components.json'),
    require('../../../../../i18n/locales/zh/templates.json'),
    require('../../../../../i18n/locales/zh/pages.json')
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
    require('../../../../../i18n/locales/zh/templates.json'),
    require('../../../../../i18n/locales/zh/pages.json')
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

vi.mock('@/components/common', () => ({
  Grid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('lucide-react', () => {
  const icon =
    (_name: string) =>
    ({ size: _size }: { size?: number }) => <svg />;

  return {
    Settings: icon('settings'),
    Save: icon('save'),
  };
});

const defaultSystemConfig = {
  site_name: 'TOPEMS 企业管理系统',
  site_description: 'Enterprise Management System',
  logo_url: '',
  favicon_url: '',
  primary_color: '#1890ff',
  secondary_color: '#722ed1',
  enable_registration: true,
  enable_sso: false,
  default_role: 'user',
  max_upload_size: 10,
  session_timeout_minutes: 30,
  password_min_length: 8,
  password_require_uppercase: true,
  password_require_lowercase: true,
  password_require_number: true,
  password_require_symbol: false,
  timezone: 'Asia/Shanghai',
  date_format: 'YYYY-MM-DD',
  language: 'zh-CN',
};

describe('SystemConfigPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders three cards with expected Chinese titles', () => {
    renderWithProviders(
      <SystemConfigPanel
        systemConfig={defaultSystemConfig}
        setSystemConfig={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
      />
    );

    expect(screen.getByText('基本信息')).toBeInTheDocument();
    expect(screen.getByText('外观配置')).toBeInTheDocument();
    expect(screen.getByText('安全配置')).toBeInTheDocument();
    expect(screen.getByText('保存配置')).toBeInTheDocument();
  });
});
