import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');
vi.mock('../client', () => ({
  downloadBlob: vi.fn(),
}));

const mockAxios = axios as vi.Mocked<typeof axios>;

describe('Finance Module API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    mockAxios.create.mockReturnValue(mockInstance);
  });

  describe('accountApi', () => {
    it('list should call GET /finance/accounts with params', async () => {
      const { accountApi } = await import('../account');
      await accountApi.list({ category: 'asset', page: 1, pagesize: 10 });
      expect(mockAxios.create).toHaveBeenCalled();
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/accounts', { params: { category: 'asset', page: 1, pagesize: 10 } });
    });

    it('getTree should call GET /finance/accounts/tree with params', async () => {
      const { accountApi } = await import('../account');
      await accountApi.getTree({ category: 'asset' });
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/accounts/tree', { params: { category: 'asset' } });
    });

    it('get should call GET /finance/accounts/:id', async () => {
      const { accountApi } = await import('../account');
      await accountApi.get('acc-001');
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/accounts/acc-001');
    });

    it('create should call POST /finance/accounts with data', async () => {
      const { accountApi } = await import('../account');
      const data = { name: 'Cash', code: '1001' };
      await accountApi.create(data);
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/finance/accounts', data);
    });

    it('update should call PUT /finance/accounts/:id with data', async () => {
      const { accountApi } = await import('../account');
      const data = { name: 'Updated Cash' };
      await accountApi.update('acc-001', data);
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.put).toHaveBeenCalledWith('/finance/accounts/acc-001', data);
    });

    it('delete should call DELETE /finance/accounts/:id', async () => {
      const { accountApi } = await import('../account');
      await accountApi.delete('acc-001');
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.delete).toHaveBeenCalledWith('/finance/accounts/acc-001');
    });

    it('batchCreateChildren should call POST /finance/accounts/:id/children-batch', async () => {
      const { accountApi } = await import('../account');
      const accounts = [{ name: 'Sub Account 1' }, { name: 'Sub Account 2' }];
      await accountApi.batchCreateChildren('acc-001', accounts);
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/finance/accounts/acc-001/children-batch', { accounts });
    });

    it('getBalances should call GET /finance/accounts/balances with params', async () => {
      const { accountApi } = await import('../account');
      await accountApi.getBalances({ period: '2024-01' });
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/accounts/balances', { params: { period: '2024-01' } });
    });

    it('getOpeningBalances should call GET /erp/finance/accounts/opening-balances with params', async () => {
      const { accountApi } = await import('../account');
      await accountApi.getOpeningBalances({ period: '2024-01', page: 1, pagesize: 10 });
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/erp/finance/accounts/opening-balances', { params: { period: '2024-01', page: 1, pagesize: 10 } });
    });

    it('setOpeningBalance should call POST /erp/finance/accounts/:id/opening-balance with data', async () => {
      const { accountApi } = await import('../account');
      const data = { debit: 10000 };
      await accountApi.setOpeningBalance('acc-001', data);
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/erp/finance/accounts/acc-001/opening-balance', data);
    });

    it('carryForwardOpeningBalance should call POST /erp/finance/accounts/opening-balances/carry-forward with params', async () => {
      const { accountApi } = await import('../account');
      await accountApi.carryForwardOpeningBalance({ from_period: '2023-12', to_period: '2024-01' });
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/erp/finance/accounts/opening-balances/carry-forward', { from_period: '2023-12', to_period: '2024-01' });
    });
  });

  describe('counterpartyFinanceApi', () => {
    it('getCustomerFinance should call GET /finance/counterparty/customers/:id', async () => {
      const { counterpartyFinanceApi } = await import('../counterparty');
      await counterpartyFinanceApi.getCustomerFinance('cust-001');
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/counterparty/customers/cust-001');
    });

    it('updateCustomerFinance should call PUT /finance/counterparty/customers/:id with data', async () => {
      const { counterpartyFinanceApi } = await import('../counterparty');
      const data = { credit_limit: 100000 };
      await counterpartyFinanceApi.updateCustomerFinance('cust-001', data);
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.put).toHaveBeenCalledWith('/finance/counterparty/customers/cust-001', data);
    });

    it('getSupplierFinance should call GET /finance/counterparty/suppliers/:id', async () => {
      const { counterpartyFinanceApi } = await import('../counterparty');
      await counterpartyFinanceApi.getSupplierFinance('supp-001');
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/counterparty/suppliers/supp-001');
    });

    it('updateSupplierFinance should call PUT /finance/counterparty/suppliers/:id with data', async () => {
      const { counterpartyFinanceApi } = await import('../counterparty');
      const data = { payment_terms: 'net-30' };
      await counterpartyFinanceApi.updateSupplierFinance('supp-001', data);
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.put).toHaveBeenCalledWith('/finance/counterparty/suppliers/supp-001', data);
    });

    it('listCustomersWithFinance should call GET /finance/counterparty/customers with params', async () => {
      const { counterpartyFinanceApi } = await import('../counterparty');
      await counterpartyFinanceApi.listCustomersWithFinance({ status: 'active', page: 1, pagesize: 10 });
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/counterparty/customers', { params: { status: 'active', page: 1, pagesize: 10 } });
    });

    it('listSuppliersWithFinance should call GET /finance/counterparty/suppliers with params', async () => {
      const { counterpartyFinanceApi } = await import('../counterparty');
      await counterpartyFinanceApi.listSuppliersWithFinance({ status: 'active', page: 1, pagesize: 10 });
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/counterparty/suppliers', { params: { status: 'active', page: 1, pagesize: 10 } });
    });
  });

  describe('voucherApi', () => {
    it('list should call GET /finance/vouchers with params', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.list({ period: '2024-01', page: 1, pagesize: 10 });
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/vouchers', { params: { period: '2024-01', page: 1, pagesize: 10 } });
    });

    it('get should call GET /finance/vouchers/:id', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.get('vou-001');
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/vouchers/vou-001');
    });

    it('getWithEntries should call GET /finance/vouchers/:id/entries', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.getWithEntries('vou-001');
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/vouchers/vou-001/entries');
    });

    it('create should call POST /finance/vouchers with data', async () => {
      const { voucherApi } = await import('../voucher');
      const data = { voucher_no: 'VOU-2024-001', entries: [] };
      await voucherApi.create(data);
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/finance/vouchers', data);
    });

    it('batchCreate should call POST /finance/vouchers/batch with vouchers', async () => {
      const { voucherApi } = await import('../voucher');
      const vouchers = [{ voucher_no: 'VOU-001' }, { voucher_no: 'VOU-002' }];
      await voucherApi.batchCreate(vouchers);
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/finance/vouchers/batch', { vouchers });
    });

    it('update should call PUT /finance/vouchers/:id with data', async () => {
      const { voucherApi } = await import('../voucher');
      const data = { memo: 'Updated memo' };
      await voucherApi.update('vou-001', data);
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.put).toHaveBeenCalledWith('/finance/vouchers/vou-001', data);
    });

    it('delete should call DELETE /finance/vouchers/:id', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.delete('vou-001');
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.delete).toHaveBeenCalledWith('/finance/vouchers/vou-001');
    });

    it('batchDelete should call POST /finance/vouchers/batch-delete with ids', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.batchDelete(['vou-001', 'vou-002']);
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/finance/vouchers/batch-delete', { ids: ['vou-001', 'vou-002'] });
    });

    it('submit should call POST /finance/vouchers/:id/submit', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.submit('vou-001');
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/finance/vouchers/vou-001/submit', {});
    });

    it('approve should call POST /finance/vouchers/:id/approve', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.approve('vou-001');
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/finance/vouchers/vou-001/approve', {});
    });

    it('batchApprove should call POST /finance/vouchers/batch-approve with ids', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.batchApprove(['vou-001', 'vou-002']);
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/finance/vouchers/batch-approve', { ids: ['vou-001', 'vou-002'] });
    });

    it('unapprove should call POST /finance/vouchers/:id/unapprove', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.unapprove('vou-001');
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/finance/vouchers/vou-001/unapprove', {});
    });

    it('post should call POST /finance/vouchers/:id/post', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.post('vou-001');
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/finance/vouchers/vou-001/post', {});
    });

    it('batchPost should call POST /finance/vouchers/batch-post with ids', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.batchPost(['vou-001', 'vou-002']);
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/finance/vouchers/batch-post', { ids: ['vou-001', 'vou-002'] });
    });

    it('reverse should call POST /finance/vouchers/:id/reverse with reason', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.reverse('vou-001', 'Wrong entry');
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/finance/vouchers/vou-001/reverse', { reason: 'Wrong entry' });
    });

    it('getNextVoucherNo should call GET /finance/vouchers/next-no with params', async () => {
      const { voucherApi } = await import('../voucher');
      await voucherApi.getNextVoucherNo({ period: '2024-01', voucher_type: 'journal' });
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/vouchers/next-no', { params: { period: '2024-01', voucher_type: 'journal' } });
    });

    it('generateByTemplate should call POST /finance/vouchers/generate with params', async () => {
      const { voucherApi } = await import('../voucher');
      const params = { template_id: 'temp-001', source_data: { invoice_id: 'inv-001' } };
      await voucherApi.generateByTemplate(params);
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/finance/vouchers/generate', params);
    });
  });

  describe('voucherTemplateApi', () => {
    it('list should call GET /finance/voucher-templates with params', async () => {
      const { voucherTemplateApi } = await import('../voucherTemplate');
      await voucherTemplateApi.list({ type: 'journal', page: 1, pagesize: 10 });
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/voucher-templates', { params: { type: 'journal', page: 1, pagesize: 10 } });
    });

    it('get should call GET /finance/voucher-templates/:id', async () => {
      const { voucherTemplateApi } = await import('../voucherTemplate');
      await voucherTemplateApi.get('temp-001');
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/voucher-templates/temp-001');
    });

    it('create should call POST /finance/voucher-templates with data', async () => {
      const { voucherTemplateApi } = await import('../voucherTemplate');
      const data = { name: 'Journal Template', type: 'journal' };
      await voucherTemplateApi.create(data);
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/finance/voucher-templates', data);
    });

    it('update should call PUT /finance/voucher-templates/:id with data', async () => {
      const { voucherTemplateApi } = await import('../voucherTemplate');
      const data = { name: 'Updated Template' };
      await voucherTemplateApi.update('temp-001', data);
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.put).toHaveBeenCalledWith('/finance/voucher-templates/temp-001', data);
    });

    it('delete should call DELETE /finance/voucher-templates/:id', async () => {
      const { voucherTemplateApi } = await import('../voucherTemplate');
      await voucherTemplateApi.delete('temp-001');
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.delete).toHaveBeenCalledWith('/finance/voucher-templates/temp-001');
    });

    it('copy should call POST /finance/voucher-templates/:id/copy with name', async () => {
      const { voucherTemplateApi } = await import('../voucherTemplate');
      await voucherTemplateApi.copy('temp-001', 'Copy of Template');
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/finance/voucher-templates/temp-001/copy', { name: 'Copy of Template' });
    });

    it('preview should call POST /finance/voucher-templates/:id/preview with source_data', async () => {
      const { voucherTemplateApi } = await import('../voucherTemplate');
      const sourceData = { amount: 1000 };
      await voucherTemplateApi.preview('temp-001', sourceData);
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/finance/voucher-templates/temp-001/preview', { source_data: sourceData });
    });

    it('setDefault should call POST /finance/voucher-templates/:id/set-default', async () => {
      const { voucherTemplateApi } = await import('../voucherTemplate');
      await voucherTemplateApi.setDefault('temp-001');
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/finance/voucher-templates/temp-001/set-default', {});
    });
  });

  describe('periodApi', () => {
    it('getCurrent should call GET /finance/period/current', async () => {
      const { periodApi } = await import('../period');
      await periodApi.getCurrent();
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/period/current');
    });

    it('list should call GET /finance/periods with params', async () => {
      const { periodApi } = await import('../period');
      await periodApi.list({ year: 2024, status: 'open' });
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/periods', { params: { year: 2024, status: 'open' } });
    });

    it('open should call POST /finance/periods/open with period', async () => {
      const { periodApi } = await import('../period');
      await periodApi.open('2024-01');
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/finance/periods/open', { period: '2024-01' });
    });

    it('close should call POST /finance/periods/close with period', async () => {
      const { periodApi } = await import('../period');
      await periodApi.close('2024-01');
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/finance/periods/close', { period: '2024-01' });
    });

    it('closePeriodIncome should call POST /finance/periods/close-income with period', async () => {
      const { periodApi } = await import('../period');
      await periodApi.closePeriodIncome('2024-12');
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/finance/periods/close-income', { period: '2024-12' });
    });

    it('yearEndClose should call POST /finance/periods/year-end-close with year', async () => {
      const { periodApi } = await import('../period');
      await periodApi.yearEndClose(2024);
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/finance/periods/year-end-close', { year: 2024 });
    });
  });

  describe('receivablePayableApi', () => {
    it('listSalesInvoices should call GET /erp/receivables with params', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      await receivablePayableApi.listSalesInvoices({ customer_id: 'cust-001', page: 1, pagesize: 10 });
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/erp/receivables', { params: { customer_id: 'cust-001', page: 1, pagesize: 10 } });
    });

    it('getSalesInvoice should call GET /erp/receivables/:id', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      await receivablePayableApi.getSalesInvoice('inv-001');
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/erp/receivables/inv-001');
    });

    it('createSalesInvoice should call POST /erp/receivables with data', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      const data = { customer_id: 'cust-001', amount: 10000 };
      await receivablePayableApi.createSalesInvoice(data);
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/erp/receivables', data);
    });

    it('updateSalesInvoice should call PUT /erp/receivables/:id with data', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      const data = { amount: 15000 };
      await receivablePayableApi.updateSalesInvoice('inv-001', data);
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.put).toHaveBeenCalledWith('/erp/receivables/inv-001', data);
    });

    it('deleteSalesInvoice should call DELETE /erp/receivables/:id', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      await receivablePayableApi.deleteSalesInvoice('inv-001');
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.delete).toHaveBeenCalledWith('/erp/receivables/inv-001');
    });

    it('listPurchaseInvoices should call GET /erp/payables with params', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      await receivablePayableApi.listPurchaseInvoices({ supplier_id: 'supp-001', page: 1, pagesize: 10 });
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/erp/payables', { params: { supplier_id: 'supp-001', page: 1, pagesize: 10 } });
    });

    it('getPurchaseInvoice should call GET /erp/payables/:id', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      await receivablePayableApi.getPurchaseInvoice('inv-002');
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/erp/payables/inv-002');
    });

    it('createPurchaseInvoice should call POST /erp/payables with data', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      const data = { supplier_id: 'supp-001', amount: 5000 };
      await receivablePayableApi.createPurchaseInvoice(data);
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/erp/payables', data);
    });

    it('updatePurchaseInvoice should call PUT /erp/payables/:id with data', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      const data = { amount: 6000 };
      await receivablePayableApi.updatePurchaseInvoice('inv-002', data);
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.put).toHaveBeenCalledWith('/erp/payables/inv-002', data);
    });

    it('deletePurchaseInvoice should call DELETE /erp/payables/:id', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      await receivablePayableApi.deletePurchaseInvoice('inv-002');
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.delete).toHaveBeenCalledWith('/erp/payables/inv-002');
    });

    it('listCollections should call GET /finance/ar/collections with params', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      await receivablePayableApi.listCollections({ customer_id: 'cust-001', page: 1, pagesize: 10 });
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/ar/collections', { params: { customer_id: 'cust-001', page: 1, pagesize: 10 } });
    });

    it('createCollection should call POST /finance/ar/collections with data', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      const data = { customer_id: 'cust-001', amount: 5000 };
      await receivablePayableApi.createCollection(data);
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/finance/ar/collections', data);
    });

    it('listPayments should call GET /finance/ap/payments with params', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      await receivablePayableApi.listPayments({ supplier_id: 'supp-001', page: 1, pagesize: 10 });
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/ap/payments', { params: { supplier_id: 'supp-001', page: 1, pagesize: 10 } });
    });

    it('createPayment should call POST /finance/ap/payments with data', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      const data = { supplier_id: 'supp-001', amount: 3000 };
      await receivablePayableApi.createPayment(data);
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/finance/ap/payments', data);
    });

    it('reconcile should call POST /finance/reconcile with params', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      const params = { type: 'ar', invoice_id: 'inv-001', record_ids: ['rec-001'] };
      await receivablePayableApi.reconcile(params);
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/finance/reconcile', params);
    });

    it('autoReconcile should call POST /finance/reconcile/auto with params', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      const params = { type: 'ap', entity_id: 'supp-001', period: '2024-01' };
      await receivablePayableApi.autoReconcile(params);
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.post).toHaveBeenCalledWith('/finance/reconcile/auto', params);
    });

    it('getReceivableAging should call GET /finance/ar/aging with params', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      await receivablePayableApi.getReceivableAging({ as_of_date: '2024-01-31' });
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/ar/aging', { params: { as_of_date: '2024-01-31' } });
    });

    it('getPayableAging should call GET /finance/ap/aging with params', async () => {
      const { receivablePayableApi } = await import('../receivablePayable');
      await receivablePayableApi.getPayableAging({ as_of_date: '2024-01-31' });
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/ap/aging', { params: { as_of_date: '2024-01-31' } });
    });
  });

  describe('reportApi', () => {
    it('getBalanceSheet should call GET /finance/reports/balance-sheet with params', async () => {
      const { reportApi } = await import('../report');
      await reportApi.getBalanceSheet({ period: '2024-01', company_id: 'comp-001' });
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/reports/balance-sheet', { params: { period: '2024-01', company_id: 'comp-001' } });
    });

    it('getIncomeStatement should call GET /finance/reports/income-statement with params', async () => {
      const { reportApi } = await import('../report');
      await reportApi.getIncomeStatement({ period: '2024-01', company_id: 'comp-001' });
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/reports/income-statement', { params: { period: '2024-01', company_id: 'comp-001' } });
    });

    it('getCashFlowStatement should call GET /finance/reports/cash-flow with params', async () => {
      const { reportApi } = await import('../report');
      await reportApi.getCashFlowStatement({ period: '2024-01', company_id: 'comp-001' });
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/reports/cash-flow', { params: { period: '2024-01', company_id: 'comp-001' } });
    });

    it('getAccountBalanceReport should call GET /finance/reports/account-balance with params', async () => {
      const { reportApi } = await import('../report');
      await reportApi.getAccountBalanceReport({ company_id: 'comp-001', period: '2024-01' });
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/reports/account-balance', { params: { company_id: 'comp-001', period: '2024-01' } });
    });

    it('getAccountLedger should call GET /finance/reports/account-ledger with params', async () => {
      const { reportApi } = await import('../report');
      await reportApi.getAccountLedger({ account_id: 'acc-001', start_period: '2024-01', end_period: '2024-03' });
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/reports/account-ledger', { params: { account_id: 'acc-001', start_period: '2024-01', end_period: '2024-03' } });
    });

    it('getDimensionDetail should call GET /finance/reports/dimension-detail with params', async () => {
      const { reportApi } = await import('../report');
      await reportApi.getDimensionDetail({ dimension: 'department', dimension_id: 'dept-001', start_period: '2024-01', end_period: '2024-03' });
      const instance = mockAxios.create.mock.results[0].value;
      expect(instance.get).toHaveBeenCalledWith('/finance/reports/dimension-detail', { params: { dimension: 'department', dimension_id: 'dept-001', start_period: '2024-01', end_period: '2024-03' } });
    });
  });
});