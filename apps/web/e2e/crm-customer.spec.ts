import { test, expect } from '@playwright/test';

test.describe('CRM Customer Management Flow', () => {
  const testCustomer = {
    name: 'Test Customer ' + Date.now(),
    contact: '张三',
    phone: '13900139000',
    email: 'customer.' + Date.now() + '@example.com',
    industry: '科技',
    address: '北京市朝阳区测试地址',
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('should navigate to customer management page', async ({ page }) => {
    await page.goto('/crm/customers');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/crm\/customers/);
  });

  test('should add a new customer', async ({ page }) => {
    await page.goto('/crm/customers');
    await page.waitForLoadState('networkidle');

    const addButton = page.getByRole('button', { name: '新增' });
    if (await addButton.isVisible()) {
      await addButton.click();
    } else {
      await page.getByRole('button', { name: '添加客户' }).click();
    }

    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder('请输入客户名称').fill(testCustomer.name);
    await page.getByPlaceholder('请输入联系人').fill(testCustomer.contact);
    await page.getByPlaceholder('请输入手机号').fill(testCustomer.phone);
    await page.getByPlaceholder('请输入邮箱').fill(testCustomer.email);

    const industrySelect = page.getByLabel('行业');
    if (await industrySelect.isVisible()) {
      await industrySelect.selectOption(testCustomer.industry);
    }

    await page.getByPlaceholder('请输入地址').fill(testCustomer.address);

    const saveButton = page.getByRole('button', { name: '保存' });
    if (await saveButton.isVisible()) {
      await saveButton.click();
    } else {
      await page.getByRole('button', { name: '提交' }).click();
    }

    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/crm\/customers/);
  });

  test('should search for a customer', async ({ page }) => {
    await page.goto('/crm/customers');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder('搜索客户');
    if (await searchInput.isVisible()) {
      await searchInput.fill(testCustomer.name);
      await page.keyboard.press('Enter');
    } else {
      const searchBox = page.getByRole('textbox', { name: '搜索' });
      if (await searchBox.isVisible()) {
        await searchBox.fill(testCustomer.name);
        await page.keyboard.press('Enter');
      }
    }

    await page.waitForTimeout(1000);
    await expect(page.locator('text=' + testCustomer.name)).toBeVisible();
  });

  test('should view customer details', async ({ page }) => {
    await page.goto('/crm/customers');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder('搜索客户');
    if (await searchInput.isVisible()) {
      await searchInput.fill(testCustomer.name);
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
      await expect(page).toHaveURL(/crm\/customers\/detail/);
      await expect(page.locator('text=' + testCustomer.name)).toBeVisible();
    }
  });

  test('should edit customer information', async ({ page }) => {
    await page.goto('/crm/customers');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder('搜索客户');
    if (await searchInput.isVisible()) {
      await searchInput.fill(testCustomer.name);
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(1000);

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    if (rowCount > 0) {
      const firstRow = rows.first();
      const editButton = firstRow.getByRole('button', { name: '编辑' });
      if (await editButton.isVisible()) {
        await editButton.click();
      }

      await page.waitForLoadState('networkidle');

      const updateName = testCustomer.name + ' Updated';
      const nameInput = page.getByPlaceholder('请输入客户名称');
      if (await nameInput.isVisible()) {
        await nameInput.fill(updateName);
      }

      const saveButton = page.getByRole('button', { name: '保存' });
      if (await saveButton.isVisible()) {
        await saveButton.click();
      }

      await page.waitForTimeout(2000);
    }
  });
});