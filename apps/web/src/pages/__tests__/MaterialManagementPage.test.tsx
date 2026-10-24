import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MaterialManagementPage from '../erp/MaterialManagementPage';
import { erpApi } from '@/api/erp';

// setup-mocks.ts 将 createCrudPageAdapter mock 为直通(api)=>api；
// 本页使用真实适配器做参数归一化/响应解包/错误翻译断言，需恢复真实实现。
vi.unmock('@/schema/crudPageAdapter');

// 适配器直接用全局 i18n.t（非 react-i18next hook），此处显式提供 crud_page_adapter
// 翻译表与页面 breadcrumbs 使用的 erp.material_management_page 译文（与 locales/zh/erp.json 一致）。
vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => {
      const translations: Record<string, string> = {
        'schema:crud_page_adapter.k0': '加载列表失败',
        'schema:crud_page_adapter.k1': '创建失败',
        'schema:crud_page_adapter.k2': '更新失败',
        'schema:crud_page_adapter.k3': '删除失败',
        'schema:crud_page_adapter.k4': '记录不存在',
        'erp.material_management_page.k9': '首页',
        'erp.material_management_page.k10': '物料管理',
      };
      return translations[key] ?? key;
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
    // 渲染 headerContent，使页面统计卡片组件真实挂载并触发其统计查询
    return <div data-testid='crud-page'>{props.headerContent as React.ReactNode}crud-page</div>;
  },
}));

vi.mock('@/schemas/erp/material', () => ({
  materialSchema: { name: 'materialSchema' },
}));

vi.mock('@/api/erp', () => ({
  erpApi: {
    materials: {
      list: vi.fn().mockResolvedValue({
        success: true,
        data: {
          materials: [
            { id: 'm-1', material_name: '六角螺栓', status: 'active' },
            { id: 'm-2', material_name: '废旧刀具', status: 'obsolete' },
          ],
          total: 2,
        },
      }),
      get: vi.fn(),
      create: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'm-9', material_name: '螺母', status: 'active' },
      }),
      update: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'm-1', material_name: '六角螺栓', status: 'inactive' },
      }),
      delete: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

describe('MaterialManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders through CrudPage with material schema and breadcrumbs', () => {
    render(<MaterialManagementPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'materialSchema' },
        breadcrumbs: [
          { label: '首页', href: '/dashboard' },
          { label: 'ERP', href: '/erp' },
          { label: '物料管理' },
        ],
      })
    );
  });

  it('queries material stats once on mount via headerContent', () => {
    render(<MaterialManagementPage />);

    // MaterialStats 统计卡片绕过适配器直接调 api.list，保留原始 pageSize 入参
    expect(erpApi.materials.list).toHaveBeenCalledWith({ page: 0, pageSize: 1000 });
  });

  it('normalizes list params (pageSize→page_size) and unwraps materials array', async () => {
    render(<MaterialManagementPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({ page: 1, pageSize: 10, search: '螺栓' });

    expect(erpApi.materials.list).toHaveBeenCalledWith({
      page: 1,
      page_size: 10,
      search: '螺栓',
    });
    // 后端列表信封为 data.materials，适配器按 items→materials→data 顺序解包
    expect(result).toEqual({
      data: [
        { id: 'm-1', material_name: '六角螺栓', status: 'active' },
        { id: 'm-2', material_name: '废旧刀具', status: 'obsolete' },
      ],
      total: 2,
    });
  });

  it('delegates material create, update and delete operations', async () => {
    render(<MaterialManagementPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(
      props.apiAdapter.create({ material_name: '螺母', status: 'active' })
    ).resolves.toEqual({ id: 'm-9', material_name: '螺母', status: 'active' });
    await expect(props.apiAdapter.update('m-1', { status: 'inactive' })).resolves.toEqual({
      id: 'm-1',
      material_name: '六角螺栓',
      status: 'inactive',
    });
    await expect(props.apiAdapter.delete('m-1')).resolves.toBeUndefined();

    expect(erpApi.materials.create).toHaveBeenCalledWith({
      material_name: '螺母',
      status: 'active',
    });
    expect(erpApi.materials.update).toHaveBeenCalledWith('m-1', { status: 'inactive' });
    expect(erpApi.materials.delete).toHaveBeenCalledWith('m-1');
  });

  it('throws translated errors when material API operations fail', async () => {
    render(<MaterialManagementPage />);
    const props = mockCrudPage.mock.calls[0][0];
    // 渲染时统计卡片已消费默认成功响应，此处再注入一次性失败响应
    vi.mocked(erpApi.materials.list).mockResolvedValueOnce({ success: false, data: null });
    vi.mocked(erpApi.materials.create).mockResolvedValueOnce({ success: false });
    vi.mocked(erpApi.materials.update).mockResolvedValueOnce({ success: false });
    vi.mocked(erpApi.materials.delete).mockResolvedValueOnce({ success: false });

    await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
    await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
    await expect(props.apiAdapter.update('m-1', {})).rejects.toThrow('更新失败');
    await expect(props.apiAdapter.delete('m-1')).rejects.toThrow('删除失败');
  });
});
