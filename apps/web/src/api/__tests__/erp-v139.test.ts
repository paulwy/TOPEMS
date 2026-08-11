import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auditApi, fixedAssetApi, officeSupplyApi, vehicleApi } from '../erp/core';
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

describe('V139 ERP - auditApi', () => {
  const mockClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list audit logs with filters', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await auditApi.list({ page: 1, pageSize: 20, action: 'login', user_id: 'U-01' });
    expect(mockClient.get).toHaveBeenCalledWith(
      '/audit-logs?page=1&pagesize=20&action=login&user_id=U-01'
    );
  });

  it('should get audit log by id', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { id: 'L-001' } });
    await auditApi.get('L-001');
    expect(mockClient.get).toHaveBeenCalledWith('/audit-logs/L-001');
  });
});

describe('V139 ERP - fixedAssetApi', () => {
  const mockClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list fixed assets', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await fixedAssetApi.list({ page: 1, pageSize: 20, status: 'in_use' });
    expect(mockClient.get).toHaveBeenCalledWith('/fixed-assets?page=1&pagesize=20&status=in_use');
  });

  it('should create fixed asset', async () => {
    const data = { asset_code: 'FA-001', asset_name: '服务器A', asset_type: 'it', asset_category: 'server', original_value: 5000, depreciation_method: 'straight_line', useful_life_months: 36 };
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'FA-001' } });
    await fixedAssetApi.create(data);
    expect(mockClient.post).toHaveBeenCalledWith('/fixed-assets', data);
  });

  it('should depreciate assets', async () => {
    const data = { asset_ids: ['FA-001'], depreciation_date: '2026-08-16' };
    mockClient.post.mockResolvedValue({ success: true, data: { count: 1 } });
    await fixedAssetApi.depreciate(data);
    expect(mockClient.post).toHaveBeenCalledWith('/fixed-assets/depreciate', data);
  });
});

describe('V139 ERP - officeSupplyApi', () => {
  const mockClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list office supplies', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await officeSupplyApi.list({ page: 1, pageSize: 20, category: 'paper' });
    expect(mockClient.get).toHaveBeenCalledWith('/office-supplies?page=1&pagesize=20&category=paper');
  });

  it('should create office supply', async () => {
    const data = { name: 'A4纸', category: 'paper', quantity: 100 };
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'S-001' } });
    await officeSupplyApi.create(data);
    expect(mockClient.post).toHaveBeenCalledWith('/office-supplies', data);
  });

  it('should remove office supply', async () => {
    mockClient.delete.mockResolvedValue({ success: true, data: 'ok' });
    await officeSupplyApi.remove('S-001');
    expect(mockClient.delete).toHaveBeenCalledWith('/office-supplies/S-001');
  });
});

describe('V139 ERP - vehicleApi', () => {
  const mockClient = apiClient.erp as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list vehicles', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await vehicleApi.list({ page: 1, pageSize: 20, vehicle_type: 'sedan' });
    expect(mockClient.get).toHaveBeenCalledWith('/vehicles?page=1&pagesize=20&vehicle_type=sedan');
  });

  it('should create vehicle', async () => {
    const data = { plate_number: '京A·12345', vehicle_type: 'sedan', brand: 'Toyota' };
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'V-001' } });
    await vehicleApi.create(data);
    expect(mockClient.post).toHaveBeenCalledWith('/vehicles', data);
  });

  it('should list vehicle requests', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await vehicleApi.listRequests({ page: 1, pageSize: 20, status: 'pending' });
    expect(mockClient.get).toHaveBeenCalledWith('/vehicle-requests?page=1&pagesize=20&status=pending');
  });

  it('should create vehicle request', async () => {
    const data = { vehicle_id: 'V-001', purpose: '出差', start_date: '2026-08-17' };
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'R-001' } });
    await vehicleApi.createRequest(data);
    expect(mockClient.post).toHaveBeenCalledWith('/vehicle-requests', data);
  });

  it('should list requests for a specific vehicle', async () => {
    mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await vehicleApi.listVehicleRequests('V-001');
    expect(mockClient.get).toHaveBeenCalledWith('/vehicles/V-001/requests');
  });
});
