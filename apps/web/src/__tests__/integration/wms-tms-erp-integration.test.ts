import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Mock apiClient — 同时覆盖：
//   1. service 级（apiClient.wms / apiClient.tms / apiClient.erp）— 供 outboundOrderApi /
//      inboundOrderApi / transferApi / shipmentApi / salesOrderApi / purchaseOrderApi /
//      erp inventoryApi / materialApi / wms inventoryApi 等使用
//   2. 顶层 post/get/put/delete — 供 wmsApprovalApi 使用（实际代码用 apiClient.post 调
//      `/wms/inbound-orders/{id}/approval/approve` 等路径）
// ============================================================================
vi.mock('@/api/client', () => {
  const createMockModule = () => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  });
  const serviceModules = {
    wms: createMockModule(),
    tms: createMockModule(),
    erp: createMockModule(),
  };
  const apiClientMock = {
    ...serviceModules,
    // 顶层方法（wmsApprovalApi 走这一层，路径前缀 /wms/）
    ...createMockModule(),
  };
  return {
    apiClient: apiClientMock,
    default: apiClientMock,
  };
});

describe('WMS + TMS + ERP 三模块联动集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // 场景 1: Order-to-Delivery（销售订单 → WMS 出库 → TMS 运单）
  // ==========================================================================
  describe('场景 1: Order-to-Delivery', () => {
    it('should link salesOrder → outboundOrder → shipment creation', async () => {
      const { salesOrderApi } = await import('@/api/erp/core/salesOrder');
      const { outboundOrderApi } = await import('@/api/wms/outbound');
      const { tmsApi } = await import('@/api/tms');
      const { apiClient } = await import('@/api/client');

      apiClient.erp.post.mockResolvedValue({
        success: true,
        data: { id: 'so-001', order_no: 'SO-2026-001', status: 'created' },
      });
      apiClient.wms.post.mockResolvedValue({
        success: true,
        data: { id: 'out-001', sales_order_id: 'so-001', status: 'created' },
      });
      apiClient.tms.post.mockResolvedValue({
        success: true,
        data: { id: 'ship-001', outbound_order_id: 'out-001', status: 'pending' },
      });

      const so = await salesOrderApi.create({
        order_no: 'SO-2026-001',
        customer_id: 'cust-001',
        items: [{ material_code: 'MAT-001', quantity: 20 }],
      } as never);
      const out = await outboundOrderApi.create({
        order_no: 'OUT-001',
        sales_order_id: so.data.id,
        items: [{ material_code: 'MAT-001', quantity: 20 }],
      } as never);
      const ship = await tmsApi.createShipment({
        outbound_order_id: out.data.id,
        origin: 'WH-A',
        destination: 'WH-B',
      } as never);

      expect(apiClient.erp.post).toHaveBeenCalledWith('/sales-orders', expect.anything());
      expect(apiClient.wms.post).toHaveBeenCalledWith('/outbound-orders', expect.anything());
      expect(apiClient.tms.post).toHaveBeenCalledWith(
        '/shipments',
        expect.objectContaining({ outbound_order_id: 'out-001' })
      );
      expect(so.data.id).toBe('so-001');
      expect(out.data.status).toBe('created');
      expect(ship.data.status).toBe('pending');
    });

    it('should sync WMS outbound packing→shipping with TMS shipment dispatch', async () => {
      const { wmsApprovalApi } = await import('@/api/wms');
      const { tmsApi } = await import('@/api/tms');
      const { apiClient } = await import('@/api/client');

      // wmsApprovalApi.outbound.approve 实际走 apiClient.post（顶层，路径 /wms/...）
      apiClient.post.mockResolvedValue({
        success: true,
        data: { id: 'out-001', status: 'shipping' },
      });
      apiClient.tms.post.mockResolvedValue({
        success: true,
        data: { id: 'ship-001', status: 'in_transit' },
      });

      const approveResult = await wmsApprovalApi.outbound.approve('out-001', {
        entityId: 'out-001',
        entityType: 'outbound_order',
        approverId: 'user-001',
      });
      const dispatchResult = await tmsApi.dispatchShipment('ship-001');

      expect(apiClient.post).toHaveBeenCalledWith(
        '/wms/outbound-orders/out-001/approval/approve',
        expect.objectContaining({ entityId: 'out-001' })
      );
      expect(apiClient.tms.post).toHaveBeenCalledWith('/shipments/ship-001/dispatch');
      expect(approveResult.data.status).toBe('shipping');
      expect(dispatchResult.data.status).toBe('in_transit');
    });

    it('should reduce ERP inventory available_quantity after WMS outbound completed', async () => {
      const { tmsApi } = await import('@/api/tms');
      const { outboundOrderApi } = await import('@/api/wms/outbound');
      const { inventoryApi: erpInventoryApi } = await import('@/api/erp/core/inventory');
      const { apiClient } = await import('@/api/client');

      // Step 1: TMS arrive → delivered
      apiClient.tms.post.mockResolvedValueOnce({
        success: true,
        data: { id: 'ship-001', status: 'delivered' },
      });
      // Step 2: WMS outbound complete (shipping→completed) → apiClient.wms.post
      apiClient.wms.post.mockResolvedValueOnce({
        success: true,
        data: { id: 'out-001', status: 'completed' },
      });
      // Step 3: ERP inventory 查询返回扣减后库存（原 100，减 20）
      apiClient.erp.get.mockResolvedValue({
        success: true,
        data: {
          items: [{ material_code: 'MAT-001', available_quantity: 80 }],
          total: 1,
          page: 1,
          page_size: 10,
        },
      });

      const arriveResult = await tmsApi.arriveShipment('ship-001');
      const completeResult = await outboundOrderApi.complete('out-001');
      const invResult = await erpInventoryApi.list();

      expect(apiClient.tms.post).toHaveBeenCalledWith('/shipments/ship-001/arrive');
      expect(apiClient.wms.post).toHaveBeenCalledWith('/outbound-orders/out-001/complete');
      expect(apiClient.erp.get).toHaveBeenCalled();
      expect(arriveResult.data.status).toBe('delivered');
      expect(completeResult.data.status).toBe('completed');
      expect(invResult.data.items[0].available_quantity).toBe(80);
      expect(invResult.data.items[0].available_quantity).toBeLessThan(100);
    });
  });

  // ==========================================================================
  // 场景 2: Procurement-to-Stock（采购订单 → WMS 入库）
  // ==========================================================================
  describe('场景 2: Procurement-to-Stock', () => {
    it('should link purchaseOrder → inboundOrder creation', async () => {
      const { purchaseOrderApi } = await import('@/api/erp/core/purchaseOrder');
      const { inboundOrderApi } = await import('@/api/wms/inbound');
      const { apiClient } = await import('@/api/client');

      apiClient.erp.post.mockResolvedValue({
        success: true,
        data: { id: 'po-001', order_no: 'PO-2026-001', status: 'created' },
      });
      apiClient.wms.post.mockResolvedValue({
        success: true,
        data: { id: 'inb-001', purchase_order_id: 'po-001', status: 'created' },
      });

      const po = await purchaseOrderApi.create({
        order_no: 'PO-2026-001',
        supplier_id: 'sup-001',
        items: [{ material_code: 'MAT-002', quantity: 50 }],
      } as never);
      const inb = await inboundOrderApi.create({
        order_no: 'INB-001',
        purchase_order_id: po.data.id,
        items: [{ material_code: 'MAT-002', quantity: 50 }],
      } as never);

      expect(apiClient.erp.post).toHaveBeenCalledWith('/purchase-orders', expect.anything());
      expect(apiClient.wms.post).toHaveBeenCalledWith('/inbound-orders', expect.anything());
      expect(po.data.id).toBe('po-001');
      expect(inb.data.purchase_order_id).toBe('po-001');
      expect(inb.data.status).toBe('created');
    });

    it('should require approval for inbound received→completed (APV-1)', async () => {
      const { inboundOrderApi } = await import('@/api/wms/inbound');
      const { wmsApprovalApi } = await import('@/api/wms');
      const { apiClient } = await import('@/api/client');

      // inbound receive (confirmed→received)
      apiClient.wms.post.mockResolvedValueOnce({
        success: true,
        data: { id: 'inb-001', status: 'received' },
      });
      // approval.approve (received→completed) — 走顶层 apiClient.post
      apiClient.post.mockResolvedValue({
        success: true,
        data: { id: 'inb-001', status: 'completed' },
      });

      const receiveResult = await inboundOrderApi.receive('inb-001', [
        { item_id: 'item-1', received_quantity: 50 },
      ]);
      const approveResult = await wmsApprovalApi.inbound.approve('inb-001', {
        entityId: 'inb-001',
        entityType: 'inbound_order',
        approverId: 'user-002',
      });

      expect(apiClient.wms.post).toHaveBeenCalledWith(
        '/inbound-orders/inb-001/receive',
        expect.anything()
      );
      expect(apiClient.post).toHaveBeenCalledWith(
        '/wms/inbound-orders/inb-001/approval/approve',
        expect.objectContaining({
          entityId: 'inb-001',
          entityType: 'inbound_order',
        })
      );
      expect(receiveResult.data.status).toBe('received');
      expect(approveResult.data.status).toBe('completed');
    });

    it('should increase ERP inventory after WMS inbound completed', async () => {
      const { inboundOrderApi } = await import('@/api/wms/inbound');
      const { inventoryApi: erpInventoryApi } = await import('@/api/erp/core/inventory');
      const { apiClient } = await import('@/api/client');

      apiClient.wms.post.mockResolvedValueOnce({
        success: true,
        data: { id: 'inb-001', status: 'completed' },
      });
      apiClient.erp.get.mockResolvedValue({
        success: true,
        data: {
          items: [{ material_code: 'MAT-002', available_quantity: 150 }],
          total: 1,
          page: 1,
          page_size: 10,
        },
      });

      const completeResult = await inboundOrderApi.complete('inb-001');
      const invResult = await erpInventoryApi.list();

      expect(apiClient.wms.post).toHaveBeenCalledWith('/inbound-orders/inb-001/complete');
      expect(apiClient.erp.get).toHaveBeenCalled();
      expect(completeResult.data.status).toBe('completed');
      expect(invResult.data.items[0].available_quantity).toBe(150);
      expect(invResult.data.items[0].available_quantity).toBeGreaterThan(100);
    });
  });

  // ==========================================================================
  // 场景 3: Transfer-to-Destination（WMS 调拨 → TMS 运输）
  // ==========================================================================
  describe('场景 3: Transfer-to-Destination', () => {
    it('should link transferOrder → shipment creation', async () => {
      const { transferApi } = await import('@/api/wms/transfer');
      const { tmsApi } = await import('@/api/tms');
      const { apiClient } = await import('@/api/client');

      apiClient.wms.post.mockResolvedValue({
        success: true,
        data: { id: 'trf-001', from_warehouse: 'WH-A', to_warehouse: 'WH-B', status: 'pending' },
      });
      apiClient.tms.post.mockResolvedValue({
        success: true,
        data: { id: 'ship-002', transfer_order_id: 'trf-001', status: 'pending' },
      });

      const trf = await transferApi.create({
        order_no: 'TRF-001',
        from_warehouse: 'WH-A',
        to_warehouse: 'WH-B',
        items: [{ material_code: 'MAT-003', quantity: 10 }],
      } as never);
      const ship = await tmsApi.createShipment({
        transfer_order_id: trf.data.id,
        origin: 'WH-A',
        destination: 'WH-B',
      } as never);

      expect(apiClient.wms.post).toHaveBeenCalledWith('/transfers', expect.anything());
      expect(apiClient.tms.post).toHaveBeenCalledWith(
        '/shipments',
        expect.objectContaining({ transfer_order_id: 'trf-001' })
      );
      expect(trf.data.id).toBe('trf-001');
      expect(ship.data.status).toBe('pending');
    });

    it('should sync transfer confirmed→shipped with TMS dispatch (APV-4)', async () => {
      const { transferApi } = await import('@/api/wms/transfer');
      const { wmsApprovalApi } = await import('@/api/wms');
      const { tmsApi } = await import('@/api/tms');
      const { apiClient } = await import('@/api/client');

      // transfer confirm (pending→confirmed)
      apiClient.wms.post.mockResolvedValueOnce({
        success: true,
        data: { id: 'trf-001', status: 'confirmed' },
      });
      // approval.approve (confirmed→shipped, APV-4) — 走顶层 apiClient.post
      apiClient.post.mockResolvedValue({
        success: true,
        data: { id: 'trf-001', status: 'shipped' },
      });
      // TMS dispatch
      apiClient.tms.post.mockResolvedValue({
        success: true,
        data: { id: 'ship-002', status: 'in_transit' },
      });

      const confirmResult = await transferApi.confirm('trf-001');
      const approveResult = await wmsApprovalApi.transferOrder.approve('trf-001', {
        entityId: 'trf-001',
        entityType: 'transfer_order',
        approverId: 'user-003',
      });
      const dispatchResult = await tmsApi.dispatchShipment('ship-002');

      expect(apiClient.wms.post).toHaveBeenCalledWith('/transfers/trf-001/confirm');
      expect(apiClient.post).toHaveBeenCalledWith(
        '/wms/transfer-orders/trf-001/approval/approve',
        expect.objectContaining({ entityId: 'trf-001' })
      );
      expect(apiClient.tms.post).toHaveBeenCalledWith('/shipments/ship-002/dispatch');
      expect(confirmResult.data.status).toBe('confirmed');
      expect(approveResult.data.status).toBe('shipped');
      expect(dispatchResult.data.status).toBe('in_transit');
    });

    it('should enable transfer received→completed after TMS delivered', async () => {
      const { tmsApi } = await import('@/api/tms');
      const { transferApi } = await import('@/api/wms/transfer');
      const { apiClient } = await import('@/api/client');

      apiClient.tms.post.mockResolvedValueOnce({
        success: true,
        data: { id: 'ship-002', status: 'delivered' },
      });
      apiClient.wms.post
        .mockResolvedValueOnce({
          success: true,
          data: { id: 'trf-001', status: 'received' },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { id: 'trf-001', status: 'completed' },
        });

      const arriveResult = await tmsApi.arriveShipment('ship-002');
      const receiveResult = await transferApi.receive('trf-001', [
        { item_id: 'item-1', received_quantity: 10 },
      ]);
      const completeResult = await transferApi.complete('trf-001');

      expect(apiClient.tms.post).toHaveBeenCalledWith('/shipments/ship-002/arrive');
      expect(apiClient.wms.post).toHaveBeenCalledWith(
        '/transfers/trf-001/receive',
        expect.anything()
      );
      expect(apiClient.wms.post).toHaveBeenCalledWith('/transfers/trf-001/complete');
      expect(arriveResult.data.status).toBe('delivered');
      expect(receiveResult.data.status).toBe('received');
      expect(completeResult.data.status).toBe('completed');
    });
  });

  // ==========================================================================
  // 场景 4: Inventory Alert（WMS 库存预警 → ERP 安全库存校验）
  // ==========================================================================
  describe('场景 4: Inventory Alert', () => {
    it('should detect low stock in WMS and check ERP material safety_stock', async () => {
      const { inventoryApi: wmsInventoryApi } = await import('@/api/wms/inventory');
      const { materialApi } = await import('@/api/erp/core/material');
      const { apiClient } = await import('@/api/client');

      apiClient.wms.get.mockResolvedValue({
        success: true,
        data: {
          items: [{ material_code: 'MAT-001', quantity: 30 }],
          total: 1,
          page: 1,
          page_size: 10,
        },
      });
      apiClient.erp.get.mockResolvedValue({
        success: true,
        data: { id: 'MAT-001', code: 'MAT-001', safety_stock: 50 },
      });

      const invResult = await wmsInventoryApi.list();
      const matResult = await materialApi.get('MAT-001');

      expect(apiClient.wms.get).toHaveBeenCalled();
      expect(apiClient.erp.get).toHaveBeenCalledWith('/materials/MAT-001');
      const wmsQty = invResult.data.items[0].quantity;
      const safetyStock = matResult.data.safety_stock;
      expect(wmsQty).toBe(30);
      expect(safetyStock).toBe(50);
      expect(wmsQty).toBeLessThan(safetyStock);
    });

    it('should trigger auto purchaseOrder when stock below safety', async () => {
      const { purchaseOrderApi } = await import('@/api/erp/core/purchaseOrder');
      const { apiClient } = await import('@/api/client');

      apiClient.erp.post.mockResolvedValue({
        success: true,
        data: {
          id: 'po-auto-001',
          order_no: 'PO-AUTO-001',
          status: 'created',
          auto_triggered: true,
        },
      });

      const result = await purchaseOrderApi.create({
        order_no: 'PO-AUTO-001',
        supplier_id: 'sup-001',
        auto_triggered: true,
        items: [{ material_code: 'MAT-001', quantity: 50 }],
      } as never);

      expect(apiClient.erp.post).toHaveBeenCalledWith(
        '/purchase-orders',
        expect.objectContaining({ auto_triggered: true })
      );
      expect(result.data.id).toBe('po-auto-001');
      expect(result.data.auto_triggered).toBe(true);
    });
  });

  // ==========================================================================
  // 场景 5: Data Consistency（三模块库存数据一致性）
  // ==========================================================================
  describe('场景 5: Data Consistency', () => {
    it('should have consistent material_code quantity across ERP and WMS inventory', async () => {
      const { inventoryApi: wmsInventoryApi } = await import('@/api/wms/inventory');
      const { inventoryApi: erpInventoryApi } = await import('@/api/erp/core/inventory');
      const { apiClient } = await import('@/api/client');

      apiClient.wms.get.mockResolvedValue({
        success: true,
        data: {
          items: [{ material_code: 'MAT-001', quantity: 100 }],
          total: 1,
          page: 1,
          page_size: 10,
        },
      });
      apiClient.erp.get.mockResolvedValue({
        success: true,
        data: {
          items: [{ material_code: 'MAT-001', available_quantity: 100 }],
          total: 1,
          page: 1,
          page_size: 10,
        },
      });

      const wmsResult = await wmsInventoryApi.list();
      const erpResult = await erpInventoryApi.list();

      expect(apiClient.wms.get).toHaveBeenCalled();
      expect(apiClient.erp.get).toHaveBeenCalled();
      expect(wmsResult.data.items[0].material_code).toBe(erpResult.data.items[0].material_code);
      expect(wmsResult.data.items[0].quantity).toBe(erpResult.data.items[0].available_quantity);
    });

    it('should decrement ERP available_quantity after WMS outbound completed', async () => {
      const { outboundOrderApi } = await import('@/api/wms/outbound');
      const { inventoryApi: erpInventoryApi } = await import('@/api/erp/core/inventory');
      const { apiClient } = await import('@/api/client');

      apiClient.wms.post.mockResolvedValueOnce({
        success: true,
        data: { id: 'out-002', status: 'completed' },
      });
      apiClient.erp.get.mockResolvedValue({
        success: true,
        data: {
          items: [{ material_code: 'MAT-001', available_quantity: 80 }],
          total: 1,
          page: 1,
          page_size: 10,
        },
      });

      const completeResult = await outboundOrderApi.complete('out-002');
      const invResult = await erpInventoryApi.list();

      expect(apiClient.wms.post).toHaveBeenCalledWith('/outbound-orders/out-002/complete');
      expect(apiClient.erp.get).toHaveBeenCalled();
      expect(completeResult.data.status).toBe('completed');
      expect(invResult.data.items[0].available_quantity).toBe(80);
      expect(invResult.data.items[0].available_quantity).toBeLessThan(100);
    });

    it('should increment ERP available_quantity after WMS inbound completed', async () => {
      const { inboundOrderApi } = await import('@/api/wms/inbound');
      const { inventoryApi: erpInventoryApi } = await import('@/api/erp/core/inventory');
      const { apiClient } = await import('@/api/client');

      apiClient.wms.post.mockResolvedValueOnce({
        success: true,
        data: { id: 'inb-002', status: 'completed' },
      });
      apiClient.erp.get.mockResolvedValue({
        success: true,
        data: {
          items: [{ material_code: 'MAT-002', available_quantity: 150 }],
          total: 1,
          page: 1,
          page_size: 10,
        },
      });

      const completeResult = await inboundOrderApi.complete('inb-002');
      const invResult = await erpInventoryApi.list();

      expect(apiClient.wms.post).toHaveBeenCalledWith('/inbound-orders/inb-002/complete');
      expect(apiClient.erp.get).toHaveBeenCalled();
      expect(completeResult.data.status).toBe('completed');
      expect(invResult.data.items[0].available_quantity).toBe(150);
      expect(invResult.data.items[0].available_quantity).toBeGreaterThan(100);
    });
  });

  // ==========================================================================
  // 场景 6: Error Rollback（跨模块失败时 FSM 状态不被破坏）
  // ==========================================================================
  describe('场景 6: Error Rollback', () => {
    it('should keep WMS outbound as picking when TMS shipment.create fails', async () => {
      const { outboundOrderApi } = await import('@/api/wms/outbound');
      const { tmsApi } = await import('@/api/tms');
      const { wmsApprovalApi } = await import('@/api/wms');
      const { apiClient } = await import('@/api/client');

      // outbound pack → packing（成功）
      apiClient.wms.post.mockResolvedValueOnce({
        success: true,
        data: { id: 'out-003', status: 'packing' },
      });
      // TMS shipment.create 抛错
      apiClient.tms.post.mockRejectedValue(new Error('TMS service unavailable'));

      const packResult = await outboundOrderApi.pack('out-003');
      let shipmentFailed = false;
      try {
        await tmsApi.createShipment({
          outbound_order_id: 'out-003',
        } as never);
      } catch (_e) {
        shipmentFailed = true;
      }

      // 断言：TMS 失败后，WMS outbound 没有调用 approval.approve（仍停留在 packing）
      expect(apiClient.wms.post).toHaveBeenCalledWith('/outbound-orders/out-003/pack');
      expect(apiClient.tms.post).toHaveBeenCalledWith('/shipments', expect.anything());
      expect(apiClient.post).not.toHaveBeenCalled();
      expect(packResult.data.status).toBe('packing');
      expect(shipmentFailed).toBe(true);
      // 关键：approval.approve 路径从未被调用 → outbound 未前进至 shipping
      expect(apiClient.post).not.toHaveBeenCalledWith(
        expect.stringContaining('/outbound-orders/out-003/approval/approve'),
        expect.anything()
      );
    });

    it('should reject invalid WMS FSM transition (created→completed)', async () => {
      const { wmsApprovalApi } = await import('@/api/wms');
      const { apiClient } = await import('@/api/client');

      // 后端 FSM 检测到 created→completed 非法转换，返回 success:false
      apiClient.post.mockResolvedValue({
        success: false,
        message: 'InvalidTransition: created → completed is not allowed',
      });

      const result = await wmsApprovalApi.outbound.approve('out-004', {
        entityId: 'out-004',
        entityType: 'outbound_order',
        approverId: 'user-001',
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/wms/outbound-orders/out-004/approval/approve',
        expect.anything()
      );
      expect(result.success).toBe(false);
      expect(result.message).toContain('InvalidTransition');
    });

    it('should reject approval on non-approval state (inbound created state)', async () => {
      const { wmsApprovalApi } = await import('@/api/wms');
      const { apiClient } = await import('@/api/client');

      // inbound 处于 created 状态（非审批态），调用 approve 应被拒绝
      apiClient.post.mockResolvedValue({
        success: false,
        message: 'not in approval state: current state is created',
      });

      const result = await wmsApprovalApi.inbound.approve('inb-003', {
        entityId: 'inb-003',
        entityType: 'inbound_order',
        approverId: 'user-002',
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/wms/inbound-orders/inb-003/approval/approve',
        expect.anything()
      );
      expect(result.success).toBe(false);
      expect(result.message).toContain('not in approval state');
    });

    it('should reject TMS dispatch on delivered shipment', async () => {
      const { tmsApi } = await import('@/api/tms');
      const { apiClient } = await import('@/api/client');

      apiClient.tms.post.mockResolvedValue({
        success: false,
        message: 'terminal state: cannot dispatch a delivered shipment',
      });

      const result = await tmsApi.dispatchShipment('ship-delivered');

      expect(apiClient.tms.post).toHaveBeenCalledWith('/shipments/ship-delivered/dispatch');
      expect(result.success).toBe(false);
      expect(result.message).toContain('terminal state');
    });
  });
});
