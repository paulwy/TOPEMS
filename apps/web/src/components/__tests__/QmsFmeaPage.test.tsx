import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import QmsFmeaPage from '../qms/QmsFmeaPage';
import { fmeaApi } from '@/api/qms';

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
  fmeaSchema: { name: 'fmeaSchema' },
}));

vi.mock('@/api/qms', () => ({
  fmeaApi: {
    listFmeaAnalyses: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [{ id: 'fmea-1', name: 'DFMEA-001' }], total: 1 },
    }),
    createFmeaAnalysis: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'fmea-2', name: 'PFMEA-002' },
    }),
    updateFmeaAnalysis: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'fmea-1', name: 'DFMEA-001-UPDATED' },
    }),
    deleteFmeaAnalysis: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('QmsFmeaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders FMEA page through CrudPage with QMS breadcrumbs', () => {
    render(<QmsFmeaPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'fmeaSchema' },
        breadcrumbs: [{ label: 'QMS' }, { label: 'pages.qms_fmea_page.fmea_0' }],
      })
    );
  });

  it('maps FMEA list params and unwraps paginated response', async () => {
    render(<QmsFmeaPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({
      page: 2,
      pageSize: 20,
      search: 'DFMEA',
    });

    expect(fmeaApi.listFmeaAnalyses).toHaveBeenCalledWith({
      page: 2,
      page_size: 20,
      search: 'DFMEA',
    });
    expect(result).toEqual({
      data: [{ id: 'fmea-1', name: 'DFMEA-001' }],
      total: 1,
    });
  });

  it('delegates FMEA create, update and delete operations', async () => {
    render(<QmsFmeaPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ name: 'PFMEA-002' })).resolves.toEqual({
      id: 'fmea-2',
      name: 'PFMEA-002',
    });
    await expect(props.apiAdapter.update('fmea-1', { name: 'DFMEA-001-UPDATED' })).resolves.toEqual(
      {
        id: 'fmea-1',
        name: 'DFMEA-001-UPDATED',
      }
    );
    await expect(props.apiAdapter.delete('fmea-1')).resolves.toBeUndefined();

    expect(fmeaApi.createFmeaAnalysis).toHaveBeenCalledWith({ name: 'PFMEA-002' });
    expect(fmeaApi.updateFmeaAnalysis).toHaveBeenCalledWith('fmea-1', {
      name: 'DFMEA-001-UPDATED',
    });
    expect(fmeaApi.deleteFmeaAnalysis).toHaveBeenCalledWith('fmea-1');
  });

  it('throws translated errors when FMEA API operations fail', async () => {
    vi.mocked(fmeaApi.listFmeaAnalyses).mockResolvedValueOnce({ success: false, data: null });
    vi.mocked(fmeaApi.createFmeaAnalysis).mockResolvedValueOnce({ success: false });
    vi.mocked(fmeaApi.updateFmeaAnalysis).mockResolvedValueOnce({ success: false });
    vi.mocked(fmeaApi.deleteFmeaAnalysis).mockResolvedValueOnce({ success: false });

    render(<QmsFmeaPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
    await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
    await expect(props.apiAdapter.update('fmea-1', {})).rejects.toThrow('更新失败');
    await expect(props.apiAdapter.delete('fmea-1')).rejects.toThrow('删除失败');
  });
});
