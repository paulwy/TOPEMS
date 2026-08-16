import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/__tests__/test-utils';

import AutomationVariablesPage from '../AutomationVariablesPage';

vi.mock('react-i18next', () => {
  const i18nMap: Record<string, string> = {
  'automation.automation_variables_page.k0': '全局',
  'automation.automation_variables_page.k1': '工作区',
  'automation.automation_variables_page.k2': '规则级',
  'automation.automation_variables_page.k3': '加载变量列表失败',
  'automation.automation_variables_page.k4': '创建变量失败',
  'automation.automation_variables_page.k5': '删除变量失败',
  'automation.automation_variables_page.k6': '解密失败',
  'automation.automation_variables_page.k7': '环境变量',
  'automation.automation_variables_page.k8': '环境变量',
  'automation.automation_variables_page.k9': '变量名',
  'automation.automation_variables_page.e2': '值',
  'automation.automation_variables_page.k10': '范围',
  'automation.automation_variables_page.k11': '密钥',
  'automation.automation_variables_page.id_12': '规则 ID',
  'automation.automation_variables_page.k13': '描述',
  'automation.automation_variables_page.k14': '更新时间',
  'automation.automation_variables_page.k15': '操作',
  'automation.automation_variables_page.k16': '解密',
  'automation.automation_variables_page.k17': '隐藏',
  'automation.automation_variables_page.k18': '解密',
  'automation.automation_variables_page.k19': '隐藏',
  'automation.automation_variables_page.k20': '否',
  'automation.automation_variables_page.k21': '是',
  'automation.automation_variables_page.k22': '删除',
  'automation.automation_variables_page.k23': '删除',
  'automation.automation_variables_page.k24': '新建环境变量',
  'automation.automation_variables_page.key_25': '变量名（key）',
  'automation.automation_variables_page.m1': '仅支持字母、数字、下划线和点，scope 为 rule 时建议 {{v1}}',
  'automation.automation_variables_page.k26': '变量值',
  'automation.automation_variables_page.k27': '范围',
  'automation.automation_variables_page.k28': '全局',
  'automation.automation_variables_page.k29': '工作区',
  'automation.automation_variables_page.k30': '规则级',
  'automation.automation_variables_page.id_31': '规则 ID',
  'automation.automation_variables_page.k32': '是否为密钥',
  'automation.automation_variables_page.k33': '否（普通变量）',
  'automation.automation_variables_page.mask_34': '是（密钥，读取时 mask）',
  'automation.automation_variables_page.k35': '描述',
  'automation.automation_variables_page.k36': '取消',
  'automation.automation_variables_page.k37': '创建',
  'automation.automation_variables_page.e1': '新建变量',
  'automation.automation_variables_page.e3': '暂无变量',
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
  'automation.automation_variables_page.k0': '全局',
  'automation.automation_variables_page.k1': '工作区',
  'automation.automation_variables_page.k2': '规则级',
  'automation.automation_variables_page.k3': '加载变量列表失败',
  'automation.automation_variables_page.k4': '创建变量失败',
  'automation.automation_variables_page.k5': '删除变量失败',
  'automation.automation_variables_page.k6': '解密失败',
  'automation.automation_variables_page.k7': '环境变量',
  'automation.automation_variables_page.k8': '环境变量',
  'automation.automation_variables_page.k9': '变量名',
  'automation.automation_variables_page.e2': '值',
  'automation.automation_variables_page.k10': '范围',
  'automation.automation_variables_page.k11': '密钥',
  'automation.automation_variables_page.id_12': '规则 ID',
  'automation.automation_variables_page.k13': '描述',
  'automation.automation_variables_page.k14': '更新时间',
  'automation.automation_variables_page.k15': '操作',
  'automation.automation_variables_page.k16': '解密',
  'automation.automation_variables_page.k17': '隐藏',
  'automation.automation_variables_page.k18': '解密',
  'automation.automation_variables_page.k19': '隐藏',
  'automation.automation_variables_page.k20': '否',
  'automation.automation_variables_page.k21': '是',
  'automation.automation_variables_page.k22': '删除',
  'automation.automation_variables_page.k23': '删除',
  'automation.automation_variables_page.k24': '新建环境变量',
  'automation.automation_variables_page.key_25': '变量名（key）',
  'automation.automation_variables_page.m1': '仅支持字母、数字、下划线和点，scope 为 rule 时建议 {{v1}}',
  'automation.automation_variables_page.k26': '变量值',
  'automation.automation_variables_page.k27': '范围',
  'automation.automation_variables_page.k28': '全局',
  'automation.automation_variables_page.k29': '工作区',
  'automation.automation_variables_page.k30': '规则级',
  'automation.automation_variables_page.id_31': '规则 ID',
  'automation.automation_variables_page.k32': '是否为密钥',
  'automation.automation_variables_page.k33': '否（普通变量）',
  'automation.automation_variables_page.mask_34': '是（密钥，读取时 mask）',
  'automation.automation_variables_page.k35': '描述',
  'automation.automation_variables_page.k36': '取消',
  'automation.automation_variables_page.k37': '创建',
  'automation.automation_variables_page.e1': '新建变量',
  'automation.automation_variables_page.e3': '暂无变量',
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
const mockReveal = vi.fn();

vi.mock('@/api/automation', () => ({
  automationVariablesApi: {
    list: (...args: any[]) => mockList(...args),
    create: (...args: any[]) => mockCreate(...args),
    remove: (...args: any[]) => mockRemove(...args),
    reveal: (...args: any[]) => mockReveal(...args),
  },
  AutomationVariable: {},
  AutomationVariableScope: {},
}));

vi.mock('@/components/common', () => ({
  PageContainer: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid='page-container'>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

const variables = [
  {
    key: 'api_endpoint',
    value: 'https://api.example.com',
    scope: 'global',
    rule_id: '',
    description: 'API 基础地址',
    updated_at: '2026-08-10',
  },
  {
    key: 'smtp_password',
    value: '******',
    scope: 'rule',
    rule_id: 'rule-001',
    description: 'SMTP 密码',
    updated_at: '2026-08-11',
  },
];

describe('AutomationVariablesPage', () => {
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

    renderWithProviders(<AutomationVariablesPage />);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    resolvePromise?.({ data: { items: variables } });
  });

  it('renders variable rows with key and scope', async () => {
    mockList.mockResolvedValue({ data: { items: variables } });

    renderWithProviders(<AutomationVariablesPage />);

    await waitFor(() => {
      expect(screen.getByText('api_endpoint')).toBeInTheDocument();
    });
    expect(screen.getByText('smtp_password')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    mockList.mockResolvedValue({ data: { items: [] } });

    renderWithProviders(<AutomationVariablesPage />);

    await waitFor(() => {
      expect(screen.getByText(/暂无变量/)).toBeInTheDocument();
    });
  });

  it('shows error on API failure', async () => {
    mockList.mockRejectedValue(new Error('unauthorized'));

    renderWithProviders(<AutomationVariablesPage />);

    await waitFor(() => {
      expect(screen.getByText(/unauthorized/)).toBeInTheDocument();
    });
  });

  it('opens create dialog with title', async () => {
    mockList.mockResolvedValue({ data: { items: [] } });

    renderWithProviders(<AutomationVariablesPage />);

    fireEvent.click(await screen.findByRole('button', { name: '新建变量' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('新建环境变量');
  });

  it('delete triggers remove API', async () => {
    mockList.mockResolvedValue({ data: { items: variables } });
    mockRemove.mockResolvedValue({});

    renderWithProviders(<AutomationVariablesPage />);

    await waitFor(() => {
      expect(screen.getByText('api_endpoint')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: '删除' })[0]);
    expect(mockRemove).toHaveBeenCalledWith('api_endpoint');
  });
});
