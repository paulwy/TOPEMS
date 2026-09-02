import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/__tests__/test-utils';

import AppListPage from '../AppListPage';

vi.mock('react-i18next', () => {
  const i18nMap: Record<string, string> = {
    'lowcode.app_list_page.k0': '加载应用列表失败',
    'lowcode.app_list_page.k1': '创建应用失败',
    'lowcode.app_list_page.k2': '删除应用失败',
    'lowcode.app_list_page.k3': '复制应用失败',
    'lowcode.app_list_page.k4': '应用列表',
    'lowcode.app_list_page.k5': '低代码应用管理',
    'lowcode.app_list_page.k6': '应用名称',
    'lowcode.app_list_page.k7': '编码',
    'lowcode.app_list_page.k8': '状态',
    'lowcode.app_list_page.k9': '版本',
    'lowcode.app_list_page.k10': '更新时间',
    'lowcode.app_list_page.k11': '操作',
    'lowcode.app_list_page.k12': '复制',
    'lowcode.app_list_page.k13': '复制',
    'lowcode.app_list_page.k14': '删除',
    'lowcode.app_list_page.k15': '删除',
    'lowcode.app_list_page.k16': '新建应用',
    'lowcode.app_list_page.k17': '应用名称',
    'lowcode.app_list_page.k18': '应用编码',
    'lowcode.app_list_page.k19': '应用唯一标识，创建后不可修改',
    'lowcode.app_list_page.k20': '描述',
    'lowcode.app_list_page.k21': '取消',
    'lowcode.app_list_page.k22': '创建',
    'lowcode.app_list_page.e1': '新建应用',
    'lowcode.app_list_page.e2': '暂无应用，点击右上角新建',
    'lowcode.app_list_page.r1': '创建中…',
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
    'lowcode.app_list_page.k0': '加载应用列表失败',
    'lowcode.app_list_page.k1': '创建应用失败',
    'lowcode.app_list_page.k2': '删除应用失败',
    'lowcode.app_list_page.k3': '复制应用失败',
    'lowcode.app_list_page.k4': '应用列表',
    'lowcode.app_list_page.k5': '低代码应用管理',
    'lowcode.app_list_page.k6': '应用名称',
    'lowcode.app_list_page.k7': '编码',
    'lowcode.app_list_page.k8': '状态',
    'lowcode.app_list_page.k9': '版本',
    'lowcode.app_list_page.k10': '更新时间',
    'lowcode.app_list_page.k11': '操作',
    'lowcode.app_list_page.k12': '复制',
    'lowcode.app_list_page.k13': '复制',
    'lowcode.app_list_page.k14': '删除',
    'lowcode.app_list_page.k15': '删除',
    'lowcode.app_list_page.k16': '新建应用',
    'lowcode.app_list_page.k17': '应用名称',
    'lowcode.app_list_page.k18': '应用编码',
    'lowcode.app_list_page.k19': '应用唯一标识，创建后不可修改',
    'lowcode.app_list_page.k20': '描述',
    'lowcode.app_list_page.k21': '取消',
    'lowcode.app_list_page.k22': '创建',
    'lowcode.app_list_page.e1': '新建应用',
    'lowcode.app_list_page.e2': '暂无应用，点击右上角新建',
    'lowcode.app_list_page.r1': '创建中…',
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

vi.mock('@/api/lowcode', () => ({
  lowcodeAppsApi: {
    list: (...args: any[]) => mockList(...args),
    create: (...args: any[]) => mockCreate(...args),
    remove: (...args: any[]) => mockRemove(...args),
    duplicate: (...args: any[]) => mockDuplicate(...args),
  },
  LowcodeApp: {},
}));

vi.mock('@/components/common', () => ({
  PageContainer: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid='page-container'>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

const apps = [
  {
    id: 'a1',
    name: 'CRM 客户管理',
    code: 'crm',
    status: 'published',
    version: 3,
    updated_at: '2026-08-10 14:22',
    created_at: '2026-08-10 14:22',
  },
  {
    id: 'a2',
    name: '库存盘点',
    code: 'inventory',
    status: 'draft',
    version: 1,
    updated_at: '2026-08-11 09:05',
    created_at: '2026-08-11 09:05',
  },
  {
    id: 'a3',
    name: '报销申请',
    code: 'expense',
    status: 'published',
    version: 5,
    updated_at: '2026-08-12 16:40',
    created_at: '2026-08-12 16:40',
  },
];

describe('AppListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 复制操作走 window.confirm，jsdom 默认返回 false
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders loading spinner while fetching', async () => {
    let resolvePromise: ((v: any) => void) | undefined;
    mockList.mockReturnValue(
      new Promise((res) => {
        resolvePromise = res;
      })
    );

    renderWithProviders(<AppListPage />);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    resolvePromise?.({ data: { items: apps } });
  });

  it('renders app rows with name, code, status, version and updated time', async () => {
    mockList.mockResolvedValue({ data: { items: apps } });

    renderWithProviders(<AppListPage />);

    await waitFor(() => {
      expect(screen.getByText('CRM 客户管理')).toBeInTheDocument();
    });

    expect(screen.getByText('crm')).toBeInTheDocument();
    expect(screen.getAllByText('published').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('v3')).toBeInTheDocument();
    expect(screen.getByText('2026-08-12 16:40')).toBeInTheDocument();
  });

  it('shows empty state when no apps', async () => {
    mockList.mockResolvedValue({ data: { items: [] } });

    renderWithProviders(<AppListPage />);

    await waitFor(() => {
      expect(screen.getByText('暂无应用，点击右上角新建')).toBeInTheDocument();
    });
  });

  it('shows error text when list fails', async () => {
    mockList.mockRejectedValue(new Error('500 boom'));

    renderWithProviders(<AppListPage />);

    await waitFor(() => {
      expect(screen.getByText(/500 boom/)).toBeInTheDocument();
    });
  });

  it('opens create dialog with title and two text fields', async () => {
    mockList.mockResolvedValue({ data: { items: [] } });

    renderWithProviders(<AppListPage />);

    fireEvent.click(await screen.findByRole('button', { name: '新建应用' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('新建应用');

    const textboxes = screen.getAllByRole('textbox');
    expect(textboxes.length).toBeGreaterThanOrEqual(2);
  });

  it('create submit calls API with filled form', async () => {
    mockList.mockResolvedValue({ data: { items: [] } });
    mockCreate.mockResolvedValue({ data: { id: 'new-1' } });

    renderWithProviders(<AppListPage />);

    fireEvent.click(await screen.findByRole('button', { name: '新建应用' }));
    await screen.findByRole('dialog');

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: '测试应用' } });
    fireEvent.change(inputs[1], { target: { value: 'test_app' } });

    const createBtn = screen.getByRole('button', { name: '创建' });
    expect(createBtn).not.toBeDisabled();
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
    });
  });

  it('disables create button when required fields are empty', async () => {
    mockList.mockResolvedValue({ data: { items: [] } });

    renderWithProviders(<AppListPage />);

    fireEvent.click(await screen.findByRole('button', { name: '新建应用' }));
    await screen.findByRole('dialog');

    const createBtn = screen.getByRole('button', { name: '创建' });
    expect(createBtn).toBeDisabled();
  });

  it('triggers duplicate and delete handlers', async () => {
    mockList.mockResolvedValue({ data: { items: apps } });
    mockDuplicate.mockResolvedValue({});
    mockRemove.mockResolvedValue({});

    renderWithProviders(<AppListPage />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /复制/ }).length).toBeGreaterThanOrEqual(2);
    });

    const copyButtons = screen.getAllByRole('button', { name: /复制/ });
    const deleteButtons = screen.getAllByRole('button', { name: /删除/ });

    fireEvent.click(copyButtons[0]);
    fireEvent.click(deleteButtons[1]);

    expect(mockDuplicate).toHaveBeenCalledWith('a1');
    expect(mockRemove).toHaveBeenCalledWith('a2');
  });
});
