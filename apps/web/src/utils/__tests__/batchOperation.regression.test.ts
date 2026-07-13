import { describe, it, expect, vi } from 'vitest';
import { batchOperation, createBatchAbortController } from '../batchOperation';

interface Employee {
  id: number;
  name: string;
  status: 'active' | 'inactive';
}

interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
}

interface Supplier {
  id: number;
  name: string;
  status: 'active' | 'disabled';
}

interface Customer {
  id: number;
  name: string;
  status: 'active' | 'inactive';
}

interface PurchaseOrder {
  id: number;
  status: 'pending' | 'approved' | 'rejected';
}

interface ProductionOrder {
  id: number;
  status: 'pending' | 'released' | 'in_progress' | 'completed';
}

interface Payment {
  id: number;
  status: 'pending' | 'approved' | 'rejected';
}

interface InspectionRecord {
  id: number;
  status: 'pending' | 'passed' | 'failed';
}

describe('batchOperation regression tests', () => {
  describe('HRM - Employee Batch Delete', () => {
    it('should delete employees correctly', async () => {
      const employees: Employee[] = [
        { id: 1, name: '张三', status: 'active' },
        { id: 2, name: '李四', status: 'active' },
        { id: 3, name: '王五', status: 'inactive' },
      ];

      const deleteApi = vi.fn(async (id: number) => ({ success: id !== 2 }));

      const result = await batchOperation(employees, async (emp) => {
        const response = await deleteApi(emp.id);
        return response.success;
      });

      expect(deleteApi).toHaveBeenCalledTimes(3);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.successes.map(e => e.id)).toEqual([1, 3]);
      expect(result.failures.map(e => e.id)).toEqual([2]);
    });
  });

  describe('WMS - Inventory Batch Delete', () => {
    it('should delete inventory items correctly', async () => {
      const items: InventoryItem[] = [
        { id: 1, name: '商品A', quantity: 100 },
        { id: 2, name: '商品B', quantity: 50 },
      ];

      const deleteApi = vi.fn(async () => ({ success: true }));

      const result = await batchOperation(items, async () => {
        const response = await deleteApi();
        return response.success;
      });

      expect(deleteApi).toHaveBeenCalledTimes(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
    });
  });

  describe('ERP - Supplier Batch Enable/Disable', () => {
    it('should enable suppliers correctly', async () => {
      const suppliers: Supplier[] = [
        { id: 1, name: '供应商A', status: 'disabled' },
        { id: 2, name: '供应商B', status: 'disabled' },
      ];

      const updateApi = vi.fn(async (id: number) => ({ success: true }));

      const result = await batchOperation(suppliers, async (supplier) => {
        const response = await updateApi(supplier.id);
        return response.success;
      });

      expect(updateApi).toHaveBeenCalledTimes(2);
      expect(result.successCount).toBe(2);
    });

    it('should disable suppliers correctly', async () => {
      const suppliers: Supplier[] = [
        { id: 1, name: '供应商A', status: 'active' },
        { id: 2, name: '供应商B', status: 'active' },
      ];

      const updateApi = vi.fn(async (id: number) => ({ success: id !== 2 }));

      const result = await batchOperation(suppliers, async (supplier) => {
        const response = await updateApi(supplier.id);
        return response.success;
      });

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
    });
  });

  describe('CRM - Customer Batch Delete', () => {
    it('should delete customers correctly', async () => {
      const customers: Customer[] = [
        { id: 1, name: '客户A', status: 'active' },
        { id: 2, name: '客户B', status: 'active' },
        { id: 3, name: '客户C', status: 'inactive' },
        { id: 4, name: '客户D', status: 'active' },
      ];

      const deleteApi = vi.fn(async (id: number) => ({ success: id % 2 === 0 }));

      const result = await batchOperation(customers, async (customer) => {
        const response = await deleteApi(customer.id);
        return response.success;
      });

      expect(deleteApi).toHaveBeenCalledTimes(4);
      expect(result.successCount).toBe(2);
      expect(result.failures.map(c => c.id)).toEqual([1, 3]);
    });
  });

  describe('ERP - Purchase Order Batch Approve', () => {
    it('should approve purchase orders correctly', async () => {
      const orders: PurchaseOrder[] = [
        { id: 1, status: 'pending' },
        { id: 2, status: 'pending' },
        { id: 3, status: 'pending' },
      ];

      const approveApi = vi.fn(async (id: number) => ({ success: id !== 2 }));

      const result = await batchOperation(orders, async (order) => {
        if (order.status !== 'pending') return false;
        const response = await approveApi(order.id);
        return response.success;
      });

      expect(approveApi).toHaveBeenCalledTimes(3);
      expect(result.successCount).toBe(2);
      expect(result.failures.map(o => o.id)).toEqual([2]);
    });
  });

  describe('MES - Production Order Batch Actions', () => {
    it('should release production orders correctly', async () => {
      const orders: ProductionOrder[] = [
        { id: 1, status: 'pending' },
        { id: 2, status: 'pending' },
      ];

      const releaseApi = vi.fn(async () => ({ success: true }));

      const result = await batchOperation(orders, async () => {
        const response = await releaseApi();
        return response.success;
      });

      expect(releaseApi).toHaveBeenCalledTimes(2);
      expect(result.successCount).toBe(2);
    });

    it('should complete production orders correctly', async () => {
      const orders: ProductionOrder[] = [
        { id: 1, status: 'in_progress' },
        { id: 2, status: 'in_progress' },
        { id: 3, status: 'in_progress' },
      ];

      const completeApi = vi.fn(async (id: number) => ({ success: id !== 3 }));

      const result = await batchOperation(orders, async (order) => {
        if (order.status !== 'in_progress') return false;
        const response = await completeApi(order.id);
        return response.success;
      });

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
    });
  });

  describe('Finance - Payment Batch Approve/Reject', () => {
    it('should approve payments correctly', async () => {
      const payments: Payment[] = [
        { id: 1, status: 'pending' },
        { id: 2, status: 'pending' },
      ];

      const approveApi = vi.fn(async () => ({ success: true }));

      const result = await batchOperation(payments, async () => {
        const response = await approveApi();
        return response.success;
      });

      expect(approveApi).toHaveBeenCalledTimes(2);
      expect(result.successCount).toBe(2);
    });

    it('should reject payments correctly', async () => {
      const payments: Payment[] = [
        { id: 1, status: 'pending' },
        { id: 2, status: 'pending' },
      ];

      const rejectApi = vi.fn(async (id: number) => ({ success: id !== 2 }));

      const result = await batchOperation(payments, async (payment) => {
        const response = await rejectApi(payment.id);
        return response.success;
      });

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
    });
  });

  describe('QMS - Inspection Record Batch Export', () => {
    it('should export inspection records correctly', async () => {
      const records: InspectionRecord[] = [
        { id: 1, status: 'passed' },
        { id: 2, status: 'failed' },
        { id: 3, status: 'pending' },
      ];

      const exportApi = vi.fn(async () => ({ success: true }));

      const result = await batchOperation(records, async () => {
        const response = await exportApi();
        return response.success;
      });

      expect(exportApi).toHaveBeenCalledTimes(3);
      expect(result.successCount).toBe(3);
    });
  });

  describe('Abort/Cancellation', () => {
    it('should handle cancellation before operation starts', async () => {
      const items = Array.from({ length: 5 }, (_, i) => i);
      const abortController = createBatchAbortController();
      abortController.abort();

      const operation = vi.fn(async () => true);

      const result = await batchOperation(items, operation, {
        concurrency: 2,
        signal: abortController.signal,
      });

      expect(operation).not.toHaveBeenCalled();
      expect(result.cancelledCount).toBe(5);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
    });

    it('should create abort controller correctly', () => {
      const controller = createBatchAbortController();
      expect(controller).toBeInstanceOf(AbortController);
      expect(controller.signal.aborted).toBe(false);

      controller.abort();
      expect(controller.signal.aborted).toBe(true);
    });
  });
});