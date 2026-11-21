import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/__tests__/test-utils';

import IntegrationSettingsPage from '../IntegrationSettingsPage';

// 手写 MUI 设置页：硬编码 MOCK_CONFIGS，无 api 模块依赖（mutation 仅用 setTimeout）。
// PageContainer 为全局 mock（只渲染 children），故断言 children 内的真实区块文案。
describe('IntegrationSettingsPage', () => {
  it('renders global settings and connection config sections', () => {
    renderWithProviders(<IntegrationSettingsPage />);
    expect(screen.getByText('全局同步设置')).toBeInTheDocument();
    expect(screen.getByText('系统连接配置')).toBeInTheDocument();
  });

  it('renders the three hardcoded integration config cards', () => {
    renderWithProviders(<IntegrationSettingsPage />);
    expect(screen.getByText('ERP系统')).toBeInTheDocument();
    expect(screen.getByText('CRM系统')).toBeInTheDocument();
    expect(screen.getByText('WMS系统')).toBeInTheDocument();
  });
});
