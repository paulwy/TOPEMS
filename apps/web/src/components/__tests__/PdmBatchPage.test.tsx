import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PdmBatchPage from '../pdm/PdmBatchPage';
import { pdmApi } from '@/api/pdm';

// PdmBatchPage 使用 CrudPage 模板，但 apiAdapter 是页面内联手写（非 createCrudPageAdapter），
// 直接 mock CrudPage 记录 props，再通过 props.apiAdapter 验证 list 解包/客户端过滤、
// create/update/delete 的 payload 与错误分支。
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
  batchSchema: { name: 'batchSchema' },
}));

vi.mock('@/api/pdm', () => ({
  pdmApi: {
    listBatches: vi.fn().mockResolvedValue({
      success: true,
      data: {
        batches: [
          { id: 'b-1', batch_no: 'B-001', product_name: 'capsule', status: 'planning' },
          { id: 'b-2', batch_no: 'B-002', product_name: 'tablet', status: 'completed' },
        ],
      },
    }),
    createBatch: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'b-3', batch_no: 'B-003', product_name: 'syrup', status: 'planning' },
    }),
    updateBatch: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'b-1', batch_no: 'B-001', status: 'in_progress' },
    }),
    deleteBatch: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('PdmBatchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders through CrudPage with batch schema and PDM breadcrumbs', () => {
    render(<PdmBatchPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'batchSchema' },
        breadcrumbs: [{ label: 'PDM' }, { label: 'pdm.pdm_batch_page.k3' }],
      })
    );
  });

  it('fetches batches with no list params and unpacks the batches envelope', async () => {
    render(<PdmBatchPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({});

    expect(pdmApi.listBatches).toHaveBeenCalledTimes(1);
    expect(result.total).toBe(2);
    expect(result.data.map((b: { id: string }) => b.id)).toEqual(['b-1', 'b-2']);
  });

  it('filters batches client-side by search (batch_no/product_name) and status', async () => {
    render(<PdmBatchPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const bySearch = await props.apiAdapter.list({ search: 'capsule' });
    expect(bySearch.data.map((b: { id: string }) => b.id)).toEqual(['b-1']);

    const byStatus = await props.apiAdapter.list({ status: 'completed' });
    expect(byStatus.data.map((b: { id: string }) => b.id)).toEqual(['b-2']);
  });

  it('delegates create, update and delete and unpacks returned data', async () => {
    render(<PdmBatchPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ product_name: 'syrup' })).resolves.toEqual({
      id: 'b-3',
      batch_no: 'B-003',
      product_name: 'syrup',
      status: 'planning',
    });
    await expect(props.apiAdapter.update('b-1', { status: 'in_progress' })).resolves.toEqual({
      id: 'b-1',
      batch_no: 'B-001',
      status: 'in_progress',
    });
    await expect(props.apiAdapter.delete('b-1')).resolves.toBeUndefined();

    expect(pdmApi.createBatch).toHaveBeenCalledWith({ product_name: 'syrup' });
    expect(pdmApi.updateBatch).toHaveBeenCalledWith('b-1', { status: 'in_progress' });
    expect(pdmApi.deleteBatch).toHaveBeenCalledWith('b-1');
  });

  it('returns empty list on list failure and rejects mutations with i18n fallback keys', async () => {
    vi.mocked(pdmApi.listBatches).mockResolvedValueOnce({ success: false, data: null });
    vi.mocked(pdmApi.createBatch).mockResolvedValueOnce({ success: false });
    vi.mocked(pdmApi.updateBatch).mockResolvedValueOnce({ success: false });
    vi.mocked(pdmApi.deleteBatch).mockResolvedValueOnce({ success: false });

    render(<PdmBatchPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({})).resolves.toEqual({ data: [], total: 0 });
    await expect(props.apiAdapter.create({})).rejects.toThrow('pdm.pdm_batch_page.k0');
    await expect(props.apiAdapter.update('b-1', {})).rejects.toThrow('pdm.pdm_batch_page.k1');
    await expect(props.apiAdapter.delete('b-1')).rejects.toThrow('pdm.pdm_batch_page.k2');
  });
});
