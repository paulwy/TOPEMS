import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PluginMarketplaceList from '../PluginMarketplaceList';
import PluginInstallStepper from '../PluginInstallStepper';
import PluginUninstallDialog from '../PluginUninstallDialog';
import type { MarketplacePlugin, UninstallTarget } from '../../hooks/usePluginManagement';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('lucide-react', () => ({
  Calendar: () => <span data-testid='calendar-icon' />,
  CheckCircle: () => <span data-testid='check-circle-icon' />,
  Download: () => <span data-testid='download-icon' />,
  GitBranch: () => <span data-testid='git-branch-icon' />,
  Package: () => <span data-testid='package-icon' />,
  Search: () => <span data-testid='search-icon' />,
  Shield: () => <span data-testid='shield-icon' />,
}));

const plugins: MarketplacePlugin[] = [
  {
    code: 'crm',
    name: 'CRM 插件',
    version: '1.0.0',
    latest_version: '1.2.0',
    description: '客户关系管理能力',
    author: 'TOPEMS',
    published_at: '2024-01-01',
    downloads: 1200,
    category: 'Business',
    plugin_type: 'module',
    permissions: [
      { code: 'crm:read', name: '读取客户' },
      { code: 'crm:write', name: '编辑客户' },
    ],
  },
  {
    code: 'bi',
    name: 'BI 插件',
    version: '2.0.0',
    latest_version: '2.1.0',
    description: '数据分析能力',
    author: 'TOPEMS',
    published_at: '2024-02-01',
    downloads: 800,
    category: 'Analytics',
    plugin_type: 'module',
    permissions: [{ code: 'bi:read', name: '读取报表' }],
  },
  {
    code: 'monitor',
    name: '监控插件',
    version: '1.0.0',
    latest_version: '1.0.1',
    description: '系统监控能力',
    author: 'TOPEMS',
    published_at: '2024-03-01',
    downloads: 500,
    category: 'System',
    plugin_type: 'module',
    permissions: [{ code: 'monitor:read', name: '读取监控' }],
  },
];

describe('PluginMarketplaceList', () => {
  it('renders marketplace plugins and installed chip', () => {
    render(
      <PluginMarketplaceList
        search=''
        onSearchChange={vi.fn()}
        tab={0}
        onTabChange={vi.fn()}
        plugins={plugins}
        installedCodes={['crm']}
        onSelectPlugin={vi.fn()}
      />
    );

    expect(screen.getByText('CRM 插件')).toBeInTheDocument();
    expect(screen.getByText('BI 插件')).toBeInTheDocument();
    expect(screen.getByText('监控插件')).toBeInTheDocument();
    expect(screen.getByText('admin.plugin_management.installed')).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'admin.plugin_management_page.text_e655a4' })
    ).toHaveLength(2);
  });

  it('emits search, tab and install selection changes', () => {
    const onSearchChange = vi.fn();
    const onTabChange = vi.fn();
    const onSelectPlugin = vi.fn();
    render(
      <PluginMarketplaceList
        search='crm'
        onSearchChange={onSearchChange}
        tab={1}
        onTabChange={onTabChange}
        plugins={plugins}
        installedCodes={[]}
        onSelectPlugin={onSelectPlugin}
      />
    );

    expect(screen.getByText('CRM 插件')).toBeInTheDocument();
    expect(screen.queryByText('BI 插件')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('admin.plugin_management_page.attr_d40b53'), {
      target: { value: 'bi' },
    });
    fireEvent.click(screen.getByRole('tab', { name: 'admin.plugin_management.analytics_plugin' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'admin.plugin_management_page.text_e655a4' })
    );

    expect(onSearchChange).toHaveBeenCalledWith('bi');
    expect(onTabChange).toHaveBeenCalledWith(2);
    expect(onSelectPlugin).toHaveBeenCalledWith(plugins[0]);
  });

  it('filters analytics and system tabs', () => {
    const { rerender } = render(
      <PluginMarketplaceList
        search=''
        onSearchChange={vi.fn()}
        tab={2}
        onTabChange={vi.fn()}
        plugins={plugins}
        installedCodes={[]}
        onSelectPlugin={vi.fn()}
      />
    );

    expect(screen.getByText('BI 插件')).toBeInTheDocument();
    expect(screen.queryByText('CRM 插件')).not.toBeInTheDocument();

    rerender(
      <PluginMarketplaceList
        search=''
        onSearchChange={vi.fn()}
        tab={3}
        onTabChange={vi.fn()}
        plugins={plugins}
        installedCodes={[]}
        onSelectPlugin={vi.fn()}
      />
    );

    expect(screen.getByText('监控插件')).toBeInTheDocument();
    expect(screen.queryByText('BI 插件')).not.toBeInTheDocument();
  });
});

describe('PluginInstallStepper', () => {
  it('renders confirmation step with plugin permissions and next action', () => {
    const onNext = vi.fn();
    render(
      <PluginInstallStepper
        plugin={plugins[0]}
        step={0}
        loading={false}
        error={null}
        onNext={onNext}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('CRM 插件')).toBeInTheDocument();
    expect(screen.getByText('客户关系管理能力')).toBeInTheDocument();
    expect(screen.getByText('读取客户')).toBeInTheDocument();
    expect(screen.getByText('crm:write')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'admin.plugin_management.next' }));

    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('renders installing, error and success states', () => {
    const { rerender } = render(
      <PluginInstallStepper
        plugin={plugins[0]}
        step={1}
        loading
        error={null}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'admin.plugin_management.install' })).toBeDisabled();

    rerender(
      <PluginInstallStepper
        plugin={plugins[0]}
        step={1}
        loading={false}
        error='安装失败'
        onNext={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('安装失败')).toBeInTheDocument();

    rerender(
      <PluginInstallStepper
        plugin={plugins[0]}
        step={2}
        loading={false}
        error={null}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('admin.plugin_management_page.text_176e15')).toBeInTheDocument();
    expect(screen.getByText(/CRM 插件/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'admin.plugin_management_page.text_769d88' })
    ).toBeInTheDocument();
  });

  it('supports back action on install step', () => {
    const onBack = vi.fn();
    render(
      <PluginInstallStepper
        plugin={plugins[0]}
        step={1}
        loading={false}
        error='安装失败'
        onNext={vi.fn()}
        onBack={onBack}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'admin.plugin_management_page.text_eeb690' })
    );

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('PluginUninstallDialog', () => {
  const getMessage = (code: string, tier: UninstallTarget['tier']) => `${code}:${tier}`;

  it('does not render dialog content without target', () => {
    render(
      <PluginUninstallDialog
        target={null}
        onTierChange={vi.fn()}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isPending={false}
        getMessage={getMessage}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders uninstall choices and emits tier, close and confirm actions', () => {
    const onTierChange = vi.fn();
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <PluginUninstallDialog
        target={{ code: 'crm', tier: 'uninstall' }}
        onTierChange={onTierChange}
        onClose={onClose}
        onConfirm={onConfirm}
        isPending={false}
        getMessage={getMessage}
      />
    );

    expect(screen.getByText('admin.plugin_management.uninstall_plugin')).toBeInTheDocument();
    expect(screen.getByText('crm:uninstall')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'admin.plugin_management_page.text_710ad0' })
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'admin.plugin_management_page.text_732796' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'admin.plugin_management.cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'admin.plugin_management.confirm' }));

    expect(onTierChange).toHaveBeenCalledWith('disable');
    expect(onTierChange).toHaveBeenCalledWith('delete');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders delete title and disables confirm while pending', () => {
    render(
      <PluginUninstallDialog
        target={{ code: 'crm', tier: 'delete' }}
        onTierChange={vi.fn()}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isPending
        getMessage={getMessage}
      />
    );

    expect(
      screen.getByText('+ admin.plugin_management.permanently_delete_plugin')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'admin.plugin_management_page.text_2fb90b' })
    ).toBeDisabled();
    expect(screen.getByText('admin.plugin_management_page.text_7b8249')).toBeInTheDocument();
  });
});
