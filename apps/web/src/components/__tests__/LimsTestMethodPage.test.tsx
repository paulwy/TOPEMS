import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import LimsTestMethodPage from '../lims/LimsTestMethodPage';
import { limsApi } from '@/api/lims';

// setup-mocks.ts 将 createCrudPageAdapter mock 为直通(api)=>api，
// 但本文件专门验证真实适配器的参数归一化/响应解包/错误翻译，需恢复真实实现。
vi.unmock('@/schema-dsl/crudPageAdapter');

// 适配器直接用全局 i18n.t（非 react-i18next hook），此处显式提供 crud_page_adapter 翻译，
// 避免测试环境 i18n 资源未就绪导致 t() 返回原始 key（与 locales/zh/schema.json 一致）
vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => {
      const crudTranslations: Record<string, string> = {
        'schema:crud_page_adapter.k0': '加载列表失败',
        'schema:crud_page_adapter.k1': '创建失败',
        'schema:crud_page_adapter.k2': '更新失败',
        'schema:crud_page_adapter.k3': '删除失败',
        'schema:crud_page_adapter.k4': '记录不存在',
      };
      return crudTranslations[key] ?? key;
    },
    exists: () => true,
  },
}));

const mockCrudPage = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/templates/CrudPage', () => ({
  default: (props: Record<string, unknown>) => {
    mockCrudPage(props);
    return <div data-testid='crud-page'>crud-page</div>;
  },
}));

vi.mock('@/schemas/lims/testMethod', () => ({
  testMethodSchema: { name: 'testMethodSchema' },
}));

// 页面以 createCrudPageAdapter(limsApi.testMethods) 直接喂入 API 对象（标准 list/create/update/delete）
vi.mock('@/api/lims', () => ({
  limsApi: {
    testMethods: {
      list: vi.fn().mockResolvedValue({
        success: true,
        data: { items: [{ id: 'tm-1', name: 'pH 测定法' }], total: 1 },
      }),
      create: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'tm-2', name: '水分测定法' },
      }),
      update: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'tm-1', name: 'pH 测定法-更新' },
      }),
      delete: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

describe('LimsTestMethodPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders test method page through CrudPage with LIMS breadcrumbs', () => {
    render(<LimsTestMethodPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'testMethodSchema' },
        breadcrumbs: [
          { label: 'lims.lims_test_method_page.k4', href: '/dashboard' },
          { label: 'LIMS', href: '/lims' },
          { label: 'lims.lims_test_method_page.k5' },
        ],
      })
    );
  });

  it('maps test method list params and unwraps paginated response', async () => {
    render(<LimsTestMethodPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({
      page: 2,
      pageSize: 20,
      search: 'pH',
    });

    expect(limsApi.testMethods.list).toHaveBeenCalledWith({
      page: 2,
      page_size: 20,
      search: 'pH',
    });
    expect(result).toEqual({
      data: [{ id: 'tm-1', name: 'pH 测定法' }],
      total: 1,
    });
  });

  it('delegates test method create, update and delete operations', async () => {
    render(<LimsTestMethodPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ name: '水分测定法' })).resolves.toEqual({
      id: 'tm-2',
      name: '水分测定法',
    });
    await expect(props.apiAdapter.update('tm-1', { name: 'pH 测定法-更新' })).resolves.toEqual({
      id: 'tm-1',
      name: 'pH 测定法-更新',
    });
    await expect(props.apiAdapter.delete('tm-1')).resolves.toBeUndefined();

    expect(limsApi.testMethods.create).toHaveBeenCalledWith({ name: '水分测定法' });
    expect(limsApi.testMethods.update).toHaveBeenCalledWith('tm-1', {
      name: 'pH 测定法-更新',
    });
    expect(limsApi.testMethods.delete).toHaveBeenCalledWith('tm-1');
  });

  it('throws translated errors when test method API operations fail', async () => {
    vi.mocked(limsApi.testMethods.list).mockResolvedValueOnce({ success: false, data: null });
    vi.mocked(limsApi.testMethods.create).mockResolvedValueOnce({ success: false });
    vi.mocked(limsApi.testMethods.update).mockResolvedValueOnce({ success: false });
    vi.mocked(limsApi.testMethods.delete).mockResolvedValueOnce({ success: false });

    render(<LimsTestMethodPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
    await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
    await expect(props.apiAdapter.update('tm-1', {})).rejects.toThrow('更新失败');
    await expect(props.apiAdapter.delete('tm-1')).rejects.toThrow('删除失败');
  });
});
