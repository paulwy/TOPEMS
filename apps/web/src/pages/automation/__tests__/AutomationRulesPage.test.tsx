import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/__tests__/test-utils';

import AutomationRulesPage from '../AutomationRulesPage';

vi.mock('react-i18next', () => {
  const i18nMap: Record<string, string> = {
    'automation.automation_rules_page.k0': '已启用',
    'automation.automation_rules_page.k1': '已禁用',
    'automation.automation_rules_page.k2': '草稿',
    'automation.automation_rules_page.k9': '自动化规则',
    'automation.automation_rules_page.k10': '规则列表',
    'automation.automation_rules_page.e1': '新建规则',
    'automation.automation_rules_page.e2': '暂无规则，点击右上角新建',
    'automation.automation_rules_page.k11': '规则名称',
    'automation.automation_rules_page.k12': '编码',
    'automation.automation_rules_page.k13': '状态',
    'automation.automation_rules_page.k14': '触发器类型',
    'automation.automation_rules_page.k15': '动作类型',
    'automation.automation_rules_page.r1': '最后运行时间',
    'automation.automation_rules_page.k16': '运行次数',
    'automation.automation_rules_page.k17': '操作',
    'automation.automation_rules_page.k18': '触发',
    'automation.automation_rules_page.k19': '触发',
    'automation.automation_rules_page.k20': '启用',
    'automation.automation_rules_page.k21': '禁用',
    'automation.automation_rules_page.k22': '启用',
    'automation.automation_rules_page.k23': '禁用',
    'automation.automation_rules_page.k24': '复制',
    'automation.automation_rules_page.k25': '复制',
    'automation.automation_rules_page.k26': '删除',
    'automation.automation_rules_page.k27': '删除',
    'automation.automation_rules_page.k28': '新建自动化规则',
    'automation.automation_rules_page.k29': '规则名称',
    'automation.automation_rules_page.k30': '编码',
    'automation.automation_rules_page.k31': '仅支持字母、数字、下划线和连字符',
    'automation.automation_rules_page.k32': '触发器类型',
    'automation.automation_rules_page.k33': '动作类型',
    'automation.automation_rules_page.json_34': '触发器配置（JSON）',
    'automation.automation_rules_page.k35': '动作配置（JSON）',
    'automation.automation_rules_page.id_36': '下游规则 ID（逗号分隔，可选）',
    'automation.automation_rules_page.k37': '取消',
    'automation.automation_rules_page.r2': '保存',
    'automation.automation_rules_page.k38': '保存',
    'automation.automation_rules_page.k3': '加载规则列表失败',
    'automation.automation_rules_page.k4': '创建规则失败',
    'automation.automation_rules_page.k5': '删除规则失败',
    'automation.automation_rules_page.k6': '复制规则失败',
    'automation.automation_rules_page.k7': '启用规则失败',
    'automation.automation_rules_page.k8': '禁用规则失败',
  };
  const t = (key: string, vars?: Record<string, unknown>): string => {
    let result = i18nMap[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        result = result.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      });
    }
    return result;
  };
  return {
    useTranslation: (ns?: string | string[]) => ({
      t,
      i18n: {
        changeLanguage: vi.fn(),
        language: 'zh',
      },
    }),
    initReactI18next: {
      type: '3rdParty',
      init: vi.fn(),
    },
    Trans: ({ children }: any) => children,
  };
});

vi.mock('@/i18n', () => {
  const i18nMap: Record<string, string> = {
    'automation.automation_rules_page.k0': '已启用',
    'automation.automation_rules_page.k1': '已禁用',
    'automation.automation_rules_page.k2': '草稿',
    'automation.automation_rules_page.k9': '自动化规则',
    'automation.automation_rules_page.k10': '规则列表',
    'automation.automation_rules_page.e1': '新建规则',
    'automation.automation_rules_page.e2': '暂无规则，点击右上角新建',
    'automation.automation_rules_page.k11': '规则名称',
    'automation.automation_rules_page.k12': '编码',
    'automation.automation_rules_page.k13': '状态',
    'automation.automation_rules_page.k14': '触发器类型',
    'automation.automation_rules_page.k15': '动作类型',
    'automation.automation_rules_page.r1': '最后运行时间',
    'automation.automation_rules_page.k16': '运行次数',
    'automation.automation_rules_page.k17': '操作',
    'automation.automation_rules_page.k18': '触发',
    'automation.automation_rules_page.k19': '触发',
    'automation.automation_rules_page.k20': '启用',
    'automation.automation_rules_page.k21': '禁用',
    'automation.automation_rules_page.k22': '启用',
    'automation.automation_rules_page.k23': '禁用',
    'automation.automation_rules_page.k24': '复制',
    'automation.automation_rules_page.k25': '复制',
    'automation.automation_rules_page.k26': '删除',
    'automation.automation_rules_page.k27': '删除',
    'automation.automation_rules_page.k28': '新建自动化规则',
    'automation.automation_rules_page.k29': '规则名称',
    'automation.automation_rules_page.k30': '编码',
    'automation.automation_rules_page.k31': '仅支持字母、数字、下划线和连字符',
    'automation.automation_rules_page.k32': '触发器类型',
    'automation.automation_rules_page.k33': '动作类型',
    'automation.automation_rules_page.json_34': '触发器配置（JSON）',
    'automation.automation_rules_page.k35': '动作配置（JSON）',
    'automation.automation_rules_page.id_36': '下游规则 ID（逗号分隔，可选）',
    'automation.automation_rules_page.k37': '取消',
    'automation.automation_rules_page.r2': '保存',
    'automation.automation_rules_page.k38': '保存',
    'automation.automation_rules_page.k3': '加载规则列表失败',
    'automation.automation_rules_page.k4': '创建规则失败',
    'automation.automation_rules_page.k5': '删除规则失败',
    'automation.automation_rules_page.k6': '复制规则失败',
    'automation.automation_rules_page.k7': '启用规则失败',
    'automation.automation_rules_page.k8': '禁用规则失败',
  };
  const t = (key: string, vars?: Record<string, unknown>): string => {
    let result = i18nMap[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        result = result.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      });
    }
    return result;
  };
  return {
    default: {
      t,
      language: 'zh',
      changeLanguage: vi.fn(),
    },
  };
});

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockRemove = vi.fn();
const mockDuplicate = vi.fn();
const mockEnable = vi.fn();
const mockDisable = vi.fn();
const mockTrigger = vi.fn();

vi.mock('@/api/automation', () => ({
  automationRulesApi: {
    list: (...args: any[]) => mockList(...args),
    create: (...args: any[]) => mockCreate(...args),
    remove: (...args: any[]) => mockRemove(...args),
    duplicate: (...args: any[]) => mockDuplicate(...args),
    enable: (...args: any[]) => mockEnable(...args),
    disable: (...args: any[]) => mockDisable(...args),
    trigger: (...args: any[]) => mockTrigger(...args),
  },
  AutomationRule: {},
  AutomationRuleTriggerType: {},
  AutomationRuleActionType: {},
}));

vi.mock('@/components/common', () => ({
  PageContainer: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid='page-container'>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

const rules = [
  {
    id: 'rule-001',
    name: '每日库存同步',
    code: 'daily_inv_sync',
    status: 'enabled',
    trigger: { type: 'schedule' },
    action: { type: 'http' },
    last_run_at: '2026-08-12 10:00:00',
  },
  {
    id: 'rule-002',
    name: '新客户跟进提醒',
    code: 'followup_remind',
    status: 'disabled',
    trigger: { type: 'record_create' },
    action: { type: 'notification' },
    last_run_at: null,
  },
];

describe('AutomationRulesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading', async () => {
    let resolvePromise: ((v: any) => void) | undefined;
    mockList.mockReturnValue(
      new Promise((res) => {
        resolvePromise = res;
      })
    );

    renderWithProviders(<AutomationRulesPage />);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    resolvePromise?.({ data: { items: rules } });
  });

  it('renders rule cards with name and status', async () => {
    mockList.mockResolvedValue({ data: { items: rules } });

    renderWithProviders(<AutomationRulesPage />);

    await waitFor(() => {
      expect(screen.getByText('每日库存同步')).toBeInTheDocument();
    });
    expect(screen.getByText('daily_inv_sync')).toBeInTheDocument();
    expect(screen.getByText('新客户跟进提醒')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    mockList.mockResolvedValue({ data: { items: [] } });

    renderWithProviders(<AutomationRulesPage />);

    await waitFor(() => {
      expect(screen.getByText(/暂无规则/)).toBeInTheDocument();
    });
  });

  it('shows error on API failure', async () => {
    mockList.mockRejectedValue(new Error('forbidden'));

    renderWithProviders(<AutomationRulesPage />);

    await waitFor(() => {
      expect(screen.getByText(/forbidden/)).toBeInTheDocument();
    });
  });

  it('opens create dialog with title', async () => {
    mockList.mockResolvedValue({ data: { items: [] } });

    renderWithProviders(<AutomationRulesPage />);

    fireEvent.click(await screen.findByRole('button', { name: '新建规则' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('新建自动化规则');
  });

  it('duplicate and delete trigger APIs', async () => {
    mockList.mockResolvedValue({ data: { items: rules } });
    mockDuplicate.mockResolvedValue({});
    mockRemove.mockResolvedValue({});

    renderWithProviders(<AutomationRulesPage />);

    await waitFor(() => {
      expect(screen.getByText('每日库存同步')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: '复制' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: '删除' })[1]);

    expect(mockDuplicate).toHaveBeenCalledWith('rule-001');
    expect(mockRemove).toHaveBeenCalledWith('rule-002');
  });
});
