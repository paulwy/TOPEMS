import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SrmContractPage from '../srm/SrmContractPage';
import { srmApi } from '@/api/srm';

// setup-mocks.ts 将 createCrudPageAdapter mock 为直通(api)=>api；
// 本页适配器为页面内手写实现（非 createCrudPageAdapter 生成），此处仍照范本恢复真实适配器。
vi.unmock('@/schema/crudPageAdapter');

// 适配器直接用全局 i18n.t（非 react-i18next hook），显式提供翻译表
vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => {
      const translations: Record<string, string> = {
        'schema:crud_page_adapter.k0': '加载列表失败',
        'schema:crud_page_adapter.k1': '创建失败',
        'schema:crud_page_adapter.k2': '更新失败',
        'schema:crud_page_adapter.k3': '删除失败',
        'schema:crud_page_adapter.k4': '记录不存在',
        'pages.srm_contract_page.k0': '创建合同失败',
        'pages.srm_contract_page.k1': '更新合同失败',
        'pages.srm_contract_page.k2': '删除合同失败',
        'pages.srm_contract_page.k8': '合同管理',
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
    return <div data-testid='crud-page'>crud-page</div>;
  },
}));

vi.mock('@/schemas/srm', () => ({
  contractSchema: { name: 'contractSchema' },
}));

vi.mock('@/api/srm', () => ({
  srmApi: {
    listContracts: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: 'c-1',
          contractNo: 'HT-001',
          title: 'Contract Alpha',
          supplier_name: 'Acme',
          status: 'active',
          currency: 'CNY',
          created_at: '2025-01-01',
          updated_at: '2025-06-01',
        },
        {
          id: 'c-2',
          contractNo: 'HT-002',
          title: 'Contract Beta',
          supplier_name: 'Beta Inc',
          status: 'completed',
          currency: 'CNY',
          created_at: '2025-01-02',
          updated_at: '2025-06-02',
        },
        {
          id: 'c-3',
          contractNo: 'HT-003',
          title: 'Contract Gamma',
          supplier_name: 'Gamma LLC',
          status: 'active',
          currency: 'CNY',
          created_at: '2025-01-03',
          updated_at: '2025-06-03',
        },
      ],
    }),
    createContract: vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: 'c-9',
        contractNo: 'HT-009',
        title: 'New Contract',
        supplier_id: 'sup-1',
        currency: 'CNY',
        status: 'active',
        created_at: '2025-06-01',
        updated_at: '2025-06-01',
      },
    }),
    updateContract: vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: 'c-1',
        contractNo: 'HT-001',
        title: 'Updated Title',
        supplier_id: 'sup-1',
        currency: 'CNY',
        status: 'active',
        created_at: '2025-01-01',
        updated_at: '2025-06-01',
      },
    }),
    deleteContract: vi.fn().mockResolvedValue({ success: true, data: true }),
  },
}));

describe('SrmContractPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders through CrudPage with contract schema and SRM breadcrumbs', () => {
    render(
      <MemoryRouter>
        <SrmContractPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'contractSchema' },
        breadcrumbs: [{ label: 'SRM' }, { label: '合同管理' }],
      })
    );
  });

  it('fetches all contracts once, then filters and paginates client-side', async () => {
    render(
      <MemoryRouter>
        <SrmContractPage />
      </MemoryRouter>
    );
    const props = mockCrudPage.mock.calls[0][0];

    const all = await props.apiAdapter.list({ page: 0, pageSize: 10 });
    expect(srmApi.listContracts).toHaveBeenCalledWith();
    expect(all.total).toBe(3);
    expect(all.data).toHaveLength(3);

    const searched = await props.apiAdapter.list({ page: 0, pageSize: 10, search: 'alpha' });
    expect(searched.total).toBe(1);
    expect(searched.data[0].id).toBe('c-1');

    const paged = await props.apiAdapter.list({ page: 1, pageSize: 2 });
    expect(paged.total).toBe(3);
    expect(paged.data).toHaveLength(1);
    expect(paged.data[0].id).toBe('c-3');
  });

  it('delegates contract create, update and delete to srmApi and unwraps data', async () => {
    render(
      <MemoryRouter>
        <SrmContractPage />
      </MemoryRouter>
    );
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ title: 'New Contract' })).resolves.toEqual({
      id: 'c-9',
      contractNo: 'HT-009',
      title: 'New Contract',
      supplier_id: 'sup-1',
      currency: 'CNY',
      status: 'active',
      created_at: '2025-06-01',
      updated_at: '2025-06-01',
    });
    expect(srmApi.createContract).toHaveBeenCalledWith({ title: 'New Contract' });

    await expect(props.apiAdapter.update('c-1', { title: 'Updated Title' })).resolves.toEqual({
      id: 'c-1',
      contractNo: 'HT-001',
      title: 'Updated Title',
      supplier_id: 'sup-1',
      currency: 'CNY',
      status: 'active',
      created_at: '2025-01-01',
      updated_at: '2025-06-01',
    });
    expect(srmApi.updateContract).toHaveBeenCalledWith('c-1', { title: 'Updated Title' });

    await expect(props.apiAdapter.delete('c-1')).resolves.toBeUndefined();
    expect(srmApi.deleteContract).toHaveBeenCalledWith('c-1');
  });

  it('returns empty list on list failure and throws translated errors on create/update/delete failure', async () => {
    vi.mocked(srmApi.listContracts).mockResolvedValueOnce({ success: false, data: null });
    vi.mocked(srmApi.createContract).mockResolvedValueOnce({ success: false, data: null });
    vi.mocked(srmApi.updateContract).mockResolvedValueOnce({ success: false, data: null });
    vi.mocked(srmApi.deleteContract).mockResolvedValueOnce({ success: false, data: null });

    render(
      <MemoryRouter>
        <SrmContractPage />
      </MemoryRouter>
    );
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({})).resolves.toEqual({ data: [], total: 0 });
    await expect(props.apiAdapter.create({})).rejects.toThrow('创建合同失败');
    await expect(props.apiAdapter.update('c-1', {})).rejects.toThrow('更新合同失败');
    await expect(props.apiAdapter.delete('c-1')).rejects.toThrow('删除合同失败');
  });
});
