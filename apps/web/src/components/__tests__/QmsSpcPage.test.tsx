import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import QmsSpcPage from '../qms/QmsSpcPage';
import { spcApi } from '@/api/qms';

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

vi.mock('@/schemas/qms', () => ({
  spcSchema: { name: 'spcSchema' },
}));

vi.mock('@/api/qms', () => ({
  spcApi: {
    listSpcCharts: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [{ id: 'spc-1', name: 'XBAR-CHART-01' }], total: 1 },
    }),
    createSpcChart: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'spc-2', name: 'R-CHART-02' },
    }),
    updateSpcChart: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'spc-1', name: 'XBAR-CHART-01-UPDATED' },
    }),
    deleteSpcChart: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('QmsSpcPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders SPC page through CrudPage with QMS breadcrumbs', () => {
    render(<QmsSpcPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'spcSchema' },
        breadcrumbs: [{ label: 'QMS' }, { label: 'pages.qms_spc_page.spc_0' }],
      })
    );
  });

  it('maps SPC list params and unwraps paginated response', async () => {
    render(<QmsSpcPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({
      page: 2,
      pageSize: 20,
      search: 'XBAR',
    });

    expect(spcApi.listSpcCharts).toHaveBeenCalledWith({
      page: 2,
      page_size: 20,
      search: 'XBAR',
    });
    expect(result).toEqual({
      data: [{ id: 'spc-1', name: 'XBAR-CHART-01' }],
      total: 1,
    });
  });

  it('delegates SPC create, update and delete operations', async () => {
    render(<QmsSpcPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ name: 'R-CHART-02' })).resolves.toEqual({
      id: 'spc-2',
      name: 'R-CHART-02',
    });
    await expect(
      props.apiAdapter.update('spc-1', { name: 'XBAR-CHART-01-UPDATED' })
    ).resolves.toEqual({
      id: 'spc-1',
      name: 'XBAR-CHART-01-UPDATED',
    });
    await expect(props.apiAdapter.delete('spc-1')).resolves.toBeUndefined();

    expect(spcApi.createSpcChart).toHaveBeenCalledWith({ name: 'R-CHART-02' });
    expect(spcApi.updateSpcChart).toHaveBeenCalledWith('spc-1', {
      name: 'XBAR-CHART-01-UPDATED',
    });
    expect(spcApi.deleteSpcChart).toHaveBeenCalledWith('spc-1');
  });

  it('throws translated errors when SPC API operations fail', async () => {
    vi.mocked(spcApi.listSpcCharts).mockResolvedValueOnce({ success: false, data: null });
    vi.mocked(spcApi.createSpcChart).mockResolvedValueOnce({ success: false });
    vi.mocked(spcApi.updateSpcChart).mockResolvedValueOnce({ success: false });
    vi.mocked(spcApi.deleteSpcChart).mockResolvedValueOnce({ success: false });

    render(<QmsSpcPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
    await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
    await expect(props.apiAdapter.update('spc-1', {})).rejects.toThrow('更新失败');
    await expect(props.apiAdapter.delete('spc-1')).rejects.toThrow('删除失败');
  });
});
