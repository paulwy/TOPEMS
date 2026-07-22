import { test, expect } from '@playwright/test';
import { API_URL, TEST_ACCOUNTS, apiLogin, authRequest, ensureTestAccounts } from '../utils/testUtils';

test.beforeAll(async () => {
  await ensureTestAccounts();
});

test.describe('ERP Asset - Current Asset Management', () => {
  let token: string;
  let createdAssetId: string | null = null;

  test.beforeEach(async () => {
    token = await apiLogin(TEST_ACCOUNTS.superadmin.username, TEST_ACCOUNTS.superadmin.password);
  });

  test('should list current assets', async () => {
    const response = await authRequest(token, 'GET', '/api/v1/erp/current-asset/list');
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('items');
    expect(Array.isArray(data.data.items)).toBe(true);
  });

  test('should create a current asset', async () => {
    const timestamp = Date.now();
    const assetData = {
      name: `测试流动资产 ${timestamp}`,
      type: 'cash',
      amount: 50000.00,
      location: '财务部',
      description: '自动化测试流动资产',
    };

    const response = await authRequest(token, 'POST', '/api/v1/erp/current-asset/', assetData);
    expect([200, 201]).toContain(response.status);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id');
    createdAssetId = data.data.id;
  });

  test('should get a single current asset', async () => {
    if (!createdAssetId) {
      test.skip();
    }

    const response = await authRequest(token, 'GET', `/api/v1/erp/current-asset/${createdAssetId}`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id', createdAssetId);
  });

  test('should update a current asset', async () => {
    if (!createdAssetId) {
      test.skip();
    }

    const updateData = {
      name: '更新后的测试流动资产',
      amount: 60000.00,
    };

    const response = await authRequest(token, 'PUT', `/api/v1/erp/current-asset/${createdAssetId}`, updateData);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('should delete a current asset', async () => {
    if (!createdAssetId) {
      test.skip();
    }

    const response = await authRequest(token, 'DELETE', `/api/v1/erp/current-asset/${createdAssetId}`);
    expect([200, 204]).toContain(response.status);

    const getResponse = await authRequest(token, 'GET', `/api/v1/erp/current-asset/${createdAssetId}`);
    expect([404, 410]).toContain(getResponse.status);
  });
});

test.describe('ERP Asset - Fixed Asset Management', () => {
  let token: string;
  let createdAssetId: string | null = null;

  test.beforeEach(async () => {
    token = await apiLogin(TEST_ACCOUNTS.superadmin.username, TEST_ACCOUNTS.superadmin.password);
  });

  test('should list fixed assets', async () => {
    const response = await authRequest(token, 'GET', '/api/v1/erp/fixed-asset/list');
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('items');
    expect(Array.isArray(data.data.items)).toBe(true);
  });

  test('should create a fixed asset', async () => {
    const timestamp = Date.now();
    const assetData = {
      name: `测试固定资产 ${timestamp}`,
      type: 'equipment',
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_price: 100000.00,
      depreciation_method: 'straight_line',
      useful_life: 5,
      location: '生产车间',
      status: 'in_use',
    };

    const response = await authRequest(token, 'POST', '/api/v1/erp/fixed-asset/', assetData);
    expect([200, 201]).toContain(response.status);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id');
    createdAssetId = data.data.id;
  });

  test('should get a single fixed asset', async () => {
    if (!createdAssetId) {
      test.skip();
    }

    const response = await authRequest(token, 'GET', `/api/v1/erp/fixed-asset/${createdAssetId}`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id', createdAssetId);
  });

  test('should update a fixed asset', async () => {
    if (!createdAssetId) {
      test.skip();
    }

    const updateData = {
      name: '更新后的测试固定资产',
      status: 'maintenance',
    };

    const response = await authRequest(token, 'PUT', `/api/v1/erp/fixed-asset/${createdAssetId}`, updateData);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('should delete a fixed asset', async () => {
    if (!createdAssetId) {
      test.skip();
    }

    const response = await authRequest(token, 'DELETE', `/api/v1/erp/fixed-asset/${createdAssetId}`);
    expect([200, 204]).toContain(response.status);

    const getResponse = await authRequest(token, 'GET', `/api/v1/erp/fixed-asset/${createdAssetId}`);
    expect([404, 410]).toContain(getResponse.status);
  });
});

test.describe('ERP Asset - Asset Depreciation', () => {
  let token: string;
  let createdAssetId: string | null = null;

  test.beforeEach(async () => {
    token = await apiLogin(TEST_ACCOUNTS.superadmin.username, TEST_ACCOUNTS.superadmin.password);
  });

  test('should calculate asset depreciation', async () => {
    const timestamp = Date.now();
    const assetData = {
      name: `折旧测试资产 ${timestamp}`,
      type: 'equipment',
      purchase_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      purchase_price: 120000.00,
      depreciation_method: 'straight_line',
      useful_life: 5,
      location: '测试部门',
      status: 'in_use',
    };

    const createResponse = await authRequest(token, 'POST', '/api/v1/erp/fixed-asset/', assetData);
    if ([200, 201].includes(createResponse.status)) {
      const createData = await createResponse.json();
      createdAssetId = createData.data.id;

      const response = await authRequest(token, 'GET', `/api/v1/erp/fixed-asset/${createdAssetId}/depreciation`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('accumulated_depreciation');
      expect(data.data).toHaveProperty('net_value');

      await authRequest(token, 'DELETE', `/api/v1/erp/fixed-asset/${createdAssetId}`);
    }
  });
});

test.describe('ERP Asset - Asset Transfer', () => {
  let token: string;

  test.beforeEach(async () => {
    token = await apiLogin(TEST_ACCOUNTS.superadmin.username, TEST_ACCOUNTS.superadmin.password);
  });

  test('should transfer asset between departments', async () => {
    const timestamp = Date.now();
    const assetData = {
      name: `转移测试资产 ${timestamp}`,
      type: 'equipment',
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_price: 50000.00,
      depreciation_method: 'straight_line',
      useful_life: 5,
      location: '原部门',
      status: 'in_use',
    };

    const createResponse = await authRequest(token, 'POST', '/api/v1/erp/fixed-asset/', assetData);
    if ([200, 201].includes(createResponse.status)) {
      const createData = await createResponse.json();
      const assetId = createData.data.id;

      const transferData = {
        new_location: '新部门',
        transfer_date: new Date().toISOString().split('T')[0],
        reason: '部门调整',
      };

      const response = await authRequest(token, 'PUT', `/api/v1/erp/fixed-asset/${assetId}/transfer`, transferData);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      await authRequest(token, 'DELETE', `/api/v1/erp/fixed-asset/${assetId}`);
    }
  });
});

test.describe('ERP Asset - Asset Disposal', () => {
  let token: string;

  test.beforeEach(async () => {
    token = await apiLogin(TEST_ACCOUNTS.superadmin.username, TEST_ACCOUNTS.superadmin.password);
  });

  test('should dispose an asset', async () => {
    const timestamp = Date.now();
    const assetData = {
      name: `报废测试资产 ${timestamp}`,
      type: 'equipment',
      purchase_date: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      purchase_price: 80000.00,
      depreciation_method: 'straight_line',
      useful_life: 5,
      location: '测试部门',
      status: 'in_use',
    };

    const createResponse = await authRequest(token, 'POST', '/api/v1/erp/fixed-asset/', assetData);
    if ([200, 201].includes(createResponse.status)) {
      const createData = await createResponse.json();
      const assetId = createData.data.id;

      const disposalData = {
        disposal_date: new Date().toISOString().split('T')[0],
        disposal_method: 'scrap',
        reason: '资产报废',
        residual_value: 0,
      };

      const response = await authRequest(token, 'PUT', `/api/v1/erp/fixed-asset/${assetId}/dispose`, disposalData);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      await authRequest(token, 'DELETE', `/api/v1/erp/fixed-asset/${assetId}`);
    }
  });
});

test.afterAll(async () => {
  console.log('\n========================================');
  console.log('  ERP Asset Module Tests Completed');
  console.log('========================================');
});