import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PdmProcessPage from '../pdm/PdmProcessPage';
import { pdmApi } from '@/api/pdm';

// PdmProcessPage 在模块加载时即调用 createCrudPageAdapter 构造适配器，
// setup-mocks 将其 mock 为直通(api)=>api，这里恢复真实实现以验证
// 参数归一化(pageSize→page_size)/响应解包(items,total→data,total)/错误翻译。
vi.unmock('@/schema-dsl/crudPageAdapter');

// 真实适配器直接用全局 i18n.t（非 react-i18next hook），显式提供 crud_page_adapter
// 翻译表（与 locales/zh/schema.json 一致），避免 t() 返回原始 key。
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

vi.mock('@/components/templates/CrudPage', () => {
  const MockCrudPage = (props: Record<string, unknown>) => {
    mockCrudPage(props);
    return <div data-testid='crud-page'>crud-page</div>;
  };
  return { default: MockCrudPage, CrudPage: MockCrudPage };
});

vi.mock('@/schemas/pdm', () => ({
  processSchema: { name: 'processSchema' },
}));

vi.mock('@/api/pdm', () => ({
  pdmApi: {
    listProcesses: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [{ id: 'proc-1', name: 'mixing' }], total: 1 },
    }),
    createProcess: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'proc-2', name: 'packing' },
    }),
    updateProcess: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'proc-1', name: 'mixing-v2' },
    }),
    deleteProcess: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('PdmProcessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders through CrudPage with process schema and PDM breadcrumbs', () => {
    render(<PdmProcessPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'processSchema' },
        breadcrumbs: [{ label: 'PDM' }, { label: 'pdm.pdm_process_page.k0' }],
      })
    );
  });

  it('normalizes list params (pageSize→page_size) and unpacks paginated response', async () => {
    render(<PdmProcessPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({ page: 2, pageSize: 20, search: 'mixing' });

    expect(pdmApi.listProcesses).toHaveBeenCalledWith({
      page: 2,
      page_size: 20,
      search: 'mixing',
    });
    expect(result).toEqual({
      data: [{ id: 'proc-1', name: 'mixing' }],
      total: 1,
    });
  });

  it('delegates create, update and delete with payload and unpacks returned data', async () => {
    render(<PdmProcessPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ name: 'packing' })).resolves.toEqual({
      id: 'proc-2',
      name: 'packing',
    });
    await expect(props.apiAdapter.update('proc-1', { name: 'mixing-v2' })).resolves.toEqual({
      id: 'proc-1',
      name: 'mixing-v2',
    });
    await expect(props.apiAdapter.delete('proc-1')).resolves.toBeUndefined();

    expect(pdmApi.createProcess).toHaveBeenCalledWith({ name: 'packing' });
    expect(pdmApi.updateProcess).toHaveBeenCalledWith('proc-1', { name: 'mixing-v2' });
    expect(pdmApi.deleteProcess).toHaveBeenCalledWith('proc-1');
  });

  it('throws translated errors when process API operations fail', async () => {
    vi.mocked(pdmApi.listProcesses).mockResolvedValueOnce({ success: false, data: null });
    vi.mocked(pdmApi.createProcess).mockResolvedValueOnce({ success: false });
    vi.mocked(pdmApi.updateProcess).mockResolvedValueOnce({ success: false });
    vi.mocked(pdmApi.deleteProcess).mockResolvedValueOnce({ success: false });

    render(<PdmProcessPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
    await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
    await expect(props.apiAdapter.update('proc-1', {})).rejects.toThrow('更新失败');
    await expect(props.apiAdapter.delete('proc-1')).rejects.toThrow('删除失败');
  });
});
