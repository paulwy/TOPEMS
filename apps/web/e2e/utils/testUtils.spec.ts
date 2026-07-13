import { test, expect } from '@playwright/test';
import {
  BASE_URL,
  API_URL,
  TEST_ACCOUNTS,
  apiLogin,
  ensureTestAccounts,
  createAuthenticatedContext,
  createAuthenticatedPage,
  getStorageStatePath,
} from './testUtils';

test.describe('testUtils - API Functions', () => {
  test('apiLogin should return valid token for superadmin', async () => {
    const token = await apiLogin(TEST_ACCOUNTS.superadmin.username, TEST_ACCOUNTS.superadmin.password);
    
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  test('apiLogin should throw error for invalid credentials', async () => {
    await expect(
      apiLogin('invalid_user', 'invalid_password')
    ).rejects.toThrow('登录失败');
  });

  test('apiLogin should handle empty credentials', async () => {
    await expect(apiLogin('', '')).rejects.toThrow('登录失败');
    await expect(apiLogin('admin', '')).rejects.toThrow('登录失败');
    await expect(apiLogin('', 'admin123')).rejects.toThrow('登录失败');
  });
});

test.describe('testUtils - Test Account Management', () => {
  test('ensureTestAccounts should create missing accounts', async () => {
    await ensureTestAccounts();
    
    for (const [key, account] of Object.entries(TEST_ACCOUNTS)) {
      const token = await apiLogin(account.username, account.password);
      expect(token).toBeTruthy();
    }
  });

  test('ensureTestAccounts should be idempotent', async () => {
    await ensureTestAccounts();
    await ensureTestAccounts();
    
    for (const [key, account] of Object.entries(TEST_ACCOUNTS)) {
      const token = await apiLogin(account.username, account.password);
      expect(token).toBeTruthy();
    }
  });
});

test.describe('testUtils - Authenticated Context', () => {
  test('createAuthenticatedContext should create context successfully', async ({ browser }) => {
    const context = await createAuthenticatedContext(
      browser,
      TEST_ACCOUNTS.superadmin.username,
      TEST_ACCOUNTS.superadmin.password
    );
    
    expect(context).toBeTruthy();
    
    await context.close();
  });

  test('createAuthenticatedContext should handle different user roles', async ({ browser }) => {
    for (const [key, account] of Object.entries(TEST_ACCOUNTS)) {
      const context = await createAuthenticatedContext(browser, account.username, account.password);
      expect(context).toBeTruthy();
      await context.close();
    }
  });

  test('createAuthenticatedContext should fail with invalid credentials', async ({ browser }) => {
    await expect(
      createAuthenticatedContext(browser, 'invalid', 'invalid')
    ).rejects.toThrow('登录失败');
  });

  test('createAuthenticatedPage should return page and context', async ({ browser }) => {
    const { page, context } = await createAuthenticatedPage(
      browser,
      TEST_ACCOUNTS.superadmin.username,
      TEST_ACCOUNTS.superadmin.password
    );
    
    expect(page).toBeTruthy();
    expect(context).toBeTruthy();
    
    await page.close();
    await context.close();
  });
});

test.describe('testUtils - Storage State', () => {
  test('getStorageStatePath should generate correct path', async () => {
    const path = await getStorageStatePath('admin');
    expect(path).toBe('e2e/auth-state-admin.json');
    
    const path2 = await getStorageStatePath('employee');
    expect(path2).toBe('e2e/auth-state-employee.json');
  });
});

test.describe('testUtils - Constants', () => {
  test('BASE_URL should be defined', () => {
    expect(BASE_URL).toBeTruthy();
    expect(BASE_URL).toBe('http://localhost:3001');
  });

  test('API_URL should be defined', () => {
    expect(API_URL).toBeTruthy();
    expect(API_URL).toBe('http://localhost:8000');
  });

  test('TEST_ACCOUNTS should have all required accounts', () => {
    expect(TEST_ACCOUNTS.superadmin).toBeDefined();
    expect(TEST_ACCOUNTS.admin).toBeDefined();
    expect(TEST_ACCOUNTS.hr_admin).toBeDefined();
    expect(TEST_ACCOUNTS.employee).toBeDefined();
  });

  test('TEST_ACCOUNTS should have valid credentials', () => {
    for (const [key, account] of Object.entries(TEST_ACCOUNTS)) {
      expect(account.username).toBeTruthy();
      expect(account.password).toBeTruthy();
      expect(account.password.length).toBeGreaterThanOrEqual(6);
    }
  });
});