import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../client', () => {
  const mockWmsClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    apiClient: { wms: mockWmsClient },
    default: { wms: mockWmsClient },
  };
});

describe('WMS Module API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('warehouseApi', () => {
    it('list should call GET /warehouses with params', async () => {
      const { warehouseApi } = await import('../wms/warehouse');
      await warehouseApi.list({ page: 1, page_size: 10 });
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/warehouses', {
        params: { page: 1, page_size: 10 },
      });
    });

    it('get should call GET /warehouses/:id', async () => {
      const { warehouseApi } = await import('../wms/warehouse');
      await warehouseApi.get('wh-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/warehouses/wh-001');
    });

    it('create should call POST /warehouses with data', async () => {
      const { warehouseApi } = await import('../wms/warehouse');
      const data = { name: 'Warehouse A', code: 'WH-A' };
      await warehouseApi.create(data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/warehouses', data);
    });

    it('update should call PUT /warehouses/:id with data', async () => {
      const { warehouseApi } = await import('../wms/warehouse');
      const data = { name: 'Updated Warehouse' };
      await warehouseApi.update('wh-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.put).toHaveBeenCalledWith('/warehouses/wh-001', data);
    });

    it('delete should call DELETE /warehouses/:id', async () => {
      const { warehouseApi } = await import('../wms/warehouse');
      await warehouseApi.delete('wh-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.delete).toHaveBeenCalledWith('/warehouses/wh-001');
    });
  });

  describe('locationApi', () => {
    it('list should call GET /locations with params', async () => {
      const { locationApi } = await import('../wms/location');
      await locationApi.list({ page: 1, page_size: 10 });
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/locations', {
        params: { page: 1, page_size: 10 },
      });
    });

    it('get should call GET /locations/:id', async () => {
      const { locationApi } = await import('../wms/location');
      await locationApi.get('loc-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/locations/loc-001');
    });

    it('create should call POST /locations with data', async () => {
      const { locationApi } = await import('../wms/location');
      const data = { warehouse_id: 'wh-001', code: 'LOC-A', name: 'Location A' };
      await locationApi.create(data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/locations', data);
    });

    it('update should call PUT /locations/:id with data', async () => {
      const { locationApi } = await import('../wms/location');
      const data = { name: 'Updated Location' };
      await locationApi.update('loc-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.put).toHaveBeenCalledWith('/locations/loc-001', data);
    });

    it('delete should call DELETE /locations/:id', async () => {
      const { locationApi } = await import('../wms/location');
      await locationApi.delete('loc-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.delete).toHaveBeenCalledWith('/locations/loc-001');
    });

    it('getStatus should call GET /locations/status with params', async () => {
      const { locationApi } = await import('../wms/location');
      await locationApi.getStatus('wh-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/locations/status', {
        params: { warehouse_id: 'wh-001' },
      });
    });
  });

  describe('inventoryApi', () => {
    it('list should call GET /inventory with params', async () => {
      const { inventoryApi } = await import('../wms/inventory');
      await inventoryApi.list({ page: 1, page_size: 10 });
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/inventory', {
        params: { page: 1, page_size: 10 },
      });
    });

    it('get should call GET /inventory/:id', async () => {
      const { inventoryApi } = await import('../wms/inventory');
      await inventoryApi.get('inv-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/inventory/inv-001');
    });

    it('create should call POST /inventory with data', async () => {
      const { inventoryApi } = await import('../wms/inventory');
      const data = { sku: 'SKU-001', quantity: 100, warehouse_id: 'wh-001' };
      await inventoryApi.create(data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/inventory', data);
    });

    it('update should call PUT /inventory/:id with data', async () => {
      const { inventoryApi } = await import('../wms/inventory');
      const data = { quantity: 200 };
      await inventoryApi.update('inv-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.put).toHaveBeenCalledWith('/inventory/inv-001', data);
    });

    it('delete should call DELETE /inventory/:id', async () => {
      const { inventoryApi } = await import('../wms/inventory');
      await inventoryApi.delete('inv-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.delete).toHaveBeenCalledWith('/inventory/inv-001');
    });

    it('listLowStock should call GET /inventory/low-stock', async () => {
      const { inventoryApi } = await import('../wms/inventory');
      await inventoryApi.listLowStock();
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/inventory/low-stock');
    });

    it('listByWarehouse should call GET /inventory/warehouse/:warehouse_id', async () => {
      const { inventoryApi } = await import('../wms/inventory');
      await inventoryApi.listByWarehouse('wh-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/inventory/warehouse/wh-001');
    });
  });

  describe('inventoryAlertsApi', () => {
    it('listRules should call GET /inventory-alerts/rules with params', async () => {
      const { inventoryAlertsApi } = await import('../wms/inventory');
      await inventoryAlertsApi.listRules({ page: 1, page_size: 10 });
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/inventory-alerts/rules', {
        params: { page: 1, page_size: 10 },
      });
    });

    it('getRule should call GET /inventory-alerts/rules/:id', async () => {
      const { inventoryAlertsApi } = await import('../wms/inventory');
      await inventoryAlertsApi.getRule('rule-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/inventory-alerts/rules/rule-001');
    });

    it('createRule should call POST /inventory-alerts/rules with data', async () => {
      const { inventoryAlertsApi } = await import('../wms/inventory');
      const data = { name: 'Low Stock Alert', threshold: 10 };
      await inventoryAlertsApi.createRule(data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/inventory-alerts/rules', data);
    });

    it('updateRule should call PUT /inventory-alerts/rules/:id with data', async () => {
      const { inventoryAlertsApi } = await import('../wms/inventory');
      const data = { threshold: 20 };
      await inventoryAlertsApi.updateRule('rule-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.put).toHaveBeenCalledWith('/inventory-alerts/rules/rule-001', data);
    });

    it('deleteRule should call DELETE /inventory-alerts/rules/:id', async () => {
      const { inventoryAlertsApi } = await import('../wms/inventory');
      await inventoryAlertsApi.deleteRule('rule-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.delete).toHaveBeenCalledWith('/inventory-alerts/rules/rule-001');
    });

    it('listRecords should call GET /inventory-alerts/records with params', async () => {
      const { inventoryAlertsApi } = await import('../wms/inventory');
      await inventoryAlertsApi.listRecords({ page: 1, page_size: 10 });
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/inventory-alerts/records', {
        params: { page: 1, page_size: 10 },
      });
    });

    it('getRecord should call GET /inventory-alerts/records/:id', async () => {
      const { inventoryAlertsApi } = await import('../wms/inventory');
      await inventoryAlertsApi.getRecord('rec-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/inventory-alerts/records/rec-001');
    });

    it('confirm should call POST /inventory-alerts/records/:id/confirm with data', async () => {
      const { inventoryAlertsApi } = await import('../wms/inventory');
      const data = { notes: 'Confirmed' };
      await inventoryAlertsApi.confirm('rec-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith(
        '/inventory-alerts/records/rec-001/confirm',
        data
      );
    });

    it('getStatistics should call GET /inventory-alerts/statistics with params', async () => {
      const { inventoryAlertsApi } = await import('../wms/inventory');
      await inventoryAlertsApi.getStatistics({ warehouse_id: 'wh-001' });
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/inventory-alerts/statistics', {
        params: { warehouse_id: 'wh-001' },
      });
    });
  });

  describe('inventoryStatsApi', () => {
    it('getStatistics should call GET /inventory/statistics with params', async () => {
      const { inventoryStatsApi } = await import('../wms/inventory');
      await inventoryStatsApi.getStatistics({ warehouse_id: 'wh-001' });
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/inventory/statistics', {
        params: { warehouse_id: 'wh-001' },
      });
    });

    it('getABCAnalysis should call GET /inventory/abc-analysis with params', async () => {
      const { inventoryStatsApi } = await import('../wms/inventory');
      await inventoryStatsApi.getABCAnalysis({ a_threshold: 80, b_threshold: 90 });
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/inventory/abc-analysis', {
        params: { a_threshold: 80, b_threshold: 90 },
      });
    });

    it('getTurnover should call GET /inventory/turnover with params', async () => {
      const { inventoryStatsApi } = await import('../wms/inventory');
      await inventoryStatsApi.getTurnover({ period_type: 'monthly', periods: 6 });
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/inventory/turnover', {
        params: { period_type: 'monthly', periods: 6 },
      });
    });

    it('getValueByWarehouse should call GET /inventory/value-by-warehouse with params', async () => {
      const { inventoryStatsApi } = await import('../wms/inventory');
      await inventoryStatsApi.getValueByWarehouse({ category_id: 'cat-001' });
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/inventory/value-by-warehouse', {
        params: { category_id: 'cat-001' },
      });
    });
  });

  describe('inboundOrderApi', () => {
    it('list should call GET /inbound-orders with params', async () => {
      const { inboundOrderApi } = await import('../wms/inbound');
      await inboundOrderApi.list({ page: 1, page_size: 10 });
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/inbound-orders', {
        params: { page: 1, page_size: 10 },
      });
    });

    it('get should call GET /inbound-orders/:id', async () => {
      const { inboundOrderApi } = await import('../wms/inbound');
      await inboundOrderApi.get('in-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/inbound-orders/in-001');
    });

    it('create should call POST /inbound-orders with data', async () => {
      const { inboundOrderApi } = await import('../wms/inbound');
      const data = { warehouse_id: 'wh-001', items: [] };
      await inboundOrderApi.create(data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/inbound-orders', data);
    });

    it('update should call PUT /inbound-orders/:id with data', async () => {
      const { inboundOrderApi } = await import('../wms/inbound');
      const data = { status: 'confirmed' };
      await inboundOrderApi.update('in-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.put).toHaveBeenCalledWith('/inbound-orders/in-001', data);
    });

    it('delete should call DELETE /inbound-orders/:id', async () => {
      const { inboundOrderApi } = await import('../wms/inbound');
      await inboundOrderApi.delete('in-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.delete).toHaveBeenCalledWith('/inbound-orders/in-001');
    });

    it('confirm should call POST /inbound-orders/:id/confirm', async () => {
      const { inboundOrderApi } = await import('../wms/inbound');
      await inboundOrderApi.confirm('in-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/inbound-orders/in-001/confirm');
    });

    it('receive should call POST /inbound-orders/:id/receive with data', async () => {
      const { inboundOrderApi } = await import('../wms/inbound');
      const data = { items: [{ sku: 'SKU-001', quantity: 50 }] };
      await inboundOrderApi.receive('in-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/inbound-orders/in-001/receive', data);
    });

    it('complete should call POST /inbound-orders/:id/complete', async () => {
      const { inboundOrderApi } = await import('../wms/inbound');
      await inboundOrderApi.complete('in-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/inbound-orders/in-001/complete');
    });

    it('listItems should call GET /inbound-orders/:id/items', async () => {
      const { inboundOrderApi } = await import('../wms/inbound');
      await inboundOrderApi.listItems('in-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/inbound-orders/in-001/items');
    });

    it('createItem should call POST /inbound-orders/:id/items with data', async () => {
      const { inboundOrderApi } = await import('../wms/inbound');
      const data = { sku: 'SKU-001', quantity: 100 };
      await inboundOrderApi.createItem('in-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/inbound-orders/in-001/items', data);
    });
  });

  describe('outboundOrderApi', () => {
    it('list should call GET /outbound-orders with params', async () => {
      const { outboundOrderApi } = await import('../wms/outbound');
      await outboundOrderApi.list({ page: 1, page_size: 10 });
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/outbound-orders', {
        params: { page: 1, page_size: 10 },
      });
    });

    it('get should call GET /outbound-orders/:id', async () => {
      const { outboundOrderApi } = await import('../wms/outbound');
      await outboundOrderApi.get('out-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/outbound-orders/out-001');
    });

    it('create should call POST /outbound-orders with data', async () => {
      const { outboundOrderApi } = await import('../wms/outbound');
      const data = { warehouse_id: 'wh-001', items: [], customer_id: 'cust-001' };
      await outboundOrderApi.create(data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/outbound-orders', data);
    });

    it('update should call PUT /outbound-orders/:id with data', async () => {
      const { outboundOrderApi } = await import('../wms/outbound');
      const data = { status: 'picked' };
      await outboundOrderApi.update('out-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.put).toHaveBeenCalledWith('/outbound-orders/out-001', data);
    });

    it('delete should call DELETE /outbound-orders/:id', async () => {
      const { outboundOrderApi } = await import('../wms/outbound');
      await outboundOrderApi.delete('out-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.delete).toHaveBeenCalledWith('/outbound-orders/out-001');
    });

    it('pick should call POST /outbound-orders/:id/pick', async () => {
      const { outboundOrderApi } = await import('../wms/outbound');
      await outboundOrderApi.pick('out-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/outbound-orders/out-001/pick');
    });

    it('pack should call POST /outbound-orders/:id/pack', async () => {
      const { outboundOrderApi } = await import('../wms/outbound');
      await outboundOrderApi.pack('out-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/outbound-orders/out-001/pack');
    });

    it('ship should call POST /outbound-orders/:id/ship with data', async () => {
      const { outboundOrderApi } = await import('../wms/outbound');
      const data = [{ item_id: 'item-001', shipped_quantity: 50 }];
      await outboundOrderApi.ship('out-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/outbound-orders/out-001/ship', data);
    });

    it('complete should call POST /outbound-orders/:id/complete', async () => {
      const { outboundOrderApi } = await import('../wms/outbound');
      await outboundOrderApi.complete('out-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/outbound-orders/out-001/complete');
    });

    it('listItems should call GET /outbound-orders/:id/items', async () => {
      const { outboundOrderApi } = await import('../wms/outbound');
      await outboundOrderApi.listItems('out-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/outbound-orders/out-001/items');
    });
  });

  describe('stockTakeApi', () => {
    it('list should call GET /stock-takes with params', async () => {
      const { stockTakeApi } = await import('../wms/stocktake');
      await stockTakeApi.list({ page: 1, page_size: 10 });
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/stock-takes', {
        params: { page: 1, page_size: 10 },
      });
    });

    it('get should call GET /stock-takes/:id', async () => {
      const { stockTakeApi } = await import('../wms/stocktake');
      await stockTakeApi.get('st-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/stock-takes/st-001');
    });

    it('create should call POST /stock-takes with data', async () => {
      const { stockTakeApi } = await import('../wms/stocktake');
      const data = { warehouse_id: 'wh-001', items: [] };
      await stockTakeApi.create(data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/stock-takes', data);
    });

    it('update should call PUT /stock-takes/:id with data', async () => {
      const { stockTakeApi } = await import('../wms/stocktake');
      const data = { status: 'completed' };
      await stockTakeApi.update('st-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.put).toHaveBeenCalledWith('/stock-takes/st-001', data);
    });

    it('delete should call DELETE /stock-takes/:id', async () => {
      const { stockTakeApi } = await import('../wms/stocktake');
      await stockTakeApi.delete('st-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.delete).toHaveBeenCalledWith('/stock-takes/st-001');
    });

    it('start should call POST /stock-takes/:id/start', async () => {
      const { stockTakeApi } = await import('../wms/stocktake');
      await stockTakeApi.start('st-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/stock-takes/st-001/start');
    });

    it('complete should call POST /stock-takes/:id/complete', async () => {
      const { stockTakeApi } = await import('../wms/stocktake');
      await stockTakeApi.complete('st-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/stock-takes/st-001/complete');
    });

    it('listItems should call GET /stock-takes/:id/items', async () => {
      const { stockTakeApi } = await import('../wms/stocktake');
      await stockTakeApi.listItems('st-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/stock-takes/st-001/items');
    });

    it('getItem should call GET /stock-takes/:id/items/:item_id', async () => {
      const { stockTakeApi } = await import('../wms/stocktake');
      await stockTakeApi.getItem('st-001', 'item-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/stock-takes/st-001/items/item-001');
    });

    it('createItem should call POST /stock-takes/:id/items with data', async () => {
      const { stockTakeApi } = await import('../wms/stocktake');
      const data = { sku: 'SKU-001', expected_quantity: 100 };
      await stockTakeApi.createItem('st-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/stock-takes/st-001/items', data);
    });

    it('updateItem should call PUT /stock-takes/:id/items/:item_id with data', async () => {
      const { stockTakeApi } = await import('../wms/stocktake');
      const data = { counted_quantity: 95 };
      await stockTakeApi.updateItem('st-001', 'item-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.put).toHaveBeenCalledWith('/stock-takes/st-001/items/item-001', data);
    });

    it('deleteItem should call DELETE /stock-takes/:id/items/:item_id', async () => {
      const { stockTakeApi } = await import('../wms/stocktake');
      await stockTakeApi.deleteItem('st-001', 'item-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.delete).toHaveBeenCalledWith('/stock-takes/st-001/items/item-001');
    });

    it('count should call POST /stock-takes/:id/count with data', async () => {
      const { stockTakeApi } = await import('../wms/stocktake');
      const data = [{ item_id: 'item-001', counted_quantity: 95 }];
      await stockTakeApi.count('st-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/stock-takes/st-001/count', data);
    });

    it('adjust should call POST /stock-takes/:id/adjust', async () => {
      const { stockTakeApi } = await import('../wms/stocktake');
      await stockTakeApi.adjust('st-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/stock-takes/st-001/adjust');
    });
  });

  describe('transferApi', () => {
    it('list should call GET /transfers with params', async () => {
      const { transferApi } = await import('../wms/transfer');
      await transferApi.list({ page: 1, page_size: 10 });
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/transfers', {
        params: { page: 1, page_size: 10 },
      });
    });

    it('get should call GET /transfers/:id', async () => {
      const { transferApi } = await import('../wms/transfer');
      await transferApi.get('tf-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/transfers/tf-001');
    });

    it('create should call POST /transfers with data', async () => {
      const { transferApi } = await import('../wms/transfer');
      const data = { from_warehouse_id: 'wh-001', to_warehouse_id: 'wh-002', items: [] };
      await transferApi.create(data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/transfers', data);
    });

    it('update should call PUT /transfers/:id with data', async () => {
      const { transferApi } = await import('../wms/transfer');
      const data = { status: 'completed' };
      await transferApi.update('tf-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.put).toHaveBeenCalledWith('/transfers/tf-001', data);
    });

    it('delete should call DELETE /transfers/:id', async () => {
      const { transferApi } = await import('../wms/transfer');
      await transferApi.delete('tf-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.delete).toHaveBeenCalledWith('/transfers/tf-001');
    });

    it('confirm should call POST /transfers/:id/confirm', async () => {
      const { transferApi } = await import('../wms/transfer');
      await transferApi.confirm('tf-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/transfers/tf-001/confirm');
    });

    it('ship should call POST /transfers/:id/ship', async () => {
      const { transferApi } = await import('../wms/transfer');
      await transferApi.ship('tf-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/transfers/tf-001/ship');
    });

    it('receive should call POST /transfers/:id/receive with data', async () => {
      const { transferApi } = await import('../wms/transfer');
      const data = { items: [{ item_id: 'item-001', received_quantity: 50 }] };
      await transferApi.receive('tf-001', data.items);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/transfers/tf-001/receive', {
        items: data.items,
      });
    });

    it('complete should call POST /transfers/:id/complete', async () => {
      const { transferApi } = await import('../wms/transfer');
      await transferApi.complete('tf-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/transfers/tf-001/complete');
    });

    it('listItems should call GET /transfers/:id/items', async () => {
      const { transferApi } = await import('../wms/transfer');
      await transferApi.listItems('tf-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/transfers/tf-001/items');
    });
  });

  describe('smartReplenishmentApi', () => {
    it('listSuggestions should call GET /smart-replenishment/suggestions with params', async () => {
      const { smartReplenishmentApi } = await import('../wms/replenishment');
      await smartReplenishmentApi.listSuggestions({ page: 1, page_size: 10 });
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/smart-replenishment/suggestions', {
        params: { page: 1, page_size: 10 },
      });
    });

    it('getSuggestion should call GET /smart-replenishment/suggestions/:id', async () => {
      const { smartReplenishmentApi } = await import('../wms/replenishment');
      await smartReplenishmentApi.getSuggestion('rep-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/smart-replenishment/suggestions/rep-001');
    });

    it('generateSuggestions should call POST /smart-replenishment/suggestions/generate', async () => {
      const { smartReplenishmentApi } = await import('../wms/replenishment');
      await smartReplenishmentApi.generateSuggestions({ warehouse_id: 'wh-001' });
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/smart-replenishment/suggestions/generate', {
        warehouse_id: 'wh-001',
      });
    });

    it('createOrder should call POST /smart-replenishment/orders with data', async () => {
      const { smartReplenishmentApi } = await import('../wms/replenishment');
      const data = { suggestion_id: 'rep-001', items: [] };
      await smartReplenishmentApi.createOrder(data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/smart-replenishment/orders', data);
    });

    it('updateOrder should call PUT /smart-replenishment/orders/:id with data', async () => {
      const { smartReplenishmentApi } = await import('../wms/replenishment');
      const data = { status: 'confirmed' };
      await smartReplenishmentApi.updateOrder('ord-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.put).toHaveBeenCalledWith('/smart-replenishment/orders/ord-001', data);
    });

    it('deleteOrder should call DELETE /smart-replenishment/orders/:id', async () => {
      const { smartReplenishmentApi } = await import('../wms/replenishment');
      await smartReplenishmentApi.deleteOrder('ord-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.delete).toHaveBeenCalledWith('/smart-replenishment/orders/ord-001');
    });

    it('listOrders should call GET /smart-replenishment/orders with params', async () => {
      const { smartReplenishmentApi } = await import('../wms/replenishment');
      await smartReplenishmentApi.listOrders({ page: 1, page_size: 10 });
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/smart-replenishment/orders', {
        params: { page: 1, page_size: 10 },
      });
    });

    it('getOrder should call GET /smart-replenishment/orders/:id', async () => {
      const { smartReplenishmentApi } = await import('../wms/replenishment');
      await smartReplenishmentApi.getOrder('ord-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/smart-replenishment/orders/ord-001');
    });

    it('confirmOrder should call POST /smart-replenishment/orders/:id/confirm', async () => {
      const { smartReplenishmentApi } = await import('../wms/replenishment');
      await smartReplenishmentApi.confirmOrder('ord-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith(
        '/smart-replenishment/orders/ord-001/confirm'
      );
    });

    it('completeOrder should call POST /smart-replenishment/orders/:id/complete', async () => {
      const { smartReplenishmentApi } = await import('../wms/replenishment');
      await smartReplenishmentApi.completeOrder('ord-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.post).toHaveBeenCalledWith(
        '/smart-replenishment/orders/ord-001/complete'
      );
    });

    it('listOrderItems should call GET /smart-replenishment/orders/:id/items', async () => {
      const { smartReplenishmentApi } = await import('../wms/replenishment');
      await smartReplenishmentApi.listOrderItems('ord-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/smart-replenishment/orders/ord-001/items');
    });

    it('listSafetyStock should call GET /smart-replenishment/safety-stock with params', async () => {
      const { smartReplenishmentApi } = await import('../wms/replenishment');
      await smartReplenishmentApi.listSafetyStock({ page: 1, page_size: 10 });
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/smart-replenishment/safety-stock', {
        params: { page: 1, page_size: 10 },
      });
    });

    it('getSafetyStock should call GET /smart-replenishment/safety-stock/:id', async () => {
      const { smartReplenishmentApi } = await import('../wms/replenishment');
      await smartReplenishmentApi.getSafetyStock('ss-001');
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/smart-replenishment/safety-stock/ss-001');
    });

    it('updateSafetyStock should call PUT /smart-replenishment/safety-stock/:id with data', async () => {
      const { smartReplenishmentApi } = await import('../wms/replenishment');
      const data = { min_stock: 10, max_stock: 100 };
      await smartReplenishmentApi.updateSafetyStock('ss-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.wms.put).toHaveBeenCalledWith(
        '/smart-replenishment/safety-stock/ss-001',
        data
      );
    });

    it('getStatistics should call GET /smart-replenishment/statistics with params', async () => {
      const { smartReplenishmentApi } = await import('../wms/replenishment');
      await smartReplenishmentApi.getStatistics({ warehouse_id: 'wh-001' });
      const { apiClient } = await import('../client');
      expect(apiClient.wms.get).toHaveBeenCalledWith('/smart-replenishment/statistics', {
        params: { warehouse_id: 'wh-001' },
      });
    });
  });
});
