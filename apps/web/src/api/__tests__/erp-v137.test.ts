import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productionOrderApi, customerExtendedApi, salesOrderExtendedApi } from '../erp/core';
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

describe('V137 ERP - productionOrderApi', () => {
  const mockClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list production orders', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { orders: [], total: 0 } });
    await productionOrderApi.list({ page: 1, pageSize: 20, status: 'planned' });
    expect(mockClient.get).toHaveBeenCalledWith(
      '/production-orders?page=1&page_size=20&status=planned'
    );
  });

  it('should get production order by id', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { id: 'PO-001' } });
    await productionOrderApi.get('PO-001');
    expect(mockClient.get).toHaveBeenCalledWith('/production-orders/PO-001');
  });

  it('should create production order', async () => {
    const data = { product_name: 'Widget', product_code: 'W-01', quantity: 100 };
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'PO-001' } });
    await productionOrderApi.create(data);
    expect(mockClient.post).toHaveBeenCalledWith('/production-orders', data);
  });

  it('should update production order', async () => {
    const data = { quantity: 200 };
    mockClient.put.mockResolvedValue({ success: true, data: { id: 'PO-001' } });
    await productionOrderApi.update('PO-001', data);
    expect(mockClient.put).toHaveBeenCalledWith('/production-orders/PO-001', data);
  });

  it('should delete production order', async () => {
    mockClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await productionOrderApi.remove('PO-001');
    expect(mockClient.delete).toHaveBeenCalledWith('/production-orders/PO-001');
  });

  it('should update production progress', async () => {
    const data = { completed_quantity: 50, status: 'in_progress' };
    mockClient.put.mockResolvedValue({ success: true, data: { id: 'PO-001' } });
    await productionOrderApi.updateProgress('PO-001', data);
    expect(mockClient.put).toHaveBeenCalledWith('/production-orders/PO-001/progress', data);
  });

  it('should update production status', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'PO-001' } });
    await productionOrderApi.updateStatus('PO-001', 'completed');
    expect(mockClient.post).toHaveBeenCalledWith('/production-orders/PO-001/status', {
      status: 'completed',
    });
  });

  it('should start production order', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'PO-001' } });
    await productionOrderApi.start('PO-001');
    expect(mockClient.post).toHaveBeenCalledWith('/production-orders/PO-001/status', {
      status: 'in_progress',
    });
  });

  it('should complete production order', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'PO-001' } });
    await productionOrderApi.complete('PO-001');
    expect(mockClient.post).toHaveBeenCalledWith('/production-orders/PO-001/status', {
      status: 'completed',
    });
  });

  it('should cancel production order', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'PO-001' } });
    await productionOrderApi.cancel('PO-001');
    expect(mockClient.post).toHaveBeenCalledWith('/production-orders/PO-001/status', {
      status: 'cancelled',
    });
  });

  it('should sync MES progress', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'PO-001' } });
    await productionOrderApi.syncMesProgress('PO-001', 75, 'in_progress');
    expect(mockClient.post).toHaveBeenCalledWith('/production-orders/sync/mes-progress', {
      order_id: 'PO-001',
      completed_quantity: 75,
      status: 'in_progress',
    });
  });
});

describe('V137 ERP - customerExtendedApi', () => {
  const mockClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list customers by ids', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: [] });
    await customerExtendedApi.listByIds(['C1', 'C2']);
    expect(mockClient.post).toHaveBeenCalledWith('/customers/batch-list', { ids: ['C1', 'C2'] });
  });

  it('should batch create customers', async () => {
    const data = [
      { customer_code: 'C001', customer_name: 'Acme' },
      { customer_code: 'C002', customer_name: 'Beta' },
    ];
    mockClient.post.mockResolvedValue({ success: true, data: [] });
    await customerExtendedApi.createBatch(data);
    expect(mockClient.post).toHaveBeenCalledWith('/customers/batch', { customers: data });
  });

  it('should batch update customers', async () => {
    const updates = [{ id: 'C1', payload: { customer_name: 'New Name' } }];
    mockClient.put.mockResolvedValue({ success: true, data: [] });
    await customerExtendedApi.updateBatch(updates);
    expect(mockClient.put).toHaveBeenCalledWith('/customers/batch', { updates });
  });

  it('should batch remove customers', async () => {
    mockClient.delete.mockResolvedValue({ success: true, data: 'ok' });
    await customerExtendedApi.removeBatch(['C1', 'C2']);
    expect(mockClient.delete).toHaveBeenCalledWith('/customers/batch', {
      data: { ids: ['C1', 'C2'] },
    });
  });

  it('should change customer status', async () => {
    mockClient.put.mockResolvedValue({ success: true, data: { id: 'C1' } });
    await customerExtendedApi.changeStatus('C1', 'active');
    expect(mockClient.put).toHaveBeenCalledWith('/customers/C1/status', { status: 'active' });
  });

  it('should activate customer', async () => {
    mockClient.put.mockResolvedValue({ success: true, data: { id: 'C1' } });
    await customerExtendedApi.activate('C1');
    expect(mockClient.put).toHaveBeenCalledWith('/customers/C1/status', { status: 'active' });
  });

  it('should deactivate customer', async () => {
    mockClient.put.mockResolvedValue({ success: true, data: { id: 'C1' } });
    await customerExtendedApi.deactivate('C1');
    expect(mockClient.put).toHaveBeenCalledWith('/customers/C1/status', { status: 'inactive' });
  });

  it('should blacklist customer', async () => {
    mockClient.put.mockResolvedValue({ success: true, data: { id: 'C1' } });
    await customerExtendedApi.blacklist('C1');
    expect(mockClient.put).toHaveBeenCalledWith('/customers/C1/status', { status: 'blacklisted' });
  });

  it('should batch change status', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: [] });
    await customerExtendedApi.batchChangeStatus({ ids: ['C1'], status: 'inactive' });
    expect(mockClient.post).toHaveBeenCalledWith('/customers/batch/status', {
      ids: ['C1'],
      status: 'inactive',
    });
  });

  it('should batch change category', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: [] });
    await customerExtendedApi.batchChangeCategory({ ids: ['C1'], category: 'VIP' });
    expect(mockClient.post).toHaveBeenCalledWith('/customers/batch/category', {
      ids: ['C1'],
      category: 'VIP',
    });
  });

  it('should get customer stats', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { total: 100 } });
    await customerExtendedApi.getStats();
    expect(mockClient.get).toHaveBeenCalledWith('/customers/stats');
  });

  it('should list recently modified customers', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { customers: [], total: 0 } });
    await customerExtendedApi.listRecentlyModified(30);
    expect(mockClient.get).toHaveBeenCalledWith('/customers/recent?limit=30');
  });
});

describe('V137 ERP - salesOrderExtendedApi', () => {
  const mockClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should batch create sales orders', async () => {
    const data = [
      {
        order_number: 'SO001',
        customer_id: 'C1',
        customer_name: 'A',
        total_amount: 100,
        order_date: '2026-08-15',
      },
    ];
    mockClient.post.mockResolvedValue({ success: true, data: [] });
    await salesOrderExtendedApi.createBatch(data);
    expect(mockClient.post).toHaveBeenCalledWith('/sales-orders/batch', { orders: data });
  });

  it('should batch update sales orders', async () => {
    const updates = [{ id: 'SO1', payload: { remark: 'Updated' } }];
    mockClient.put.mockResolvedValue({ success: true, data: [] });
    await salesOrderExtendedApi.updateBatch(updates);
    expect(mockClient.put).toHaveBeenCalledWith('/sales-orders/batch', { updates });
  });

  it('should batch approve sales orders', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: [] });
    await salesOrderExtendedApi.approveBatch({ ids: ['SO1', 'SO2'] });
    expect(mockClient.post).toHaveBeenCalledWith('/sales-orders/batch/approve', {
      ids: ['SO1', 'SO2'],
    });
  });

  it('should batch ship sales orders', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: [] });
    await salesOrderExtendedApi.shipBatch({ ids: ['SO1'], ship_date: '2026-08-15' });
    expect(mockClient.post).toHaveBeenCalledWith('/sales-orders/batch/ship', {
      ids: ['SO1'],
      ship_date: '2026-08-15',
    });
  });

  it('should batch complete sales orders', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: [] });
    await salesOrderExtendedApi.completeBatch({ ids: ['SO1'] });
    expect(mockClient.post).toHaveBeenCalledWith('/sales-orders/batch/complete', { ids: ['SO1'] });
  });

  it('should batch cancel sales orders', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: [] });
    await salesOrderExtendedApi.cancelBatch({ ids: ['SO1'], reason: 'Customer request' });
    expect(mockClient.post).toHaveBeenCalledWith('/sales-orders/batch/cancel', {
      ids: ['SO1'],
      reason: 'Customer request',
    });
  });

  it('should get sales order stats', async () => {
    mockClient.get.mockResolvedValue({
      success: true,
      data: {
        total: 50,
        byStatus: [],
        byCustomer: [],
        pendingTotalAmount: 0,
        shippedTotalAmount: 0,
        completedTotalAmount: 0,
      },
    });
    await salesOrderExtendedApi.getStats();
    expect(mockClient.get).toHaveBeenCalledWith('/sales-orders/stats');
  });

  it('should list sales orders by customer', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: [] });
    await salesOrderExtendedApi.listByCustomer('C1');
    expect(mockClient.get).toHaveBeenCalledWith('/sales-orders?customer_id=C1');
  });
});
