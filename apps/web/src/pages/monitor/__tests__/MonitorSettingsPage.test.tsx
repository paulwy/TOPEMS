import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/__tests__/test-utils';

import MonitorSettingsPage from '../MonitorSettingsPage';

// SettingsPageTemplate 全局 mock 是 children-only stub（吞掉 title/tabs），
// 按 §C 在测试内覆盖 barrel mock，让页面计算出的 title / tabs / sections / fields 真实渲染出来，
// 以验证页面 → tabs 配置的映射逻辑被执行。
vi.mock('@/components/templates', () => ({
  SettingsPageTemplate: ({ title, subtitle, tabs }: any) => (
    <div>
      <h1>{title}</h1>
      <div data-testid="settings-subtitle">{subtitle}</div>
      {tabs?.map((tab: any) => (
        <div key={tab.id} data-testid={`setting-tab-${tab.id}`}>
          <span className="tab-label">{tab.label}</span>
          {tab.sections?.map((section: any) => (
            <section key={section.id} data-testid={`section-${section.id}`}>
              <h3>{section.title}</h3>
              {section.fields?.map((field: any) => (
                <span key={field.id} data-testid={`field-${field.id}`}>
                  {field.label}
                </span>
              ))}
            </section>
          ))}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/api/monitor', () => ({
  monitorApi: {
    settings: {
      list: vi.fn().mockResolvedValue({ success: true, code: 0, data: {} }),
      batchUpdate: vi.fn().mockResolvedValue({ success: true, code: 0, data: {} }),
    },
  },
}));

describe('MonitorSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title and six setting tabs', () => {
    renderWithProviders(<MonitorSettingsPage />);

    expect(screen.getByRole('heading', { name: '监控设置' })).toBeInTheDocument();
    expect(screen.getByTestId('settings-subtitle')).toHaveTextContent(
      '配置监控系统的各项参数'
    );

    // 六个分类 tab 全部由页面 tabs 配置渲染（真实中文）
    expect(screen.getByTestId('setting-tab-general')).toHaveTextContent('通用设置');
    expect(screen.getByTestId('setting-tab-alert')).toHaveTextContent('告警设置');
    expect(screen.getByTestId('setting-tab-notification')).toHaveTextContent('通知设置');
    expect(screen.getByTestId('setting-tab-datasource')).toHaveTextContent('数据源');
    expect(screen.getByTestId('setting-tab-permission')).toHaveTextContent('权限设置');
    expect(screen.getByTestId('setting-tab-integration')).toHaveTextContent('集成设置');
  });

  it('renders general tab sections and field labels from page config', () => {
    renderWithProviders(<MonitorSettingsPage />);

    // 通用 tab 下的 section 与字段 label（页面 i18n 文案）
    expect(screen.getByTestId('section-general-basic')).toHaveTextContent('基础配置');
    expect(screen.getByTestId('field-general_monitoringEnabled')).toHaveTextContent('启用监控');
    expect(screen.getByTestId('field-general_dataRetentionDays')).toHaveTextContent(
      '数据保留时间（天）'
    );
  });
});
