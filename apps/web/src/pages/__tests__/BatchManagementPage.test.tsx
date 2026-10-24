import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import BatchManagementPage from '../wms/BatchManagementPage';
import { wmsApi } from '@/api/wms';

// BatchManagementPage 在组件内调用 createCrudPageAdapter(wmsApi.batches) 构造适配器，
// setup-mocks 将其 mock 为直通 (api)=>api，这里恢复真实实现以验证
// 参数归一化(pageSize→page_size)/响应解包/错误翻译。
vi.unmock('@/schema/crudPageAdapter');

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

vi.mock('@/schemas/wms/batch', () => ({
  batchSchema: { name: 'batchSchema' },
}));

vi.mock('@/api/wms', () => ({
  wmsApi: {
    batches: {
      list: vi.fn().mockResolvedValue({
        success: true,
        data: {
          items: [
            {
              id: 'batch-1',
              batch_no: 'B-2026-001',
              material_name: 'Steel Plate',
              quantity: 100,
              status: 'in_stock',
            },
          ],
          total: 1,
        },
      }),
      create: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'batch-9', batch_no: 'B-2026-009', status: 'in_stock' },
      }),
      update: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'batch-1', batch_no: 'B-2026-001', status: 'frozen' },
      }),
      delete: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

describe('BatchManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders through CrudPage with batch schema and WMS breadcrumb', () => {
    render(<BatchManagementPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'batchSchema' },
        breadcrumbs: [{ label: 'wms.batch_management_page.breadcrumb_current' }],
      })
    );
  });

  it('normalizes list params (pageSize→page_size) and unpacks paginated response', async () => {
    render(<BatchManagementPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({ page: 2, pageSize: 20, search: 'B-2026' });

    expect(wmsApi.batches.list).toHaveBeenCalledWith({
      page: 2,
      page_size: 20,
      search: 'B-2026',
    });
    expect(result).toEqual({
      data: [
        {
          id: 'batch-1',
          batch_no: 'B-2026-001',
          material_name: 'Steel Plate',
          quantity: 100,
          status: 'in_stock',
        },
      ],
      total: 1,
    });
  });

  it('delegates create, update and delete with payload and unpacks returned row', async () => {
    render(<BatchManagementPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ batch_no: 'B-2026-009' })).resolves.toEqual({
      id: 'batch-9',
      batch_no: 'B-2026-009',
      status: 'in_stock',
    });
    await expect(props.apiAdapter.update('batch-1', { status: 'frozen' })).resolves.toEqual({
      id: 'batch-1',
      batch_no: 'B-2026-001',
      status: 'frozen',
    });
    await expect(props.apiAdapter.delete('batch-1')).resolves.toBeUndefined();

    expect(wmsApi.batches.create).toHaveBeenCalledWith({ batch_no: 'B-2026-009' });
    expect(wmsApi.batches.update).toHaveBeenCalledWith('batch-1', { status: 'frozen' });
    expect(wmsApi.batches.delete).toHaveBeenCalledWith('batch-1');
  });

  it('throws translated errors when batch API operations fail', async () => {
    vi.mocked(wmsApi.batches.list).mockResolvedValueOnce({ success: false, data: null });
    vi.mocked(wmsApi.batches.create).mockResolvedValueOnce({ success: false });
    vi.mocked(wmsApi.batches.update).mockResolvedValueOnce({ success: false });
    vi.mocked(wmsApi.batches.delete).mockResolvedValueOnce({ success: false });

    render(<BatchManagementPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
    await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
    await expect(props.apiAdapter.update('batch-1', {})).rejects.toThrow('更新失败');
    await expect(props.apiAdapter.delete('batch-1')).rejects.toThrow('删除失败');
  });
});
