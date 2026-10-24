import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, fireEvent } from '@/__tests__/test-utils';

import MrpPlanPage from '../MrpPlanPage';

// --- mock @/api/scm（MrpPlanPage 经 createCrudPageAdapter 使用 scmApi.mrpPlans）---
vi.mock('@/api/scm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/scm')>();
  return {
    ...actual,
    scmApi: {
      ...actual.scmApi,
      mrpPlans: {
        list: vi.fn().mockResolvedValue({
          success: true,
          code: 0,
          message: '',
          data: {
            items: [
              { id: 'M1', plan_code: 'MP-001', plan_name: '主生产计划A', status: 'draft' },
              { id: 'M2', plan_code: 'MP-002', plan_name: '主生产计划B', status: 'calculated' },
            ],
            total: 2,
          },
        }),
        calculate: vi.fn().mockResolvedValue({
          success: true,
          code: 0,
          message: '',
          data: {
            plan_id: 'M1',
            totalitems: 1,
            total_suggestions: 1,
            purchase_suggestions: 1,
            production_suggestions: 0,
            message: '计算完成',
          },
        }),
        get: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
  };
});

// --- mock i18n（页面直接 import '@/i18n' 调 i18n.t）---
vi.mock('@/i18n', () => {
  const keys: Record<string, string> = {
    'scm.mrp_plan_page.k0': '计算成功',
    'scm.mrp_plan_page.k1': '计算失败',
    'scm.mrp_plan_page.k2': '确认计算',
    'scm.mrp_plan_page.k3': '计算',
    'scm.mrp_plan_page.k4': '查看建议',
    'scm.mrp_plan_page.k9': '关闭',
    'scm.mrp_plan_page.e1': '确认对计划 {v1} 执行 MRP 计算？',
    'scm.mrp_plan_page.e2': '查看建议订单',
    'scm.mrp_plan_page.m1': '计算异常',
    'scm.mrp_plan_page.m2': '计算失败，请重试',
    'scm.mrp_plan_page.l1': 'MRP 计算完成',
  };
  return { default: { t: (k: string) => keys[k] ?? k } };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

// --- mock ConfirmDialog：确认按钮触发 onConfirm ---
vi.mock('@topems/shared-components', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@topems/shared-components')>();
  return {
    ...actual,
    ConfirmDialog: ({
      isOpen,
      onConfirm,
      title,
      message,
    }: {
      isOpen: boolean;
      onConfirm: () => void;
      title: string;
      message: string;
    }) =>
      isOpen ? (
        <div
          role='dialog'
          aria-label={title}
        >
          <div>{message}</div>
          <button onClick={onConfirm}>确认</button>
          <button onClick={() => {}}>取消</button>
        </div>
      ) : null,
  };
});

// --- mock store（页面与 CrudPage 都调 useNotificationStore().addNotification）---
vi.mock('@/store', () => ({
  useNotificationStore: () => ({
    addNotification: vi.fn(),
    notify: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('MrpPlanPage（模板 stub 改造后可测）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染计划列表行 + 按 status 显示行动作按钮', async () => {
    renderWithProviders(<MrpPlanPage />);
    await waitFor(() => {
      expect(screen.getByText('MP-001')).toBeInTheDocument();
    });
    expect(screen.getByText('MP-002')).toBeInTheDocument();
    // draft 行（M1）有计算按钮；calculated 行（M2）有查看建议按钮
    expect(screen.getByTestId('row-action-calculate-0')).toBeInTheDocument();
    expect(screen.getByTestId('row-action-viewSuggestions-1')).toBeInTheDocument();
    // calculated 行不显示计算按钮（show 过滤）
    expect(screen.queryByTestId('row-action-calculate-1')).not.toBeInTheDocument();
  });

  it('点击计算 → 确认 → 调用 calculate → 展示结果 Dialog', async () => {
    const { scmApi } = await import('@/api/scm');
    renderWithProviders(<MrpPlanPage />);
    await waitFor(() => {
      expect(screen.getByTestId('row-action-calculate-0')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('row-action-calculate-0'));
    // ConfirmDialog 出现（确认计算）
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('确认'));
    await waitFor(() => {
      expect(scmApi.mrpPlans.calculate).toHaveBeenCalledWith('M1');
    });

    // 结果 Dialog：Alert 消息 + 汇总卡数值
    await waitFor(() => {
      expect(screen.getByText('计算完成')).toBeInTheDocument();
    });
    // 汇总卡（totalitems=1 / purchase_suggestions=1）
    await waitFor(() => {
      expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('查看建议按钮跳转 mrpSuggestion（携带 plan_id）', async () => {
    // jsdom location.href 只读不可赋——替换为可写 location 模拟导航
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...originalLocation, href: 'http://localhost:3000/' },
    });

    renderWithProviders(<MrpPlanPage />);
    await waitFor(() => {
      expect(screen.getByTestId('row-action-viewSuggestions-1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('row-action-viewSuggestions-1'));
    await waitFor(() => {
      expect(window.location.href).toContain('mrp-suggestion');
      expect(window.location.href).toContain('plan_id=M2');
    });
  });
});
