import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/__tests__/test-utils';

import FormListPage from '../FormListPage';

vi.mock('react-i18next', () => {
  const i18nMap: Record<string, string> = {
    'lowcode.form_list_page.k0': '加载表单失败',
    'lowcode.form_list_page.k1': '创建表单失败',
    'lowcode.form_list_page.k2': '删除表单失败',
    'lowcode.form_list_page.k3': '预览表单失败',
    'lowcode.form_list_page.k4': '发布表单失败',
    'lowcode.form_list_page.k5': '表单列表',
    'lowcode.form_list_page.k6': '表单列表',
    'lowcode.form_list_page.k7': '表单名称',
    'lowcode.form_list_page.k8': '编码',
    'lowcode.form_list_page.k9': '字段数',
    'lowcode.form_list_page.k10': '状态',
    'lowcode.form_list_page.k11': '版本',
    'lowcode.form_list_page.k12': '操作',
    'lowcode.form_list_page.k13': '预览',
    'lowcode.form_list_page.k14': '预览',
    'lowcode.form_list_page.k15': '发布',
    'lowcode.form_list_page.k16': '发布',
    'lowcode.form_list_page.k17': '删除',
    'lowcode.form_list_page.k18': '新建表单',
    'lowcode.form_list_page.id_19': '所属应用 ID',
    'lowcode.form_list_page.k20': '表单编码',
    'lowcode.form_list_page.k21': '应用内唯一',
    'lowcode.form_list_page.k22': '表单名称',
    'lowcode.form_list_page.k23': '描述',
    'lowcode.form_list_page.k24': '取消',
    'lowcode.form_list_page.k25': '创建',
    'lowcode.form_list_page.k26': '关闭',
    'lowcode.form_list_page.e1': '新建表单',
    'lowcode.form_list_page.e2': '暂无表单',
    'lowcode.form_list_page.r2': '表单预览 · {{v1}}',
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
    'lowcode.form_list_page.k0': '加载表单失败',
    'lowcode.form_list_page.k1': '创建表单失败',
    'lowcode.form_list_page.k2': '删除表单失败',
    'lowcode.form_list_page.k3': '预览表单失败',
    'lowcode.form_list_page.k4': '发布表单失败',
    'lowcode.form_list_page.k5': '表单列表',
    'lowcode.form_list_page.k6': '表单列表',
    'lowcode.form_list_page.k7': '表单名称',
    'lowcode.form_list_page.k8': '编码',
    'lowcode.form_list_page.k9': '字段数',
    'lowcode.form_list_page.k10': '状态',
    'lowcode.form_list_page.k11': '版本',
    'lowcode.form_list_page.k12': '操作',
    'lowcode.form_list_page.k13': '预览',
    'lowcode.form_list_page.k14': '预览',
    'lowcode.form_list_page.k15': '发布',
    'lowcode.form_list_page.k16': '发布',
    'lowcode.form_list_page.k17': '删除',
    'lowcode.form_list_page.k18': '新建表单',
    'lowcode.form_list_page.id_19': '所属应用 ID',
    'lowcode.form_list_page.k20': '表单编码',
    'lowcode.form_list_page.k21': '应用内唯一',
    'lowcode.form_list_page.k22': '表单名称',
    'lowcode.form_list_page.k23': '描述',
    'lowcode.form_list_page.k24': '取消',
    'lowcode.form_list_page.k25': '创建',
    'lowcode.form_list_page.k26': '关闭',
    'lowcode.form_list_page.e1': '新建表单',
    'lowcode.form_list_page.e2': '暂无表单',
    'lowcode.form_list_page.r2': '表单预览 · {{v1}}',
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
const mockPreview = vi.fn();
const mockPublish = vi.fn();

vi.mock('@/api/lowcode', () => ({
  lowcodeFormsApi: {
    list: (...args: any[]) => mockList(...args),
    create: (...args: any[]) => mockCreate(...args),
    remove: (...args: any[]) => mockRemove(...args),
    preview: (...args: any[]) => mockPreview(...args),
    publish: (...args: any[]) => mockPublish(...args),
  },
  LowcodeForm: {},
}));

vi.mock('@/components/common', () => ({
  PageContainer: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid='page-container'>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

const forms = [
  {
    id: 'f1',
    app_id: 'crm',
    name: '客户登记表单',
    code: 'customer_registry',
    status: 'published',
    updated_at: '2026-08-10',
  },
  {
    id: 'f2',
    app_id: 'crm',
    name: '拜访记录',
    code: 'visit_log',
    status: 'draft',
    updated_at: '2026-08-11',
  },
];

describe('FormListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading while fetching', async () => {
    let resolvePromise: ((v: any) => void) | undefined;
    mockList.mockReturnValue(
      new Promise((res) => {
        resolvePromise = res;
      })
    );

    renderWithProviders(<FormListPage />);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    resolvePromise?.({ data: { items: forms } });
  });

  it('renders form rows', async () => {
    mockList.mockResolvedValue({ data: { items: forms } });

    renderWithProviders(<FormListPage />);

    await waitFor(() => {
      expect(screen.getByText('客户登记表单')).toBeInTheDocument();
    });
    expect(screen.getByText('customer_registry')).toBeInTheDocument();
    expect(screen.getByText('拜访记录')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    mockList.mockResolvedValue({ data: { items: [] } });

    renderWithProviders(<FormListPage />);

    await waitFor(() => {
      expect(screen.getByText(/暂无表单/)).toBeInTheDocument();
    });
  });

  it('shows error on API failure', async () => {
    mockList.mockRejectedValue(new Error('network down'));

    renderWithProviders(<FormListPage />);

    await waitFor(() => {
      expect(screen.getByText(/network down/)).toBeInTheDocument();
    });
  });

  it('opens create dialog and validates fields', async () => {
    mockList.mockResolvedValue({ data: { items: [] } });

    renderWithProviders(<FormListPage />);

    fireEvent.click(await screen.findByRole('button', { name: '新建表单' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('新建表单');

    const createBtn = screen.getByRole('button', { name: '创建' });
    expect(createBtn).toBeDisabled();

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'crm' } });
    fireEvent.change(inputs[1], { target: { value: 'f_new' } });
    fireEvent.change(inputs[2], { target: { value: '新表单' } });

    expect(createBtn).not.toBeDisabled();
  });

  it('preview button opens dialog', async () => {
    mockList.mockResolvedValue({ data: { items: forms } });
    mockPreview.mockResolvedValue({ data: { id: 'f1', name: '客户登记表单', fields: [] } });

    renderWithProviders(<FormListPage />);

    await waitFor(() => {
      expect(screen.getByText('客户登记表单')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: '预览' })[0]);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('表单预览');
  });

  it('publish and delete trigger APIs', async () => {
    mockList.mockResolvedValue({ data: { items: forms } });
    mockPublish.mockResolvedValue({});
    mockRemove.mockResolvedValue({});

    renderWithProviders(<FormListPage />);

    await waitFor(() => {
      expect(screen.getByText('客户登记表单')).toBeInTheDocument();
    });

    const publishBtns = screen.getAllByRole('button', { name: '发布' });
    const deleteBtns = screen.getAllByRole('button', { name: '删除' });

    fireEvent.click(publishBtns[0]);
    fireEvent.click(deleteBtns[1]);

    expect(mockPublish).toHaveBeenCalledWith('f1');
    expect(mockRemove).toHaveBeenCalledWith('f2');
  });
});
