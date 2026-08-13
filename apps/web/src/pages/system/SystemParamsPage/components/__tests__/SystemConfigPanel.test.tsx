import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import SystemConfigPanel from '../SystemConfigPanel';

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

  it('renders site info text fields with current values', () => {
    renderWithProviders(
      <SystemConfigPanel
        systemConfig={defaultSystemConfig}
        setSystemConfig={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
      />
    );

    const textboxes = screen.getAllByRole('textbox');
    expect(textboxes.length).toBeGreaterThanOrEqual(4);

    expect(screen.getByDisplayValue('TOPEMS 企业管理系统')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('Enterprise Management System')
    ).toBeInTheDocument();
  });

  it('renders timezone and language selects with options', () => {
    renderWithProviders(
      <SystemConfigPanel
        systemConfig={defaultSystemConfig}
        setSystemConfig={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
      />
    );

    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes.length).toBe(2);

    fireEvent.mouseDown(comboboxes[0]);
    expect(
      screen.getByRole('option', { name: /亚洲\/上海/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /欧洲\/伦敦/ })
    ).toBeInTheDocument();
  });

  it('calls setSystemConfig when site name text field changes', () => {
    const setSystemConfig = vi.fn();

    renderWithProviders(
      <SystemConfigPanel
        systemConfig={defaultSystemConfig}
        setSystemConfig={setSystemConfig}
        onSave={vi.fn()}
        isSaving={false}
      />
    );

    const textboxes = screen.getAllByRole('textbox');
    fireEvent.change(textboxes[0], {
      target: { value: 'New Site Name' },
    });

    expect(setSystemConfig).toHaveBeenCalledTimes(1);
  });

  it('renders security switches and toggles update config', () => {
    const setSystemConfig = vi.fn();

    renderWithProviders(
      <SystemConfigPanel
        systemConfig={defaultSystemConfig}
        setSystemConfig={setSystemConfig}
        onSave={vi.fn()}
        isSaving={false}
      />
    );

    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBe(6);

    fireEvent.click(switches[0]);
    expect(setSystemConfig).toHaveBeenCalledTimes(1);
  });

  it('renders password complexity section', () => {
    renderWithProviders(
      <SystemConfigPanel
        systemConfig={defaultSystemConfig}
        setSystemConfig={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
      />
    );

    expect(screen.getByText('密码复杂度要求')).toBeInTheDocument();
    expect(screen.getByText('需要大写字母')).toBeInTheDocument();
    expect(screen.getByText('需要小写字母')).toBeInTheDocument();
    expect(screen.getByText('需要数字')).toBeInTheDocument();
    expect(screen.getByText('需要特殊字符')).toBeInTheDocument();
  });

  it('calls onSave when save button is clicked and shows disabled state when saving', () => {
    const onSave = vi.fn();

    const { rerender } = renderWithProviders(
      <SystemConfigPanel
        systemConfig={defaultSystemConfig}
        setSystemConfig={vi.fn()}
        onSave={onSave}
        isSaving={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /保存配置/ }));
    expect(onSave).toHaveBeenCalledTimes(1);

    rerender(
      <SystemConfigPanel
        systemConfig={defaultSystemConfig}
        setSystemConfig={vi.fn()}
        onSave={onSave}
        isSaving
      />
    );

    expect(screen.getByRole('button', { name: /保存中/ })).toBeDisabled();
  });
});
