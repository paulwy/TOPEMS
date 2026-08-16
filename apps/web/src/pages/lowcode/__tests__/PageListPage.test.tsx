import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/__tests__/test-utils';

import PageListPage from '../PageListPage';

vi.mock('react-i18next', () => {
  const i18nMap: Record<string, string> = {
    'lowcode.page_list_page.k0': '加载页面失败',
    'lowcode.page_list_page.k1': '创建页面失败',
    'lowcode.page_list_page.k2': '删除页面失败',
    'lowcode.page_list_page.k3': '发布页面失败',
    'lowcode.page_list_page.k4': '设为首页失败',
    'lowcode.page_list_page.k5': '页面列表',
    'lowcode.page_list_page.k6': '页面列表',
    'lowcode.page_list_page.k7': '页面名称',
    'lowcode.page_list_page.k8': '编码',
    'lowcode.page_list_page.k9': '类型',
    'lowcode.page_list_page.k10': '路由',
    'lowcode.page_list_page.k11': '状态',
    'lowcode.page_list_page.k12': '操作',
    'lowcode.page_list_page.k13': '设为首页',
    'lowcode.page_list_page.k14': '设为首页',
    'lowcode.page_list_page.k15': '发布',
    'lowcode.page_list_page.k16': '发布',
    'lowcode.page_list_page.k17': '删除',
    'lowcode.page_list_page.k18': '新建页面',
    'lowcode.page_list_page.id_19': '所属应用 ID',
    'lowcode.page_list_page.k20': '页面编码',
    'lowcode.page_list_page.k21': '应用内唯一',
    'lowcode.page_list_page.k22': '页面名称',
    'lowcode.page_list_page.k23': '页面类型',
    'lowcode.page_list_page.k24': '路由路径',
    'lowcode.page_list_page.list_25': '应用内相对路径，如 /list',
    'lowcode.page_list_page.k26': '取消',
    'lowcode.page_list_page.k27': '创建',
    'lowcode.page_list_page.e1': '新建页面',
    'lowcode.page_list_page.e2': '暂无页面',
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
    'lowcode.page_list_page.k0': '加载页面失败',
    'lowcode.page_list_page.k1': '创建页面失败',
    'lowcode.page_list_page.k2': '删除页面失败',
    'lowcode.page_list_page.k3': '发布页面失败',
    'lowcode.page_list_page.k4': '设为首页失败',
    'lowcode.page_list_page.k5': '页面列表',
    'lowcode.page_list_page.k6': '页面列表',
    'lowcode.page_list_page.k7': '页面名称',
    'lowcode.page_list_page.k8': '编码',
    'lowcode.page_list_page.k9': '类型',
    'lowcode.page_list_page.k10': '路由',
    'lowcode.page_list_page.k11': '状态',
    'lowcode.page_list_page.k12': '操作',
    'lowcode.page_list_page.k13': '设为首页',
    'lowcode.page_list_page.k14': '设为首页',
    'lowcode.page_list_page.k15': '发布',
    'lowcode.page_list_page.k16': '发布',
    'lowcode.page_list_page.k17': '删除',
    'lowcode.page_list_page.k18': '新建页面',
    'lowcode.page_list_page.id_19': '所属应用 ID',
    'lowcode.page_list_page.k20': '页面编码',
    'lowcode.page_list_page.k21': '应用内唯一',
    'lowcode.page_list_page.k22': '页面名称',
    'lowcode.page_list_page.k23': '页面类型',
    'lowcode.page_list_page.k24': '路由路径',
    'lowcode.page_list_page.list_25': '应用内相对路径，如 /list',
    'lowcode.page_list_page.k26': '取消',
    'lowcode.page_list_page.k27': '创建',
    'lowcode.page_list_page.e1': '新建页面',
    'lowcode.page_list_page.e2': '暂无页面',
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
const mockPublish = vi.fn();
const mockSetHome = vi.fn();

vi.mock('@/api/lowcode', () => ({
  lowcodePagesApi: {
    list: (...args: any[]) => mockList(...args),
    create: (...args: any[]) => mockCreate(...args),
    remove: (...args: any[]) => mockRemove(...args),
    publish: (...args: any[]) => mockPublish(...args),
    setAsHome: (...args: any[]) => mockSetHome(...args),
  },
  LowcodePage: {},
  LowcodePageType: {},
}));

vi.mock('@/components/common', () => ({
  PageContainer: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid='page-container'>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

const pages = [
  {
    id: 'p1',
    app_id: 'crm',
    name: '客户列表',
    code: 'customer_list',
    type: 'table',
    route_path: '/crm/customers',
    status: 'published',
    is_home: true,
    updated_at: '2026-08-10',
  },
  {
    id: 'p2',
    app_id: 'crm',
    name: '客户详情',
    code: 'customer_detail',
    type: 'form',
    route_path: '/crm/customers/:id',
    status: 'draft',
    is_home: false,
    updated_at: '2026-08-11',
  },
];

describe('PageListPage', () => {
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

    renderWithProviders(<PageListPage />);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    resolvePromise?.({ data: { items: pages } });
  });

  it('renders page rows with home indicator', async () => {
    mockList.mockResolvedValue({ data: { items: pages } });

    renderWithProviders(<PageListPage />);

    await waitFor(() => {
      expect(screen.getByText('客户列表')).toBeInTheDocument();
    });
    expect(screen.getByText('customer_list')).toBeInTheDocument();
    expect(screen.getByText('客户详情')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    mockList.mockResolvedValue({ data: { items: [] } });

    renderWithProviders(<PageListPage />);

    await waitFor(() => {
      expect(screen.getByText(/暂无页面/)).toBeInTheDocument();
    });
  });

  it('shows error on API failure', async () => {
    mockList.mockRejectedValue(new Error('timeout'));

    renderWithProviders(<PageListPage />);

    await waitFor(() => {
      expect(screen.getByText(/timeout/)).toBeInTheDocument();
    });
  });

  it('opens create dialog with title', async () => {
    mockList.mockResolvedValue({ data: { items: [] } });

    renderWithProviders(<PageListPage />);

    fireEvent.click(await screen.findByRole('button', { name: '新建页面' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('新建页面');

    const createBtn = screen.getByRole('button', { name: '创建' });
    expect(createBtn).toBeDisabled();
  });

  it('publish and remove trigger APIs', async () => {
    mockList.mockResolvedValue({ data: { items: pages } });
    mockPublish.mockResolvedValue({});
    mockRemove.mockResolvedValue({});

    renderWithProviders(<PageListPage />);

    await waitFor(() => {
      expect(screen.getByText('客户列表')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: '发布' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: '删除' })[0]);

    expect(mockPublish).toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalled();
  });
});
