import { test, expect } from '@playwright/test';

test.describe('Finance Expense Reimbursement Flow', () => {
  const testExpense = {
    title: 'Test Expense ' + Date.now(),
    type: '差旅费',
    amount: '1000.00',
    description: 'Test expense description',
    date: new Date().toISOString().split('T')[0],
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('should navigate to expense reimbursement page', async ({ page }) => {
    await page.goto('/finance/expense');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/finance\/expense/);
  });

  test('should create a new expense reimbursement', async ({ page }) => {
    await page.goto('/finance/expense');
    await page.waitForLoadState('networkidle');

    const addButton = page.getByRole('button', { name: '新增' });
    if (await addButton.isVisible()) {
      await addButton.click();
    } else {
      await page.getByRole('button', { name: '创建报销' }).click();
    }

    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder('请输入报销标题').fill(testExpense.title);

    const typeSelect = page.getByLabel('报销类型');
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption(testExpense.type);
    }

    await page.getByPlaceholder('请输入金额').fill(testExpense.amount);
    await page.getByPlaceholder('请输入报销说明').fill(testExpense.description);

    const dateInput = page.getByPlaceholder('请选择日期');
    if (await dateInput.isVisible()) {
      await dateInput.fill(testExpense.date);
    }

    const saveButton = page.getByRole('button', { name: '保存' });
    if (await saveButton.isVisible()) {
      await saveButton.click();
    } else {
      await page.getByRole('button', { name: '提交' }).click();
    }

    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/finance\/expense/);
  });

  test('should view expense list', async ({ page }) => {
    await page.goto('/finance/expense');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder('搜索报销');
    if (await searchInput.isVisible()) {
      await searchInput.fill(testExpense.title);
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(1000);
    await expect(page.locator('text=' + testExpense.title)).toBeVisible();
  });

  test('should filter expenses by type', async ({ page }) => {
    await page.goto('/finance/expense');
    await page.waitForLoadState('networkidle');

    const typeFilter = page.getByLabel('报销类型');
    if (await typeFilter.isVisible()) {
      await typeFilter.selectOption(testExpense.type);
    }

    await page.waitForTimeout(1000);
  });

  test('should view expense details', async ({ page }) => {
    await page.goto('/finance/expense');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder('搜索报销');
    if (await searchInput.isVisible()) {
      await searchInput.fill(testExpense.title);
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(1000);

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    if (rowCount > 0) {
      const firstRow = rows.first();
      const viewButton = firstRow.getByRole('button', { name: '查看' });
      if (await viewButton.isVisible()) {
        await viewButton.click();
      } else {
        await firstRow.click();
      }

      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=' + testExpense.title)).toBeVisible();
    }
  });

  test('should submit expense for approval', async ({ page }) => {
    await page.goto('/finance/expense');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder('搜索报销');
    if (await searchInput.isVisible()) {
      await searchInput.fill(testExpense.title);
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(1000);

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    if (rowCount > 0) {
      const firstRow = rows.first();
      const submitButton = firstRow.getByRole('button', { name: '提交审批' });
      if (await submitButton.isVisible()) {
        await submitButton.click();

        const confirmButton = page.getByRole('button', { name: '确认' });
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        await page.waitForTimeout(2000);
      }
    }
  });
});