import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReagentPage from '../lims/ReagentPage';
import { reagentApi } from '@/api/lims';

// setup-mocks.ts 将 createCrudPageAdapter mock 为直通(api)=>api，
// 但本文件专门验证真实适配器的参数归一化/响应解包/错误翻译，需恢复真实实现。
vi.unmock('@/schema/crudPageAdapter');

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

vi.mock('@/schemas/lims', () => ({
  reagentSchema: { name: 'reagentSchema' },
}));

vi.mock('@/api/lims', () => ({
  reagentApi: {
    listReagents: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [{ id: 'rg-1', name: '盐酸' }], total: 1 },
    }),
    createReagent: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'rg-2', name: '硫酸' },
    }),
    updateReagent: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'rg-1', name: '盐酸-更新' },
    }),
    deleteReagent: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('ReagentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders reagent page through CrudPage with LIMS breadcrumbs', () => {
    render(<ReagentPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'reagentSchema' },
        breadcrumbs: [{ label: 'LIMS' }, { label: 'lims.reagent_page.k0' }],
      })
    );
  });

  it('maps reagent list params and unwraps paginated response', async () => {
    render(<ReagentPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({
      page: 2,
      pageSize: 20,
      search: '盐酸',
    });

    expect(reagentApi.listReagents).toHaveBeenCalledWith({
      page: 2,
      page_size: 20,
      search: '盐酸',
    });
    expect(result).toEqual({
      data: [{ id: 'rg-1', name: '盐酸' }],
      total: 1,
    });
  });

  it('delegates reagent create, update and delete operations', async () => {
    render(<ReagentPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ name: '硫酸' })).resolves.toEqual({
      id: 'rg-2',
      name: '硫酸',
    });
    await expect(props.apiAdapter.update('rg-1', { name: '盐酸-更新' })).resolves.toEqual({
      id: 'rg-1',
      name: '盐酸-更新',
    });
    await expect(props.apiAdapter.delete('rg-1')).resolves.toBeUndefined();

    expect(reagentApi.createReagent).toHaveBeenCalledWith({ name: '硫酸' });
    expect(reagentApi.updateReagent).toHaveBeenCalledWith('rg-1', { name: '盐酸-更新' });
    expect(reagentApi.deleteReagent).toHaveBeenCalledWith('rg-1');
  });

  it('throws translated errors when reagent API operations fail', async () => {
    vi.mocked(reagentApi.listReagents).mockResolvedValueOnce({ success: false, data: null });
    vi.mocked(reagentApi.createReagent).mockResolvedValueOnce({ success: false });
    vi.mocked(reagentApi.updateReagent).mockResolvedValueOnce({ success: false });
    vi.mocked(reagentApi.deleteReagent).mockResolvedValueOnce({ success: false });

    render(<ReagentPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
    await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
    await expect(props.apiAdapter.update('rg-1', {})).rejects.toThrow('更新失败');
    await expect(props.apiAdapter.delete('rg-1')).rejects.toThrow('删除失败');
  });
});
