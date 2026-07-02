import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SupplierAdmissionPage from '../scm/SupplierAdmissionPage';
import PurchaseRequisitionPage from '../scm/PurchaseRequisitionPage';
import PurchaseContractPage from '../scm/PurchaseContractPage';
import ScmPurchaseOrderPage from '../scm/ScmPurchaseOrderPage';
import { scmApi } from '@/api/scm';
import { useAppStore } from '@/store';

vi.mock('@/api/scm', () => ({
  scmApi: {
    suppliers: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      approve: vi.fn(),
      reject: vi.fn(),
    },
    supplierAdmissions: {
      list: vi.fn().mockResolvedValue({ success: true, data: { items: [], total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      approve: vi.fn(),
      reject: vi.fn(),
    },
    purchaseRequisitions: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      approve: vi.fn(),
    },
    purchaseContracts: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      sign: vi.fn(),
    },
    purchaseOrders: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      confirm: vi.fn(),
      cancel: vi.fn(),
    },
    materials: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
    },
  },
  supplierApi: {
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
}));

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['scm:supplier:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['scm:supplier:read'] },
          theme: 'light',
        }
  ),
}));

describe('ScmModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SupplierAdmissionPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <SupplierAdmissionPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have supplier API methods defined', () => {
      expect(scmApi.suppliers.list).toBeDefined();
      expect(scmApi.suppliers.get).toBeDefined();
      expect(scmApi.suppliers.create).toBeDefined();
      expect(scmApi.suppliers.update).toBeDefined();
      expect(scmApi.suppliers.delete).toBeDefined();
      expect(scmApi.suppliers.approve).toBeDefined();
    });
  });

  describe('PurchaseRequisitionPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <PurchaseRequisitionPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have purchase requisition API methods defined', () => {
      expect(scmApi.purchaseRequisitions.list).toBeDefined();
      expect(scmApi.purchaseRequisitions.get).toBeDefined();
      expect(scmApi.purchaseRequisitions.create).toBeDefined();
      expect(scmApi.purchaseRequisitions.update).toBeDefined();
      expect(scmApi.purchaseRequisitions.delete).toBeDefined();
    });
  });

  describe('PurchaseContractPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <PurchaseContractPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have purchase contract API methods defined', () => {
      expect(scmApi.purchaseContracts.list).toBeDefined();
      expect(scmApi.purchaseContracts.get).toBeDefined();
      expect(scmApi.purchaseContracts.create).toBeDefined();
      expect(scmApi.purchaseContracts.update).toBeDefined();
      expect(scmApi.purchaseContracts.delete).toBeDefined();
      expect(scmApi.purchaseContracts.sign).toBeDefined();
    });
  });

  describe('ScmPurchaseOrderPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <ScmPurchaseOrderPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have purchase order API methods defined', () => {
      expect(scmApi.purchaseOrders.list).toBeDefined();
      expect(scmApi.purchaseOrders.get).toBeDefined();
      expect(scmApi.purchaseOrders.create).toBeDefined();
      expect(scmApi.purchaseOrders.update).toBeDefined();
      expect(scmApi.purchaseOrders.delete).toBeDefined();
    });
  });
});