import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import { SettingsTabRenderer } from '../SettingsTabRenderer';

vi.mock('@/components/templates', async () => {
  const React = await import('react');
  return {
    SettingsPageTemplate: ({
      title,
      subtitle,
      tabs,
      onSave,
    }: {
      title: string;
      subtitle?: string;
      tabs: Array<{ key?: string; id?: string; label?: string }>;
      onSave: (data: Record<string, unknown>) => void | Promise<void>;
    }) =>
      React.createElement(
        'section',
        { 'data-testid': 'settings-page-template' },
        React.createElement('h1', null, title),
        subtitle ? React.createElement('p', null, subtitle) : null,
        React.createElement(
          'ul',
          null,
          tabs.map((tab) =>
            React.createElement('li', { key: tab.key ?? tab.id }, tab.label ?? tab.key ?? tab.id)
          )
        ),
        React.createElement(
          'button',
          {
            onClick: () =>
              onSave({
                refreshInterval: 30,
                enabled: true,
              }),
          },
          '保存设置'
        )
      ),
  };
});

const tabs = [
  {
    key: 'basic',
    label: '基础设置',
    fields: [],
  },
  {
    key: 'alerts',
    label: '告警设置',
    fields: [],
  },
];

describe('SettingsTabRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes title, subtitle and tabs to SettingsPageTemplate', () => {
    renderWithProviders(
      <SettingsTabRenderer
        title='监控设置'
        subtitle='配置监控刷新和告警参数'
        tabs={tabs as any}
        handleSave={vi.fn()}
      />
    );

    expect(screen.getByTestId('settings-page-template')).toBeInTheDocument();
    expect(screen.getByText('监控设置')).toBeInTheDocument();
    expect(screen.getByText('配置监控刷新和告警参数')).toBeInTheDocument();
    expect(screen.getByText('基础设置')).toBeInTheDocument();
    expect(screen.getByText('告警设置')).toBeInTheDocument();
  });
});
