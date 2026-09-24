import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dictApi, openingBalanceApi, searchApi } from '../erp/core';
import apiClient from '../client';

vi.mock('../client', () => ({
  default: {
    erp: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('V140 ERP - dictApi', () => {
  const mockClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list dict types with filters', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await dictApi.listTypes({ page: 1, pageSize: 20, category: 'erp', status: 'active' });
    expect(mockClient.get).toHaveBeenCalledWith(
      '/system/dict-types?page=1&page_size=20&category=erp&status=active'
    );
  });

  it('should get dict type by id', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { id: 'DT-001' } });
    await dictApi.getType('DT-001');
    expect(mockClient.get).toHaveBeenCalledWith('/system/dict-types/DT-001');
  });

  it('should create dict type', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'DT-001' } });
    await dictApi.createType({ code: 'status', name: '状态' });
    expect(mockClient.post).toHaveBeenCalledWith('/system/dict-types', {
      code: 'status',
      name: '状态',
    });
  });

  it('should update dict type', async () => {
    mockClient.put.mockResolvedValue({ success: true, data: { id: 'DT-001' } });
    await dictApi.updateType('DT-001', { name: '新状态' });
    expect(mockClient.put).toHaveBeenCalledWith('/system/dict-types/DT-001', { name: '新状态' });
  });

  it('should remove dict type', async () => {
    mockClient.delete.mockResolvedValue({ success: true, data: '' });
    await dictApi.removeType('DT-001');
    expect(mockClient.delete).toHaveBeenCalledWith('/system/dict-types/DT-001');
  });

  it('deleteType should alias removeType', async () => {
    mockClient.delete.mockResolvedValue({ success: true, data: '' });
    await dictApi.deleteType('DT-001');
    expect(mockClient.delete).toHaveBeenCalledWith('/system/dict-types/DT-001');
  });

  it('should list dict items for a type', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await dictApi.listItems('DT-001', { page: 1, pageSize: 20 });
    expect(mockClient.get).toHaveBeenCalledWith(
      '/system/dict-types/DT-001/items?page=1&page_size=20'
    );
  });

  it('should get dict item by id', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { id: 'DI-001' } });
    await dictApi.getItem('DI-001');
    expect(mockClient.get).toHaveBeenCalledWith('/system/dict-items/DI-001');
  });

  it('should create dict item', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'DI-001' } });
    await dictApi.createItem({ dict_type_id: 'DT-001', code: 'active', name: '激活' });
    expect(mockClient.post).toHaveBeenCalledWith('/system/dict-items', {
      dict_type_id: 'DT-001',
      code: 'active',
      name: '激活',
    });
  });

  it('should batch create dict items', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: [] });
    await dictApi.batchCreateItems({
      dict_type_id: 'DT-001',
      items: [{ dict_type_id: 'DT-001', code: 'a', name: 'A' }],
    });
    expect(mockClient.post).toHaveBeenCalledWith('/system/dict-items/batch', {
      dict_type_id: 'DT-001',
      items: [{ dict_type_id: 'DT-001', code: 'a', name: 'A' }],
    });
  });

  it('should update dict item', async () => {
    mockClient.put.mockResolvedValue({ success: true, data: { id: 'DI-001' } });
    await dictApi.updateItem('DI-001', { name: '新名称' });
    expect(mockClient.put).toHaveBeenCalledWith('/system/dict-items/DI-001', { name: '新名称' });
  });

  it('should remove dict item', async () => {
    mockClient.delete.mockResolvedValue({ success: true, data: '' });
    await dictApi.removeItem('DI-001');
    expect(mockClient.delete).toHaveBeenCalledWith('/system/dict-items/DI-001');
  });

  it('deleteItem should alias removeItem', async () => {
    mockClient.delete.mockResolvedValue({ success: true, data: '' });
    await dictApi.deleteItem('DI-001');
    expect(mockClient.delete).toHaveBeenCalledWith('/system/dict-items/DI-001');
  });

  it('should export dict items', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: [] });
    await dictApi.exportItems('DT-001');
    expect(mockClient.get).toHaveBeenCalledWith('/system/dict-types/DT-001/items/export');
  });

  it('should support page_size parameter alias', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await dictApi.listTypes({ page: 1, page_size: 50 } as any);
    expect(mockClient.get).toHaveBeenCalledWith('/system/dict-types?page=1&page_size=50');
  });
});

describe('V140 ERP - openingBalanceApi', () => {
  const mockClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list opening balances with filters', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await openingBalanceApi.list({
      page: 1,
      pageSize: 20,
      company_id: 'C-001',
      period: '2026-08',
    });
    expect(mockClient.get).toHaveBeenCalledWith(
      '/finance/accounts/opening-balances?page=1&page_size=20&company_id=C-001&period=2026-08'
    );
  });

  it('should get opening balance by id', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { id: 'OB-001' } });
    await openingBalanceApi.get('OB-001');
    expect(mockClient.get).toHaveBeenCalledWith('/finance/accounts/opening-balances/OB-001');
  });

  it('should create opening balance', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'OB-001' } });
    await openingBalanceApi.create({
      company_id: 'C-001',
      subject_code: '1001',
      period: '2026-08',
      debit_balance: 1000,
      credit_balance: 0,
    });
    expect(mockClient.post).toHaveBeenCalledWith('/finance/accounts/opening-balances', {
      company_id: 'C-001',
      subject_code: '1001',
      period: '2026-08',
      debit_balance: 1000,
      credit_balance: 0,
    });
  });

  it('should update opening balance', async () => {
    mockClient.put.mockResolvedValue({ success: true, data: { id: 'OB-001' } });
    await openingBalanceApi.update('OB-001', { debit_balance: 2000 });
    expect(mockClient.put).toHaveBeenCalledWith('/finance/accounts/opening-balances/OB-001', {
      debit_balance: 2000,
    });
  });

  it('should remove opening balance', async () => {
    mockClient.delete.mockResolvedValue({ success: true, data: '' });
    await openingBalanceApi.remove('OB-001');
    expect(mockClient.delete).toHaveBeenCalledWith('/finance/accounts/opening-balances/OB-001');
  });

  it('delete should alias remove', async () => {
    mockClient.delete.mockResolvedValue({ success: true, data: '' });
    await openingBalanceApi.delete('OB-001');
    expect(mockClient.delete).toHaveBeenCalledWith('/finance/accounts/opening-balances/OB-001');
  });

  it('should batch import opening balances', async () => {
    mockClient.post.mockResolvedValue({
      success: true,
      data: { success_count: 2, failed_count: 0, errors: [] },
    });
    const data = [
      {
        company_id: 'C-001',
        subject_code: '1001',
        period: '2026-08',
        debit_balance: 1000,
        credit_balance: 0,
      },
    ];
    await openingBalanceApi.import(data);
    expect(mockClient.post).toHaveBeenCalledWith('/finance/accounts/opening-balances/batch', data);
  });

  it('should carry forward opening balances', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { rows_affected: 5 } });
    await openingBalanceApi.carryForward({ from_period: '2026-07', to_period: '2026-08' });
    expect(mockClient.post).toHaveBeenCalledWith(
      '/finance/accounts/opening-balances/carry-forward',
      { from_period: '2026-07', to_period: '2026-08' }
    );
  });

  it('should support page_size parameter alias', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await openingBalanceApi.list({ page: 1, page_size: 50 } as any);
    expect(mockClient.get).toHaveBeenCalledWith(
      '/finance/accounts/opening-balances?page=1&page_size=50'
    );
  });
});

describe('V140 ERP - searchApi', () => {
  const mockClient = apiClient.erp as {
    get: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should perform global search with query', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: [] });
    await searchApi.global({ query: '订单' });
    expect(mockClient.get).toHaveBeenCalledWith('/search/global?query=%E8%AE%A2%E5%8D%95');
  });

  it('should perform global search with limit', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: [] });
    await searchApi.global({ query: '物料', limit: 10 });
    expect(mockClient.get).toHaveBeenCalledWith('/search/global?query=%E7%89%A9%E6%96%99&limit=10');
  });
});
