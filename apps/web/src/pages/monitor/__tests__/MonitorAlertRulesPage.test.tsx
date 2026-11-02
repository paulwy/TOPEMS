import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import MonitorAlertRulesPage from '../MonitorAlertRulesPage';

// CrudPage 包装页：页面内部用 initialMockRules 状态作为 mockApiAdapter.list 数据源，
// 同时 useQuery 调 monitorApi.ruleTyped.list()（被页面 try/catch 吞掉），mock 成空响应即可。
// CrudPage mock 渲染 alertRuleSchema.title（告警规则）为 <h1>，行字段渲染 cell-<field>-<ri>。
vi.mock('@/api/monitor', () => ({
  monitorApi: {
    ruleTyped: {
      list: vi.fn().mockResolvedValue({ success: true, code: 0, data: {} }),
    },
  },
}));

describe('MonitorAlertRulesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page heading（告警规则）', async () => {
    renderWithProviders(<MonitorAlertRulesPage />);

    expect(await screen.findByRole('heading', { name: '告警规则' })).toBeInTheDocument();
  });

  it('renders built-in rule rows（initialMockRules）', async () => {
    renderWithProviders(<MonitorAlertRulesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('cell-name-0')).toHaveTextContent('CPU 使用率过高');
    });
  });
});
