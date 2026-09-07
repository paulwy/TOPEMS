import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  purchaseOrderApi,
  salesOrderApi,
  inventoryApi,
  materialApi,
  supplierApi,
  customerApi,
} from '../core';
import { voucherApi } from '../../finance/voucher';
import { bankAccountApi } from '../bankAccount';
import { bankTransactionApi } from '../bankTransaction';
import { financeReportApi } from '../../finance/report';
import { officeSupplyApi } from '../admin/officeSupplies';
import { meetingRoomApi, meetingBookingApi } from '../admin/meeting';
import { vehicleApi, vehicleRequestApi } from '../core/vehicle';
import { announcementApi } from '../core/announcement';
import { documentApi } from '../core/document';
import apiClient from '../../client';

vi.mock('../../client', () => {
  const erpClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  const financeClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  const client = { erp: erpClient, finance: financeClient };
  return { default: client, apiClient: client, downloadBlob: vi.fn() };
});

describe('ERP supplierApi', () => {
  const mockApiClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /suppliers for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { suppliers: [], total: 0 } });
    await supplierApi.list({ page: 1, pageSize: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/suppliers?page=1&pagesize=10');
  });

  it('should call GET /suppliers/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: 'S001' } });
    await supplierApi.get('S001');
    expect(mockApiClient.get).toHaveBeenCalledWith('/suppliers/S001');
  });

  it('should call POST /suppliers for create', async () => {
    const data = { supplier_code: 'SUP999', supplier_name: 'Test Supplier' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await supplierApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/suppliers', data);
  });

  it('should call PUT /suppliers/:id for update', async () => {
    const data = { supplier_name: 'Updated' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await supplierApi.update('S001', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/suppliers/S001', data);
  });

  it('should call DELETE /suppliers/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await supplierApi.delete('S001');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/suppliers/S001');
  });
});

describe('ERP customerApi', () => {
  const mockApiClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /customers for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { customers: [], total: 0 } });
    await customerApi.list({ page: 1, pageSize: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/customers?page=1&pagesize=10');
  });

  it('should call GET /customers/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: 'C001' } });
    await customerApi.get('C001');
    expect(mockApiClient.get).toHaveBeenCalledWith('/customers/C001');
  });

  it('should call POST /customers for create', async () => {
    const data = { customer_code: 'CUS999', customer_name: 'Test Customer' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await customerApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/customers', data);
  });

  it('should call PUT /customers/:id for update', async () => {
    const data = { customer_name: 'Updated' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await customerApi.update('C001', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/customers/C001', data);
  });

  it('should call DELETE /customers/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await customerApi.delete('C001');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/customers/C001');
  });
});

describe('ERP materialApi', () => {
  const mockApiClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /materials for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { materials: [], total: 0 } });
    await materialApi.list({ page: 1, pageSize: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/materials?page=1&pagesize=10');
  });

  it('should call GET /materials/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: 'M001' } });
    await materialApi.get('M001');
    expect(mockApiClient.get).toHaveBeenCalledWith('/materials/M001');
  });

  it('should call POST /materials for create', async () => {
    const data = { material_code: 'MAT999', material_name: 'Test Material' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await materialApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/materials', data);
  });

  it('should call PUT /materials/:id for update', async () => {
    const data = { material_name: 'Updated' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await materialApi.update('M001', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/materials/M001', data);
  });

  it('should call DELETE /materials/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await materialApi.delete('M001');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/materials/M001');
  });
});

describe('ERP inventoryApi', () => {
  const mockApiClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /inventory for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await inventoryApi.list({ page: 1, pageSize: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/inventory?page=1&pagesize=10');
  });

  it('should call GET /inventory/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: 'INV001' } });
    await inventoryApi.get('INV001');
    expect(mockApiClient.get).toHaveBeenCalledWith('/inventory/INV001');
  });

  it('should call POST /inventory for create', async () => {
    const data = { material_id: 'M001', quantity: 100 };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await inventoryApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/inventory', data);
  });

  it('should call PUT /inventory/:id for update', async () => {
    const data = { quantity: 200 };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await inventoryApi.update('INV001', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/inventory/INV001', data);
  });

  it('should call DELETE /inventory/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await inventoryApi.delete('INV001');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/inventory/INV001');
  });

  it('should call GET /inventory/low-stock for getLowStock', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: [] });
    await inventoryApi.getLowStock();
    expect(mockApiClient.get).toHaveBeenCalledWith('/inventory/low-stock');
  });
});

describe('ERP purchaseOrderApi', () => {
  const mockApiClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /purchase-orders for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { orders: [], total: 0 } });
    await purchaseOrderApi.list({ page: 1, pageSize: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/purchase-orders?page=1&pagesize=10');
  });

  it('should call GET /purchase-orders/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: 'PO001' } });
    await purchaseOrderApi.get('PO001');
    expect(mockApiClient.get).toHaveBeenCalledWith('/purchase-orders/PO001');
  });

  it('should call POST /purchase-orders for create', async () => {
    const data = { order_number: 'PO2024999', supplier_id: 'S001', total_amount: 1000 };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await purchaseOrderApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/purchase-orders', data);
  });

  it('should call PUT /purchase-orders/:id for update', async () => {
    const data = { remark: 'Updated' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await purchaseOrderApi.update('PO001', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/purchase-orders/PO001', data);
  });

  it('should call DELETE /purchase-orders/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await purchaseOrderApi.delete('PO001');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/purchase-orders/PO001');
  });

  it('should call PUT /purchase-orders/:id/approve for approve', async () => {
    mockApiClient.put.mockResolvedValue({
      success: true,
      data: { id: 'PO001', status: 'approved' },
    });
    await purchaseOrderApi.approve('PO001');
    expect(mockApiClient.put).toHaveBeenCalledWith('/purchase-orders/PO001/approve');
  });

  it('should call PUT /purchase-orders/:id/cancel for cancel', async () => {
    mockApiClient.put.mockResolvedValue({
      success: true,
      data: { id: 'PO001', status: 'cancelled' },
    });
    await purchaseOrderApi.cancel('PO001');
    expect(mockApiClient.put).toHaveBeenCalledWith('/purchase-orders/PO001/cancel');
  });
});

describe('ERP salesOrderApi', () => {
  const mockApiClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /sales-orders for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { orders: [], total: 0 } });
    await salesOrderApi.list({ page: 1, pageSize: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/sales-orders?page=1&pagesize=10');
  });

  it('should call GET /sales-orders/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: 'SO001' } });
    await salesOrderApi.get('SO001');
    expect(mockApiClient.get).toHaveBeenCalledWith('/sales-orders/SO001');
  });

  it('should call POST /sales-orders for create', async () => {
    const data = { order_number: 'SO2024999', customer_id: 'C001', total_amount: 2000 };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await salesOrderApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/sales-orders', data);
  });

  it('should call PUT /sales-orders/:id for update', async () => {
    const data = { remark: 'Updated' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await salesOrderApi.update('SO001', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/sales-orders/SO001', data);
  });

  it('should call DELETE /sales-orders/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await salesOrderApi.delete('SO001');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/sales-orders/SO001');
  });

  it('should call PUT /sales-orders/:id/approve for approve', async () => {
    mockApiClient.put.mockResolvedValue({
      success: true,
      data: { id: 'SO001', status: 'approved' },
    });
    await salesOrderApi.approve('SO001');
    expect(mockApiClient.put).toHaveBeenCalledWith('/sales-orders/SO001/approve');
  });

  it('should call PUT /sales-orders/:id/ship for ship', async () => {
    mockApiClient.put.mockResolvedValue({
      success: true,
      data: { id: 'SO001', status: 'shipped' },
    });
    await salesOrderApi.ship('SO001');
    expect(mockApiClient.put).toHaveBeenCalledWith('/sales-orders/SO001/ship');
  });

  it('should call PUT /sales-orders/:id/complete for complete', async () => {
    mockApiClient.put.mockResolvedValue({
      success: true,
      data: { id: 'SO001', status: 'completed' },
    });
    await salesOrderApi.complete('SO001');
    expect(mockApiClient.put).toHaveBeenCalledWith('/sales-orders/SO001/complete');
  });

  it('should call PUT /sales-orders/:id/cancel for cancel', async () => {
    mockApiClient.put.mockResolvedValue({
      success: true,
      data: { id: 'SO001', status: 'cancelled' },
    });
    await salesOrderApi.cancel('SO001');
    expect(mockApiClient.put).toHaveBeenCalledWith('/sales-orders/SO001/cancel');
  });
});

describe('ERP voucherApi', () => {
  const mockApiClient = apiClient.finance as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /vouchers for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await voucherApi.list({ page: 1, pagesize: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/vouchers', expect.anything());
  });

  it('should call GET /vouchers/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: 'V001' } });
    await voucherApi.get('V001');
    expect(mockApiClient.get).toHaveBeenCalledWith('/vouchers/V001');
  });

  it('should call GET /vouchers/:id/items for getItems', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: [] });
    await voucherApi.getItems('V001');
    expect(mockApiClient.get).toHaveBeenCalledWith('/vouchers/V001/items');
  });

  it('should call POST /vouchers for create', async () => {
    const data = { voucher_date: '2024-01-01', items: [] };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await voucherApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/vouchers', data);
  });

  it('should call PUT /vouchers/:id for update', async () => {
    const data = { voucher_date: '2024-01-02' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await voucherApi.update('V001', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/vouchers/V001', data);
  });

  it('should call DELETE /vouchers/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await voucherApi.delete('V001');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/vouchers/V001');
  });
});

describe('ERP bankAccountApi', () => {
  const mockApiClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /bank-accounts for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await bankAccountApi.list({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalled();
  });

  it('should call GET /bank-accounts/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: 'BA001' } });
    await bankAccountApi.get('BA001');
    expect(mockApiClient.get).toHaveBeenCalledWith('/bank-accounts/BA001');
  });

  it('should call POST /bank-accounts for create', async () => {
    const data = { bank_name: 'Bank', account_no: '123456', currency: 'CNY' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await bankAccountApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/bank-accounts', data);
  });

  it('should call PUT /bank-accounts/:id for update', async () => {
    const data = { bank_name: 'Updated Bank' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await bankAccountApi.update('BA001', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/bank-accounts/BA001', data);
  });

  it('should call DELETE /bank-accounts/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await bankAccountApi.delete('BA001');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/bank-accounts/BA001');
  });
});

describe('ERP bankTransactionApi', () => {
  const mockApiClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /bank-transactions for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await bankTransactionApi.list({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalled();
  });

  it('should call GET /bank-transactions/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: 'BT001' } });
    await bankTransactionApi.get('BT001');
    expect(mockApiClient.get).toHaveBeenCalledWith('/bank-transactions/BT001');
  });

  it('should call POST /bank-transactions for create', async () => {
    const data = { account_id: 'BA001', amount: 1000, transaction_type: 'transfer' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await bankTransactionApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/bank-transactions', data);
  });

  it('should call DELETE /bank-transactions/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await bankTransactionApi.delete('BT001');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/bank-transactions/BT001');
  });
});

describe('ERP financeReportApi', () => {
  const mockApiClient = apiClient.finance as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /reports/balance-sheet for balanceSheet', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: {} });
    await financeReportApi.balanceSheet({ period: '2024-01' });
    expect(mockApiClient.get).toHaveBeenCalledWith('/reports/balance-sheet', expect.anything());
  });

  it('should call GET /reports/income-statement for incomeStatement', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: {} });
    await financeReportApi.incomeStatement({ period: '2024-01' });
    expect(mockApiClient.get).toHaveBeenCalledWith('/reports/income-statement', expect.anything());
  });

  it('should call GET /reports/cash-flow for cashFlowStatement', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: {} });
    await financeReportApi.cashFlowStatement({ period: '2024-01' });
    expect(mockApiClient.get).toHaveBeenCalledWith('/reports/cash-flow', expect.anything());
  });

  it('should call GET /reports/business-overview for businessOverview', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: {} });
    await financeReportApi.businessOverview({ period: '2024-01' });
    expect(mockApiClient.get).toHaveBeenCalledWith('/reports/business-overview', expect.anything());
  });

  it('should call GET /reports/monthly-trend for monthlyTrend', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: [] });
    await financeReportApi.monthlyTrend();
    expect(mockApiClient.get).toHaveBeenCalledWith('/reports/monthly-trend');
  });

  it('should call GET /reports/aging-analysis for agingAnalysis', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: [] });
    await financeReportApi.agingAnalysis();
    expect(mockApiClient.get).toHaveBeenCalledWith('/reports/aging-analysis');
  });
});

describe('ERP officeSupplyApi', () => {
  const mockApiClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /office-supplies for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await officeSupplyApi.list({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalled();
  });

  it('should call GET /office-supplies/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: 'OS001' } });
    await officeSupplyApi.get('OS001');
    expect(mockApiClient.get).toHaveBeenCalledWith('/office-supplies/OS001');
  });

  it('should call POST /office-supplies for create', async () => {
    const data = { name: 'Paper', category: 'stationery' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await officeSupplyApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/office-supplies', data);
  });

  it('should call PUT /office-supplies/:id for update', async () => {
    const data = { name: 'A4 Paper' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await officeSupplyApi.update('OS001', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/office-supplies/OS001', data);
  });

  it('should call DELETE /office-supplies/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await officeSupplyApi.delete('OS001');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/office-supplies/OS001');
  });
});

describe('ERP meetingRoomApi', () => {
  const mockApiClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /meeting-rooms for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await meetingRoomApi.list({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalled();
  });

  it('should call GET /meeting-rooms/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: 'MR001' } });
    await meetingRoomApi.get('MR001');
    expect(mockApiClient.get).toHaveBeenCalledWith('/meeting-rooms/MR001');
  });

  it('should call POST /meeting-rooms for create', async () => {
    const data = { name: 'Room A', capacity: 10 };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await meetingRoomApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/meeting-rooms', data);
  });

  it('should call PUT /meeting-rooms/:id for update', async () => {
    const data = { name: 'Room B' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await meetingRoomApi.update('MR001', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/meeting-rooms/MR001', data);
  });

  it('should call DELETE /meeting-rooms/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await meetingRoomApi.delete('MR001');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/meeting-rooms/MR001');
  });

  it('should call GET /meeting-rooms/:id/bookings for getBookings', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: [] });
    await meetingRoomApi.getBookings('MR001');
    expect(mockApiClient.get).toHaveBeenCalledWith('/meeting-rooms/MR001/bookings');
  });
});

describe('ERP meetingBookingApi', () => {
  const mockApiClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /meeting-bookings for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await meetingBookingApi.list({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalled();
  });

  it('should call GET /meeting-bookings/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: 'BK001' } });
    await meetingBookingApi.get('BK001');
    expect(mockApiClient.get).toHaveBeenCalledWith('/meeting-bookings/BK001');
  });

  it('should call POST /meeting-bookings for create', async () => {
    const data = { room_id: 'MR001', start_time: '09:00', end_time: '10:00' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await meetingBookingApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/meeting-bookings', data);
  });

  it('should call PUT /meeting-bookings/:id for update', async () => {
    const data = { start_time: '10:00' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await meetingBookingApi.update('BK001', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/meeting-bookings/BK001', data);
  });

  it('should call DELETE /meeting-bookings/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await meetingBookingApi.delete('BK001');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/meeting-bookings/BK001');
  });
});

describe('ERP vehicleApi', () => {
  const mockApiClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /vehicles for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await vehicleApi.list({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalled();
  });

  it('should call GET /vehicles/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: 'V001' } });
    await vehicleApi.get('V001');
    expect(mockApiClient.get).toHaveBeenCalledWith('/vehicles/V001');
  });

  it('should call POST /vehicles for create', async () => {
    const data = { plate_no: '京A12345', vehicle_type: 'sedan' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await vehicleApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/vehicles', data);
  });

  it('should call PUT /vehicles/:id for update', async () => {
    const data = { plate_no: '京B67890' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await vehicleApi.update('V001', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/vehicles/V001', data);
  });

  it('should call DELETE /vehicles/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await vehicleApi.delete('V001');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/vehicles/V001');
  });

  it('should call GET /vehicles/:id/requests for listVehicleRequests', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: [] });
    await vehicleApi.listVehicleRequests('V001');
    expect(mockApiClient.get).toHaveBeenCalledWith('/vehicles/V001/requests');
  });
});

describe('ERP vehicleRequestApi', () => {
  const mockApiClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /vehicle-requests for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await vehicleRequestApi.list({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalled();
  });

  it('should call GET /vehicle-requests/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: 'VR001' } });
    await vehicleRequestApi.get('VR001');
    expect(mockApiClient.get).toHaveBeenCalledWith('/vehicle-requests/VR001');
  });

  it('should call POST /vehicle-requests for create', async () => {
    const data = { vehicle_id: 'V001', start_date: '2024-01-01' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await vehicleRequestApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/vehicle-requests', data);
  });

  it('should call PUT /vehicle-requests/:id for update', async () => {
    const data = { status: 'approved' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await vehicleRequestApi.update('VR001', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/vehicle-requests/VR001', data);
  });

  it('should call DELETE /vehicle-requests/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await vehicleRequestApi.delete('VR001');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/vehicle-requests/VR001');
  });
});

describe('ERP announcementApi', () => {
  const mockApiClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /announcements for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await announcementApi.list({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalled();
  });

  it('should call GET /announcements/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: 'ANN001' } });
    await announcementApi.get('ANN001');
    expect(mockApiClient.get).toHaveBeenCalledWith('/announcements/ANN001');
  });

  it('should call POST /announcements for create', async () => {
    const data = { title: 'Test', content: 'Content', publish_date: '2024-01-01' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await announcementApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/announcements', data);
  });

  it('should call PUT /announcements/:id for update', async () => {
    const data = { title: 'Updated' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await announcementApi.update('ANN001', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/announcements/ANN001', data);
  });

  it('should call DELETE /announcements/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await announcementApi.delete('ANN001');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/announcements/ANN001');
  });

  it('should call POST /announcements/:id/publish for publish', async () => {
    mockApiClient.post.mockResolvedValue({ success: true, data: {} });
    await announcementApi.publish('ANN001');
    expect(mockApiClient.post).toHaveBeenCalledWith('/announcements/ANN001/publish');
  });

  it('should call POST /announcements/:id/unpublish for unpublish', async () => {
    mockApiClient.post.mockResolvedValue({ success: true, data: {} });
    await announcementApi.unpublish('ANN001');
    expect(mockApiClient.post).toHaveBeenCalledWith('/announcements/ANN001/unpublish');
  });
});

describe('ERP documentApi (core)', () => {
  const mockApiClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /documents for list with query params', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await documentApi.list({ page: 2, pageSize: 10, doc_type: 'contract' });
    expect(mockApiClient.get).toHaveBeenCalledWith(
      '/documents?page=2&pagesize=10&doc_type=contract'
    );
  });

  it('should call GET /documents/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: 'DOC001' } });
    await documentApi.get('DOC001');
    expect(mockApiClient.get).toHaveBeenCalledWith('/documents/DOC001');
  });

  it('should call POST /documents for create', async () => {
    const data = { title: '采购合同', doc_type: 'contract' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await documentApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/documents', data);
  });

  it('should call PUT /documents/:id for update', async () => {
    const data = { status: 'archived' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await documentApi.update('DOC001', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/documents/DOC001', data);
  });

  it('should call DELETE /documents/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: 'deleted' });
    await documentApi.delete('DOC001');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/documents/DOC001');
  });
});
