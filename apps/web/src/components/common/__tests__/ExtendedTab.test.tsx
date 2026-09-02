import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { Tabs } from '@mui/material';
import { renderWithProviders } from '@/__tests__/test-utils';
import type { ExtendedTabConfig } from '../ExtendedTab';
import ExtendedTab from '../ExtendedTab';

// Mock PluginContext to control isPluginInstalled behavior
const isPluginInstalledMock = vi.fn((code: string) => code === 'installed-module');
vi.mock('@/context/PluginContext', () => ({
  usePlugins: () => ({
    isPluginInstalled: isPluginInstalledMock,
  }),
}));

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector
      ? selector({ addNotification: vi.fn(), notifications: [] })
      : { addNotification: vi.fn(), notifications: [] }
  ),
  useAuthStore: vi.fn((selector?: any) => (selector ? selector({ user: null }) : { user: null })),
}));

// Helper to render ExtendedTab inside Tabs (required by MUI Tab)
const renderInTabs = (props: React.ComponentProps<typeof ExtendedTab>) =>
  renderWithProviders(
    <Tabs
      value={props.value}
      onChange={props.onChange}
    >
      <ExtendedTab {...props} />
    </Tabs>
  );

describe('ExtendedTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isPluginInstalledMock.mockImplementation((code: string) => code === 'installed-module');
  });

  it('renders tabs for installed plugins', () => {
    const configs: ExtendedTabConfig[] = [
      { moduleCode: 'installed-module', label: '已安装模块', value: 'tab1' },
    ];
    renderInTabs({ configs, value: 'tab1', onChange: vi.fn() });
    expect(screen.getByText('已安装模块')).toBeInTheDocument();
  });

  it('filters out tabs for uninstalled plugins', () => {
    const configs: ExtendedTabConfig[] = [
      { moduleCode: 'installed-module', label: '已安装', value: 'tab1' },
      { moduleCode: 'uninstalled-module', label: '未安装', value: 'tab2' },
    ];
    renderInTabs({ configs, value: 'tab1', onChange: vi.fn() });
    expect(screen.getByText('已安装')).toBeInTheDocument();
    expect(screen.queryByText('未安装')).not.toBeInTheDocument();
  });

  it('renders nothing when no plugins are installed', () => {
    isPluginInstalledMock.mockReturnValue(false);
    const configs: ExtendedTabConfig[] = [
      { moduleCode: 'module-a', label: '模块A', value: 'a' },
      { moduleCode: 'module-b', label: '模块B', value: 'b' },
    ];
    const { container } = renderInTabs({ configs, value: 'a', onChange: vi.fn() });
    expect(container.textContent).not.toContain('模块A');
    expect(container.textContent).not.toContain('模块B');
  });

  it('renders multiple tabs when multiple plugins are installed', () => {
    isPluginInstalledMock.mockReturnValue(true);
    const configs: ExtendedTabConfig[] = [
      { moduleCode: 'module-a', label: '模块A', value: 'a' },
      { moduleCode: 'module-b', label: '模块B', value: 'b' },
      { moduleCode: 'module-c', label: '模块C', value: 'c' },
    ];
    renderInTabs({ configs, value: 'a', onChange: vi.fn() });
    expect(screen.getByText('模块A')).toBeInTheDocument();
    expect(screen.getByText('模块B')).toBeInTheDocument();
    expect(screen.getByText('模块C')).toBeInTheDocument();
  });

  it('renders tab with icon when icon prop is provided', () => {
    const configs: ExtendedTabConfig[] = [
      {
        moduleCode: 'installed-module',
        label: '带图标',
        value: 'tab1',
        icon: <span data-testid='tab-icon'>★</span>,
      },
    ];
    renderInTabs({ configs, value: 'tab1', onChange: vi.fn() });
    expect(screen.getByText('带图标')).toBeInTheDocument();
    expect(screen.getByTestId('tab-icon')).toBeInTheDocument();
  });

  it('renders tab as a clickable button element', () => {
    const handleChange = vi.fn();
    const configs: ExtendedTabConfig[] = [
      { moduleCode: 'installed-module', label: '可点击Tab', value: 'tab1' },
    ];
    renderInTabs({ configs, value: 'tab1', onChange: handleChange });
    // MUI Tab renders a button with role="tab"
    const tab = screen.getByRole('tab');
    expect(tab).toBeInTheDocument();
    expect(tab).toHaveTextContent('可点击Tab');
  });
});
