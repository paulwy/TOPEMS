import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  supplierApi,
  purchaseOrderApi,
  purchaseItemApi,
  supplierEvaluationApi,
  mrpPlanApi,
  mrpSuggestionApi,
  incomingInspectionApi,
  inspectionRecordApi,
  inventoryTurnoverApi,
  supplyChainDashboardApi,
  priceComparisonApi,
  syncRecordApi,
  auditLogApi,
  deliveryAppointmentApi,
  purchaseRequisitionApi,
  purchaseContractApi,
  supplierAdmissionApi,
  scmApi,
} from '../index';
import apiClient from '../../client';

vi.mock('../../client', () => ({
  default: {
    scm: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('SCM supplierApi', () => {
  const mockApiClient = apiClient.scm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /suppliers with params for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await supplierApi.list({ page: 1, pageSize: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/suppliers', {
      params: { page: 1, pageSize: 10 },
    });
  });

  it('should call POST /suppliers for create', async () => {
    const data = { name: 'Supplier1', code: 'SUP001' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await supplierApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/suppliers', data);
  });

  it('should call GET /suppliers/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await supplierApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/suppliers/1');
  });

  it('should call PUT /suppliers/:id for update', async () => {
    const data = { name: 'Updated' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await supplierApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/suppliers/1', data);
  });

  it('should call DELETE /suppliers/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await supplierApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/suppliers/1');
  });
});

describe('SCM purchaseOrderApi', () => {
  const mockApiClient = apiClient.scm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /purchase-orders for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await purchaseOrderApi.list();
    expect(mockApiClient.get).toHaveBeenCalledWith('/purchase-orders', { params: undefined });
  });

  it('should call POST /purchase-orders for create', async () => {
    const data = { orderNo: 'PO001', supplier_id: 'sup1' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await purchaseOrderApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/purchase-orders', data);
  });

  it('should call GET /purchase-orders/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await purchaseOrderApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/purchase-orders/1');
  });

  it('should call PUT /purchase-orders/:id for update', async () => {
    const data = { status: 'confirmed' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await purchaseOrderApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/purchase-orders/1', data);
  });

  it('should call DELETE /purchase-orders/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await purchaseOrderApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/purchase-orders/1');
  });

  it('should call POST /purchase-orders/:id/approve for approve', async () => {
    mockApiClient.post.mockResolvedValue({ success: true, data: { id: '1' } });
    await purchaseOrderApi.approve('1', 'Approved');
    expect(mockApiClient.post).toHaveBeenCalledWith('/purchase-orders/1/approve', {
      remarks: 'Approved',
    });
  });

  it('should call POST /purchase-orders/:id/confirm for confirm', async () => {
    mockApiClient.post.mockResolvedValue({ success: true, data: { id: '1' } });
    await purchaseOrderApi.confirm('1');
    expect(mockApiClient.post).toHaveBeenCalledWith('/purchase-orders/1/confirm', {
      remarks: undefined,
    });
  });

  it('should call POST /purchase-orders/:id/cancel for cancel', async () => {
    mockApiClient.post.mockResolvedValue({ success: true, data: { id: '1' } });
    await purchaseOrderApi.cancel('1', 'Cancelled');
    expect(mockApiClient.post).toHaveBeenCalledWith('/purchase-orders/1/cancel', {
      remarks: 'Cancelled',
    });
  });

  it('should call POST /purchase-orders/:id/close for close', async () => {
    mockApiClient.post.mockResolvedValue({ success: true, data: { id: '1' } });
    await purchaseOrderApi.close('1');
    expect(mockApiClient.post).toHaveBeenCalledWith('/purchase-orders/1/close', {
      remarks: undefined,
    });
  });
});

describe('SCM purchaseItemApi', () => {
  const mockApiClient = apiClient.scm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /purchase-items for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await purchaseItemApi.list();
    expect(mockApiClient.get).toHaveBeenCalledWith('/purchase-items', { params: undefined });
  });

  it('should call POST /purchase-items for create', async () => {
    const data = { order_id: 'po1', material_id: 'mat1', quantity: 10 };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await purchaseItemApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/purchase-items', data);
  });

  it('should call GET /purchase-items/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await purchaseItemApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/purchase-items/1');
  });

  it('should call PUT /purchase-items/:id for update', async () => {
    const data = { quantity: 20 };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await purchaseItemApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/purchase-items/1', data);
  });
});

describe('SCM supplierEvaluationApi', () => {
  const mockApiClient = apiClient.scm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /evaluations for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await supplierEvaluationApi.list();
    expect(mockApiClient.get).toHaveBeenCalledWith('/evaluations', { params: undefined });
  });

  it('should call POST /evaluations for create', async () => {
    const data = { supplier_id: 'sup1', score: 90 };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await supplierEvaluationApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/evaluations', data);
  });

  it('should call GET /evaluations/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await supplierEvaluationApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/evaluations/1');
  });

  it('should call PUT /evaluations/:id for update', async () => {
    const data = { score: 95 };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await supplierEvaluationApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/evaluations/1', data);
  });

  it('should call DELETE /evaluations/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await supplierEvaluationApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/evaluations/1');
  });
});

describe('SCM mrpPlanApi', () => {
  const mockApiClient = apiClient.scm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /mrp/suggestions for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await mrpPlanApi.list();
    expect(mockApiClient.get).toHaveBeenCalledWith('/mrp/suggestions', { params: undefined });
  });

  it('should call POST /mrp/suggestions for create', async () => {
    const data = { name: 'MRP Plan 1' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await mrpPlanApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/mrp/suggestions', data);
  });

  it('should call GET /mrp/suggestions/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await mrpPlanApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/mrp/suggestions/1');
  });

  it('should call PUT /mrp/suggestions/:id for update', async () => {
    const data = { status: 'confirmed' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await mrpPlanApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/mrp/suggestions/1', data);
  });

  it('should call DELETE /mrp/suggestions/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await mrpPlanApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/mrp/suggestions/1');
  });

  it('should call POST /mrp/suggestions/:id/confirm for calculate', async () => {
    mockApiClient.post.mockResolvedValue({ success: true, data: {} });
    await mrpPlanApi.calculate('1');
    expect(mockApiClient.post).toHaveBeenCalledWith('/mrp/suggestions/1/confirm');
  });
});

describe('SCM mrpSuggestionApi', () => {
  const mockApiClient = apiClient.scm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /mrp-suggestions for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await mrpSuggestionApi.list();
    expect(mockApiClient.get).toHaveBeenCalledWith('/mrp-suggestions', { params: undefined });
  });

  it('should call GET /mrp-suggestions/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await mrpSuggestionApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/mrp-suggestions/1');
  });

  it('should call GET /mrp-suggestions/summary for summary', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: [] });
    await mrpSuggestionApi.summary();
    expect(mockApiClient.get).toHaveBeenCalledWith('/mrp-suggestions/summary', {
      params: undefined,
    });
  });
});

describe('SCM incomingInspectionApi', () => {
  const mockApiClient = apiClient.scm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /incoming-inspections for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await incomingInspectionApi.list();
    expect(mockApiClient.get).toHaveBeenCalledWith('/incoming-inspections', { params: undefined });
  });

  it('should call POST /incoming-inspections for create', async () => {
    const data = { order_id: 'po1' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await incomingInspectionApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/incoming-inspections', data);
  });

  it('should call GET /incoming-inspections/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await incomingInspectionApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/incoming-inspections/1');
  });

  it('should call PUT /incoming-inspections/:id for update', async () => {
    const data = { status: 'inspected' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await incomingInspectionApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/incoming-inspections/1', data);
  });

  it('should call DELETE /incoming-inspections/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await incomingInspectionApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/incoming-inspections/1');
  });

  it('should call POST /incoming-inspections/:id/pass for pass', async () => {
    mockApiClient.post.mockResolvedValue({ success: true, data: { id: '1' } });
    await incomingInspectionApi.pass('1', 'Passed');
    expect(mockApiClient.post).toHaveBeenCalledWith('/incoming-inspections/1/pass', {
      remarks: 'Passed',
    });
  });

  it('should call POST /incoming-inspections/:id/reject for reject', async () => {
    const data = { disposal_type: 'return' };
    mockApiClient.post.mockResolvedValue({ success: true, data: { id: '1' } });
    await incomingInspectionApi.reject('1', data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/incoming-inspections/1/reject', data);
  });
});

describe('SCM inspectionRecordApi', () => {
  const mockApiClient = apiClient.scm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /incoming-inspections/:id/records for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await inspectionRecordApi.list('inspection1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/incoming-inspections/inspection1/records', {
      params: undefined,
    });
  });

  it('should call POST /inspection-records for create', async () => {
    const data = { inspection_id: 'ins1', result: 'pass' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await inspectionRecordApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/inspection-records', data);
  });

  it('should call GET /inspection-records/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await inspectionRecordApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/inspection-records/1');
  });

  it('should call PUT /inspection-records/:id for update', async () => {
    const data = { result: 'fail' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await inspectionRecordApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/inspection-records/1', data);
  });

  it('should call DELETE /inspection-records/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await inspectionRecordApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/inspection-records/1');
  });
});

describe('SCM inventoryTurnoverApi', () => {
  const mockApiClient = apiClient.scm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /inventory-turnover for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await inventoryTurnoverApi.list();
    expect(mockApiClient.get).toHaveBeenCalledWith('/inventory-turnover', { params: undefined });
  });

  it('should call GET /inventory-turnover/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await inventoryTurnoverApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/inventory-turnover/1');
  });

  it('should call GET /inventory-turnover/abc-analysis for abcClassification', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: [] });
    await inventoryTurnoverApi.abcClassification();
    expect(mockApiClient.get).toHaveBeenCalledWith('/inventory-turnover/abc-analysis', {
      params: undefined,
    });
  });

  it('should call GET /inventory-turnover/trend for trend', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: [] });
    await inventoryTurnoverApi.trend();
    expect(mockApiClient.get).toHaveBeenCalledWith('/inventory-turnover/trend', {
      params: undefined,
    });
  });
});

describe('SCM supplyChainDashboardApi', () => {
  const mockApiClient = apiClient.scm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /dashboard/overview for overview', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: {} });
    await supplyChainDashboardApi.overview();
    expect(mockApiClient.get).toHaveBeenCalledWith('/dashboard/overview');
  });

  it('should call GET /dashboard/purchase-inbound-outbound for fullLinkStats', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: {} });
    await supplyChainDashboardApi.fullLinkStats();
    expect(mockApiClient.get).toHaveBeenCalledWith('/dashboard/purchase-inbound-outbound');
  });

  it('should call GET /dashboard/supplier-performance for supplierPerformance', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await supplyChainDashboardApi.supplierPerformance();
    expect(mockApiClient.get).toHaveBeenCalledWith('/dashboard/supplier-performance', {
      params: undefined,
    });
  });
});

describe('SCM priceComparisonApi', () => {
  const mockApiClient = apiClient.scm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /comparisons for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await priceComparisonApi.list();
    expect(mockApiClient.get).toHaveBeenCalledWith('/comparisons', { params: undefined });
  });

  it('should call POST /comparisons for create', async () => {
    const data = { name: 'Price Comparison 1' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await priceComparisonApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/comparisons', data);
  });

  it('should call GET /comparisons/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await priceComparisonApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/comparisons/1');
  });

  it('should call PUT /comparisons/:id for update', async () => {
    const data = { name: 'Updated' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await priceComparisonApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/comparisons/1', data);
  });

  it('should call DELETE /comparisons/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await priceComparisonApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/comparisons/1');
  });

  it('should call GET /quotes for quotes', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: [] });
    await priceComparisonApi.quotes('comp1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/quotes', {
      params: { comparison_id: 'comp1' },
    });
  });

  it('should call POST /quotes for createQuote', async () => {
    const data = { comparison_id: 'comp1', supplier_id: 'sup1', price: 100 };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await priceComparisonApi.createQuote(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/quotes', data);
  });
});

describe('SCM syncRecordApi', () => {
  const mockApiClient = apiClient.scm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /sync-records for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await syncRecordApi.list();
    expect(mockApiClient.get).toHaveBeenCalledWith('/sync-records', { params: undefined });
  });

  it('should call POST /sync-records for create', async () => {
    const data = { sync_type: 'wms' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await syncRecordApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/sync-records', data);
  });

  it('should call GET /sync-records/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await syncRecordApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/sync-records/1');
  });

  it('should call POST /sync-records/:id/retry for retry', async () => {
    mockApiClient.post.mockResolvedValue({ success: true, data: {} });
    await syncRecordApi.retry('1');
    expect(mockApiClient.post).toHaveBeenCalledWith('/sync-records/1/retry');
  });

  it('should call POST /sync/wms/:type for syncWithWms', async () => {
    mockApiClient.post.mockResolvedValue({ success: true, data: {} });
    await syncRecordApi.syncWithWms('inventory');
    expect(mockApiClient.post).toHaveBeenCalledWith('/sync/wms/inventory');
  });

  it('should call POST /sync/srm/:type for syncWithSrm', async () => {
    mockApiClient.post.mockResolvedValue({ success: true, data: {} });
    await syncRecordApi.syncWithSrm('supplier');
    expect(mockApiClient.post).toHaveBeenCalledWith('/sync/srm/supplier');
  });

  it('should call GET /sync-records/:id/details for details', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await syncRecordApi.details('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/sync-records/1/details', {
      params: undefined,
    });
  });
});

describe('SCM auditLogApi', () => {
  const mockApiClient = apiClient.scm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /audit-logs for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await auditLogApi.list();
    expect(mockApiClient.get).toHaveBeenCalledWith('/audit-logs', { params: undefined });
  });

  it('should call GET /audit-logs/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await auditLogApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/audit-logs/1');
  });
});

describe('SCM deliveryAppointmentApi', () => {
  const mockApiClient = apiClient.scm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /delivery-appointments for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await deliveryAppointmentApi.list();
    expect(mockApiClient.get).toHaveBeenCalledWith('/delivery-appointments', { params: undefined });
  });

  it('should call POST /delivery-appointments for create', async () => {
    const data = { supplier_id: 'sup1', scheduled_date: '2024-01-01' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await deliveryAppointmentApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/delivery-appointments', data);
  });

  it('should call GET /delivery-appointments/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await deliveryAppointmentApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/delivery-appointments/1');
  });

  it('should call PUT /delivery-appointments/:id for update', async () => {
    const data = { scheduled_date: '2024-01-02' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await deliveryAppointmentApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/delivery-appointments/1', data);
  });

  it('should call DELETE /delivery-appointments/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await deliveryAppointmentApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/delivery-appointments/1');
  });

  it('should call POST /delivery-appointments/:id/approve for approve', async () => {
    mockApiClient.post.mockResolvedValue({ success: true, data: { id: '1' } });
    await deliveryAppointmentApi.approve('1');
    expect(mockApiClient.post).toHaveBeenCalledWith('/delivery-appointments/1/approve', {});
  });

  it('should call GET /delivery-appointments/stats for stats', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: {} });
    await deliveryAppointmentApi.stats();
    expect(mockApiClient.get).toHaveBeenCalledWith('/delivery-appointments/stats');
  });
});

describe('SCM purchaseRequisitionApi', () => {
  const mockApiClient = apiClient.scm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /purchase-requisitions for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await purchaseRequisitionApi.list();
    expect(mockApiClient.get).toHaveBeenCalledWith('/purchase-requisitions', { params: undefined });
  });

  it('should call POST /purchase-requisitions for create', async () => {
    const data = { material_id: 'mat1', quantity: 10 };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await purchaseRequisitionApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/purchase-requisitions', data);
  });

  it('should call GET /purchase-requisitions/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await purchaseRequisitionApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/purchase-requisitions/1');
  });

  it('should call PUT /purchase-requisitions/:id for update', async () => {
    const data = { quantity: 20 };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await purchaseRequisitionApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/purchase-requisitions/1', data);
  });

  it('should call DELETE /purchase-requisitions/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await purchaseRequisitionApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/purchase-requisitions/1');
  });

  it('should call POST /purchase-requisitions/:id/submit for submit', async () => {
    mockApiClient.post.mockResolvedValue({ success: true, data: { id: '1' } });
    await purchaseRequisitionApi.submit('1');
    expect(mockApiClient.post).toHaveBeenCalledWith('/purchase-requisitions/1/submit', {
      remarks: undefined,
    });
  });

  it('should call POST /purchase-requisitions/:id/convert-to-order for convertToOrder', async () => {
    mockApiClient.post.mockResolvedValue({ success: true, data: { id: '1' } });
    await purchaseRequisitionApi.convertToOrder('1');
    expect(mockApiClient.post).toHaveBeenCalledWith('/purchase-requisitions/1/convert-to-order');
  });
});

describe('SCM purchaseContractApi', () => {
  const mockApiClient = apiClient.scm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /purchase-contracts for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await purchaseContractApi.list();
    expect(mockApiClient.get).toHaveBeenCalledWith('/purchase-contracts', { params: undefined });
  });

  it('should call POST /purchase-contracts for create', async () => {
    const data = { contractNo: 'PC001', supplier_id: 'sup1' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await purchaseContractApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/purchase-contracts', data);
  });

  it('should call GET /purchase-contracts/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await purchaseContractApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/purchase-contracts/1');
  });

  it('should call PUT /purchase-contracts/:id for update', async () => {
    const data = { status: 'active' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await purchaseContractApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/purchase-contracts/1', data);
  });

  it('should call DELETE /purchase-contracts/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await purchaseContractApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/purchase-contracts/1');
  });

  it('should call POST /purchase-contracts/:id/submit for submit', async () => {
    mockApiClient.post.mockResolvedValue({ success: true, data: { id: '1' } });
    await purchaseContractApi.submit('1');
    expect(mockApiClient.post).toHaveBeenCalledWith('/purchase-contracts/1/submit', {
      remarks: undefined,
    });
  });

  it('should call POST /purchase-contracts/:id/terminate for terminate', async () => {
    mockApiClient.post.mockResolvedValue({ success: true, data: { id: '1' } });
    await purchaseContractApi.terminate('1', 'Terminated');
    expect(mockApiClient.post).toHaveBeenCalledWith('/purchase-contracts/1/terminate', {
      remarks: 'Terminated',
    });
  });

  it('should call POST /purchase-contracts/:id/renew for renew', async () => {
    mockApiClient.post.mockResolvedValue({ success: true, data: { id: '1' } });
    await purchaseContractApi.renew('1');
    expect(mockApiClient.post).toHaveBeenCalledWith('/purchase-contracts/1/renew');
  });
});

describe('SCM supplierAdmissionApi', () => {
  const mockApiClient = apiClient.scm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /supplier-admissions for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await supplierAdmissionApi.list();
    expect(mockApiClient.get).toHaveBeenCalledWith('/supplier-admissions', { params: undefined });
  });

  it('should call POST /supplier-admissions for create', async () => {
    const data = { supplier_name: 'Supplier1' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await supplierAdmissionApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/supplier-admissions', data);
  });

  it('should call GET /supplier-admissions/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await supplierAdmissionApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/supplier-admissions/1');
  });

  it('should call PUT /supplier-admissions/:id for update', async () => {
    const data = { status: 'pending' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await supplierAdmissionApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/supplier-admissions/1', data);
  });

  it('should call DELETE /supplier-admissions/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await supplierAdmissionApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/supplier-admissions/1');
  });

  it('should call POST /supplier-admissions/:id/submit for submit', async () => {
    mockApiClient.post.mockResolvedValue({ success: true, data: { id: '1' } });
    await supplierAdmissionApi.submit('1');
    expect(mockApiClient.post).toHaveBeenCalledWith('/supplier-admissions/1/submit', {
      remarks: undefined,
    });
  });

  it('should call POST /supplier-admissions/:id/audit for audit', async () => {
    const auditData = { audit_items: [{ audit_item: 'Quality', audit_result: 'pass' }] };
    mockApiClient.post.mockResolvedValue({ success: true, data: { id: '1' } });
    await supplierAdmissionApi.audit('1', auditData);
    expect(mockApiClient.post).toHaveBeenCalledWith('/supplier-admissions/1/audit', auditData);
  });

  it('should call POST /supplier-admissions/:id/activate-supplier for activateSupplier', async () => {
    mockApiClient.post.mockResolvedValue({ success: true, data: { id: '1' } });
    await supplierAdmissionApi.activateSupplier('1');
    expect(mockApiClient.post).toHaveBeenCalledWith('/supplier-admissions/1/activate-supplier');
  });
});

describe('SCM scmApi', () => {
  const mockApiClient = apiClient.scm as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /health for health', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: 'OK' });
    await scmApi.health();
    expect(mockApiClient.get).toHaveBeenCalledWith('/health');
  });
});
