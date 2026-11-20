import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import QmsQualityCostPage from '../qms/QmsQualityCostPage';
import { qualityCostApi } from '@/api/qms';

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
  qualityCostSchema: { name: 'qualityCostSchema' },
}));

vi.mock('@/api/qms', () => ({
  qualityCostApi: {
    listQualityCosts: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [{ id: 'qc-1', name: '质量成本-001' }], total: 1 },
    }),
    createQualityCost: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'qc-2', name: '质量成本-002' },
    }),
    updateQualityCost: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'qc-1', name: '质量成本-001-UPDATED' },
    }),
    deleteQualityCost: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('QmsQualityCostPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders quality cost page through CrudPage with QMS breadcrumbs and stats header', () => {
    render(<QmsQualityCostPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'qualityCostSchema' },
        breadcrumbs: [{ label: 'QMS' }, { label: 'qms.qms_quality_cost_page.k2' }],
        detailMaxWidth: 'lg',
      })
    );
    // headerContent 注入统计卡片渲染器（接收行数据返回统计卡片节点）
    const props = mockCrudPage.mock.calls[0][0];
    expect(props.headerContent).toEqual(expect.any(Function));
  });

  it('maps quality cost list params and unwraps paginated response', async () => {
    render(<QmsQualityCostPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({
      page: 2,
      pageSize: 20,
      search: 'cost',
    });

    expect(qualityCostApi.listQualityCosts).toHaveBeenCalledWith({
      page: 2,
      page_size: 20,
      search: 'cost',
    });
    expect(result).toEqual({
      data: [{ id: 'qc-1', name: '质量成本-001' }],
      total: 1,
    });
  });

  it('delegates quality cost create, update and delete operations', async () => {
    render(<QmsQualityCostPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ name: '质量成本-002' })).resolves.toEqual({
      id: 'qc-2',
      name: '质量成本-002',
    });
    await expect(
      props.apiAdapter.update('qc-1', { name: '质量成本-001-UPDATED' })
    ).resolves.toEqual({
      id: 'qc-1',
      name: '质量成本-001-UPDATED',
    });
    await expect(props.apiAdapter.delete('qc-1')).resolves.toBeUndefined();

    expect(qualityCostApi.createQualityCost).toHaveBeenCalledWith({ name: '质量成本-002' });
    expect(qualityCostApi.updateQualityCost).toHaveBeenCalledWith('qc-1', {
      name: '质量成本-001-UPDATED',
    });
    expect(qualityCostApi.deleteQualityCost).toHaveBeenCalledWith('qc-1');
  });

  it('throws translated errors when quality cost API operations fail', async () => {
    vi.mocked(qualityCostApi.listQualityCosts).mockResolvedValueOnce({
      success: false,
      data: null,
    });
    vi.mocked(qualityCostApi.createQualityCost).mockResolvedValueOnce({ success: false });
    vi.mocked(qualityCostApi.updateQualityCost).mockResolvedValueOnce({ success: false });
    vi.mocked(qualityCostApi.deleteQualityCost).mockResolvedValueOnce({ success: false });

    render(<QmsQualityCostPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
    await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
    await expect(props.apiAdapter.update('qc-1', {})).rejects.toThrow('更新失败');
    await expect(props.apiAdapter.delete('qc-1')).rejects.toThrow('删除失败');
  });
});
