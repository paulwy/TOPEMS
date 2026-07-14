import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInstance = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
};

vi.mock('@/api/client', () => ({
  downloadBlob: vi.fn(),
  apiClient: {
    erp: mockInstance,
    iam: mockInstance,
    finance: mockInstance,
    getClient: vi.fn(() => mockInstance),
  },
}));

describe('Finance Module API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('accountApi', () => {
    it('list should call GET /accounts with params', async () => {
      const { accountApi } = await import('../account');
      await accountApi.list({ category: 'asset', page: 1, pagesize: 10 });
      expect(mockInstance.get).toHaveBeenCalledWith('/accounts', {
        params: { category: 'asset', page: 1, pagesize: 10 },
      });
    });

    it('getTree should call GET /accounts/tree with params', async () => {
      const { accountApi } = await import('../account');
      await accountApi.getTree({ category: 'asset' });
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/accounts/tree', {
        params: { category: 'asset' },
      });
    });

    it('get should call GET /accounts/:id', async () => {
      const { accountApi } = await import('../account');
      await accountApi.get('acc-001');
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/accounts/acc-001');
    });

    it('create should call POST /accounts with data', async () => {
      const { accountApi } = await import('../account');
      const data = { name: 'Cash', code: '1001' };
      await accountApi.create(data);
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith('/accounts', data);
    });

    it('update should call PUT /accounts/:id with data', async () => {
      const { accountApi } = await import('../account');
      const data = { name: 'Updated Cash' };
      await accountApi.update('acc-001', data);
      const instance = mockInstance;
      expect(instance.put).toHaveBeenCalledWith('/accounts/acc-001', data);
    });

    it('delete should call DELETE /accounts/:id', async () => {
      const { accountApi } = await import('../account');
      await accountApi.delete('acc-001');
      const instance = mockInstance;
      expect(instance.delete).toHaveBeenCalledWith('/accounts/acc-001');
    });

    it('batchCreateChildren should call POST /accounts/:id/children-batch', async () => {
      const { accountApi } = await import('../account');
      const accounts = [{ name: 'Sub Account 1' }, { name: 'Sub Account 2' }];
      await accountApi.batchCreateChildren('acc-001', accounts);
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith('/accounts/acc-001/children-batch', {
        accounts,
      });
    });

    it('getBalances should call GET /accounts/balances with params', async () => {
      const { accountApi } = await import('../account');
      await accountApi.getBalances({ period: '2024-01' });
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/accounts/balances', {
        params: { period: '2024-01' },
      });
    });

    it('getOpeningBalances should call GET /accounts/opening-balances with params', async () => {
      const { accountApi } = await import('../account');
      await accountApi.getOpeningBalances({ period: '2024-01', page: 1, pagesize: 10 });
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/accounts/opening-balances', {
        params: { period: '2024-01', page: 1, pagesize: 10 },
      });
    });

    it('setOpeningBalance should call POST /accounts/:id/opening-balance with data', async () => {
      const { accountApi } = await import('../account');
      const data = { debit: 10000 };
      await accountApi.setOpeningBalance('acc-001', data);
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith(
        '/accounts/acc-001/opening-balance',
        data
      );
    });

    it('carryForwardOpeningBalance should call POST /accounts/opening-balances/carry-forward with params', async () => {
      const { accountApi } = await import('../account');
      await accountApi.carryForwardOpeningBalance({ from_period: '2023-12', to_period: '2024-01' });
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith(
        '/accounts/opening-balances/carry-forward',
        { from_period: '2023-12', to_period: '2024-01' }
      );
    });
  });

  describe('counterpartyFinanceApi', () => {
    it('getCustomerFinance should call GET /counterparty/customers/:id', async () => {
      const { counterpartyFinanceApi } = await import('../counterparty');
      await counterpartyFinanceApi.getCustomerFinance('cust-001');
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/counterparty/customers/cust-001');
    });

    it('updateCustomerFinance should call PUT /counterparty/customers/:id with data', async () => {
      const { counterpartyFinanceApi } = await import('../counterparty');
      const data = { credit_limit: 100000 };
      await counterpartyFinanceApi.updateCustomerFinance('cust-001', data);
      const instance = mockInstance;
      expect(instance.put).toHaveBeenCalledWith(
        '/counterparty/customers/cust-001',
        data
      );
    });

    it('getSupplierFinance should call GET /counterparty/suppliers/:id', async () => {
      const { counterpartyFinanceApi } = await import('../counterparty');
      await counterpartyFinanceApi.getSupplierFinance('supp-001');
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/counterparty/suppliers/supp-001');
    });

    it('updateSupplierFinance should call PUT /counterparty/suppliers/:id with data', async () => {
      const { counterpartyFinanceApi } = await import('../counterparty');
      const data = { payment_terms: 'net-30' };
      await counterpartyFinanceApi.updateSupplierFinance('supp-001', data);
      const instance = mockInstance;
      expect(instance.put).toHaveBeenCalledWith(
        '/counterparty/suppliers/supp-001',
        data
      );
    });

    it('listCustomersWithFinance should call GET /counterparty/customers with params', async () => {
      const { counterpartyFinanceApi } = await import('../counterparty');
      await counterpartyFinanceApi.listCustomersWithFinance({
        status: 'active',
        page: 1,
        pagesize: 10,
      });
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/counterparty/customers', {
        params: { status: 'active', page: 1, pagesize: 10 },
      });
    });

    it('listSuppliersWithFinance should call GET /counterparty/suppliers with params', async () => {
      const { counterpartyFinanceApi } = await import('../counterparty');
      await counterpartyFinanceApi.listSuppliersWithFinance({
        status: 'active',
        page: 1,
        pagesize: 10,
      });
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/counterparty/suppliers', {
        params: { status: 'active', page: 1, pagesize: 10 },
      });
    });
  });

  describe('voucherApi', () => {
    it('list should call GET /vouchers with params', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.list({ period: '2024-01', page: 1, pagesize: 10 });
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/vouchers', {
        params: { period: '2024-01', page: 1, pagesize: 10 },
      });
    });

    it('get should call GET /vouchers/:id', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.get('vou-001');
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/vouchers/vou-001');
    });

    it('getWithEntries should call GET /vouchers/:id/entries', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.getWithEntries('vou-001');
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/vouchers/vou-001/entries');
    });

    it('create should call POST /vouchers with data', async () => {
      const { voucherApi } = await import('../voucher');
      const data = { voucher_no: 'VOU-2024-001', entries: [] };
      await voucherApi.create(data);
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith('/vouchers', data);
    });

    it('batchCreate should call POST /vouchers/batch with vouchers', async () => {
      const { voucherApi } = await import('../voucher');
      const vouchers = [{ voucher_no: 'VOU-001' }, { voucher_no: 'VOU-002' }];
      await voucherApi.batchCreate(vouchers);
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith('/vouchers/batch', { vouchers });
    });

    it('update should call PUT /vouchers/:id with data', async () => {
      const { voucherApi } = await import('../voucher');
      const data = { memo: 'Updated memo' };
      await voucherApi.update('vou-001', data);
      const instance = mockInstance;
      expect(instance.put).toHaveBeenCalledWith('/vouchers/vou-001', data);
    });

    it('delete should call DELETE /vouchers/:id', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.delete('vou-001');
      const instance = mockInstance;
      expect(instance.delete).toHaveBeenCalledWith('/vouchers/vou-001');
    });

    it('batchDelete should call POST /vouchers/batch-delete with ids', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.batchDelete(['vou-001', 'vou-002']);
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith('/vouchers/batch-delete', {
        ids: ['vou-001', 'vou-002'],
      });
    });

    it('submit should call POST /vouchers/:id/submit', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.submit('vou-001');
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith('/vouchers/vou-001/submit', {});
    });

    it('approve should call POST /vouchers/:id/approve', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.approve('vou-001');
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith('/vouchers/vou-001/approve', {});
    });

    it('batchApprove should call POST /vouchers/batch-approve with ids', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.batchApprove(['vou-001', 'vou-002']);
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith('/vouchers/batch-approve', {
        ids: ['vou-001', 'vou-002'],
      });
    });

    it('unapprove should call POST /vouchers/:id/unapprove', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.unapprove('vou-001');
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith('/vouchers/vou-001/unapprove', {});
    });

    it('post should call POST /vouchers/:id/post', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.post('vou-001');
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith('/vouchers/vou-001/post', {});
    });

    it('batchPost should call POST /vouchers/batch-post with ids', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.batchPost(['vou-001', 'vou-002']);
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith('/vouchers/batch-post', {
        ids: ['vou-001', 'vou-002'],
      });
    });

    it('reverse should call POST /vouchers/:id/reverse with reason', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.reverse('vou-001', 'Wrong entry');
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith('/vouchers/vou-001/reverse', {
        reason: 'Wrong entry',
      });
    });

    it('getNextVoucherNo should call GET /vouchers/next-no with params', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.getNextVoucherNo({ period: '2024-01', voucher_type: 'journal' });
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/vouchers/next-no', {
        params: { period: '2024-01', voucher_type: 'journal' },
      });
    });

    it('generateByTemplate should call POST /vouchers/generate with params', async () => {
      const { voucherApi } = await import('../voucher');
      const params = { template_id: 'temp-001', source_data: { invoice_id: 'inv-001' } };
      await voucherApi.generateByTemplate(params);
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith('/vouchers/generate', params);
    });
  });

  describe('voucherTemplateApi', () => {
    it('list should call GET /voucher-templates with params', async () => {
      const { voucherTemplateApi } = await import('../voucherTemplate');
      await voucherTemplateApi.list({ type: 'journal', page: 1, pagesize: 10 });
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/voucher-templates', {
        params: { type: 'journal', page: 1, pagesize: 10 },
      });
    });

    it('get should call GET /voucher-templates/:id', async () => {
      const { voucherTemplateApi } = await import('../voucherTemplate');
      await voucherTemplateApi.get('temp-001');
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/voucher-templates/temp-001');
    });

    it('create should call POST /voucher-templates with data', async () => {
      const { voucherTemplateApi } = await import('../voucherTemplate');
      const data = { name: 'Journal Template', type: 'journal' };
      await voucherTemplateApi.create(data);
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith('/voucher-templates', data);
    });

    it('update should call PUT /voucher-templates/:id with data', async () => {
      const { voucherTemplateApi } = await import('../voucherTemplate');
      const data = { name: 'Updated Template' };
      await voucherTemplateApi.update('temp-001', data);
      const instance = mockInstance;
      expect(instance.put).toHaveBeenCalledWith('/voucher-templates/temp-001', data);
    });

    it('delete should call DELETE /voucher-templates/:id', async () => {
      const { voucherTemplateApi } = await import('../voucherTemplate');
      await voucherTemplateApi.delete('temp-001');
      const instance = mockInstance;
      expect(instance.delete).toHaveBeenCalledWith('/voucher-templates/temp-001');
    });

    it('copy should call POST /voucher-templates/:id/copy with name', async () => {
      const { voucherTemplateApi } = await import('../voucherTemplate');
      await voucherTemplateApi.copy('temp-001', 'Copy of Template');
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith('/voucher-templates/temp-001/copy', {
        name: 'Copy of Template',
      });
    });

    it('preview should call POST /voucher-templates/:id/preview with source_data', async () => {
      const { voucherTemplateApi } = await import('../voucherTemplate');
      const sourceData = { amount: 1000 };
      await voucherTemplateApi.preview('temp-001', sourceData);
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith(
        '/voucher-templates/temp-001/preview',
        {
          source_data: sourceData,
        }
      );
    });

    it('setDefault should call POST /voucher-templates/:id/set-default', async () => {
      const { voucherTemplateApi } = await import('../voucherTemplate');
      await voucherTemplateApi.setDefault('temp-001');
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith(
        '/voucher-templates/temp-001/set-default',
        {}
      );
    });
  });

  describe('periodApi', () => {
    it('getCurrent should call GET /period/current', async () => {
      const { periodApi } = await import('../period');
      await periodApi.getCurrent();
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/period/current');
    });

    it('list should call GET /periods with params', async () => {
      const { periodApi } = await import('../period');
      await periodApi.list({ year: 2024, status: 'open' });
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/periods', {
        params: { year: 2024, status: 'open' },
      });
    });

    it('open should call POST /periods/open with period', async () => {
      const { periodApi } = await import('../period');
      await periodApi.open('2024-01');
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith('/periods/open', {
        period: '2024-01',
      });
    });

    it('close should call POST /periods/close with period', async () => {
      const { periodApi } = await import('../period');
      await periodApi.close('2024-01');
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith('/periods/close', {
        period: '2024-01',
      });
    });

    it('closePeriodIncome should call POST /periods/close-income with period', async () => {
      const { periodApi } = await import('../period');
      await periodApi.closePeriodIncome('2024-12');
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith('/periods/close-income', {
        period: '2024-12',
      });
    });

    it('yearEndClose should call POST /periods/year-end-close with year', async () => {
      const { periodApi } = await import('../period');
      await periodApi.yearEndClose(2024);
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith('/periods/year-end-close', {
        year: 2024,
      });
    });
  });

  describe('receivablePayableApi', () => {
    it('listSalesInvoices should call GET /receivables with params', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      await receivablePayableApi.listSalesInvoices({
        customer_id: 'cust-001',
        page: 1,
        pagesize: 10,
      });
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/receivables', {
        params: { customer_id: 'cust-001', page: 1, pagesize: 10 },
      });
    });

    it('getSalesInvoice should call GET /receivables/:id', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      await receivablePayableApi.getSalesInvoice('inv-001');
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/receivables/inv-001');
    });

    it('createSalesInvoice should call POST /receivables with data', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      const data = { customer_id: 'cust-001', amount: 10000 };
      await receivablePayableApi.createSalesInvoice(data);
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith('/receivables', data);
    });

    it('updateSalesInvoice should call PUT /receivables/:id with data', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      const data = { amount: 15000 };
      await receivablePayableApi.updateSalesInvoice('inv-001', data);
      const instance = mockInstance;
      expect(instance.put).toHaveBeenCalledWith('/receivables/inv-001', data);
    });

    it('deleteSalesInvoice should call DELETE /receivables/:id', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      await receivablePayableApi.deleteSalesInvoice('inv-001');
      const instance = mockInstance;
      expect(instance.delete).toHaveBeenCalledWith('/receivables/inv-001');
    });

    it('listPurchaseInvoices should call GET /payables with params', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      await receivablePayableApi.listPurchaseInvoices({
        supplier_id: 'supp-001',
        page: 1,
        pagesize: 10,
      });
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/payables', {
        params: { supplier_id: 'supp-001', page: 1, pagesize: 10 },
      });
    });

    it('getPurchaseInvoice should call GET /payables/:id', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      await receivablePayableApi.getPurchaseInvoice('inv-002');
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/payables/inv-002');
    });

    it('createPurchaseInvoice should call POST /payables with data', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      const data = { supplier_id: 'supp-001', amount: 5000 };
      await receivablePayableApi.createPurchaseInvoice(data);
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith('/payables', data);
    });

    it('updatePurchaseInvoice should call PUT /payables/:id with data', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      const data = { amount: 6000 };
      await receivablePayableApi.updatePurchaseInvoice('inv-002', data);
      const instance = mockInstance;
      expect(instance.put).toHaveBeenCalledWith('/payables/inv-002', data);
    });

    it('deletePurchaseInvoice should call DELETE /payables/:id', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      await receivablePayableApi.deletePurchaseInvoice('inv-002');
      const instance = mockInstance;
      expect(instance.delete).toHaveBeenCalledWith('/payables/inv-002');
    });

    it('listCollections should call GET /ar/collections with params', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      await receivablePayableApi.listCollections({
        customer_id: 'cust-001',
        page: 1,
        pagesize: 10,
      });
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/ar/collections', {
        params: { customer_id: 'cust-001', page: 1, pagesize: 10 },
      });
    });

    it('createCollection should call POST /ar/collections with data', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      const data = { customer_id: 'cust-001', amount: 5000 };
      await receivablePayableApi.createCollection(data);
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith('/ar/collections', data);
    });

    it('listPayments should call GET /ap/payments with params', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      await receivablePayableApi.listPayments({ supplier_id: 'supp-001', page: 1, pagesize: 10 });
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/ap/payments', {
        params: { supplier_id: 'supp-001', page: 1, pagesize: 10 },
      });
    });

    it('createPayment should call POST /ap/payments with data', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      const data = { supplier_id: 'supp-001', amount: 3000 };
      await receivablePayableApi.createPayment(data);
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith('/ap/payments', data);
    });

    it('reconcile should call POST /reconcile with params', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      const params = { type: 'ar', invoice_id: 'inv-001', record_ids: ['rec-001'] };
      await receivablePayableApi.reconcile(params);
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith('/reconcile', params);
    });

    it('autoReconcile should call POST /reconcile/auto with params', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      const params = { type: 'ap', entity_id: 'supp-001', period: '2024-01' };
      await receivablePayableApi.autoReconcile(params);
      const instance = mockInstance;
      expect(instance.post).toHaveBeenCalledWith('/reconcile/auto', params);
    });

    it('getReceivableAging should call GET /ar/aging with params', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      await receivablePayableApi.getReceivableAging({ as_of_date: '2024-01-31' });
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/ar/aging', {
        params: { as_of_date: '2024-01-31' },
      });
    });

    it('getPayableAging should call GET /ap/aging with params', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      await receivablePayableApi.getPayableAging({ as_of_date: '2024-01-31' });
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/ap/aging', {
        params: { as_of_date: '2024-01-31' },
      });
    });
  });

  describe('reportApi', () => {
    it('getBalanceSheet should call GET /reports/balance-sheet with params', async () => {
      const { reportApi } = await import('../report');
      await reportApi.getBalanceSheet({ period: '2024-01', company_id: 'comp-001' });
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/reports/balance-sheet', {
        params: { period: '2024-01', company_id: 'comp-001' },
      });
    });

    it('getIncomeStatement should call GET /reports/income-statement with params', async () => {
      const { reportApi } = await import('../report');
      await reportApi.getIncomeStatement({ period: '2024-01', company_id: 'comp-001' });
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/reports/income-statement', {
        params: { period: '2024-01', company_id: 'comp-001' },
      });
    });

    it('getCashFlowStatement should call GET /reports/cash-flow with params', async () => {
      const { reportApi } = await import('../report');
      await reportApi.getCashFlowStatement({ period: '2024-01', company_id: 'comp-001' });
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/reports/cash-flow', {
        params: { period: '2024-01', company_id: 'comp-001' },
      });
    });

    it('getAccountBalanceReport should call GET /reports/account-balance with params', async () => {
      const { reportApi } = await import('../report');
      await reportApi.getAccountBalanceReport({ company_id: 'comp-001', period: '2024-01' });
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/reports/account-balance', {
        params: { company_id: 'comp-001', period: '2024-01' },
      });
    });

    it('getAccountLedger should call GET /reports/account-ledger with params', async () => {
      const { reportApi } = await import('../report');
      await reportApi.getAccountLedger({
        account_id: 'acc-001',
        start_period: '2024-01',
        end_period: '2024-03',
      });
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/reports/account-ledger', {
        params: { account_id: 'acc-001', start_period: '2024-01', end_period: '2024-03' },
      });
    });

    it('getDimensionDetail should call GET /reports/dimension-detail with params', async () => {
      const { reportApi } = await import('../report');
      await reportApi.getDimensionDetail({
        dimension: 'department',
        dimension_id: 'dept-001',
        start_period: '2024-01',
        end_period: '2024-03',
      });
      const instance = mockInstance;
      expect(instance.get).toHaveBeenCalledWith('/reports/dimension-detail', {
        params: {
          dimension: 'department',
          dimension_id: 'dept-001',
          start_period: '2024-01',
          end_period: '2024-03',
        },
      });
    });
  });
});
