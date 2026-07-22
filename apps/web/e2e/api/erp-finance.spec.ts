import { test, expect } from '@playwright/test';
import { API_URL, TEST_ACCOUNTS, apiLogin, authRequest, ensureTestAccounts } from '../utils/testUtils';

test.beforeAll(async () => {
  await ensureTestAccounts();
});

test.describe('ERP Finance - Budget Management', () => {
  let token: string;
  let createdBudgetId: string | null = null;

  test.beforeEach(async () => {
    token = await apiLogin(TEST_ACCOUNTS.superadmin.username, TEST_ACCOUNTS.superadmin.password);
  });

  test('should list budgets', async () => {
    const response = await authRequest(token, 'GET', '/api/v1/erp/budget/list');
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('items');
    expect(Array.isArray(data.data.items)).toBe(true);
  });

  test('should create a budget', async () => {
    const timestamp = Date.now();
    const budgetData = {
      name: `测试预算 ${timestamp}`,
      department: '财务部',
      amount: 100000.00,
      year: new Date().getFullYear(),
      description: '自动化测试预算',
    };

    const response = await authRequest(token, 'POST', '/api/v1/erp/budget/', budgetData);
    expect([200, 201]).toContain(response.status);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id');
    createdBudgetId = data.data.id;
  });

  test('should get a single budget', async () => {
    if (!createdBudgetId) {
      test.skip();
    }

    const response = await authRequest(token, 'GET', `/api/v1/erp/budget/${createdBudgetId}`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id', createdBudgetId);
  });

  test('should update a budget', async () => {
    if (!createdBudgetId) {
      test.skip();
    }

    const updateData = {
      name: '更新后的测试预算',
      amount: 150000.00,
    };

    const response = await authRequest(token, 'PUT', `/api/v1/erp/budget/${createdBudgetId}`, updateData);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('should delete a budget', async () => {
    if (!createdBudgetId) {
      test.skip();
    }

    const response = await authRequest(token, 'DELETE', `/api/v1/erp/budget/${createdBudgetId}`);
    expect([200, 204]).toContain(response.status);

    const getResponse = await authRequest(token, 'GET', `/api/v1/erp/budget/${createdBudgetId}`);
    expect([404, 410]).toContain(getResponse.status);
  });
});

test.describe('ERP Finance - Expense Management', () => {
  let token: string;
  let createdExpenseId: string | null = null;

  test.beforeEach(async () => {
    token = await apiLogin(TEST_ACCOUNTS.superadmin.username, TEST_ACCOUNTS.superadmin.password);
  });

  test('should list expenses', async () => {
    const response = await authRequest(token, 'GET', '/api/v1/erp/expense/list');
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('items');
    expect(Array.isArray(data.data.items)).toBe(true);
  });

  test('should create an expense', async () => {
    const timestamp = Date.now();
    const expenseData = {
      title: `测试费用 ${timestamp}`,
      type: '差旅费',
      amount: 2000.00,
      date: new Date().toISOString().split('T')[0],
      description: '自动化测试费用报销',
    };

    const response = await authRequest(token, 'POST', '/api/v1/erp/expense/', expenseData);
    expect([200, 201]).toContain(response.status);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id');
    createdExpenseId = data.data.id;
  });

  test('should get a single expense', async () => {
    if (!createdExpenseId) {
      test.skip();
    }

    const response = await authRequest(token, 'GET', `/api/v1/erp/expense/${createdExpenseId}`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id', createdExpenseId);
  });

  test('should update an expense', async () => {
    if (!createdExpenseId) {
      test.skip();
    }

    const updateData = {
      title: '更新后的测试费用',
      amount: 2500.00,
    };

    const response = await authRequest(token, 'PUT', `/api/v1/erp/expense/${createdExpenseId}`, updateData);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('should delete an expense', async () => {
    if (!createdExpenseId) {
      test.skip();
    }

    const response = await authRequest(token, 'DELETE', `/api/v1/erp/expense/${createdExpenseId}`);
    expect([200, 204]).toContain(response.status);

    const getResponse = await authRequest(token, 'GET', `/api/v1/erp/expense/${createdExpenseId}`);
    expect([404, 410]).toContain(getResponse.status);
  });
});

test.describe('ERP Finance - Accounts Receivable', () => {
  let token: string;
  let createdReceivableId: string | null = null;

  test.beforeEach(async () => {
    token = await apiLogin(TEST_ACCOUNTS.superadmin.username, TEST_ACCOUNTS.superadmin.password);
  });

  test('should list receivables', async () => {
    const response = await authRequest(token, 'GET', '/api/v1/erp/receivable/list');
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('items');
    expect(Array.isArray(data.data.items)).toBe(true);
  });

  test('should create a receivable', async () => {
    const timestamp = Date.now();
    const receivableData = {
      customer_name: `测试客户 ${timestamp}`,
      amount: 50000.00,
      invoice_no: `INV-${timestamp}`,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending',
    };

    const response = await authRequest(token, 'POST', '/api/v1/erp/receivable/', receivableData);
    expect([200, 201]).toContain(response.status);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id');
    createdReceivableId = data.data.id;
  });

  test('should get a single receivable', async () => {
    if (!createdReceivableId) {
      test.skip();
    }

    const response = await authRequest(token, 'GET', `/api/v1/erp/receivable/${createdReceivableId}`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id', createdReceivableId);
  });

  test('should update a receivable', async () => {
    if (!createdReceivableId) {
      test.skip();
    }

    const updateData = {
      status: 'paid',
    };

    const response = await authRequest(token, 'PUT', `/api/v1/erp/receivable/${createdReceivableId}`, updateData);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('should delete a receivable', async () => {
    if (!createdReceivableId) {
      test.skip();
    }

    const response = await authRequest(token, 'DELETE', `/api/v1/erp/receivable/${createdReceivableId}`);
    expect([200, 204]).toContain(response.status);

    const getResponse = await authRequest(token, 'GET', `/api/v1/erp/receivable/${createdReceivableId}`);
    expect([404, 410]).toContain(getResponse.status);
  });
});

test.describe('ERP Finance - Accounts Payable', () => {
  let token: string;
  let createdPayableId: string | null = null;

  test.beforeEach(async () => {
    token = await apiLogin(TEST_ACCOUNTS.superadmin.username, TEST_ACCOUNTS.superadmin.password);
  });

  test('should list payables', async () => {
    const response = await authRequest(token, 'GET', '/api/v1/erp/payable/list');
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('items');
    expect(Array.isArray(data.data.items)).toBe(true);
  });

  test('should create a payable', async () => {
    const timestamp = Date.now();
    const payableData = {
      supplier_name: `测试供应商 ${timestamp}`,
      amount: 30000.00,
      invoice_no: `PO-${timestamp}`,
      due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending',
    };

    const response = await authRequest(token, 'POST', '/api/v1/erp/payable/', payableData);
    expect([200, 201]).toContain(response.status);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id');
    createdPayableId = data.data.id;
  });

  test('should get a single payable', async () => {
    if (!createdPayableId) {
      test.skip();
    }

    const response = await authRequest(token, 'GET', `/api/v1/erp/payable/${createdPayableId}`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id', createdPayableId);
  });

  test('should update a payable', async () => {
    if (!createdPayableId) {
      test.skip();
    }

    const updateData = {
      status: 'paid',
    };

    const response = await authRequest(token, 'PUT', `/api/v1/erp/payable/${createdPayableId}`, updateData);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('should delete a payable', async () => {
    if (!createdPayableId) {
      test.skip();
    }

    const response = await authRequest(token, 'DELETE', `/api/v1/erp/payable/${createdPayableId}`);
    expect([200, 204]).toContain(response.status);

    const getResponse = await authRequest(token, 'GET', `/api/v1/erp/payable/${createdPayableId}`);
    expect([404, 410]).toContain(getResponse.status);
  });
});

test.describe('ERP Finance - Bank Account Management', () => {
  let token: string;
  let createdAccountId: string | null = null;

  test.beforeEach(async () => {
    token = await apiLogin(TEST_ACCOUNTS.superadmin.username, TEST_ACCOUNTS.superadmin.password);
  });

  test('should list bank accounts', async () => {
    const response = await authRequest(token, 'GET', '/api/v1/erp/bank-account/list');
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('items');
    expect(Array.isArray(data.data.items)).toBe(true);
  });

  test('should create a bank account', async () => {
    const timestamp = Date.now();
    const accountData = {
      bank_name: '测试银行',
      account_no: `622202${timestamp}`,
      account_name: '测试账户',
      balance: 100000.00,
      currency: 'CNY',
    };

    const response = await authRequest(token, 'POST', '/api/v1/erp/bank-account/', accountData);
    expect([200, 201]).toContain(response.status);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id');
    createdAccountId = data.data.id;
  });

  test('should get a single bank account', async () => {
    if (!createdAccountId) {
      test.skip();
    }

    const response = await authRequest(token, 'GET', `/api/v1/erp/bank-account/${createdAccountId}`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id', createdAccountId);
  });

  test('should update a bank account', async () => {
    if (!createdAccountId) {
      test.skip();
    }

    const updateData = {
      balance: 120000.00,
    };

    const response = await authRequest(token, 'PUT', `/api/v1/erp/bank-account/${createdAccountId}`, updateData);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('should delete a bank account', async () => {
    if (!createdAccountId) {
      test.skip();
    }

    const response = await authRequest(token, 'DELETE', `/api/v1/erp/bank-account/${createdAccountId}`);
    expect([200, 204]).toContain(response.status);

    const getResponse = await authRequest(token, 'GET', `/api/v1/erp/bank-account/${createdAccountId}`);
    expect([404, 410]).toContain(getResponse.status);
  });
});

test.afterAll(async () => {
  console.log('\n========================================');
  console.log('  ERP Finance Module Tests Completed');
  console.log('========================================');
});