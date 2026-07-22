import { createMockProvider, authHeaders } from './setup';
import axios from 'axios';

describe('Finance API Contract', () => {
  const provider = createMockProvider('topems-finance');
  const token = 'valid-finance-token';

  it('should return financial dashboard data', async () => {
    provider
      .given('tenant has financial data')
      .uponReceiving('a request for financial dashboard')
      .withRequest({
        method: 'GET',
        path: '/api/finance/dashboard',
        headers: authHeaders(token),
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          code: 0,
          message: 'success',
          data: {
            totalAssets: '1000000.00',
            totalLiabilities: '300000.00',
            totalEquity: '700000.00',
            monthlyRevenue: '50000.00',
            monthlyExpense: '30000.00',
            monthlyProfit: '20000.00',
            cashFlow: '15000.00',
          },
        },
      });

    await provider.executeTest(async (mockServer) => {
      const response = await axios.get(`${mockServer.url}/api/finance/dashboard`, {
        headers: authHeaders(token),
      });

      expect(response.status).toBe(200);
      expect(response.data.code).toBe(0);
      expect(response.data.data).toHaveProperty('totalAssets');
      expect(response.data.data).toHaveProperty('monthlyRevenue');
      expect(response.data.data).toHaveProperty('monthlyProfit');
    });
  });

  it('should list accounting subjects', async () => {
    provider
      .given('tenant has accounting subjects')
      .uponReceiving('a request to list accounting subjects')
      .withRequest({
        method: 'GET',
        path: '/api/finance/accounts',
        headers: authHeaders(token),
        query: { page: '1', page_size: '10' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          code: 0,
          message: 'success',
          data: {
            items: [
              {
                id: 'acc-001',
                code: '1001',
                name: '库存现金',
                category: 'asset',
                level: 1,
                parentId: null,
              },
              {
                id: 'acc-002',
                code: '1002',
                name: '银行存款',
                category: 'asset',
                level: 1,
                parentId: null,
              },
            ],
            total: 2,
            page: 1,
            pageSize: 10,
          },
        },
      });

    await provider.executeTest(async (mockServer) => {
      const response = await axios.get(`${mockServer.url}/api/finance/accounts`, {
        headers: authHeaders(token),
        params: { page: 1, page_size: 10 },
      });

      expect(response.status).toBe(200);
      expect(response.data.code).toBe(0);
      expect(Array.isArray(response.data.data.items)).toBe(true);
      expect(response.data.data.items[0]).toHaveProperty('code', '1001');
      expect(response.data.data.items[0]).toHaveProperty('name', '库存现金');
    });
  });

  it('should list vouchers', async () => {
    provider
      .given('tenant has financial vouchers')
      .uponReceiving('a request to list financial vouchers')
      .withRequest({
        method: 'GET',
        path: '/api/finance/vouchers',
        headers: authHeaders(token),
        query: { page: '1', page_size: '10' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          code: 0,
          message: 'success',
          data: {
            items: [
              {
                id: 'voucher-001',
                voucherNo: 'VOUCHER-2024-0001',
                period: '202401',
                status: 'posted',
                totalDebit: '10000.00',
                totalCredit: '10000.00',
                createdAt: '2024-01-15T10:00:00Z',
              },
            ],
            total: 1,
            page: 1,
            pageSize: 10,
          },
        },
      });

    await provider.executeTest(async (mockServer) => {
      const response = await axios.get(`${mockServer.url}/api/finance/vouchers`, {
        headers: authHeaders(token),
        params: { page: 1, page_size: 10 },
      });

      expect(response.status).toBe(200);
      expect(response.data.code).toBe(0);
      expect(response.data.data.items[0]).toHaveProperty('voucherNo');
      expect(response.data.data.items[0]).toHaveProperty('status', 'posted');
    });
  });

  it('should create a new voucher', async () => {
    const voucherData = {
      voucherDate: '2024-01-15',
      period: '202401',
      lines: [
        { accountCode: '1001', debit: '5000', credit: '0', description: '现金收入' },
        { accountCode: '6001', debit: '0', credit: '5000', description: '主营业务收入' },
      ],
    };

    provider
      .given('voucher creation is allowed')
      .uponReceiving('a request to create a voucher')
      .withRequest({
        method: 'POST',
        path: '/api/finance/vouchers',
        headers: authHeaders(token),
        body: voucherData,
      })
      .willRespondWith({
        status: 201,
        headers: { 'Content-Type': 'application/json' },
        body: {
          code: 0,
          message: 'success',
          data: {
            id: 'voucher-new-001',
            voucherNo: 'VOUCHER-2024-0002',
            status: 'draft',
            totalDebit: '5000.00',
            totalCredit: '5000.00',
          },
        },
      });

    await provider.executeTest(async (mockServer) => {
      const response = await axios.post(`${mockServer.url}/api/finance/vouchers`, voucherData, {
        headers: authHeaders(token),
      });

      expect(response.status).toBe(201);
      expect(response.data.code).toBe(0);
      expect(response.data.data.status).toBe('draft');
    });
  });

  it('should return trial balance', async () => {
    provider
      .given('tenant has posted vouchers')
      .uponReceiving('a request for trial balance')
      .withRequest({
        method: 'GET',
        path: '/api/finance/trial-balance/current',
        headers: authHeaders(token),
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          code: 0,
          message: 'success',
          data: {
            period: '202401',
            items: [
              { code: '1001', name: '库存现金', debit: '5000', credit: '3000', balance: '2000' },
              { code: '1002', name: '银行存款', debit: '10000', credit: '2000', balance: '8000' },
            ],
            totalDebit: '15000',
            totalCredit: '5000',
          },
        },
      });

    await provider.executeTest(async (mockServer) => {
      const response = await axios.get(`${mockServer.url}/api/finance/trial-balance/current`, {
        headers: authHeaders(token),
      });

      expect(response.status).toBe(200);
      expect(response.data.code).toBe(0);
      expect(response.data.data.period).toBe('202401');
    });
  });
});
