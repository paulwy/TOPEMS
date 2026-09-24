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
} from '../index';
import apiClient from '../../client';

vi.mock('../../client', () => ({
  default: {
    mes: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('MES productionOrderApi', () => {
  const mockApiClient = apiClient.mes as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /orders with params for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { orders: [], total: 0 } });
    await productionOrderApi.list({ page: 1, page_size: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/orders?page=1&page_size=10');
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
    const data = { orderNo: 'PO001', product_code: 'P001' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await productionOrderApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/orders', data);
  });

  it('should call PUT /orders/:id for update', async () => {
    const data = { status: 'released' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await productionOrderApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/orders/1', data);
  });

  it('should call DELETE /orders/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await productionOrderApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/orders/1');
  });

  it('should call PUT /orders/:id/release for release', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1' } });
    await productionOrderApi.release('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/orders/1/release');
  });

  it('should call PUT /orders/:id/start for start', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1' } });
    await productionOrderApi.start('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/orders/1/start');
  });

  it('should call PUT /orders/:id/complete for complete', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1' } });
    await productionOrderApi.complete('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/orders/1/complete');
  });

  it('should call PUT /orders/:id/cancel for cancel', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1' } });
    await productionOrderApi.cancel('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/orders/1/cancel');
  });

  it('should call POST /orders/from-erp for createFromErp', async () => {
    const data = { erp_order_ids: ['erp1'] };
    mockApiClient.post.mockResolvedValue({ success: true, data: [] });
    await productionOrderApi.createFromErp(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/orders/from-erp', data);
  });
});

describe('MES productionProcessApi', () => {
  const mockApiClient = apiClient.mes as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /processes with params for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { processes: [], total: 0 } });
    await productionProcessApi.list({ page: 1, page_size: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/processes?page=1&page_size=10');
  });

  it('should call GET /processes/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await productionProcessApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/processes/1');
  });

  it('should call POST /processes for create', async () => {
    const data = { code: 'PR001', name: 'Process1' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await productionProcessApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/processes', data);
  });

  it('should call PUT /processes/:id for update', async () => {
    const data = { name: 'Updated' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await productionProcessApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/processes/1', data);
  });

  it('should call DELETE /processes/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await productionProcessApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/processes/1');
  });

  it('should call PUT /processes/:id/deactivate for deactivate', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1' } });
    await productionProcessApi.deactivate('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/processes/1/deactivate');
  });
});

describe('MES workStationApi', () => {
  const mockApiClient = apiClient.mes as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /workstations with params for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { workstations: [], total: 0 } });
    await workStationApi.list({ page: 1, page_size: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/workstations?page=1&page_size=10');
  });

  it('should call GET /workstations/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await workStationApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/workstations/1');
  });

  it('should call POST /workstations for create', async () => {
    const data = { code: 'WS001', name: 'WorkStation1' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await workStationApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/workstations', data);
  });

  it('should call PUT /workstations/:id for update', async () => {
    const data = { name: 'Updated' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await workStationApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/workstations/1', data);
  });

  it('should call DELETE /workstations/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await workStationApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/workstations/1');
  });

  it('should call PUT /workstations/:id/activate for activate', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1' } });
    await workStationApi.activate('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/workstations/1/activate');
  });

  it('should call PUT /workstations/:id/deactivate for deactivate', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1' } });
    await workStationApi.deactivate('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/workstations/1/deactivate');
  });
});

describe('MES productionRecordApi', () => {
  const mockApiClient = apiClient.mes as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /records with params for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { records: [], total: 0 } });
    await productionRecordApi.list({ page: 1, page_size: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/records?page=1&page_size=10');
  });

  it('should call GET /records/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await productionRecordApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/records/1');
  });

  it('should call POST /records for create', async () => {
    const data = { order_id: '1', workstation_id: 'ws1' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await productionRecordApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/records', data);
  });

  it('should call PUT /records/:id for update', async () => {
    const data = { quantity: 100 };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await productionRecordApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/records/1', data);
  });

  it('should call DELETE /records/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await productionRecordApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/records/1');
  });

  it('should call PUT /records/:id/complete for complete', async () => {
    const data = { actual_quantity: 100 };
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1' } });
    await productionRecordApi.complete('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/records/1/complete', data);
  });
});

describe('MES equipmentApi', () => {
  const mockApiClient = apiClient.mes as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /equipment with params for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { equipments: [], total: 0 } });
    await equipmentApi.list({ page: 1, page_size: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/equipment?page=1&page_size=10');
  });

  it('should call GET /equipment/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await equipmentApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/equipment/1');
  });

  it('should call POST /equipment for create', async () => {
    const data = { code: 'EQ001', name: 'Equipment1' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await equipmentApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/equipment', data);
  });

  it('should call PUT /equipment/:id for update', async () => {
    const data = { name: 'Updated' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await equipmentApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/equipment/1', data);
  });

  it('should call DELETE /equipment/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await equipmentApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/equipment/1');
  });

  it('should call POST /equipment/:id/maintenance for maintenance', async () => {
    const data = { maintenance_type: 'routine' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await equipmentApi.maintenance('1', data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/equipment/1/maintenance', data);
  });

  it('should call GET /equipment/statistics for getStatistics', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: {} });
    await equipmentApi.getStatistics();
    expect(mockApiClient.get).toHaveBeenCalledWith('/equipment/statistics');
  });
});

describe('MES mesEquipmentApi', () => {
  const mockApiClient = apiClient.mes as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /equipment/statistics for getStatistics', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: {} });
    await mesEquipmentApi.getStatistics();
    expect(mockApiClient.get).toHaveBeenCalledWith('/equipment/statistics');
  });

  it('should call GET /inspections with params for listInspections', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await mesEquipmentApi.listInspections({ page: 1, page_size: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/inspections?page=1&page_size=10');
  });

  it('should call POST /inspections for createInspection', async () => {
    const data = { equipment_id: 'eq1', inspection_type: 'daily' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await mesEquipmentApi.createInspection(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/inspections', data);
  });

  it('should call GET /maintenances with params for listMaintenances', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
    await mesEquipmentApi.listMaintenances({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/maintenances?page=1');
  });

  it('should call POST /maintenances for createMaintenance', async () => {
    const data = { equipment_id: 'eq1', maintenance_type: 'repair' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await mesEquipmentApi.createMaintenance(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/maintenances', data);
  });

  it('should call PUT /maintenances/:id/status for updateMaintenanceStatus', async () => {
    const data = { status: 'completed' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await mesEquipmentApi.updateMaintenanceStatus('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/maintenances/1/status', data);
  });
});

describe('MES equipmentOeeApi', () => {
  const mockApiClient = apiClient.mes as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /equipment-oee with params for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { records: [], total: 0 } });
    await equipmentOeeApi.list({ page: 1, page_size: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/equipment-oee?page=1&page_size=10');
  });

  it('should call GET /equipment-oee/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await equipmentOeeApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/equipment-oee/1');
  });

  it('should call POST /equipment-oee for create', async () => {
    const data = { equipment_id: 'eq1', oee: 85 };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await equipmentOeeApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/equipment-oee', data);
  });

  it('should call PUT /equipment-oee/:id for update', async () => {
    const data = { oee: 90 };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await equipmentOeeApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/equipment-oee/1', data);
  });

  it('should call DELETE /equipment-oee/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await equipmentOeeApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/equipment-oee/1');
  });

  it('should call GET /equipment-oee/statistics for getStatistics', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: {} });
    await equipmentOeeApi.getStatistics();
    expect(mockApiClient.get).toHaveBeenCalledWith('/equipment-oee/statistics');
  });

  it('should call GET /equipment-oee/:id/efficiency for getEquipmentEfficiencyAnalysis', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: {} });
    await equipmentOeeApi.getEquipmentEfficiencyAnalysis('eq1', { period: 'month' });
    expect(mockApiClient.get).toHaveBeenCalledWith('/equipment-oee/eq1/efficiency?period=month');
  });
});

describe('MES productionScheduleApi', () => {
  const mockApiClient = apiClient.mes as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /schedules with params for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { schedules: [], total: 0 } });
    await productionScheduleApi.list({ page: 1, page_size: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/schedules?page=1&page_size=10');
  });

  it('should call GET /schedules/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await productionScheduleApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/schedules/1');
  });

  it('should call POST /schedules for create', async () => {
    const data = { order_id: '1', start_date: '2024-01-01' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await productionScheduleApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/schedules', data);
  });

  it('should call PUT /schedules/:id for update', async () => {
    const data = { start_date: '2024-01-02' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await productionScheduleApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/schedules/1', data);
  });

  it('should call DELETE /schedules/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await productionScheduleApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/schedules/1');
  });

  it('should call PUT /schedules/:id/adjust for adjust', async () => {
    const data = { adjustment_days: 1 };
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1' } });
    await productionScheduleApi.adjust('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/schedules/1/adjust', data);
  });

  it('should call GET /schedules/gantt for getGanttData', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: {} });
    await productionScheduleApi.getGanttData({ start_date: '2024-01-01' });
    expect(mockApiClient.get).toHaveBeenCalledWith('/schedules/gantt?start_date=2024-01-01');
  });
});

describe('MES materialBomApi', () => {
  const mockApiClient = apiClient.mes as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /boms with params for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { boms: [], total: 0 } });
    await materialBomApi.list({ page: 1, page_size: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/boms?page=1&page_size=10');
  });

  it('should call GET /boms/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await materialBomApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/boms/1');
  });

  it('should call POST /boms for create', async () => {
    const data = { product_code: 'P001', version: '1.0' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await materialBomApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/boms', data);
  });

  it('should call PUT /boms/:id for update', async () => {
    const data = { version: '2.0' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await materialBomApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/boms/1', data);
  });

  it('should call DELETE /boms/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await materialBomApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/boms/1');
  });
});

describe('MES materialIssueApi', () => {
  const mockApiClient = apiClient.mes as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /material-issues with params for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { issues: [], total: 0 } });
    await materialIssueApi.list({ page: 1, page_size: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/material-issues?page=1&page_size=10');
  });

  it('should call POST /material-issues for create', async () => {
    const data = { order_id: '1', material_id: 'mat1', quantity: 10 };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await materialIssueApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/material-issues', data);
  });
});

describe('MES materialReturnApi', () => {
  const mockApiClient = apiClient.mes as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /material-returns with params for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { returns: [], total: 0 } });
    await materialReturnApi.list({ page: 1, page_size: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/material-returns?page=1&page_size=10');
  });

  it('should call POST /material-returns for create', async () => {
    const data = { issue_id: '1', material_id: 'mat1', quantity: 5 };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await materialReturnApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/material-returns', data);
  });
});

describe('MES traceabilityApi', () => {
  const mockApiClient = apiClient.mes as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /traceability/forward/:orderId for forwardTraceability', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: {} });
    await traceabilityApi.forwardTraceability('order1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/traceability/forward/order1');
  });

  it('should call GET /traceability/backward/:batchNo for backwardTraceability', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: {} });
    await traceabilityApi.backwardTraceability('batch1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/traceability/backward/batch1');
  });

  it('should call GET /traceability/chain for getTraceChain', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: {} });
    await traceabilityApi.getTraceChain({ type: 'forward', identifier: 'order1' });
    expect(mockApiClient.get).toHaveBeenCalledWith(
      '/traceability/chain?type=forward&identifier=order1'
    );
  });

  it('should call GET /traceability/quality-records for listQualityRecords', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { records: [], total: 0 } });
    await traceabilityApi.listQualityRecords({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/traceability/quality-records?page=1');
  });
});

describe('MES wipApi', () => {
  const mockApiClient = apiClient.mes as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /wips with params for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { wips: [], total: 0 } });
    await wipApi.list({ page: 1, page_size: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/wips?page=1&page_size=10');
  });

  it('should call GET /wips/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await wipApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/wips/1');
  });

  it('should call POST /wips for create', async () => {
    const data = { order_id: '1', material_id: 'mat1', quantity: 100 };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await wipApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/wips', data);
  });

  it('should call PUT /wips/:id for update', async () => {
    const data = { quantity: 90 };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await wipApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/wips/1', data);
  });

  it('should call DELETE /wips/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await wipApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/wips/1');
  });

  it('should call POST /wips/transfer for transfer', async () => {
    const data = { wip_id: '1', target_workstation: 'ws2' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await wipApi.transfer(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/wips/transfer', data);
  });

  it('should call GET /wips/statistics for getStatistics', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: {} });
    await wipApi.getStatistics();
    expect(mockApiClient.get).toHaveBeenCalledWith('/wips/statistics');
  });
});

describe('MES processRouteApi', () => {
  const mockApiClient = apiClient.mes as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /process-routes with params for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { routes: [], total: 0 } });
    await processRouteApi.list({ page: 1, page_size: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/process-routes?page=1&page_size=10');
  });

  it('should call GET /process-routes/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await processRouteApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/process-routes/1');
  });

  it('should call POST /process-routes for create', async () => {
    const data = { code: 'PR001', name: 'Route1' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await processRouteApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/process-routes', data);
  });

  it('should call PUT /process-routes/:id for update', async () => {
    const data = { name: 'Updated' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await processRouteApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/process-routes/1', data);
  });

  it('should call DELETE /process-routes/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await processRouteApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/process-routes/1');
  });

  it('should call GET /process-routes/:id/steps for getSteps', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { steps: [] } });
    await processRouteApi.getSteps('route1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/process-routes/route1/steps');
  });

  it('should call POST /process-routes/:id/steps for addStep', async () => {
    const data = { process_id: 'proc1', sequence: 1 };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await processRouteApi.addStep('route1', data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/process-routes/route1/steps', data);
  });

  it('should call DELETE /process-routes/:id/steps/:stepId for removeStep', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await processRouteApi.removeStep('route1', 'step1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/process-routes/route1/steps/step1');
  });
});

describe('MES processFlowApi', () => {
  const mockApiClient = apiClient.mes as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /process-flows with params for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { flows: [], total: 0 } });
    await processFlowApi.list({ page: 1, page_size: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/process-flows?page=1&page_size=10');
  });

  it('should call GET /process-flows/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await processFlowApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/process-flows/1');
  });

  it('should call POST /process-flows for create', async () => {
    const data = { code: 'PF001', name: 'Flow1' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await processFlowApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/process-flows', data);
  });

  it('should call PUT /process-flows/:id for update', async () => {
    const data = { name: 'Updated' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await processFlowApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/process-flows/1', data);
  });

  it('should call DELETE /process-flows/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await processFlowApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/process-flows/1');
  });

  it('should call GET /process-flows/:id/capacity for analyzeCapacity', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: {} });
    await processFlowApi.analyzeCapacity('flow1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/process-flows/flow1/capacity');
  });
});

describe('MES qualityApi', () => {
  const mockApiClient = apiClient.mes as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /quality/inspections with params for listInspections', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { inspections: [], total: 0 } });
    await qualityApi.listInspections({ page: 1, page_size: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/quality/inspections?page=1&page_size=10');
  });

  it('should call GET /quality/inspections/:id for getInspection', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await qualityApi.getInspection('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/quality/inspections/1');
  });

  it('should call POST /quality/inspections for createInspection', async () => {
    const data = { product_code: 'P001', inspection_type: 'incoming' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await qualityApi.createInspection(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/quality/inspections', data);
  });

  it('should call PUT /quality/inspections/:id for updateInspection', async () => {
    const data = { qualified_quantity: 100 };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await qualityApi.updateInspection('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/quality/inspections/1', data);
  });

  it('should call DELETE /quality/inspections/:id for deleteInspection', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await qualityApi.deleteInspection('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/quality/inspections/1');
  });

  it('should call GET /quality/patrols with params for listPatrolInspections', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { patrols: [], total: 0 } });
    await qualityApi.listPatrolInspections({ page: 1 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/quality/patrols?page=1');
  });

  it('should call POST /quality/patrols for createPatrolInspection', async () => {
    const data = { inspector: 'user1' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await qualityApi.createPatrolInspection(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/quality/patrols', data);
  });

  it('should call GET /quality/patrols/:id/items for getPatrolItems', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { items: [] } });
    await qualityApi.getPatrolItems('patrol1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/quality/patrols/patrol1/items');
  });

  it('should call GET /quality/standards for listStandards', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { standards: [], total: 0 } });
    await qualityApi.listStandards();
    expect(mockApiClient.get).toHaveBeenCalledWith('/quality/standards');
  });

  it('should call POST /quality/standards for createStandard', async () => {
    const data = { code: 'QS001', name: 'Standard1', inspection_type: 'incoming' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await qualityApi.createStandard(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/quality/standards', data);
  });
});

describe('MES workReportApi', () => {
  const mockApiClient = apiClient.mes as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /work-reports with params for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { reports: [], total: 0 } });
    await workReportApi.list({ page: 1, page_size: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/work-reports?page=1&page_size=10');
  });

  it('should call GET /work-reports/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await workReportApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/work-reports/1');
  });

  it('should call POST /work-reports for create', async () => {
    const data = { workstation_id: 'ws1', date: '2024-01-01' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await workReportApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/work-reports', data);
  });

  it('should call PUT /work-reports/:id for update', async () => {
    const data = { output: 100 };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await workReportApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/work-reports/1', data);
  });

  it('should call DELETE /work-reports/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await workReportApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/work-reports/1');
  });

  it('should call PUT /work-reports/:id/approve for approve', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1' } });
    await workReportApi.approve('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/work-reports/1/approve');
  });

  it('should call PUT /work-reports/:id/reject for reject', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1' } });
    await workReportApi.reject('1', 'Rejected');
    expect(mockApiClient.put).toHaveBeenCalledWith('/work-reports/1/reject', {
      remark: 'Rejected',
    });
  });
});

describe('MES workOrderApi', () => {
  const mockApiClient = apiClient.mes as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /work-orders with params for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { work_orders: [], total: 0 } });
    await workOrderApi.list({ page: 1, page_size: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/work-orders?page=1&page_size=10');
  });

  it('should call GET /work-orders/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await workOrderApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/work-orders/1');
  });

  it('should call POST /work-orders for create', async () => {
    const data = { order_id: '1', workstation_id: 'ws1' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await workOrderApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/work-orders', data);
  });

  it('should call PUT /work-orders/:id for update', async () => {
    const data = { status: 'in_progress' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await workOrderApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/work-orders/1', data);
  });

  it('should call DELETE /work-orders/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await workOrderApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/work-orders/1');
  });

  it('should call PUT /work-orders/:id/start for start', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1' } });
    await workOrderApi.start('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/work-orders/1/start');
  });

  it('should call PUT /work-orders/:id/complete for complete', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1' } });
    await workOrderApi.complete('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/work-orders/1/complete');
  });

  it('should call PUT /work-orders/:id/pause for pause', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1' } });
    await workOrderApi.pause('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/work-orders/1/pause');
  });

  it('should call PUT /work-orders/:id/resume for resume', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1' } });
    await workOrderApi.resume('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/work-orders/1/resume');
  });
});

describe('MES teamApi', () => {
  const mockApiClient = apiClient.mes as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /teams with params for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { teams: [], total: 0 } });
    await teamApi.list({ page: 1, page_size: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/teams?page=1&page_size=10');
  });

  it('should call GET /teams/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await teamApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/teams/1');
  });

  it('should call POST /teams for create', async () => {
    const data = { name: 'Team1', code: 'TM001' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await teamApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/teams', data);
  });

  it('should call PUT /teams/:id for update', async () => {
    const data = { name: 'Updated' };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await teamApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/teams/1', data);
  });

  it('should call DELETE /teams/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await teamApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/teams/1');
  });

  it('should call GET /teams/:id/members for getMembers', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { members: [] } });
    await teamApi.getMembers('team1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/teams/team1/members');
  });

  it('should call POST /teams/:id/members for addMember', async () => {
    const data = { employee_id: 'emp1', employee_name: 'Employee1' };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await teamApi.addMember('team1', data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/teams/team1/members', data);
  });

  it('should call DELETE /teams/:id/members/:memberId for removeMember', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await teamApi.removeMember('team1', 'member1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/teams/team1/members/member1');
  });
});

describe('MES materialRequirementApi', () => {
  const mockApiClient = apiClient.mes as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /material-requirements with params for list', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { requirements: [], total: 0 } });
    await materialRequirementApi.list({ page: 1, page_size: 10 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/material-requirements?page=1&page_size=10');
  });

  it('should call GET /material-requirements/:id for get', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { id: '1' } });
    await materialRequirementApi.get('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/material-requirements/1');
  });

  it('should call POST /material-requirements for create', async () => {
    const data = { order_id: '1', material_id: 'mat1', quantity: 10 };
    mockApiClient.post.mockResolvedValue({ success: true, data });
    await materialRequirementApi.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/material-requirements', data);
  });

  it('should call PUT /material-requirements/:id for update', async () => {
    const data = { quantity: 20 };
    mockApiClient.put.mockResolvedValue({ success: true, data });
    await materialRequirementApi.update('1', data);
    expect(mockApiClient.put).toHaveBeenCalledWith('/material-requirements/1', data);
  });

  it('should call DELETE /material-requirements/:id for delete', async () => {
    mockApiClient.delete.mockResolvedValue({ success: true, data: undefined });
    await materialRequirementApi.delete('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/material-requirements/1');
  });

  it('should call POST /material-requirements/calculate for calculate', async () => {
    mockApiClient.post.mockResolvedValue({ success: true, data: [] });
    await materialRequirementApi.calculate('order1');
    expect(mockApiClient.post).toHaveBeenCalledWith('/material-requirements/calculate', {
      order_id: 'order1',
    });
  });

  it('should call PUT /material-requirements/:id/confirm for confirm', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1' } });
    await materialRequirementApi.confirm('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/material-requirements/1/confirm');
  });

  it('should call PUT /material-requirements/:id/release for release', async () => {
    mockApiClient.put.mockResolvedValue({ success: true, data: { id: '1' } });
    await materialRequirementApi.release('1');
    expect(mockApiClient.put).toHaveBeenCalledWith('/material-requirements/1/release');
  });
});

describe('MES productionKanbanApi', () => {
  const mockApiClient = apiClient.mes as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /kanban/dashboard for getDashboard', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: {} });
    await productionKanbanApi.getDashboard();
    expect(mockApiClient.get).toHaveBeenCalledWith('/kanban/dashboard');
  });

  it('should call GET /kanban/order-progress for getOrderProgress', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: [] });
    await productionKanbanApi.getOrderProgress({ date: '2024-01-01' });
    expect(mockApiClient.get).toHaveBeenCalledWith('/kanban/order-progress?date=2024-01-01');
  });

  it('should call GET /kanban/workstation-status for getWorkstationStatus', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: [] });
    await productionKanbanApi.getWorkstationStatus();
    expect(mockApiClient.get).toHaveBeenCalledWith('/kanban/workstation-status');
  });

  it('should call GET /kanban/quality-trend for getQualityTrend', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: [] });
    await productionKanbanApi.getQualityTrend({ days: 7 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/kanban/quality-trend?days=7');
  });

  it('should call GET /kanban/equipment-status for getEquipmentStatus', async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: [] });
    await productionKanbanApi.getEquipmentStatus();
    expect(mockApiClient.get).toHaveBeenCalledWith('/kanban/equipment-status');
  });
});

describe('MES mesApi', () => {
  const mockApiClient = apiClient.mes as {
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
    await mesApi.health();
    expect(mockApiClient.get).toHaveBeenCalledWith('/health');
  });
});
