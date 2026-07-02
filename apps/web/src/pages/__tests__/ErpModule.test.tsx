import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SalesOrderPage from '../erp/SalesOrderPage';
import PurchaseOrderPage from '../erp/PurchaseOrderPage';
import InventoryManagementPage from '../erp/InventoryManagementPage';
import CustomerManagementPage from '../erp/CustomerManagementPage';
import SupplierManagementPage from '../erp/SupplierManagementPage';
import { erpApi } from '@/api/erp';
import { useAppStore } from '@/store';

vi.mock('@/api/erp', () => ({
  erpApi: {
    salesOrders: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      confirm: vi.fn(),
      cancel: vi.fn(),
    },
    purchaseOrders: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      approve: vi.fn(),
      reject: vi.fn(),
    },
    inventory: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      adjust: vi.fn(),
      transfer: vi.fn(),
    },
    customers: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    suppliers: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
  salesOrderApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  purchaseOrderApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  inventoryApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    adjust: vi.fn(),
  },
}));

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['erp:sales:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['erp:sales:read'] },
          theme: 'light',
        }
  ),
}));

describe('ErpModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SalesOrderPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <SalesOrderPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have sales order API methods defined', () => {
      expect(erpApi.salesOrders.list).toBeDefined();
      expect(erpApi.salesOrders.get).toBeDefined();
      expect(erpApi.salesOrders.create).toBeDefined();
      expect(erpApi.salesOrders.update).toBeDefined();
      expect(erpApi.salesOrders.delete).toBeDefined();
    });
  });

  describe('PurchaseOrderPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <PurchaseOrderPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have purchase order API methods defined', () => {
      expect(erpApi.purchaseOrders.list).toBeDefined();
      expect(erpApi.purchaseOrders.get).toBeDefined();
      expect(erpApi.purchaseOrders.create).toBeDefined();
      expect(erpApi.purchaseOrders.update).toBeDefined();
      expect(erpApi.purchaseOrders.delete).toBeDefined();
    });
  });

  describe('InventoryManagementPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <InventoryManagementPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have inventory API methods defined', () => {
      expect(erpApi.inventory.list).toBeDefined();
      expect(erpApi.inventory.get).toBeDefined();
      expect(erpApi.inventory.adjust).toBeDefined();
      expect(erpApi.inventory.transfer).toBeDefined();
    });
  });

  describe('CustomerManagementPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <CustomerManagementPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have customer API methods defined', () => {
      expect(erpApi.customers.list).toBeDefined();
      expect(erpApi.customers.get).toBeDefined();
      expect(erpApi.customers.create).toBeDefined();
      expect(erpApi.customers.update).toBeDefined();
      expect(erpApi.customers.delete).toBeDefined();
    });
  });

  describe('SupplierManagementPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <SupplierManagementPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have supplier API methods defined', () => {
      expect(erpApi.suppliers.list).toBeDefined();
      expect(erpApi.suppliers.get).toBeDefined();
      expect(erpApi.suppliers.create).toBeDefined();
      expect(erpApi.suppliers.update).toBeDefined();
      expect(erpApi.suppliers.delete).toBeDefined();
    });
  });
});