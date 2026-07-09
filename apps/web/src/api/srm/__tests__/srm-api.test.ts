import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../client', () => {
  const mockSrmClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    apiClient: { srm: mockSrmClient },
    default: { srm: mockSrmClient },
  };
});

describe('SRM Module API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('srmApi - Suppliers', () => {
    it('listSuppliers should call GET /suppliers', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.listSuppliers();
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/suppliers');
    });

    it('getSupplier should call GET /suppliers/:id', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.getSupplier('supplier-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/suppliers/supplier-001');
    });

    it('createSupplier should call POST /suppliers with data', async () => {
      const { srmApi } = await import('../../srm');
      const data = {
        supplier_no: 'SUP-001',
        name: 'Supplier A',
        category: 'raw_material',
        status: 'active',
        risklevel: 'low',
      };
      await srmApi.createSupplier(data as any);
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.post).toHaveBeenCalledWith('/suppliers', data);
    });

    it('updateSupplier should call PUT /suppliers/:id with data', async () => {
      const { srmApi } = await import('../../srm');
      const data = { name: 'Updated Supplier', status: 'active' };
      await srmApi.updateSupplier('supplier-001', data as any);
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.put).toHaveBeenCalledWith('/suppliers/supplier-001', data);
    });

    it('deleteSupplier should call DELETE /suppliers/:id', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.deleteSupplier('supplier-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.delete).toHaveBeenCalledWith('/suppliers/supplier-001');
    });
  });

  describe('srmApi - Supplier Evaluations', () => {
    it('listEvaluations should call GET /supplier-evaluations', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.listEvaluations();
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/supplier-evaluations');
    });

    it('getEvaluation should call GET /supplier-evaluations/:id', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.getEvaluation('eval-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/supplier-evaluations/eval-001');
    });

    it('createEvaluation should call POST /supplier-evaluations with data', async () => {
      const { srmApi } = await import('../../srm');
      const data = { supplier_id: 'supplier-001', evaluation_no: 'EVAL-001', status: 'pending' };
      await srmApi.createEvaluation(data as any);
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.post).toHaveBeenCalledWith('/supplier-evaluations', data);
    });

    it('updateEvaluation should call PUT /supplier-evaluations/:id with data', async () => {
      const { srmApi } = await import('../../srm');
      const data = { overall_score: 85, status: 'completed' };
      await srmApi.updateEvaluation('eval-001', data as any);
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.put).toHaveBeenCalledWith('/supplier-evaluations/eval-001', data);
    });

    it('deleteEvaluation should call DELETE /supplier-evaluations/:id', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.deleteEvaluation('eval-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.delete).toHaveBeenCalledWith('/supplier-evaluations/eval-001');
    });
  });

  describe('srmApi - Purchase Orders', () => {
    it('listPurchaseOrders should call GET /purchase-orders', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.listPurchaseOrders();
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/purchase-orders');
    });

    it('getPurchaseOrder should call GET /purchase-orders/:id', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.getPurchaseOrder('po-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/purchase-orders/po-001');
    });

    it('createPurchaseOrder should call POST /purchase-orders with data', async () => {
      const { srmApi } = await import('../../srm');
      const data = {
        po_no: 'PO-001',
        supplier_id: 'supplier-001',
        currency: 'CNY',
        status: 'draft',
      };
      await srmApi.createPurchaseOrder(data as any);
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.post).toHaveBeenCalledWith('/purchase-orders', data);
    });

    it('updatePurchaseOrder should call PUT /purchase-orders/:id with data', async () => {
      const { srmApi } = await import('../../srm');
      const data = { total_amount: 10000, status: 'pending' };
      await srmApi.updatePurchaseOrder('po-001', data as any);
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.put).toHaveBeenCalledWith('/purchase-orders/po-001', data);
    });

    it('deletePurchaseOrder should call DELETE /purchase-orders/:id', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.deletePurchaseOrder('po-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.delete).toHaveBeenCalledWith('/purchase-orders/po-001');
    });
  });

  describe('srmApi - Supplier Contracts', () => {
    it('listContracts should call GET /supplier-contracts', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.listContracts();
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/supplier-contracts');
    });

    it('getContract should call GET /supplier-contracts/:id', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.getContract('contract-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/supplier-contracts/contract-001');
    });

    it('createContract should call POST /supplier-contracts with data', async () => {
      const { srmApi } = await import('../../srm');
      const data = {
        contract_no: 'CT-001',
        supplier_id: 'supplier-001',
        title: 'Supply Contract',
        contract_type: 'supply',
        currency: 'CNY',
        status: 'draft',
      };
      await srmApi.createContract(data as any);
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.post).toHaveBeenCalledWith('/supplier-contracts', data);
    });

    it('updateContract should call PUT /supplier-contracts/:id with data', async () => {
      const { srmApi } = await import('../../srm');
      const data = { title: 'Updated Contract', total_amount: 50000 };
      await srmApi.updateContract('contract-001', data as any);
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.put).toHaveBeenCalledWith('/supplier-contracts/contract-001', data);
    });

    it('deleteContract should call DELETE /supplier-contracts/:id', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.deleteContract('contract-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.delete).toHaveBeenCalledWith('/supplier-contracts/contract-001');
    });
  });

  describe('srmApi - Statistics', () => {
    it('getStatistics should call GET /statistics', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.getStatistics();
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/statistics');
    });

    it('getDetailedStatistics should call GET /statistics/detailed', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.getDetailedStatistics();
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/statistics/detailed');
    });

    it('getSuppliersWithStats should call GET /suppliers-with-stats', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.getSuppliersWithStats();
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/suppliers-with-stats');
    });
  });

  describe('srmApi - Scoring Dimensions', () => {
    it('listScoringDimensions should call GET /scoring-dimensions', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.listScoringDimensions();
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/scoring-dimensions');
    });

    it('listActiveScoringDimensions should call GET /scoring-dimensions/active', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.listActiveScoringDimensions();
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/scoring-dimensions/active');
    });

    it('getScoringDimension should call GET /scoring-dimensions/:id', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.getScoringDimension('dim-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/scoring-dimensions/dim-001');
    });

    it('createScoringDimension should call POST /scoring-dimensions with data', async () => {
      const { srmApi } = await import('../../srm');
      const data = {
        name: 'Quality',
        code: 'quality',
        weight: 30,
        min_score: 0,
        max_score: 100,
        isactive: true,
        sort_order: 1,
      };
      await srmApi.createScoringDimension(data);
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.post).toHaveBeenCalledWith('/scoring-dimensions', data);
    });

    it('updateScoringDimension should call PUT /scoring-dimensions/:id with data', async () => {
      const { srmApi } = await import('../../srm');
      const data = { name: 'Updated Quality', weight: 35 };
      await srmApi.updateScoringDimension('dim-001', data as any);
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.put).toHaveBeenCalledWith('/scoring-dimensions/dim-001', data);
    });

    it('deleteScoringDimension should call DELETE /scoring-dimensions/:id', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.deleteScoringDimension('dim-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.delete).toHaveBeenCalledWith('/scoring-dimensions/dim-001');
    });
  });

  describe('srmApi - Performance Reports', () => {
    it('getPerformanceReports should call GET /performance/reports with params', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.getPerformanceReports({ page: 1, pagesize: 10, category: 'raw_material' });
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith(
        '/performance/reports?page=1&pagesize=10&category=raw_material'
      );
    });

    it('getPerformanceReports should call GET /performance/reports without params', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.getPerformanceReports();
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/performance/reports');
    });

    it('getPerformanceReport should call GET /performance/reports/:id', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.getPerformanceReport('report-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/performance/reports/report-001');
    });

    it('getPerformanceSummary should call GET /performance/summary', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.getPerformanceSummary();
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/performance/summary');
    });

    it('getScoreLevelDistribution should call GET /performance/score-level-distribution', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.getScoreLevelDistribution();
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/performance/score-level-distribution');
    });

    it('getTopSuppliers should call GET /performance/top-suppliers', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.getTopSuppliers();
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/performance/top-suppliers');
    });

    it('getPerformanceTrend should call GET /performance/trend with params', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.getPerformanceTrend({ supplier_id: 'supplier-001', period: 'monthly' });
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith(
        '/performance/trend?supplier_id=supplier-001&period=monthly'
      );
    });

    it('compareSupplierPerformance should call GET /performance/compare with supplier_ids', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.compareSupplierPerformance(['sup-001', 'sup-002']);
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith(
        '/performance/compare?supplier_ids=sup-001,sup-002'
      );
    });
  });

  describe('srmApi - Inquiry & Quotation', () => {
    it('listInquiries should call GET /inquiries with params', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.listInquiries({ status: 'published', page: 1, pagesize: 10 });
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/inquiries', {
        params: { status: 'published', page: 1, pagesize: 10 },
      });
    });

    it('getInquiry should call GET /inquiries/:id', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.getInquiry('inquiry-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/inquiries/inquiry-001');
    });

    it('createInquiry should call POST /inquiries with data', async () => {
      const { srmApi } = await import('../../srm');
      const data = { inquiry_no: 'INQ-001', title: 'Material Inquiry', status: 'draft' };
      await srmApi.createInquiry(data as any);
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.post).toHaveBeenCalledWith('/inquiries', data);
    });

    it('updateInquiry should call PUT /inquiries/:id with data', async () => {
      const { srmApi } = await import('../../srm');
      const data = { title: 'Updated Inquiry', status: 'published' };
      await srmApi.updateInquiry('inquiry-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.put).toHaveBeenCalledWith('/inquiries/inquiry-001', data);
    });

    it('deleteInquiry should call DELETE /inquiries/:id', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.deleteInquiry('inquiry-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.delete).toHaveBeenCalledWith('/inquiries/inquiry-001');
    });

    it('publishInquiry should call POST /inquiries/:id/publish', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.publishInquiry('inquiry-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.post).toHaveBeenCalledWith('/inquiries/inquiry-001/publish');
    });

    it('closeInquiry should call POST /inquiries/:id/close', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.closeInquiry('inquiry-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.post).toHaveBeenCalledWith('/inquiries/inquiry-001/close');
    });

    it('listQuotations should call GET /quotations with inquiry_id', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.listQuotations('inquiry-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/quotations?inquiry_id=inquiry-001');
    });

    it('listQuotations should call GET /quotations without params', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.listQuotations();
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/quotations');
    });

    it('getQuotation should call GET /quotations/:id', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.getQuotation('quote-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/quotations/quote-001');
    });

    it('createQuotation should call POST /quotations with data', async () => {
      const { srmApi } = await import('../../srm');
      const data = {
        inquiry_id: 'inquiry-001',
        supplier_id: 'supplier-001',
        title: 'Quotation A',
        total_amount: 10000,
        currency: 'CNY',
        status: 'draft',
      };
      await srmApi.createQuotation(data as any);
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.post).toHaveBeenCalledWith('/quotations', data);
    });

    it('updateQuotation should call PUT /quotations/:id with data', async () => {
      const { srmApi } = await import('../../srm');
      const data = { total_amount: 12000, status: 'submitted' };
      await srmApi.updateQuotation('quote-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.put).toHaveBeenCalledWith('/quotations/quote-001', data);
    });

    it('awardQuotation should call POST /quotations/:id/award', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.awardQuotation('quote-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.post).toHaveBeenCalledWith('/quotations/quote-001/award');
    });

    it('rejectQuotation should call POST /quotations/:id/reject', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.rejectQuotation('quote-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.post).toHaveBeenCalledWith('/quotations/quote-001/reject');
    });
  });

  describe('srmApi - Bidding', () => {
    it('listBiddings should call GET /biddings with params', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.listBiddings({ status: 'published', page: 1, pagesize: 10 });
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/biddings', {
        params: { status: 'published', page: 1, pagesize: 10 },
      });
    });

    it('getBidding should call GET /biddings/:id', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.getBidding('bid-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/biddings/bid-001');
    });

    it('createBidding should call POST /biddings with data', async () => {
      const { srmApi } = await import('../../srm');
      const data = { bidding_no: 'BID-001', title: 'Bidding A', currency: 'CNY', status: 'draft' };
      await srmApi.createBidding(data as any);
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.post).toHaveBeenCalledWith('/biddings', data);
    });

    it('updateBidding should call PUT /biddings/:id with data', async () => {
      const { srmApi } = await import('../../srm');
      const data = { title: 'Updated Bidding', budget_amount: 100000 };
      await srmApi.updateBidding('bid-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.put).toHaveBeenCalledWith('/biddings/bid-001', data);
    });

    it('deleteBidding should call DELETE /biddings/:id', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.deleteBidding('bid-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.delete).toHaveBeenCalledWith('/biddings/bid-001');
    });

    it('publishBidding should call POST /biddings/:id/publish', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.publishBidding('bid-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.post).toHaveBeenCalledWith('/biddings/bid-001/publish');
    });

    it('openBidding should call POST /biddings/:id/open', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.openBidding('bid-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.post).toHaveBeenCalledWith('/biddings/bid-001/open');
    });

    it('evaluateBidding should call POST /biddings/:id/evaluate', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.evaluateBidding('bid-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.post).toHaveBeenCalledWith('/biddings/bid-001/evaluate');
    });

    it('awardBidding should call POST /biddings/:id/award with supplierId', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.awardBidding('bid-001', 'supplier-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.post).toHaveBeenCalledWith('/biddings/bid-001/award', {
        supplier_id: 'supplier-001',
      });
    });

    it('listBiddingSuppliers should call GET /biddings/:biddingId/suppliers', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.listBiddingSuppliers('bid-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/biddings/bid-001/suppliers');
    });
  });

  describe('srmApi - Health', () => {
    it('health should call GET /health', async () => {
      const { srmApi } = await import('../../srm');
      await srmApi.health();
      const { apiClient } = await import('../../client');
      expect(apiClient.srm.get).toHaveBeenCalledWith('/health');
    });
  });
});
