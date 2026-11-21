import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import MonitorAlertRulesPage from '../MonitorAlertRulesPage';

// CrudPage 包装页：adapter 直接调 monitorApi.ruleTyped.list()（GET /api/monitor/rules），
// 返回的 AlertRuleRecord 映射成页面 AlertRule（condition.field→metric_name 等）。
// CrudPage 渲染 alertRuleSchema.title（告警规则）为 <h1>，行字段渲染 cell-<field>-<ri>。
const mockRecords = vi.hoisted(() => [
  {
    id: 'rule-1',
    tenant_id: 't1',
    name: 'CPU 使用率过高',
    description: null,
    service_name: 'cpu',
    severity: 'critical',
    condition: { field: 'cpu_usage', operator: '>', value: 90 },
    actions: [{ action_type: 'email', config: {} }],
    enabled: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-02',
  },
]);

vi.mock('@/api/monitor', () => ({
  monitorApi: {
    ruleTyped: {
      list: vi.fn().mockResolvedValue({ success: true, code: 0, data: mockRecords }),
      create: vi.fn().mockResolvedValue({ success: true, code: 0, data: mockRecords[0] }),
      update: vi.fn().mockResolvedValue({ success: true, code: 0, data: mockRecords[0] }),
      delete: vi.fn().mockResolvedValue({ success: true, code: 0, data: { id: 'rule-1' } }),
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

  it('renders rule rows from GET /api/monitor/rules', async () => {
    renderWithProviders(<MonitorAlertRulesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('cell-name-0')).toHaveTextContent('CPU 使用率过高');
    });
  });
});
