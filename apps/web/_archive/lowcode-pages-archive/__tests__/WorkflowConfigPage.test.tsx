import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/__tests__/test-utils';

import WorkflowConfigPage from '../WorkflowConfigPage';

vi.mock('react-i18next', () => {
  const i18nMap: Record<string, string> = {
    'lowcode.workflow_config_page.k0': '加载工作流失败',
    'lowcode.workflow_config_page.k1': '创建工作流失败',
    'lowcode.workflow_config_page.k2': '删除工作流失败',
    'lowcode.workflow_config_page.k3': '切换状态失败',
    'lowcode.workflow_config_page.k4': '流程配置',
    'lowcode.workflow_config_page.k5': '流程配置',
    'lowcode.workflow_config_page.k6': '名称',
    'lowcode.workflow_config_page.k7': '编码',
    'lowcode.workflow_config_page.k8': '触发器',
    'lowcode.workflow_config_page.k9': '节点数',
    'lowcode.workflow_config_page.k10': '状态',
    'lowcode.workflow_config_page.k11': '操作',
    'lowcode.workflow_config_page.k12': '启用',
    'lowcode.workflow_config_page.k13': '禁用',
    'lowcode.workflow_config_page.k14': '启用',
    'lowcode.workflow_config_page.k15': '禁用',
    'lowcode.workflow_config_page.k16': '删除',
    'lowcode.workflow_config_page.k17': '新建工作流',
    'lowcode.workflow_config_page.id_18': '所属应用 ID',
    'lowcode.workflow_config_page.k19': '工作流编码',
    'lowcode.workflow_config_page.k20': '应用内唯一',
    'lowcode.workflow_config_page.k21': '工作流名称',
    'lowcode.workflow_config_page.k22': '触发器类型',
    'lowcode.workflow_config_page.k23': '描述',
    'lowcode.workflow_config_page.k24': '取消',
    'lowcode.workflow_config_page.k25': '创建',
    'lowcode.workflow_config_page.e1': '新建工作流',
    'lowcode.workflow_config_page.e2':
      '低代码应用内嵌工作流（表单提交/定时/事件触发）。 与 BPM 审批流程（workflow',
    'lowcode.workflow_config_page.e3': '模块）不同——本表用于数据/系统自动化。',
    'lowcode.workflow_config_page.e4': '暂无工作流',
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
    'lowcode.workflow_config_page.k0': '加载工作流失败',
    'lowcode.workflow_config_page.k1': '创建工作流失败',
    'lowcode.workflow_config_page.k2': '删除工作流失败',
    'lowcode.workflow_config_page.k3': '切换状态失败',
    'lowcode.workflow_config_page.k4': '流程配置',
    'lowcode.workflow_config_page.k5': '流程配置',
    'lowcode.workflow_config_page.k6': '名称',
    'lowcode.workflow_config_page.k7': '编码',
    'lowcode.workflow_config_page.k8': '触发器',
    'lowcode.workflow_config_page.k9': '节点数',
    'lowcode.workflow_config_page.k10': '状态',
    'lowcode.workflow_config_page.k11': '操作',
    'lowcode.workflow_config_page.k12': '启用',
    'lowcode.workflow_config_page.k13': '禁用',
    'lowcode.workflow_config_page.k14': '启用',
    'lowcode.workflow_config_page.k15': '禁用',
    'lowcode.workflow_config_page.k16': '删除',
    'lowcode.workflow_config_page.k17': '新建工作流',
    'lowcode.workflow_config_page.id_18': '所属应用 ID',
    'lowcode.workflow_config_page.k19': '工作流编码',
    'lowcode.workflow_config_page.k20': '应用内唯一',
    'lowcode.workflow_config_page.k21': '工作流名称',
    'lowcode.workflow_config_page.k22': '触发器类型',
    'lowcode.workflow_config_page.k23': '描述',
    'lowcode.workflow_config_page.k24': '取消',
    'lowcode.workflow_config_page.k25': '创建',
    'lowcode.workflow_config_page.e1': '新建工作流',
    'lowcode.workflow_config_page.e2':
      '低代码应用内嵌工作流（表单提交/定时/事件触发）。 与 BPM 审批流程（workflow',
    'lowcode.workflow_config_page.e3': '模块）不同——本表用于数据/系统自动化。',
    'lowcode.workflow_config_page.e4': '暂无工作流',
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
const mockEnable = vi.fn();
const mockDisable = vi.fn();

vi.mock('@/api/lowcode', () => ({
  lowcodeWorkflowsApi: {
    list: (...args: any[]) => mockList(...args),
    create: (...args: any[]) => mockCreate(...args),
    remove: (...args: any[]) => mockRemove(...args),
    enable: (...args: any[]) => mockEnable(...args),
    disable: (...args: any[]) => mockDisable(...args),
  },
  LowcodeWorkflow: {},
  LowcodeWorkflowTriggerType: {},
}));

vi.mock('@/components/common', () => ({
  PageContainer: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid='page-container'>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

const workflows = [
  {
    id: 'w1',
    app_id: 'crm',
    name: '客户自动分配',
    code: 'auto_assign',
    trigger: { type: 'record_create' },
    nodes: [{ id: 'n1' }, { id: 'n2' }],
    status: 'enabled',
    updated_at: '2026-08-10',
  },
  {
    id: 'w2',
    app_id: 'crm',
    name: '回款提醒',
    code: 'payment_remind',
    trigger: { type: 'schedule' },
    nodes: [{ id: 'n1' }],
    status: 'disabled',
    updated_at: '2026-08-11',
  },
];

describe('WorkflowConfigPage', () => {
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

    renderWithProviders(<WorkflowConfigPage />);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    resolvePromise?.({ data: { items: workflows } });
  });

  it('renders workflow rows', async () => {
    mockList.mockResolvedValue({ data: { items: workflows } });

    renderWithProviders(<WorkflowConfigPage />);

    await waitFor(() => {
      expect(screen.getByText('客户自动分配')).toBeInTheDocument();
    });
    expect(screen.getByText('auto_assign')).toBeInTheDocument();
    expect(screen.getByText('回款提醒')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    mockList.mockResolvedValue({ data: { items: [] } });

    renderWithProviders(<WorkflowConfigPage />);

    await waitFor(() => {
      expect(screen.getByText(/暂无工作流/)).toBeInTheDocument();
    });
  });

  it('shows error on API failure', async () => {
    mockList.mockRejectedValue(new Error('server error'));

    renderWithProviders(<WorkflowConfigPage />);

    await waitFor(() => {
      expect(screen.getByText(/server error/)).toBeInTheDocument();
    });
  });

  it('opens create dialog and validates required fields', async () => {
    mockList.mockResolvedValue({ data: { items: [] } });

    renderWithProviders(<WorkflowConfigPage />);

    fireEvent.click(await screen.findByRole('button', { name: '新建工作流' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('新建工作流');

    const createBtn = screen.getByRole('button', { name: '创建' });
    expect(createBtn).toBeDisabled();

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'crm' } });
    fireEvent.change(inputs[1], { target: { value: 'w_new' } });
    fireEvent.change(inputs[2], { target: { value: '新工作流' } });

    expect(createBtn).not.toBeDisabled();
  });

  it('toggle enable/disable triggers correct API', async () => {
    mockList.mockResolvedValue({ data: { items: workflows } });
    mockEnable.mockResolvedValue({});
    mockDisable.mockResolvedValue({});

    renderWithProviders(<WorkflowConfigPage />);

    await waitFor(() => {
      expect(screen.getByText('客户自动分配')).toBeInTheDocument();
    });

    // 点击 enabled 行的“禁用”按钮（w1）
    fireEvent.click(screen.getByRole('button', { name: '禁用' }));
    expect(mockDisable).toHaveBeenCalledWith('w1');

    // mutation 成功后 invalidate 重查，按钮重新渲染；
    // 等“启用”按钮可点击（非 disabled）后再点，避免 isMutating 期间点击丢失
    await waitFor(() => {
      const btn = screen.getAllByRole('button', { name: '启用' })[0];
      if (!btn || (btn as HTMLButtonElement).disabled) {
        throw new Error('启用 button not ready');
      }
      fireEvent.click(btn);
      expect(mockEnable).toHaveBeenCalledWith('w2');
    });
  });
});
