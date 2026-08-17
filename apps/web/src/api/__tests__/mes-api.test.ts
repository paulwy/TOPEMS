import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  productionOrderApi,
  productionProcessApi,
  workStationApi,
  productionRecordApi,
  equipmentApi,
  mesEquipmentApi,
  equipmentOeeApi,
  productionScheduleApi,
  materialBomApi,
  materialIssueApi,
  materialReturnApi,
  traceabilityApi,
  wipApi,
  processRouteApi,
  processFlowApi,
  qualityApi,
  workReportApi,
  workOrderApi,
  teamApi,
  materialRequirementApi,
  productionKanbanApi,
  mesApi,
} from '../mes';
import apiClient from '../client';

vi.mock('../client', () => ({
  default: {
    mes: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

type MockClient = {
  get: vi.Mock;
  post: vi.Mock;
  put: vi.Mock;
  delete: vi.Mock;
};

describe('MES productionOrderApi', () => {
  const mockApiClient = apiClient.mes as MockClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /orders with params for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { orders: [], total: 0 } });
    await productionOrderApi.list({ page: 1, pagesize: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/orders?page=1&pagesize=10');
  });

  it('should call GET /orders without params when no params', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { orders: [], total: 0 } });
    await productionOrderApi.list();
    expect(mockApiClient.get).toHaveBeenCalledWith('/orders');
  });

  it('should call GET /orders/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await productionOrderApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/orders/1');
  });

  it('should call POST /orders for create', async () => {
    const data = { order_no: 'PO001', product_code: 'P001' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await productionOrderApi.create(data as never);
    expect(mockApiClient.post).toHaveBeenCalledWith('/orders', data);
  });

  it('should call PUT /orders/:id for update', async () => {
    const data = { status: 'released' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await productionOrderApi.update('1', data as never);
    expect(mockApiClient.put).toHaveBeenCalledWith('/orders/1', data);
  });

  it('should call DELETE /orders/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: '1' });
    await productionOrderApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/orders/1');
  });

  it('should call PUT /orders/:id/release for release', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1', status: 'pending' } });
    await productionOrderApi.release('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/orders/1/release');
  });

  it('should call PUT /orders/:id/start for start', async () => {
    mockApiClient.put.mockResolvedValue({
      success: true,
      data: { id: '1', status: 'in_progress' },
    });
    await productionOrderApi.start('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/orders/1/start');
  });

  it('should call PUT /orders/:id/complete for complete', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1', status: 'completed' } });
    await productionOrderApi.complete('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/orders/1/complete');
  });

  it('should call PUT /orders/:id/cancel for cancel', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1', status: 'cancelled' } });
    await productionOrderApi.cancel('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/orders/1/cancel');
  });
});

describe('MES workOrderApi', () => {
  const mockApiClient = apiClient.mes as MockClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /work-orders with params for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { work_orders: [], total: 0 } });
    await workOrderApi.list({ page: 1, pagesize: 20, status: 'pending' });
    expect(mockApiClient.get).toHaveBeenCalledWith(
      '/work-orders?page=1&pagesize=20&status=pending'
    );
  });

  it('should call POST /work-orders for create', async () => {
    const data = { work_order_no: 'WO001', product_code: 'P001', planned_quantity: 100 };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await workOrderApi.create(data as never);
    expect(mockApiClient.post).toHaveBeenCalledWith('/work-orders', data);
  });

  it('should call PUT /work-orders/:id for update', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1' } });
    await workOrderApi.update('1', { remark: 'test' } as never);
    expect(mockApiClient.put).toHaveBeenCalledWith('/work-orders/1', { remark: 'test' });
  });

  it('should call PUT /work-orders/:id/start for start', async () => {
    mockApiClient.put.mockResolvedValue({
      success: true,
      data: { id: '1', status: 'in_progress' },
    });
    await workOrderApi.start('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/work-orders/1/start');
  });

  it('should call PUT /work-orders/:id/pause for pause', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1', status: 'paused' } });
    await workOrderApi.pause('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/work-orders/1/pause');
  });

  it('should call PUT /work-orders/:id/resume for resume', async () => {
    mockApiClient.put.mockResolvedValue({
      success: true,
      data: { id: '1', status: 'in_progress' },
    });
    await workOrderApi.resume('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/work-orders/1/resume');
  });

  it('should call PUT /work-orders/:id/complete for complete', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1', status: 'completed' } });
    await workOrderApi.complete('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/work-orders/1/complete');
  });

  it('should call PUT /work-orders/:id/cancel for cancel', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1', status: 'cancelled' } });
    await workOrderApi.cancel('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/work-orders/1/cancel');
  });
});

describe('MES equipmentApi', () => {
  const mockApiClient = apiClient.mes as MockClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /equipment with params for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { equipments: [], total: 0 } });
    await equipmentApi.list({ page: 1, pagesize: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/equipment?page=1&pagesize=10');
  });

  it('should call GET /equipment/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: 'eq1' } });
    await equipmentApi.get('eq1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/equipment/eq1');
  });

  it('should call POST /equipment for create', async () => {
    const data = { code: 'EQ001', name: 'CNC Machine' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await equipmentApi.create(data as never);
    expect(mockApiClient.post).toHaveBeenCalledWith('/equipment', data);
  });

  it('should call PUT /equipment/:id for update', async () => {
    const data = { status: 'active' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await equipmentApi.update('eq1', data as never);
    expect(mockApiClient.put).toHaveBeenCalledWith('/equipment/eq1', { status: 'active' });
  });

  it('should call GET /equipment/statistics for stats', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { total: 0 } });
    await equipmentApi.getStatistics();
    expect(mockApiClient.get).toHaveBeenCalledWith('/equipment/statistics');
  });
});

describe('MES workStationApi', () => {
  const mockApiClient = apiClient.mes as MockClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /workstations for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { workstations: [], total: 0 } });
    await workStationApi.list({ page: 1, pagesize: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/workstations?page=1&pagesize=10');
  });

  it('should call GET /workstations/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: 'ws1' } });
    await workStationApi.get('ws1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/workstations/ws1');
  });

  it('should call POST /workstations for create', async () => {
    const data = { code: 'WS001', name: 'St A' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await workStationApi.create(data as never);
    expect(mockApiClient.post).toHaveBeenCalledWith('/workstations', data);
  });

  it('should call PUT /workstations/:id/activate for activate', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: 'ws1', status: 'active' } });
    await workStationApi.activate('ws1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/workstations/ws1/activate');
  });

  it('should call PUT /workstations/:id/deactivate for deactivate', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: 'ws1', status: 'inactive' } });
    await workStationApi.deactivate('ws1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/workstations/ws1/deactivate');
  });
});

describe('MES processRouteApi', () => {
  const mockApiClient = apiClient.mes as MockClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /process-routes for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { process_routes: [], total: 0 } });
    await processRouteApi.list({ page: 1, pagesize: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/process-routes?page=1&pagesize=10');
  });

  it('should call POST /process-routes for create', async () => {
    const data = { code: 'PR001', name: 'Default Route' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await processRouteApi.create(data as never);
    expect(mockApiClient.post).toHaveBeenCalledWith('/process-routes', data);
  });
});

describe('MES mesEquipmentApi (equipment inspections & maintenances)', () => {
  const mockApiClient = apiClient.mes as MockClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /inspections with equipment_id filter', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await mesEquipmentApi.listInspections({ page: 1, pagesize: 10, equipment_id: 'eq1' });
    expect(mockApiClient.get).toHaveBeenCalledWith(
      '/inspections?page=1&pagesize=10&equipment_id=eq1'
    );
  });

  it('should call POST /inspections for create', async () => {
    const data = { equipment_id: 'eq1', inspection_type: 'daily' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await mesEquipmentApi.createInspection(data as never);
    expect(mockApiClient.post).toHaveBeenCalledWith('/inspections', data);
  });
});

describe('MES dashboard.health', () => {
  const mockApiClient = apiClient.mes as MockClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /health', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: 'ok' });
    const result = await mesApi.health();
    expect(mockApiClient.get).toHaveBeenCalledWith('/health');
    expect(result.success).toBe(true);
  });
});
